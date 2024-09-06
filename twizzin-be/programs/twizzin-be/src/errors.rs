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
    PlayerNotFound,
    #[msg("Name must be between 1 and 32 characters")]
    NameTooLong,
    #[msg("This does not match the game code")]
    InvalidGameCode,
    #[msg("Not admin")]
    NotAdmin,
    #[msg("Game not started")]
    GameNotStarted,
    #[msg("Game ended")]
    GameEnded,
    #[msg("Player already submitted")]
    PlayerAlreadySubmitted,
    #[msg("Invalid admin")]
    InvalidAdmin,
    #[msg("Max winners must be between 1 and 10")]
    MaxWinnersTooHigh,
    #[msg("Invalid end time")]
    InvalidEndTime,
    #[msg("Overflow")]
    Overflow,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid treasury")]
    InvalidTreasury,
    #[msg("Invalid winner")]
    InvalidWinner,
    #[msg("No recent blockhash")]
    NoRecentBlockhash,
    #[msg("Invalid slot hashes")]
    InvalidSlotHashes,
    #[msg("No recent slot hash")]
    NoRecentSlotHash,
}
