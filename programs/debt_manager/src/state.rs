use anchor_lang::prelude::*;

#[account]
pub struct ProtocolConfig {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub supported_collaterals: Vec<CollateralInfo>,
    pub supported_borrows: Vec<BorrowAssetInfo>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct CollateralInfo {
    pub mint: Pubkey,
    pub ltv: u64, // Loan-to-Value ratio (e.g., 8000 for 80%)
    pub liquidation_threshold: u64, // e.g., 8500 for 85%
    pub liquidation_bonus: u64, // e.g., 500 for 5%
    pub price: u64, // Mock price in fixed point (e.g. 6 decimals)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct BorrowAssetInfo {
    pub mint: Pubkey,
    pub annual_rate_fixed: u128, // Fixed-point annual interest rate
    pub global_index: u128, // Global interest index
    pub last_update_ts: u64, // Timestamp of last index update
    pub price: u64, // Mock price
}

#[account]
pub struct UserDebtAccount {
    pub owner: Pubkey,
    pub collateral_balances: Vec<CollateralBalance>,
    pub debt_balances: Vec<DebtBalance>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct CollateralBalance {
    pub mint: Pubkey,
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct DebtBalance {
    pub borrow_mint: Pubkey,
    pub principal: u64,
    pub interest_index_snapshot: u128,
}
