use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod math;
pub mod errors;

use instructions::*;

declare_id!("Bym9jYYsJryghp9KWgsRAMT97NoRizbajvEjTKehZNwZ");

#[program]
pub mod debt_manager {
    use super::*;

    pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
        instructions::admin::initialize_protocol(ctx)
    }

    pub fn add_supported_collateral(
        ctx: Context<AddSupportedCollateral>,
        mint: Pubkey,
        ltv: u64,
        liquidation_threshold: u64,
        liquidation_bonus: u64,
        price_feed: Pubkey,
    ) -> Result<()> {
        instructions::admin::add_supported_collateral(ctx, mint, ltv, liquidation_threshold, liquidation_bonus, price_feed)
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
        instructions::admin::add_supported_borrow(ctx, mint, base_rate, optimal_utilization, slope1, slope2, price_feed)
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        instructions::admin::initialize_vault(ctx)
    }

    pub fn update_rate_model(
        ctx: Context<UpdateRateModel>,
        mint: Pubkey,
        base_rate: u64,
        optimal_utilization: u64,
        slope1: u64,
        slope2: u64,
    ) -> Result<()> {
        instructions::admin::update_rate_model(ctx, mint, base_rate, optimal_utilization, slope1, slope2)
    }

    pub fn open_debt_account(ctx: Context<OpenDebtAccount>) -> Result<()> {

        instructions::user::open_debt_account(ctx)
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        instructions::user::deposit_collateral(ctx, amount)
    }

    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
        instructions::user::withdraw_collateral(ctx, amount)
    }

    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        instructions::user::borrow(ctx, amount)
    }

    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        instructions::user::repay(ctx, amount)
    }

    pub fn liquidate(ctx: Context<Liquidate>, amount: u64) -> Result<()> {
        instructions::liquidation::liquidate(ctx, amount)
    }

    pub fn accrue_interest(ctx: Context<AccrueInterest>) -> Result<()> {
        instructions::user::accrue_interest(ctx)
    }
}
