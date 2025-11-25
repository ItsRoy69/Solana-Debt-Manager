use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 4 + (32 + 8 + 8 + 8 + 8) * 10 + 4 + (32 + 16 + 16 + 8 + 8) * 10 + 1,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.treasury = ctx.accounts.admin.key();
    config.bump = ctx.bumps.config;
    config.supported_collaterals = Vec::new();
    config.supported_borrows = Vec::new();
    Ok(())
}

#[derive(Accounts)]
pub struct AddSupportedCollateral<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn add_supported_collateral(
    ctx: Context<AddSupportedCollateral>,
    mint: Pubkey,
    ltv: u64,
    liquidation_threshold: u64,
    liquidation_bonus: u64,
    price_feed: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    if config.supported_collaterals.iter().any(|c| c.mint == mint) {
        return Err(ProgramError::Custom(1).into());
    }
    
    config.supported_collaterals.push(CollateralInfo {
        mint,
        ltv,
        liquidation_threshold,
        liquidation_bonus,
        price_feed,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct AddSupportedBorrow<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn add_supported_borrow(
    ctx: Context<AddSupportedBorrow>,
    mint: Pubkey,
    base_rate: u64,
    optimal_utilization: u64,
    slope1: u64,
    slope2: u64,
    price_feed: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    if config.supported_borrows.iter().any(|b| b.mint == mint) {
        return Err(ProgramError::Custom(2).into());
    }
    
    let clock = Clock::get()?;
    
    config.supported_borrows.push(BorrowAssetInfo {
        mint,
        base_rate,
        optimal_utilization,
        slope1,
        slope2,
        total_deposits: 0,
        total_borrows: 0,
        global_index: crate::math::INDEX_SCALE,
        last_update_ts: clock.unix_timestamp as u64,
        price_feed,
    });
    
    Ok(())
}


#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = admin,
        token::mint = mint,
        token::authority = vault,
        seeds = [b"vault", mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, anchor_spl::token::TokenAccount>,
    pub mint: Account<'info, anchor_spl::token::Mint>,
    #[account(
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_vault(_ctx: Context<InitializeVault>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateRateModel<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn update_rate_model(
    ctx: Context<UpdateRateModel>,
    mint: Pubkey,
    base_rate: u64,
    optimal_utilization: u64,
    slope1: u64,
    slope2: u64,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    let asset = config.supported_borrows.iter_mut()
        .find(|b| b.mint == mint)
        .ok_or(ProgramError::Custom(2))?;
    
    asset.base_rate = base_rate;
    asset.optimal_utilization = optimal_utilization;
    asset.slope1 = slope1;
    asset.slope2 = slope2;
    
    Ok(())
}
