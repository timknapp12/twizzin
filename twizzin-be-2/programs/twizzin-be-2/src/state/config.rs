use anchor_lang::prelude::*;

#[account]
pub struct ProgramConfig {
    pub treasury_pubkey: Pubkey,
    pub authority_pubkey: Pubkey,
    pub treasury_fee: u16,
}

impl Space for ProgramConfig {
    const INIT_SPACE: usize = 8 + 32 + 32 + 2;
}
