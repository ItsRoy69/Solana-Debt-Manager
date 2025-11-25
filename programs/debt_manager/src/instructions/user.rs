use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn};
use crate::state::*;
use crate::errors::ErrorCode;
use crate::math::*;

#[derive(Accounts)]
pub struct OpenDebtAccount<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 4 + (32 + 8) * 10 + 4 + (32 + 8 + 16) * 10 + 1,
        seeds = [b"debt", owner.key().as_ref()],
        bump
    )]
    pub debt_account: Account<'info, UserDebtAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn open_debt_account(ctx: Context<OpenDebtAccount>) -> Result<()> {
    let debt_account = &mut ctx.accounts.debt_account;
    debt_account.owner = ctx.accounts.owner.key();
    debt_account.collateral_balances = Vec::new();
    debt_account.debt_balances = Vec::new();
    debt_account.bump = ctx.bumps.debt_account;
    Ok(())
}

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut, seeds = [b"debt", owner.key().as_ref()], bump = debt_account.bump)]
    pub debt_account: Account<'info, UserDebtAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub user_collateral: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault", collateral_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub collateral_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: Verified in instruction
    pub price_feed: AccountInfo<'info>,
}

pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;
    let collateral_info = config.supported_collaterals.iter().find(|c| c.mint == ctx.accounts.collateral_mint.key()).ok_or(ErrorCode::UnsupportedCollateral)?;
    
    if collateral_info.price_feed != ctx.accounts.price_feed.key() {
        return Err(ErrorCode::InvalidPriceFeed.into());
    }

    let cpi_accounts = Transfer {
        from: ctx.accounts.user_collateral.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    let debt_account = &mut ctx.accounts.debt_account;
    if let Some(balance) = debt_account.collateral_balances.iter_mut().find(|b| b.mint == ctx.accounts.collateral_mint.key()) {
        balance.amount = balance.amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    } else {
        debt_account.collateral_balances.push(CollateralBalance {
            mint: ctx.accounts.collateral_mint.key(),
            amount,
        });
    }

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(mut, seeds = [b"debt", owner.key().as_ref()], bump = debt_account.bump)]
    pub debt_account: Account<'info, UserDebtAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub user_collateral: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault", collateral_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub collateral_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: Verified in instruction
    pub price_feed: AccountInfo<'info>,
}

pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;
    let collateral_info = config.supported_collaterals.iter().find(|c| c.mint == ctx.accounts.collateral_mint.key()).ok_or(ErrorCode::UnsupportedCollateral)?;
    
    if collateral_info.price_feed != ctx.accounts.price_feed.key() {
        return Err(ErrorCode::InvalidPriceFeed.into());
    }



    let debt_account = &mut ctx.accounts.debt_account;
    
    if let Some(balance) = debt_account.collateral_balances.iter_mut().find(|b| b.mint == ctx.accounts.collateral_mint.key()) {
        if balance.amount < amount {
            return Err(ErrorCode::InsufficientCollateral.into());
        }
        balance.amount = balance.amount.checked_sub(amount).ok_or(ErrorCode::MathOverflow)?;
    } else {
        return Err(ErrorCode::InsufficientCollateral.into());
    }

    if !debt_account.debt_balances.is_empty() {
        let now = Clock::get()?.unix_timestamp as u64;
        
        let mut total_collateral_value_with_ltv: u128 = 0;
        for c in &debt_account.collateral_balances {
            if let Some(info) = config.supported_collaterals.iter().find(|x| x.mint == c.mint) {
                let price = get_price_from_feed(
                    ctx.remaining_accounts.iter().find(|acc| acc.key() == info.price_feed)
                        .ok_or(ErrorCode::InvalidPriceFeed)?,
                    60,
                    now as i64
                )?;
                let value = (c.amount as u128) * (price as u128);
                let value_with_ltv = value * (info.ltv as u128) / 10000;
                total_collateral_value_with_ltv = total_collateral_value_with_ltv
                    .checked_add(value_with_ltv)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
        }


        let mut total_debt_value: u128 = 0;
        for d in &debt_account.debt_balances {
            if let Some(info) = config.supported_borrows.iter().find(|x| x.mint == d.borrow_mint) {
                let price = get_price_from_feed(
                    ctx.remaining_accounts.iter().find(|acc| acc.key() == info.price_feed)
                        .ok_or(ErrorCode::InvalidPriceFeed)?,
                    60,
                    now as i64
                )?;
                let owed = calculate_owed_amount(d.principal, d.interest_index_snapshot, info.global_index)?;
                let value = (owed as u128) * (price as u128);
                total_debt_value = total_debt_value.checked_add(value).ok_or(ErrorCode::MathOverflow)?;
            }
        }

        if total_debt_value > total_collateral_value_with_ltv {

            return Err(ErrorCode::LTVExceeded.into());
        }
    }

    let mint_key = ctx.accounts.collateral_mint.key();
    let bump = ctx.bumps.vault;
    let seeds = &[
        b"vault".as_ref(),
        mint_key.as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.user_collateral.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;
    
    Ok(())
}


#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut, seeds = [b"debt", owner.key().as_ref()], bump = debt_account.bump)]
    pub debt_account: Account<'info, UserDebtAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub borrow_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Verified in instruction
    pub price_feed: AccountInfo<'info>,
}

pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp as u64;
    let borrow_mint_key = ctx.accounts.borrow_mint.key();

    let asset_index = config.supported_borrows.iter().position(|a| a.mint == borrow_mint_key).ok_or(ErrorCode::UnsupportedBorrowAsset)?;
    let asset = &mut config.supported_borrows[asset_index];
    
    if asset.price_feed != ctx.accounts.price_feed.key() {
        return Err(ErrorCode::InvalidPriceFeed.into());
    }
    
    let borrow_price = get_price_from_feed(&ctx.accounts.price_feed, 60, now as i64)?;
    
    let utilization = crate::math::calculate_utilization(asset.total_borrows, asset.total_deposits);
    let borrow_rate = crate::math::calculate_borrow_rate(
        utilization,
        asset.base_rate,
        asset.optimal_utilization,
        asset.slope1,
        asset.slope2
    );
    let annual_rate = crate::math::calculate_annual_rate_from_borrow_rate(borrow_rate);
    
    let new_index = update_global_index(asset.global_index, annual_rate, asset.last_update_ts, now)?;
    asset.global_index = new_index;
    asset.last_update_ts = now;
    let current_global_index = asset.global_index;

    asset.total_borrows = asset.total_borrows.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

    let debt_account = &mut ctx.accounts.debt_account;
    let debt_slot_index = debt_account.debt_balances.iter().position(|d| d.borrow_mint == borrow_mint_key);

    if let Some(idx) = debt_slot_index {
        let slot = &mut debt_account.debt_balances[idx];
        let owed_now = calculate_owed_amount(slot.principal, slot.interest_index_snapshot, current_global_index)?;
        let new_principal = owed_now.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        slot.principal = new_principal;
        slot.interest_index_snapshot = current_global_index;
    } else {
        debt_account.debt_balances.push(DebtBalance {
            borrow_mint: borrow_mint_key,
            principal: amount,
            interest_index_snapshot: current_global_index,
        });
    }

    let mut total_collateral_value_with_ltv: u128 = 0;
    for c in &debt_account.collateral_balances {
        if let Some(info) = config.supported_collaterals.iter().find(|x| x.mint == c.mint) {
            let price = get_price_from_feed(
                ctx.remaining_accounts.iter().find(|acc| acc.key() == info.price_feed)
                    .ok_or(ErrorCode::InvalidPriceFeed)?,
                60,
                now as i64
            )?;
            let value = (c.amount as u128) * (price as u128);
            let value_with_ltv = value * (info.ltv as u128) / 10000;
            total_collateral_value_with_ltv = total_collateral_value_with_ltv
                .checked_add(value_with_ltv)
                .ok_or(ErrorCode::MathOverflow)?;
        }
    }

    let mut total_debt_value: u128 = 0;
    for d in &debt_account.debt_balances {
        if let Some(info) = config.supported_borrows.iter().find(|x| x.mint == d.borrow_mint) {
            let price = if info.mint == borrow_mint_key {
                borrow_price
            } else {
                get_price_from_feed(
                    ctx.remaining_accounts.iter().find(|acc| acc.key() == info.price_feed)
                        .ok_or(ErrorCode::InvalidPriceFeed)?,
                    60,
                    now as i64
                )?
            };
            let owed = calculate_owed_amount(d.principal, d.interest_index_snapshot, info.global_index)?;
            let value = (owed as u128) * (price as u128);
            total_debt_value = total_debt_value.checked_add(value).ok_or(ErrorCode::MathOverflow)?;
        }
    }

    if total_debt_value > total_collateral_value_with_ltv {
        return Err(ErrorCode::LTVExceeded.into());
    }

    let bump = ctx.accounts.config.bump;
    let seeds = &[
        b"config".as_ref(),
        &[bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.borrow_mint.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::mint_to(cpi_ctx, amount)?;

    Ok(())
}


#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(mut, seeds = [b"debt", owner.key().as_ref()], bump = debt_account.bump)]
    pub debt_account: Account<'info, UserDebtAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub borrow_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Verified in instruction
    pub price_feed: AccountInfo<'info>,
}

pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp as u64;
    let borrow_mint_key = ctx.accounts.borrow_mint.key();

    let asset_index = config.supported_borrows.iter().position(|a| a.mint == borrow_mint_key).ok_or(ErrorCode::UnsupportedBorrowAsset)?;
    let asset = &mut config.supported_borrows[asset_index];
    
    if asset.price_feed != ctx.accounts.price_feed.key() {
        return Err(ErrorCode::InvalidPriceFeed.into());
    }
    
    let utilization = crate::math::calculate_utilization(asset.total_borrows, asset.total_deposits);
    let borrow_rate = crate::math::calculate_borrow_rate(
        utilization,
        asset.base_rate,
        asset.optimal_utilization,
        asset.slope1,
        asset.slope2
    );
    let annual_rate = crate::math::calculate_annual_rate_from_borrow_rate(borrow_rate);
    
    let new_index = update_global_index(asset.global_index, annual_rate, asset.last_update_ts, now)?;
    asset.global_index = new_index;
    asset.last_update_ts = now;
    let current_global_index = asset.global_index;

    let debt_account = &mut ctx.accounts.debt_account;
    let debt_slot_index = debt_account.debt_balances.iter().position(|d| d.borrow_mint == borrow_mint_key).ok_or(ErrorCode::NoDebtToRepay)?;
    let slot = &mut debt_account.debt_balances[debt_slot_index];

    let owed_now = calculate_owed_amount(slot.principal, slot.interest_index_snapshot, current_global_index)?;
    
    let repay_amount = if amount > owed_now { owed_now } else { amount };
    let new_principal = owed_now.checked_sub(repay_amount).ok_or(ErrorCode::MathOverflow)?;

    slot.principal = new_principal;
    slot.interest_index_snapshot = current_global_index;

    let asset = &mut config.supported_borrows[asset_index];
    asset.total_borrows = asset.total_borrows.checked_sub(repay_amount).ok_or(ErrorCode::MathOverflow)?;

    let cpi_accounts = Burn {
        mint: ctx.accounts.borrow_mint.to_account_info(),
        from: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::burn(cpi_ctx, repay_amount)?;

    Ok(())
}

#[derive(Accounts)]
pub struct AccrueInterest<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
}

pub fn accrue_interest(ctx: Context<AccrueInterest>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp as u64;

    for asset in config.supported_borrows.iter_mut() {
        let utilization = crate::math::calculate_utilization(asset.total_borrows, asset.total_deposits);
        let borrow_rate = crate::math::calculate_borrow_rate(
            utilization,
            asset.base_rate,
            asset.optimal_utilization,
            asset.slope1,
            asset.slope2
        );
        let annual_rate = crate::math::calculate_annual_rate_from_borrow_rate(borrow_rate);
        
        let new_index = update_global_index(asset.global_index, annual_rate, asset.last_update_ts, now)?;
        asset.global_index = new_index;
        asset.last_update_ts = now;
    }

    Ok(())
}
