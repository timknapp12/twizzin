use anchor_lang::prelude::*;

#[account]
pub struct PlayerAccount {
    pub game: Pubkey,
    pub player: Pubkey,
    pub join_time: i64,
    pub finished_time: i64,
    pub num_correct: u8,
    pub reward_amount: u64,
    pub claimed: bool,
    pub answer_hash: [u8; 32], // Hash of their answers (set when submitting)
    pub bump: u8,              // PDA bump
}

impl PlayerAccount {
    pub const INIT_SPACE: usize = 8 + // discriminator
        32 +    // game pubkey
        32 +    // player pubkey
        8 +     // join_time
        8 +     // finished_time
        1 +     // num_correct
        8 +     // reward_amount
        1 +     // claimed
        32 +    // answer_hash
        1; // bump
}

#[event]
pub struct PlayerJoined {
    pub game: Pubkey,
    pub player: Pubkey,
    pub join_time: i64,
}
