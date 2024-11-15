use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

pub fn calculate_payouts(
    total_pot: u64,
    treasury_fee_bps: u16,  // basis points (e.g. 1000 = 10%)
    commission_percent: u8, // percentage (e.g. 10 = 10%)
    max_winners: u8,
    total_players: u32,
) -> Result<(u64, u64, u64, u64)> {
    // Calculate treasury fee
    let treasury_fee = if total_pot > 0 {
        (total_pot as u128)
            .checked_mul(treasury_fee_bps as u128)
            .ok_or(ErrorCode::NumericOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::NumericOverflow)? as u64
    } else {
        0
    };

    // Calculate admin commission
    let admin_commission = if total_pot > 0 {
        (total_pot as u128)
            .checked_mul(commission_percent as u128)
            .ok_or(ErrorCode::NumericOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::NumericOverflow)? as u64
    } else {
        0
    };

    // Calculate prize pool
    let prize_pool = total_pot
        .checked_sub(treasury_fee)
        .ok_or(ErrorCode::NumericOverflow)?
        .checked_sub(admin_commission)
        .ok_or(ErrorCode::NumericOverflow)?;

    // Calculate actual number of winners (minimum of max_winners and total_players)
    let actual_winners = std::cmp::min(max_winners as u32, total_players) as u64;

    // Calculate per winner amount
    let per_winner = if actual_winners > 0 && prize_pool > 0 {
        prize_pool
            .checked_div(actual_winners)
            .ok_or(ErrorCode::NumericOverflow)?
    } else {
        0
    };

    Ok((treasury_fee, admin_commission, prize_pool, per_winner))
}

// cargo test payout -- --nocapture
#[cfg(test)]
mod tests {
    use super::*;
    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    #[test]
    fn test_payout_calculations() {
        // Test case 1: Normal case with max_winners < total_players
        let result = calculate_payouts(
            1_000_000, // 1 SOL total pot
            1000,      // 10% treasury fee
            5,         // 5% commission
            3,         // 3 max winners
            10,        // 10 total players
        )
        .unwrap();
        assert_eq!(result.0, 100_000); // treasury fee
        assert_eq!(result.1, 50_000); // admin commission
        assert_eq!(result.2, 850_000); // prize pool
        assert_eq!(result.3, 283_333); // per winner (rounded down)

        // Test case 2: total_players < max_winners
        let result = calculate_payouts(
            1_000_000, // 1 SOL
            1000,      // 10%
            5,         // 5%
            10,        // 10 max winners
            3,         // only 3 players
        )
        .unwrap();
        assert_eq!(result.0, 100_000); // treasury fee
        assert_eq!(result.1, 50_000); // admin commission
        assert_eq!(result.2, 850_000); // prize pool
        assert_eq!(result.3, 283_333); // split among 3 players, not 10

        // Test case 3: Empty pot
        let result = calculate_payouts(0, 1000, 5, 3, 10).unwrap();
        assert_eq!(result.0, 0);
        assert_eq!(result.1, 0);
        assert_eq!(result.2, 0);
        assert_eq!(result.3, 0);

        // Test case 4: Single winner
        let result = calculate_payouts(1_000_000, 1000, 5, 1, 5).unwrap();
        assert_eq!(result.0, 100_000);
        assert_eq!(result.1, 50_000);
        assert_eq!(result.2, 850_000);
        assert_eq!(result.3, 850_000); // entire prize pool goes to one winner
    }

    #[test]
    fn test_basic_payout_scenarios() {
        // Test case 1: Normal case with max_winners < total_players
        let result = calculate_payouts(
            1_000_000, // 1 SOL total pot
            1000,      // 10% treasury fee
            5,         // 5% commission
            3,         // 3 max winners
            10,        // 10 total players
        )
        .unwrap();
        assert_eq!(result.0, 100_000); // treasury fee
        assert_eq!(result.1, 50_000); // admin commission
        assert_eq!(result.2, 850_000); // prize pool
        assert_eq!(result.3, 283_333); // per winner (rounded down)

        // Verify total allocation equals total pot
        assert!(result.0 + result.1 + (result.3 * 3) <= 1_000_000);
    }

