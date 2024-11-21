use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

pub fn calculate_prizes(
    total_pot: u64,
    num_winners: u8,
    even_split: bool,
    is_native: bool,
    rent_exemption: u64,
) -> Result<Vec<u64>> {
    require!(num_winners > 0, ErrorCode::InvalidWinnerCount);

    // Handle rent exemption for native SOL
    let distributable_pot = if is_native {
        total_pot
            .checked_sub(rent_exemption)
            .ok_or(ErrorCode::NumericOverflow)?
    } else {
        total_pot
    };

    if distributable_pot == 0 {
        return Ok(vec![0; num_winners as usize]);
    }

    if even_split {
        let prize_amount = distributable_pot
            .checked_div(num_winners as u64)
            .ok_or(ErrorCode::NumericOverflow)?;
        return Ok(vec![prize_amount; num_winners as usize]);
    }

    // Geometric distribution
    let mut prizes = Vec::with_capacity(num_winners as usize);
    let mut remaining_pot = distributable_pot;

    for _ in 0..num_winners {
        let prize = remaining_pot
            .checked_div(2)
            .ok_or(ErrorCode::NumericOverflow)?;

        if prize == 0 {
            prizes.push(0);
            continue;
        }

        prizes.push(prize);
        remaining_pot = remaining_pot
            .checked_sub(prize)
            .ok_or(ErrorCode::NumericOverflow)?;
    }

    // Add any remaining dust to first place due to integer division
    if remaining_pot > 0 {
        prizes[0] = prizes[0]
            .checked_add(remaining_pot)
            .ok_or(ErrorCode::NumericOverflow)?;
    }

    Ok(prizes)
}

#[cfg(test)]
mod tests {
    use super::*;
    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
    const MOCK_RENT_EXEMPTION: u64 = 890_880;

    #[test]
    fn test_even_split_distribution() {
        // Test with 100 SOL and 4 winners
        let prizes = calculate_prizes(
            100 * LAMPORTS_PER_SOL + MOCK_RENT_EXEMPTION,
            4,
            true,
            true,
            MOCK_RENT_EXEMPTION,
        )
        .unwrap();

        assert_eq!(prizes.len(), 4);
        assert_eq!(prizes[0], 25 * LAMPORTS_PER_SOL);
        assert_eq!(prizes[1], 25 * LAMPORTS_PER_SOL);
        assert_eq!(prizes[2], 25 * LAMPORTS_PER_SOL);
        assert_eq!(prizes[3], 25 * LAMPORTS_PER_SOL);

        // Verify total equals distributable pot
        let total: u64 = prizes.iter().sum();
        assert_eq!(total, 100 * LAMPORTS_PER_SOL);
    }

    #[test]
    fn test_geometric_distribution() {
        // Test with 100 SOL and 4 winners
        let prizes = calculate_prizes(
            100 * LAMPORTS_PER_SOL + MOCK_RENT_EXEMPTION,
            4,
            false,
            true,
            MOCK_RENT_EXEMPTION,
        )
        .unwrap();

        assert_eq!(prizes.len(), 4);
        // Expected distribution: 50, 25, 12.5, 6.25 (plus dust to first place)
        assert!(prizes[0] > 50 * LAMPORTS_PER_SOL); // Should be slightly more due to dust
        assert_eq!(prizes[1], 25 * LAMPORTS_PER_SOL);
        assert_eq!(prizes[2], 12 * LAMPORTS_PER_SOL + 500_000_000);
        assert_eq!(prizes[3], 6 * LAMPORTS_PER_SOL + 250_000_000);

        // Verify total equals distributable pot
        let total: u64 = prizes.iter().sum();
        assert_eq!(total, 100 * LAMPORTS_PER_SOL);
    }

    #[test]
    fn test_single_winner() {
        // Test even split with single winner
        let prizes =
            calculate_prizes(LAMPORTS_PER_SOL, 1, true, false, MOCK_RENT_EXEMPTION).unwrap();

        assert_eq!(prizes.len(), 1);
        assert_eq!(prizes[0], LAMPORTS_PER_SOL);

        // Test geometric with single winner
        let prizes =
            calculate_prizes(LAMPORTS_PER_SOL, 1, false, false, MOCK_RENT_EXEMPTION).unwrap();

        assert_eq!(prizes.len(), 1);
        assert_eq!(prizes[0], LAMPORTS_PER_SOL);
    }

    #[test]
    fn test_token_distribution() {
        let total_tokens = 1_000_000;

        // Test even split
        let prizes = calculate_prizes(total_tokens, 5, true, false, MOCK_RENT_EXEMPTION).unwrap();

        assert_eq!(prizes.len(), 5);
        assert_eq!(prizes[0], 200_000);
        assert_eq!(prizes.iter().sum::<u64>(), total_tokens);

        // Test geometric
        let prizes = calculate_prizes(total_tokens, 5, false, false, MOCK_RENT_EXEMPTION).unwrap();

        assert_eq!(prizes.len(), 5);
        assert!(prizes[0] >= 500_000); // Should be 500,000 plus dust
        assert_eq!(prizes[1], 250_000);
        assert_eq!(prizes[2], 125_000);
        assert_eq!(prizes[3], 62_500);
        assert_eq!(prizes[4], 31_250);
        assert_eq!(prizes.iter().sum::<u64>(), total_tokens);
    }

    #[test]
    fn test_zero_pot() {
        let prizes = calculate_prizes(
            MOCK_RENT_EXEMPTION, // Only rent exemption
            3,
            false,
            true,
            MOCK_RENT_EXEMPTION,
        )
        .unwrap();

        assert_eq!(prizes.len(), 3);
        assert!(prizes.iter().all(|&x| x == 0));
    }

    #[test]
    fn test_many_winners() {
        let prizes = calculate_prizes(1000, 10, false, false, MOCK_RENT_EXEMPTION).unwrap();

        assert_eq!(prizes.len(), 10);
        // Verify decreasing geometric sequence
        for i in 1..prizes.len() {
            assert!(prizes[i] <= prizes[i - 1]);
        }
        // Verify total equals pot
        assert_eq!(prizes.iter().sum::<u64>(), 1000);
    }

    #[test]
    fn test_error_cases() {
        // Test zero winners
        assert!(calculate_prizes(LAMPORTS_PER_SOL, 0, true, false, MOCK_RENT_EXEMPTION,).is_err());

        // Test overflow scenarios
        let huge_pot = u64::MAX;
        let result = calculate_prizes(huge_pot, 5, true, false, MOCK_RENT_EXEMPTION);
        assert!(result.is_ok()); // Should handle large numbers safely
    }

    #[test]
    fn test_rounding_and_dust() {
        // Test with amount that won't divide evenly
        let prizes = calculate_prizes(1001, 3, false, false, 0).unwrap();

        // First place should get the dust
        assert_eq!(prizes.iter().sum::<u64>(), 1001);
        assert_eq!(prizes.len(), 3);
    }

    #[test]
    fn test_minimum_amounts() {
        // Test with very small pot
        let prizes = calculate_prizes(7, 4, false, false, 0).unwrap();

        assert_eq!(prizes.len(), 4);
        assert!(prizes[0] > 0); // First place should get something
                                // Verify some places get 0 due to small pot
        assert!(prizes.iter().any(|&x| x == 0));
    }
}

// cargo test prize -- --nocapture

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
