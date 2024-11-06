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
}
