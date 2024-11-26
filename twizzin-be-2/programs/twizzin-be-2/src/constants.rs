use anchor_lang::prelude::*;

pub const SOL_ADDRESS: &str = "So11111111111111111111111111111111111111112";

// BKV7zy1Q74pyk3eehMrVQeau9pj2kEp6k36RZwFTFdHk (devnet)
pub const DEVNET_WALLET_BYTES: [u8; 32] = [
    153, 81, 30, 183, 10, 130, 241, 205, 12, 135, 205, 77, 182, 252, 154, 212, 199, 199, 39, 136,
    111, 233, 50, 140, 18, 38, 132, 227, 151, 217, 88, 235,
];

pub const MAINNET_WALLET_BYTES: [u8; 32] = [
    // TODO: Replace with mainnet wallet
    153, 81, 30, 183, 10, 130, 241, 205, 12, 135, 205, 77, 182, 252, 154, 212, 199, 199, 39, 136,
    111, 233, 50, 140, 18, 38, 132, 227, 151, 217, 88, 235,
];

#[cfg(feature = "devnet")]
pub const PROGRAM_AUTHORITY: Pubkey = Pubkey::new_from_array(DEVNET_WALLET_BYTES);

#[cfg(not(feature = "devnet"))]
pub const PROGRAM_AUTHORITY: Pubkey = Pubkey::new_from_array(MAINNET_WALLET_BYTES);
