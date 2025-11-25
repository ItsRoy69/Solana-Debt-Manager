use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, Burn};
use crate::state::*;
use crate::errors::ErrorCode;
use crate::math::*;

pub const MAX_LIQUIDATION_CLOSE_FACTOR: u64 = 5000;

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


    let collateral_info = config.supported_collaterals.iter().find(|x| x.mint == ctx.accounts.collateral_mint.key()).ok_or(ErrorCode::UnsupportedCollateral)?;
    if collateral_info.price_feed != ctx.accounts.collateral_price_feed.key() {
        return Err(ErrorCode::InvalidPriceFeed.into());
    }
    let borrow_info = config.supported_borrows.iter().find(|x| x.mint == ctx.accounts.borrow_mint.key()).ok_or(ErrorCode::UnsupportedBorrowAsset)?;
    if borrow_info.price_feed != ctx.accounts.borrow_price_feed.key() {
        return Err(ErrorCode::InvalidPriceFeed.into());
    }


    let mut total_collateral_value: u128 = 0;
    let mut total_debt_value: u128 = 0;
    let mut weighted_threshold_numerator: u128 = 0;

    for c in &debt_account.collateral_balances {
        if let Some(info) = config.supported_collaterals.iter().find(|x| x.mint == c.mint) {
            let price_feed = if info.mint == ctx.accounts.collateral_mint.key() {
                &ctx.accounts.collateral_price_feed
            } else {
                &ctx.accounts.borrow_price_feed
            };
            let price = get_price_from_feed(price_feed, 60, now)?;
            let value = (c.amount as u128) * (price as u128);
            total_collateral_value += value;
            weighted_threshold_numerator += value * (info.liquidation_threshold as u128);
        }
    }

    for d in &debt_account.debt_balances {
        if let Some(info) = config.supported_borrows.iter().find(|x| x.mint == d.borrow_mint) {
            let price = get_price_from_feed(&ctx.accounts.borrow_price_feed, 60, now)?;
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

    let debt_balance = debt_account.debt_balances.iter()
        .find(|d| d.borrow_mint == ctx.accounts.borrow_mint.key())
        .ok_or(ErrorCode::NoDebtToRepay)?;
    
    let owed = calculate_owed_amount(debt_balance.principal, debt_balance.interest_index_snapshot, borrow_info.global_index)?;
    
    let max_liquidatable = (owed as u128) * (MAX_LIQUIDATION_CLOSE_FACTOR as u128) / 10000;
    let actual_amount = if (amount as u128) > max_liquidatable {
        max_liquidatable as u64
    } else {
        amount
    };

    let cpi_accounts = Burn {
        mint: ctx.accounts.borrow_mint.to_account_info(),
        from: ctx.accounts.liquidator_borrow_account.to_account_info(),
        authority: ctx.accounts.liquidator.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::burn(cpi_ctx, actual_amount)?;

    if let Some(d) = debt_account.debt_balances.iter_mut().find(|d| d.borrow_mint == ctx.accounts.borrow_mint.key()) {
        d.principal = d.principal.checked_sub(actual_amount).ok_or(ErrorCode::MathOverflow)?;
    }

    let _borrow_info = config.supported_borrows.iter().find(|x| x.mint == ctx.accounts.borrow_mint.key()).ok_or(ErrorCode::UnsupportedBorrowAsset)?;
    let collateral_info = config.supported_collaterals.iter().find(|x| x.mint == ctx.accounts.collateral_mint.key()).ok_or(ErrorCode::UnsupportedCollateral)?;

    let borrow_price = get_price_from_feed(&ctx.accounts.borrow_price_feed, 60, now)?;
    let collateral_price = get_price_from_feed(&ctx.accounts.collateral_price_feed, 60, now)?;


    let borrow_value = (actual_amount as u128) * (borrow_price as u128);
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
