use anchor_lang::prelude::*;

#[account]
pub struct PlayerAccount {
    pub game: Pubkey,
    pub player: Pubkey,
    pub join_time: i64,
    pub finished_time: i64,
    pub num_correct: u8,
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
        32 +    // answer_hash
        1; // bump
}

#[event]
pub struct PlayerJoined {
    pub game: Pubkey,
    pub player: Pubkey,
    pub join_time: i64,
}
