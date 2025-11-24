use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, Burn};
use crate::state::*;
use crate::errors::ErrorCode;
use crate::math::*;

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut, seeds = [b"debt", user.key().as_ref()], bump = debt_account.bump)]
    pub debt_account: Account<'info, UserDebtAccount>,
    /// CHECK: Used only as a seed for deriving the debt_account PDA
    pub user: AccountInfo<'info>,
    #[account(mut)]
    pub liquidator: Signer<'info>,
    #[account(mut)]
    pub liquidator_collateral_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub liquidator_borrow_account: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [b"vault", collateral_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub collateral_mint: Account<'info, Mint>,
    #[account(mut)]
    pub borrow_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Verified in instruction
    pub collateral_price_feed: AccountInfo<'info>,
    /// CHECK: Verified in instruction
    pub borrow_price_feed: AccountInfo<'info>,
}

pub fn liquidate(ctx: Context<Liquidate>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;
    let debt_account = &mut ctx.accounts.debt_account;
    let now = Clock::get()?.unix_timestamp;

    // Verify explicit price feeds
    let collateral_info = config.supported_collaterals.iter().find(|x| x.mint == ctx.accounts.collateral_mint.key()).unwrap();
    if collateral_info.price_feed != ctx.accounts.collateral_price_feed.key() {
        return Err(ErrorCode::InvalidPriceFeed.into());
    }
    let borrow_info = config.supported_borrows.iter().find(|x| x.mint == ctx.accounts.borrow_mint.key()).unwrap();
    if borrow_info.price_feed != ctx.accounts.borrow_price_feed.key() {
        return Err(ErrorCode::InvalidPriceFeed.into());
    }

    let mut total_collateral_value: u128 = 0;
    let mut total_debt_value: u128 = 0;
    let mut weighted_threshold_numerator: u128 = 0;

    // Helper to find price feed
    let find_price = |feed_pubkey: Pubkey, remaining_accounts: &[AccountInfo]| -> Result<u64> {
        if feed_pubkey == ctx.accounts.collateral_price_feed.key() {
            return get_price_from_feed(&ctx.accounts.collateral_price_feed, 60, now);
        }
        if feed_pubkey == ctx.accounts.borrow_price_feed.key() {
            return get_price_from_feed(&ctx.accounts.borrow_price_feed, 60, now);
        }
        for acc in remaining_accounts {
            if acc.key() == feed_pubkey {
                return get_price_from_feed(acc, 60, now);
            }
        }
        Err(ErrorCode::InvalidPriceFeed.into())
    };

    for c in &debt_account.collateral_balances {
        if let Some(info) = config.supported_collaterals.iter().find(|x| x.mint == c.mint) {
            let price = find_price(info.price_feed, ctx.remaining_accounts)?;
            let value = (c.amount as u128) * (price as u128);
            total_collateral_value += value;
            weighted_threshold_numerator += value * (info.liquidation_threshold as u128);
        }
    }

    for d in &debt_account.debt_balances {
        if let Some(info) = config.supported_borrows.iter().find(|x| x.mint == d.borrow_mint) {
            let price = find_price(info.price_feed, ctx.remaining_accounts)?;
            let owed = calculate_owed_amount(d.principal, d.interest_index_snapshot, info.global_index)?;
            let value = (owed as u128) * (price as u128);
            total_debt_value += value;
        }
    }
    
    let weighted_threshold = if total_collateral_value > 0 {
        weighted_threshold_numerator / total_collateral_value
    } else {
        0
    };

    if total_debt_value * 10000 < total_collateral_value * weighted_threshold {
        return Err(ErrorCode::Unauthorized.into());
    }

    let cpi_accounts = Burn {
        mint: ctx.accounts.borrow_mint.to_account_info(),
        from: ctx.accounts.liquidator_borrow_account.to_account_info(),
        authority: ctx.accounts.liquidator.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::burn(cpi_ctx, amount)?;

    if let Some(d) = debt_account.debt_balances.iter_mut().find(|d| d.borrow_mint == ctx.accounts.borrow_mint.key()) {
        d.principal = d.principal.checked_sub(amount).ok_or(ErrorCode::MathOverflow)?;
    }

    let _borrow_info = config.supported_borrows.iter().find(|x| x.mint == ctx.accounts.borrow_mint.key()).unwrap();
    let collateral_info = config.supported_collaterals.iter().find(|x| x.mint == ctx.accounts.collateral_mint.key()).unwrap();

    let borrow_price = get_price_from_feed(&ctx.accounts.borrow_price_feed, 60, now)?;
    let collateral_price = get_price_from_feed(&ctx.accounts.collateral_price_feed, 60, now)?;

    let borrow_value = (amount as u128) * (borrow_price as u128);
    let collateral_value_to_seize = borrow_value * (10000 + collateral_info.liquidation_bonus as u128) / 10000;
    let collateral_amount_to_seize = collateral_value_to_seize / (collateral_price as u128);

    let mint_key = ctx.accounts.collateral_mint.key();
    let bump = ctx.bumps.vault;
    let seeds = &[
        b"vault".as_ref(),
        mint_key.as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts_transfer = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.liquidator_collateral_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx_transfer = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts_transfer, signer);
    token::transfer(cpi_ctx_transfer, collateral_amount_to_seize as u64)?;

    if let Some(c) = debt_account.collateral_balances.iter_mut().find(|c| c.mint == ctx.accounts.collateral_mint.key()) {
        c.amount = c.amount.checked_sub(collateral_amount_to_seize as u64).ok_or(ErrorCode::MathOverflow)?;
    }

    Ok(())
}
