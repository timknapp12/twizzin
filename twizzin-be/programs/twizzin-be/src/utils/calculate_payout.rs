// cargo test --lib calculate_payout

pub fn calculate_payout(pool: u64, commission_percent: u8, winners: u8) -> (u64, u64, u64) {
    let founders_fee = pool / 100; // 1% of pool
    let commission_amount = (pool as f64 * (commission_percent as f64 / 100.0)).floor() as u64;
    let total_payout = pool
        .saturating_sub(commission_amount)
        .saturating_sub(founders_fee);
    let payout_per_winner = total_payout / winners as u64;
    (founders_fee, commission_amount, payout_per_winner)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_payout_basic() {
        let (founders_fee, commission_amount, payout_per_winner) =
            calculate_payout(1_000_000, 10, 2);
        assert_eq!(founders_fee, 10_000);
        assert_eq!(commission_amount, 100_000);
        assert_eq!(payout_per_winner, 445_000);
    }

    #[test]
    fn test_calculate_payout_no_commission() {
        let (founders_fee, commission_amount, payout_per_winner) =
            calculate_payout(1_000_000, 0, 1);
        assert_eq!(founders_fee, 10_000);
        assert_eq!(commission_amount, 0);
        assert_eq!(payout_per_winner, 990_000);
    }

    #[test]
    fn test_calculate_payout_high_commission() {
        let (founders_fee, commission_amount, payout_per_winner) =
            calculate_payout(1_000_000, 50, 5);
        assert_eq!(founders_fee, 10_000);
        assert_eq!(commission_amount, 500_000);
        assert_eq!(payout_per_winner, 98_000);
    }

    #[test]
    fn test_calculate_payout_many_winners() {
        let (founders_fee, commission_amount, payout_per_winner) =
            calculate_payout(1_000_000, 10, 100);
        assert_eq!(founders_fee, 10_000);
        assert_eq!(commission_amount, 100_000);
        assert_eq!(payout_per_winner, 8_900);
    }

    #[test]
    fn test_calculate_payout_small_pool() {
        let (founders_fee, commission_amount, payout_per_winner) = calculate_payout(100, 10, 2);
        assert_eq!(founders_fee, 1);
        assert_eq!(commission_amount, 10);
        assert_eq!(payout_per_winner, 44);
    }
}
