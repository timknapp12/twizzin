use anchor_lang::prelude::*;

#[account]
// GAME ACCOUNT will serve as the escrow
pub struct Game {
    pub admin: Pubkey,
    pub name: String, // set this to 32 as max length
    pub entry_fee: u64,
    pub commission: u16,
    pub bump: u8,
    pub vault_bump: u8,
    pub start_time: u64,
    pub end_time: u64,
    pub players: Vec<PlayerEntry>,
    pub answers: Vec<CorrectAnswers>,
    // pub entries: u32, // this is in Andre's repo - not sure why
}

impl Space for Game {
    const INIT_SPACE: usize = 8 + // discriminator
        32 + // pubkey
        (4 + 32) + // name - 32 is max length and 4 is the length of the string
        2 + // commission
        (1 * 2) + // bumps
        (8 * 3) + // entry_fee, start_time and end_time -> u64 * 2
        (4 * 2); // Vec length (u32) -> 4 * 2
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct PlayerEntry {
    pub player: Pubkey,
    pub num_correct: u8,
    pub player_end_time: u64,
}

impl Space for PlayerEntry {
    const INIT_SPACE: usize = 32 + 1 + 8;
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct CorrectAnswers {
    pub question_id: String,
    pub display_order: u8,
    pub answer: [u8; 32], // SHA256 hash of the correct answer
}

impl Space for CorrectAnswers {
    const INIT_SPACE: usize = 4 + 36 + 1 + 32;
}
