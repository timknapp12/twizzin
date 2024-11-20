use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

pub fn calculate_payouts(
    total_pot: u64,
    treasury_fee_bps: u16,
    commission_percent: u8,
    max_winners: u8,
    total_players: u32,
    rent_exemption: u64,
    is_native: bool,
) -> Result<(u64, u64, u64, u64)> {
    // Only subtract rent exemption for native SOL games
    let distributable_pot = if is_native {
        total_pot
            .checked_sub(rent_exemption)
            .ok_or(ErrorCode::NumericOverflow)?
    } else {
        total_pot
    };

    // Calculate treasury fee
    let treasury_fee = if distributable_pot > 0 {
        (distributable_pot as u128)
            .checked_mul(treasury_fee_bps as u128)
            .ok_or(ErrorCode::NumericOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::NumericOverflow)? as u64
    } else {
        0
    };

    // Calculate admin commission
    let admin_commission = if distributable_pot > 0 {
        (distributable_pot as u128)
            .checked_mul(commission_percent as u128)
            .ok_or(ErrorCode::NumericOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::NumericOverflow)? as u64
    } else {
        0
    };

    // Calculate prize pool
    let prize_pool = distributable_pot
        .checked_sub(treasury_fee)
        .ok_or(ErrorCode::NumericOverflow)?
        .checked_sub(admin_commission)
        .ok_or(ErrorCode::NumericOverflow)?;

    let actual_winners = std::cmp::min(max_winners as u32, total_players) as u64;

    let per_winner = if actual_winners > 0 && prize_pool > 0 {
        prize_pool
            .checked_div(actual_winners)
            .ok_or(ErrorCode::NumericOverflow)?
    } else {
        0
    };

    Ok((treasury_fee, admin_commission, prize_pool, per_winner))
}

#[cfg(test)]
mod tests {
    use super::*;
    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
    const MOCK_RENT_EXEMPTION: u64 = 890_880; // Example value, you can adjust this

    // Replace the get_rent_exemption function
    fn get_rent_exemption() -> u64 {
        MOCK_RENT_EXEMPTION
    }

    // Update the first test to demonstrate the change
    #[test]
    fn test_payout_calculations() {
        // Test case 1: Normal case with max_winners < total_players
        let total_pot = LAMPORTS_PER_SOL + MOCK_RENT_EXEMPTION;
        let distributable_pot = total_pot - MOCK_RENT_EXEMPTION;

        println!("Total pot: {}", total_pot);
        println!("MOCK_RENT_EXEMPTION: {}", MOCK_RENT_EXEMPTION);
        println!("Distributable pot: {}", distributable_pot);
        println!("Treasury fee bps: {}", 500);
        println!("Commission percent: {}", 2);

        let result = calculate_payouts(
            total_pot,
            500, // 5% treasury fee
            2,   // 2% commission
            3,   // 3 max winners
            10,  // 10 total players
            MOCK_RENT_EXEMPTION,
            true,
        )
        .unwrap();

        println!("Treasury fee: {}", result.0);
        println!("Admin commission: {}", result.1);
        println!("Prize pool: {}", result.2);
        println!("Per winner: {}", result.3);

        // Verify calculations
        assert_eq!(result.0, distributable_pot * 500 / 10000); // treasury fee (5%)
        assert_eq!(result.1, distributable_pot * 2 / 100); // admin commission (2%)
        assert_eq!(result.2, distributable_pot - result.0 - result.1); // prize pool
        assert_eq!(result.3, result.2 / 3); // per winner amount

        // Test case 2: Empty pot
        let result = calculate_payouts(
            MOCK_RENT_EXEMPTION, // Only rent exemption
            500,
            2,
            3,
            10,
            MOCK_RENT_EXEMPTION,
            true,
        )
        .unwrap();

        assert_eq!(result.0, 0); // No treasury fee
        assert_eq!(result.1, 0); // No commission
        assert_eq!(result.2, 0); // No prize pool
        assert_eq!(result.3, 0); // No per winner amount
    }

