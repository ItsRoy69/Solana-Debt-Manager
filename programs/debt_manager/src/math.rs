use anchor_lang::prelude::*;

pub const INDEX_SCALE: u128 = 1_000_000_000_000_000_000;
pub const SECONDS_PER_YEAR: u128 = 31_536_000;

use crate::errors::ErrorCode;

pub fn update_global_index(
    global_index: u128,
    annual_rate_fixed: u128,
    last_ts: u64,
    now_ts: u64,
) -> Result<u128> {
    if now_ts <= last_ts {
        return Ok(global_index);
    }

    let delta_t = (now_ts - last_ts) as u128;
    
    let rate_per_second_fixed = annual_rate_fixed
        .checked_div(SECONDS_PER_YEAR)
        .ok_or(error!(ErrorCode::MathOverflow))?;

    let interest_factor = rate_per_second_fixed
        .checked_mul(delta_t)
        .ok_or(error!(ErrorCode::MathOverflow))?;

    let multiplier = INDEX_SCALE
        .checked_add(interest_factor)
        .ok_or(error!(ErrorCode::MathOverflow))?;

    let new_index = global_index
        .checked_mul(multiplier)
        .ok_or(error!(ErrorCode::MathOverflow))?
        .checked_div(INDEX_SCALE)
        .ok_or(error!(ErrorCode::MathOverflow))?;

    Ok(new_index)
}

pub fn calculate_owed_amount(
    principal: u64,
    snapshot_index: u128,
    current_index: u128,
) -> Result<u64> {
    if snapshot_index == 0 {
        return Ok(principal);
    }
    let principal_u128 = principal as u128;
    
    let owed = principal_u128
        .checked_mul(current_index)
        .ok_or(error!(ErrorCode::MathOverflow))?
        .checked_div(snapshot_index)
        .ok_or(error!(ErrorCode::MathOverflow))?;

    if owed > u64::MAX as u128 {
        return Err(error!(ErrorCode::MathOverflow));
    }

    Ok(owed as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_global_index() {
        let initial_index = INDEX_SCALE;
        let annual_rate = 50_000_000_000_000_000;
        let last_ts = 0;
        let now_ts = 86400;
        let new_index = update_global_index(initial_index, annual_rate, last_ts, now_ts).unwrap();
        assert!(new_index > initial_index);
        assert_eq!(new_index, 1_000_136_986_301_353_600);
    }

    #[test]
    fn test_calculate_owed_amount() {
        let principal = 1000;
        let snapshot_index = INDEX_SCALE;
        let current_index = INDEX_SCALE * 11 / 10;

        let owed = calculate_owed_amount(principal, snapshot_index, current_index).unwrap();
        assert_eq!(owed, 1100);
    }
}

