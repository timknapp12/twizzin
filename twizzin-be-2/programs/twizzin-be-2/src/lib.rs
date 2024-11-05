use anchor_lang::prelude::*;

declare_id!("FmRELAAURvtc5rn3pt3d8ZfogACZT2m1N3gkhCs2R9qV");

pub mod contexts;
pub use contexts::*;

pub mod state;
pub use state::*;

#[program]
pub mod twizzin_be_2 {
    use super::*;

    pub fn init_config(ctx: Context<InitConfig>, treasury_pubkey: Pubkey) -> Result<()> {
        ctx.accounts.init_config(treasury_pubkey)
    }
}
