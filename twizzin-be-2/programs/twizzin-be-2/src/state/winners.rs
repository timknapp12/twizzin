use anchor_lang::prelude::*;
#[account]
pub struct Winners {
    pub game: Pubkey,             // Game this winners account belongs to
    pub num_winners: u8,          // Actual number of winners
    pub winners: Vec<WinnerInfo>, // Vector of winners and their info
    pub bump: u8,                 // PDA bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct WinnerInfo {
    pub player: Pubkey,    // Winner's wallet
    pub rank: u8,          // Position (1-based ranking)
    pub prize_amount: u64, // Amount they can claim
    pub claimed: bool,     // Whether they've claimed their prize
}

impl Winners {
    pub const INIT_SPACE: usize = 8 +     // discriminator
        32 +                              // game pubkey
        1 +                              // num_winners
        1 +                              // bump
        4 +                              // vec len
        (32 + 1 + 8 + 1) * 255; // max possible winners (pub key + rank + amount + claimed)
}

#[event]
pub struct WinnersDeclared {
    pub game: Pubkey,
    pub num_winners: u8,
    pub total_prize_pool: u64,
}
