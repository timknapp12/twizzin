use anchor_lang::prelude::*;

#[account]
pub struct ProgramConfig {
    pub treasury_pubkey: Pubkey,
}

impl Space for ProgramConfig {
    const INIT_SPACE: usize = 8 + 32;
}
