use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Math operation overflowed")]
    MathOverflow,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Collateral not supported")]
    UnsupportedCollateral,
    #[msg("Borrow asset not supported")]
    UnsupportedBorrowAsset,
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("LTV exceeded")]
    LTVExceeded,
    #[msg("Debt account already exists")]
    DebtAccountAlreadyExists,
    #[msg("No debt to repay")]
    NoDebtToRepay,
}
