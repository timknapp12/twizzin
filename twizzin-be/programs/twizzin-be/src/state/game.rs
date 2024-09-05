use anchor_lang::prelude::*;

#[account]
// GAME ACCOUNT will serve as the escrow
pub struct Game {
    pub admin: Pubkey,
    pub name: String, // set this to 32 as max length
    pub entry_fee: u64,
    pub commission: u8,    // percentage of the pool
    pub game_code: String, // 6 char max
    pub bump: u8,
    pub vault_bump: u8,
    pub start_time: i64,
    pub end_time: i64,
    pub max_winners: u8,
    pub players: Vec<PlayerEntry>, // size of vector will dynamically be figured in add_player context
    pub answers: Vec<CorrectAnswers>, // size of vector will dynamically be figured in add_question context
}

impl Game {
    pub const INIT_SPACE: usize = 8 + // discriminator
        32 + // pubkey
        (4 + 32) + // name (4 for length, 32 for max string length)
        8 + // entry_fee
        1 + // commission
        (4 + 6) + // game_code (4 for length, 6 for max string length)
        1 + // bump
        1 + // vault_bump
        8 + // start_time
        8 + // end_time
        1 + // max_winners
        4 + // players vector length (just the length field, not the contents)
        4; // answers vector length (just the length field, not the contents)
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct PlayerEntry {
    pub player: Pubkey,
    pub num_correct: u8,
    pub player_end_time: i64,
}

impl Space for PlayerEntry {
    const INIT_SPACE: usize = 32 + 1 + 8;
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct CorrectAnswers {
    pub display_order: u8,
    pub answer: [u8; 32], // SHA256 hash of the correct answer
}

impl Space for CorrectAnswers {
    const INIT_SPACE: usize = 1 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AnswerInput {
    pub display_order: u8,
    pub answer: String, // a, b, c, d
    pub salt: String,   // question_id
}
