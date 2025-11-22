use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod math;
pub mod errors;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod debt_manager {
    use super::*;

    pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
        instructions::admin::initialize_protocol(ctx)
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