    #[test]
    fn test_basic_payout_scenarios() {
        let total_pot = 1_000_000;
        let distributable_pot = total_pot - MOCK_RENT_EXEMPTION;

        let result = calculate_payouts(
            total_pot,
            1000, // 10% treasury fee
            5,    // 5% commission
            3,    // 3 max winners
            10,   // 10 total players
            MOCK_RENT_EXEMPTION,
            true,
        )
        .unwrap();

        assert_eq!(result.0, distributable_pot / 10); // treasury fee (10%)
        assert_eq!(result.1, distributable_pot / 20); // admin commission (5%)
        assert_eq!(result.2, distributable_pot - result.0 - result.1); // prize pool
        assert_eq!(result.3, result.2 / 3); // per winner (rounded down)

        // Verify total allocation equals distributable pot
        assert!(result.0 + result.1 + (result.3 * 3) <= distributable_pot);
    }

    #[test]
    fn test_winner_count_scenarios() {
        // Case 1: More players than max winners
        let result =
            calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 3, 10, MOCK_RENT_EXEMPTION, true).unwrap();
        let winners = 3;
        assert!(result.3 * winners <= result.2); // per_winner * winners <= prize_pool

        // Case 2: Fewer players than max winners
        let result =
            calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 10, 3, MOCK_RENT_EXEMPTION, true).unwrap();
        let winners = 3;
        assert!(result.3 * winners <= result.2);

        // Case 3: Equal players and max winners
        let result =
            calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 5, 5, MOCK_RENT_EXEMPTION, true).unwrap();
        let winners = 5;
        assert!(result.3 * winners <= result.2);
    }

    #[test]
    fn test_fee_calculation_accuracy() {
        let rent_exempt = get_rent_exemption();
        let pot = 100 * LAMPORTS_PER_SOL + rent_exempt;
        let result = calculate_payouts(pot, 1000, 5, 5, 10, rent_exempt, true).unwrap();

        // Treasury should get exactly 10% of (pot - rent_exempt)
        assert_eq!(result.0, 10 * LAMPORTS_PER_SOL);
        // Admin should get exactly 5% of (pot - rent_exempt)
        assert_eq!(result.1, 5 * LAMPORTS_PER_SOL);
        // Prize pool should be 85 SOL
        assert_eq!(result.2, 85 * LAMPORTS_PER_SOL);
        // Each winner (5) should get 17 SOL
        assert_eq!(result.3, 17 * LAMPORTS_PER_SOL);
    }

    #[test]
    fn test_edge_cases() {
        // Test zero players
        let result =
            calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 5, 0, MOCK_RENT_EXEMPTION, true).unwrap();
        assert_eq!(result.3, 0); // per_winner should be 0

        // Test zero max winners
        let result =
            calculate_payouts(LAMPORTS_PER_SOL, 1000, 5, 0, 5, MOCK_RENT_EXEMPTION, true).unwrap();
        assert_eq!(result.3, 0);

        // Test with large but safe values
        let large_pot = 1_000_000 * LAMPORTS_PER_SOL; // 1 million SOL
        let result =
            calculate_payouts(large_pot, 1000, 10, 255, 1000, MOCK_RENT_EXEMPTION, true).unwrap();
        assert!(result.0 > 0); // Should not overflow
        assert!(result.1 > 0);
        assert!(result.2 > 0);
        assert!(result.3 > 0);
    }

    #[test]
    fn test_rounding_behavior() {
        // Test with a pot that won't divide evenly
        let result =
            calculate_payouts(1_000_003, 1000, 5, 3, 5, MOCK_RENT_EXEMPTION, true).unwrap();
        let total_distributed = result.0 + result.1 + (result.3 * 3);
        assert!(total_distributed <= 1_000_003);
        assert!(result.2 >= result.3 * 3); // Prize pool should be >= total winner payouts
        assert!(result.2 - (result.3 * 3) < 3); // Difference should be less than number of winners
    }

    #[test]
    fn test_minimum_amounts() {
        let rent_exempt = get_rent_exemption();
        // Test with 1 lamport + rent exemption
        let result = calculate_payouts(1 + rent_exempt, 1000, 5, 1, 1, rent_exempt, true).unwrap();
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
        let result =
            calculate_payouts(pot, 1000, 5, 3, players as u32, MOCK_RENT_EXEMPTION, true).unwrap();
        assert!(result.3 * 3 <= pot); // Total prizes <= pot

        // Medium game: 100 players, 1 SOL entry fee
        let result = calculate_payouts(
            100 * LAMPORTS_PER_SOL,
            1000,
            5,
            5,
            100,
            MOCK_RENT_EXEMPTION,
            true,
        )
        .unwrap();
        assert!(result.0 + result.1 + (result.3 * 5) <= 100 * LAMPORTS_PER_SOL);

        // Large game: 1000 players, 0.5 SOL entry fee
        let result = calculate_payouts(
            500 * LAMPORTS_PER_SOL,
            1000,
            5,
            10,
            1000,
            MOCK_RENT_EXEMPTION,
            true,
        )
        .unwrap();
        assert!(result.0 + result.1 + (result.3 * 10) <= 500 * LAMPORTS_PER_SOL);
    }

    #[test]
    fn test_token_payout_calculations() {
        // Test case 1: Token game with max_winners < total_players
        let total_pot = 8_000_000; // 8 million tokens

        let result = calculate_payouts(
            total_pot,
            1000, // 10% treasury fee
            5,    // 5% commission
            3,    // 3 max winners
            10,   // 10 total players
            MOCK_RENT_EXEMPTION,
            false, // is_native = false for token game
        )
        .unwrap();

        // For token games, we use the total pot directly (no rent exemption)
        assert_eq!(result.0, total_pot / 10); // treasury fee (10%)
        assert_eq!(result.1, total_pot / 20); // admin commission (5%)
        assert_eq!(result.2, total_pot - result.0 - result.1); // prize pool
        assert_eq!(result.3, result.2 / 3); // per winner amount

        // Verify expected amounts
        assert_eq!(result.0, 800_000); // treasury fee
        assert_eq!(result.1, 400_000); // admin commission
        assert_eq!(result.2, 6_800_000); // prize pool
        assert_eq!(result.3, 2_266_666); // per winner (rounded down)

        // Test case 2: Verify no rent exemption impact
        let result_with_different_rent = calculate_payouts(
            total_pot,
            1000,
            5,
            3,
            10,
            MOCK_RENT_EXEMPTION * 2, // Double the rent exemption
            false,                   // is_native = false
        )
        .unwrap();

        // Results should be identical regardless of rent exemption
        assert_eq!(result.0, result_with_different_rent.0);
        assert_eq!(result.1, result_with_different_rent.1);
        assert_eq!(result.2, result_with_different_rent.2);
        assert_eq!(result.3, result_with_different_rent.3);
    }
}

// cargo test payout -- --nocapture

// Client-side winner determination
// async function determineWinners(gameAddress: PublicKey, maxWinners: number) {
//     // Find all player accounts for this game
//     const playerAccounts = await program.account.playerAccount.all([
//       {
//         memcmp: {
//           offset: 8, // after discriminator
//           bytes: gameAddress.toBase58(),
//         },
//       },
//     ]);

//     // Sort by num_correct (descending) and finish_time (ascending)
//     const sortedPlayers = playerAccounts
//       .filter(p => p.account.finishedTime > 0) // Only include players who submitted
//       .sort((a, b) => {
//         if (b.account.numCorrect !== a.account.numCorrect) {
//           return b.account.numCorrect - a.account.numCorrect;
//         }
//         return a.account.finishedTime - b.account.finishedTime;
//       });

//     // Return top winners
//     return sortedPlayers.slice(0, maxWinners);
//   }
