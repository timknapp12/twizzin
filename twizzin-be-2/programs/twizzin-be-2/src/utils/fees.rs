use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

pub fn calculate_fees(
    total_pot: u64,
    treasury_fee_bps: u16,
    commission_bps: u16,
    rent_exemption: u64,
    is_native: bool,
) -> Result<(u64, u64)> {
    require!(treasury_fee_bps <= 1000, ErrorCode::InvalidBasisPoints);
    require!(commission_bps <= 1000, ErrorCode::InvalidBasisPoints);

    // If total pot is 0 or less than rent exemption (for native), return 0 fees
    if total_pot == 0 || (is_native && total_pot <= rent_exemption) {
        return Ok((0, 0));
    }

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
            .checked_mul(commission_bps as u128)
            .ok_or(ErrorCode::NumericOverflow)?
            .checked_div(10000)
            .ok_or(ErrorCode::NumericOverflow)? as u64
    } else {
        0
    };

    Ok((treasury_fee, admin_commission))
}

#[cfg(test)]
mod tests {
    use super::*;

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
    const MOCK_RENT_EXEMPTION: u64 = 890_880;

    #[test]
    fn test_basic_fee_calculations() {
        // Test with 100 SOL, 5% treasury fee (500 bps), 2% commission (200 bps)
        let (treasury_fee, admin_commission) = calculate_fees(
            100 * LAMPORTS_PER_SOL + MOCK_RENT_EXEMPTION,
            500,
            200,
            MOCK_RENT_EXEMPTION,
            true,
        )
        .unwrap();

        assert_eq!(treasury_fee, 5 * LAMPORTS_PER_SOL); // 5% of 100 SOL
        assert_eq!(admin_commission, 2 * LAMPORTS_PER_SOL); // 2% of 100 SOL

        // Test with token amount (no rent exemption)
        let (treasury_fee, admin_commission) = calculate_fees(
            1000_000, // 1M tokens
            500,      // 5%
            200,      // 2%
            MOCK_RENT_EXEMPTION,
            false,
        )
        .unwrap();

        assert_eq!(treasury_fee, 50_000); // 5% of 1M
        assert_eq!(admin_commission, 20_000); // 2% of 1M
    }

    #[test]
    fn test_edge_cases() {
        // Test with 0 pot
        let (treasury_fee, admin_commission) =
            calculate_fees(0, 500, 200, MOCK_RENT_EXEMPTION, true).unwrap();

        assert_eq!(treasury_fee, 0);
        assert_eq!(admin_commission, 0);

        // Test with max allowed bps - using 10,000 as test amount to make calculations cleaner
        let (treasury_fee, admin_commission) = calculate_fees(
            10_000, // Using 10,000 for cleaner math
            1000,   // 10%
            500,    // 5%
            0, false,
        )
        .unwrap();

        assert_eq!(treasury_fee, 1_000); // 10% of 10,000
        assert_eq!(admin_commission, 500); // 5% of 10,000
    }

    #[test]
    fn test_bps_validation() {
        // Test treasury fee bps > 1000
        assert!(calculate_fees(LAMPORTS_PER_SOL, 1001, 500, 0, false,).is_err());

        // Test commission bps > 1000
        assert!(calculate_fees(LAMPORTS_PER_SOL, 500, 1001, 0, false,).is_err());
    }

    #[test]
    fn test_rent_exemption() {
        // Test native SOL with rent exemption
        let (treasury_fee, admin_commission) = calculate_fees(
            LAMPORTS_PER_SOL + MOCK_RENT_EXEMPTION,
            500, // 5%
            200, // 2%
            MOCK_RENT_EXEMPTION,
            true,
        )
        .unwrap();

        assert_eq!(treasury_fee, LAMPORTS_PER_SOL / 20); // 5% of 1 SOL
        assert_eq!(admin_commission, LAMPORTS_PER_SOL / 50); // 2% of 1 SOL

        // Test token without rent exemption effect
        let (token_treasury_fee, token_admin_commission) = calculate_fees(
            LAMPORTS_PER_SOL + MOCK_RENT_EXEMPTION,
            500, // 5%
            200, // 2%
            MOCK_RENT_EXEMPTION,
            false,
        )
        .unwrap();

        // Should be higher than SOL fees because no rent exemption subtracted
        assert!(token_treasury_fee > treasury_fee);
        assert!(token_admin_commission > admin_commission);
    }

    #[test]
    fn test_rounding_behavior() {
        // Test with amount that won't divide evenly
        let (treasury_fee, admin_commission) = calculate_fees(
            1_000_003, // Odd number
            500,       // 5%
            200,       // 2%
            0, false,
        )
        .unwrap();

        // Check rounding is handled correctly (floor division)
        assert_eq!(treasury_fee, 50_000);
        assert_eq!(admin_commission, 20_000);
    }

    #[test]
    fn test_minimum_amounts() {
        // Test with 1 lamport (should round to 0 fees)
        let (treasury_fee, admin_commission) = calculate_fees(
            1, 500, // 5%
            200, // 2%
            0, false,
        )
        .unwrap();

        assert_eq!(treasury_fee, 0);
        assert_eq!(admin_commission, 0);
    }
}

// cargo test fees -- --nocapture
