use anchor_lang::prelude::*;

#[error_code]

pub enum ErrorCode {
    #[msg("Submitted before the game start time")]
    BeforeStartTime,
    #[msg("Submitted after the game end time")]
    AfterEndTime,
    #[msg("Player already in game")]
    PlayerAlreadyInGame,
    #[msg("Player not in game")]
    PlayerNotInGame,
    #[msg("Name must be between 1 and 32 characters")]
    NameTooLong,
    #[msg("This does not match the game code")]
    InvalidGameCode,
}
