use anchor_lang::prelude::*;

pub const MAX_NAME_LENGTH: usize = 32;
pub const MAX_GAME_CODE_LENGTH: usize = 16;

#[account]
pub struct Game {
    pub admin: Pubkey,
    pub name: String,
    pub game_code: String,
    pub token_mint: Pubkey,
    pub entry_fee: u64,
    pub commission: u16, // basis points (bps)
    pub bump: u8,
    pub vault_bump: u8,
    pub start_time: i64,
    pub end_time: i64,
    pub max_winners: u8,
    pub total_players: u32,
    pub answer_hash: [u8; 32], // Single merkle root of all answers
    pub donation_amount: u64,
    pub is_native: bool,
    pub all_are_winners: bool,
    pub even_split: bool,
}

impl Space for Game {
    const INIT_SPACE: usize = 8 +  // discriminator
        32 +                       // admin pubkey
        4 + MAX_NAME_LENGTH +      // name string
        4 + MAX_GAME_CODE_LENGTH + // game code string
        32 +                       // token mint
        8 +                        // entry fee
        2 +                        // commission
        1 +                        // bump
        1 +                        // vault bump
        8 +                        // start time
        8 +                        // end time
        1 +                        // max winners
        4 +                        // total players
        32 +                       // answer hash (merkle root)
        8 +                        // donation_amount
        1 +                        // is_native
        1 +                        // all_are_winners
        1; // even_split
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

#[event]
pub struct GameStarted {
    pub admin: Pubkey,
    pub game: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
}

#[event]
pub struct GameEnded {
    pub game: Pubkey,
    pub total_pot: u64,
    pub treasury_fee: u64,
    pub admin_commission: u64,
    pub end_time: i64,
}

#[event]
pub struct GameClosed {
    pub game: Pubkey,
    pub admin: Pubkey,
    pub recovered_lamports: u64,
}