    #[test]
    fn test_winner_count_scenarios() {
        // Case 1: More players than max winners
        let result = calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 3, 10).unwrap();
        let winners = 3;
        assert!(result.3 * winners <= result.2); // per_winner * winners <= prize_pool

        // Case 2: Fewer players than max winners
        let result = calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 10, 3).unwrap();
        let winners = 3;
        assert!(result.3 * winners <= result.2);

        // Case 3: Equal players and max winners
        let result = calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 5, 5).unwrap();
        let winners = 5;
        assert!(result.3 * winners <= result.2);
    }

    #[test]
    fn test_fee_calculation_accuracy() {
        // Test with 100 SOL pot to verify exact fee calculations
        let pot = 100 * LAMPORTS_PER_SOL;
        let result = calculate_payouts(pot, 1000, 5, 5, 10).unwrap();

        // Treasury should get exactly 10%
        assert_eq!(result.0, 10 * LAMPORTS_PER_SOL);
        // Admin should get exactly 5%
        assert_eq!(result.1, 5 * LAMPORTS_PER_SOL);
        // Prize pool should be 85 SOL
        assert_eq!(result.2, 85 * LAMPORTS_PER_SOL);
        // Each winner (5) should get 17 SOL
        assert_eq!(result.3, 17 * LAMPORTS_PER_SOL);
    }

    #[test]
    fn test_edge_cases() {
        // Test zero players
        let result = calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 5, 0).unwrap();
        assert_eq!(result.3, 0); // per_winner should be 0

        // Test zero max winners
        let result = calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 0, 5).unwrap();
        assert_eq!(result.3, 0);

        // Test with large but safe values
        let large_pot = 1_000_000 * LAMPORTS_PER_SOL; // 1 million SOL
        let result = calculate_payouts(large_pot, 1000, 10, 255, 1000).unwrap();
        assert!(result.0 > 0); // Should not overflow
        assert!(result.1 > 0);
        assert!(result.2 > 0);
        assert!(result.3 > 0);
    }

    #[test]
    fn test_rounding_behavior() {
        // Test with a pot that won't divide evenly
        let result = calculate_payouts(1_000_003, 1000, 5, 3, 5).unwrap();
        let total_distributed = result.0 + result.1 + (result.3 * 3);
        assert!(total_distributed <= 1_000_003);
        assert!(result.2 >= result.3 * 3); // Prize pool should be >= total winner payouts
        assert!(result.2 - (result.3 * 3) < 3); // Difference should be less than number of winners
    }

    #[test]
    fn test_minimum_amounts() {
        // Test with 1 lamport
        let result = calculate_payouts(1, 1000, 5, 1, 1).unwrap();
        assert_eq!(result.0, 0); // Treasury fee rounds down to 0
        assert_eq!(result.1, 0); // Commission rounds down to 0
        assert_eq!(result.2, 1); // All goes to prize pool
        assert_eq!(result.3, 1); // Single winner gets it all
    }

    #[test]
    fn test_realistic_game_scenarios() {
        // Small game: 10 players, 0.1 SOL entry fee
        let entry_fee = LAMPORTS_PER_SOL / 10;
        let players = 10;
        let pot = entry_fee * players as u64;
        let result = calculate_payouts(pot, 1000, 5, 3, players as u32).unwrap();
        assert!(result.3 * 3 <= pot); // Total prizes <= pot

        // Medium game: 100 players, 1 SOL entry fee
        let result = calculate_payouts(100 * LAMPORTS_PER_SOL, 1000, 5, 5, 100).unwrap();
        assert!(result.0 + result.1 + (result.3 * 5) <= 100 * LAMPORTS_PER_SOL);

        // Large game: 1000 players, 0.5 SOL entry fee
        let result = calculate_payouts(500 * LAMPORTS_PER_SOL, 1000, 5, 10, 1000).unwrap();
        assert!(result.0 + result.1 + (result.3 * 10) <= 500 * LAMPORTS_PER_SOL);
    }
}
