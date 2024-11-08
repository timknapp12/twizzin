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
}