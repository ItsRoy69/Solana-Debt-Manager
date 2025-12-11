use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::ErrorCode;

pub const POINTS_MULTIPLIER: u128 = 100; // Base multiplier
pub const REFERRAL_BONUS_BPS: u128 = 1000; // 10% bonus for referrer

pub fn update_points(
    debt_account: &mut UserDebtAccount,
    now: i64,
) -> Result<()> {
    if debt_account.last_points_update_ts == 0 {
        debt_account.last_points_update_ts = now;
        return Ok(());
    }

    let time_delta = now.checked_sub(debt_account.last_points_update_ts).unwrap_or(0);
    if time_delta == 0 {
        return Ok(());
    }

    // Calculate points for Collateral (1 point per token unit per second * multiplier)
    // In a real system, you'd normalize decimals. Here we assume raw amount * time.
    let mut points_delta: u128 = 0;

    for col in &debt_account.collateral_balances {
        // Simplified: 1 Collateral Unit * 1 Second = 1 Point
        let p = (col.amount as u128)
            .checked_mul(time_delta as u128)
            .ok_or(ErrorCode::MathOverflow)?;
         points_delta = points_delta.checked_add(p).ok_or(ErrorCode::MathOverflow)?;
    }

    // Borrowing checks could equate to different points (e.g., 4x for borrowing)
    for debt in &debt_account.debt_balances {
         let p = (debt.principal as u128)
            .checked_mul(time_delta as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_mul(4) // 4x points for borrowing
            .ok_or(ErrorCode::MathOverflow)?;
        points_delta = points_delta.checked_add(p).ok_or(ErrorCode::MathOverflow)?;
    }

    // Apply global multiplier
    points_delta = points_delta.checked_mul(POINTS_MULTIPLIER).ok_or(ErrorCode::MathOverflow)?;

    debt_account.accumulated_points = debt_account.accumulated_points.checked_add(points_delta).ok_or(ErrorCode::MathOverflow)?;
    debt_account.last_points_update_ts = now;

    Ok(())
}
