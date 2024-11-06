use anchor_lang::prelude::*;

declare_id!("35V3AqBVBuUVczUxULiZ7eoXbCwVZcNZAN4otDeD4K2F");

pub mod errors;
pub use errors::ErrorCode;

pub mod contexts;
pub use contexts::*;

pub mod state;
pub use state::*;

#[program]
pub mod twizzin_be_2 {
    use super::*;

    pub fn init_config(
        ctx: Context<InitConfig>,
        treasury_pubkey: Pubkey,
        authority_pubkey: Pubkey,
        treasury_fee: u16,
    ) -> Result<()> {
        ctx.accounts
            .init_config(treasury_pubkey, authority_pubkey, treasury_fee)
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_treasury: Option<Pubkey>,
        new_treasury_fee: Option<u16>,
    ) -> Result<()> {
        ctx.accounts.update_config(new_treasury, new_treasury_fee)
    }
}
