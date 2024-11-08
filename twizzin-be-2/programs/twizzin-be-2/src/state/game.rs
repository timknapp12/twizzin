use anchor_lang::prelude::*;

// Constants for space calculation
pub const MAX_NAME_LENGTH: usize = 32;
pub const MAX_GAME_CODE_LENGTH: usize = 16;

#[account]
pub struct Game {
    pub admin: Pubkey,
    pub name: String,
    pub game_code: String,
    pub token_mint: Pubkey,
    pub entry_fee: u64,
    pub commission: u8,
    pub bump: u8,
    pub vault_bump: u8,
    pub start_time: i64,
    pub end_time: i64,
    pub max_winners: u8,
    pub total_players: u32,
    pub answer_hash: [u8; 32], // Single merkle root of all answers
}

impl Space for Game {
    const INIT_SPACE: usize = 8 +  // discriminator
        32 +                       // admin pubkey
        4 + MAX_NAME_LENGTH +      // name string
        4 + MAX_GAME_CODE_LENGTH + // game code string
        32 +                       // token mint
        8 +                        // entry fee
        1 +                        // commission
        1 +                        // bump
        1 +                        // vault bump
        8 +                        // start time
        8 +                        // end time
        1 +                        // max winners
        4 +                        // total players
        32; // answer hash (merkle root)
}

// For processing inputs when creating the game
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AnswerInput {
    pub display_order: u8,
    pub answer: String, // a, b, c, d
    pub salt: String,   // question_id
}

// For verifying answers during gameplay
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct AnswerProof {
    pub display_order: u8,
    pub answer: String,
    pub proof: Vec<[u8; 32]>, // Merkle proof for this answer
}

#[event]
pub struct GameCreated {
    pub admin: Pubkey,
    pub game: Pubkey,
    pub name: String,
    pub game_code: String,
    pub entry_fee: u64,
    pub start_time: i64,
    pub end_time: i64,
}

#[event]
pub struct GameUpdated {
    pub admin: Pubkey,
    pub game: Pubkey,
    pub name: String,
    pub entry_fee: u64,
    pub start_time: i64,
    pub end_time: i64,
}
