use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Invalid fee")]
    InvalidFee,
    #[msg("Treasury fee too high - can't be more than 10%")]
    TreasuryFeeTooHigh,
    #[msg("Treasury address is blank")]
    TreasuryAddressBlank,
    #[msg("Authority address is blank")]
    AuthorityAddressBlank,
    #[msg("Name has to be between 1 and 32 characters")]
    NameTooLong,
    #[msg("Game code has to be between 1 and 6 characters")]
    GameCodeTooLong,
    #[msg("Max winners must be at least 1")]
    MaxWinnersTooLow,
    #[msg("Start time is greater than end time")]
    InvalidTimeRange,
    #[msg("Token mint is required")]
    TokenMintRequired,
    #[msg("Vault is required")]
    VaultRequired,
    #[msg("Admin token account not provided")]
    AdminTokenAccountNotProvided,
    #[msg("Invalid vault account provided")]
    InvalidVaultAccount,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Game has ended")]
    GameEnded,
    #[msg("Player token account not provided")]
    PlayerTokenAccountNotProvided,
    #[msg("Player count overflow")]
    PlayerCountOverflow,
    #[msg("Invalid player")]
    InvalidPlayer,
    #[msg("Invalid game")]
    InvalidGame,
    #[msg("Already submitted")]
    AlreadySubmitted,
    #[msg("Game not started")]
    GameNotStarted,
    #[msg("Invalid finish time")]
    InvalidFinishTime,
    #[msg("Invalid admin")]
    InvalidAdmin,
    #[msg("Numeric overflow")]
    NumericOverflow,
    #[msg("Vault token account not provided")]
    VaultTokenAccountNotProvided,
    #[msg("Treasury token account not provided")]
    TreasuryTokenAccountNotProvided,
    #[msg("Invalid treasury")]
    InvalidTreasury,
    #[msg("Game not ended")]
    GameNotEnded,
}
