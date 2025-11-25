use anchor_lang::prelude::*;
use pyth_sdk_solana::state::SolanaPriceAccount;

pub const INDEX_SCALE: u128 = 1_000_000_000_000_000_000;
pub const SECONDS_PER_YEAR: u128 = 31_536_000;
pub const PRICE_PRECISION: u64 = 1_000_000;

use crate::errors::ErrorCode;

pub const UTILIZATION_PRECISION: u64 = 10000;
pub const RATE_PRECISION: u64 = 10000;

pub fn calculate_utilization(total_borrows: u64, total_deposits: u64) -> u64 {
    if total_deposits == 0 {
        return 0;
    }
    ((total_borrows as u128) * (UTILIZATION_PRECISION as u128) / (total_deposits as u128)) as u64
}

pub fn calculate_borrow_rate(
    utilization: u64,
    base_rate: u64,
    optimal_utilization: u64,
    slope1: u64,
    slope2: u64,
) -> u64 {
    if utilization <= optimal_utilization {
        base_rate + ((utilization as u128) * (slope1 as u128) / (optimal_utilization as u128)) as u64
    } else {
        let excess_utilization = utilization - optimal_utilization;
        let max_excess = UTILIZATION_PRECISION - optimal_utilization;
        base_rate + slope1 + ((excess_utilization as u128) * (slope2 as u128) / (max_excess as u128)) as u64
    }
}

pub fn calculate_annual_rate_from_borrow_rate(borrow_rate: u64) -> u128 {
    (borrow_rate as u128) * INDEX_SCALE / (RATE_PRECISION as u128)
}

pub fn get_price_from_feed(price_feed_info: &AccountInfo, max_age: u64, current_ts: i64) -> Result<u64> {
    let price_account = SolanaPriceAccount::account_info_to_feed(price_feed_info)
        .map_err(|_| ErrorCode::InvalidPriceFeed)?;
    
    let price = price_account.get_price_no_older_than(current_ts, max_age)
        .ok_or(ErrorCode::PriceTooOld)?;

    if price.price <= 0 {
        return Err(ErrorCode::InvalidPrice.into());
    }

    let price_u64 = price.price as u64;
    let expo = price.expo;
    let target_expo = 6;
    let current_expo = expo;
    
    let result = if current_expo < target_expo {
        
        let p = price_u64 as u128;

        let power = target_expo - current_expo;
        if power >= 0 {
             p * 10u128.pow(power as u32)
        } else {
             p / 10u128.pow((-power) as u32)
        }
    } else {
        let power = current_expo - target_expo;
        (price_u64 as u128) / 10u128.pow(power as u32)
    };

    Ok(result as u64)
}

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

