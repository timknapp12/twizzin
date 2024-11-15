use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::errors::ErrorCode;
use crate::state::{Game, PlayerAccount};

#[derive(Accounts)]
pub struct Claim<'info> {
   #[account(mut)]
   pub player: Signer<'info>,

   #[account(
       mut,
       seeds = [b"game", game.admin.as_ref(), game.game_code.as_bytes()],
       bump = game.bump
   )]
   pub game: Account<'info, Game>,

   #[account(
       mut,
       seeds = [
           b"player", 
           game.key().as_ref(),
           player.key().as_ref()
       ],
       bump = player_account.bump,
       constraint = player_account.player == player.key() @ ErrorCode::InvalidPlayer,
       close = player
   )]
   pub player_account: Account<'info, PlayerAccount>,

   /// CHECK: Vault PDA that holds the funds
   #[account(
       mut,
       seeds = [b"vault", game.admin.as_ref(), game.game_code.as_bytes()],
       bump = game.vault_bump,
   )]
   pub vault: UncheckedAccount<'info>,

   #[account(
       mut,
       associated_token::mint = game.token_mint,
       associated_token::authority = vault
   )]
   pub vault_token_account: Option<Account<'info, TokenAccount>>,

   #[account(
       mut,
       constraint = !game.is_native @ ErrorCode::InvalidTokenAccount,
       constraint = player_token_account.owner == player.key() @ ErrorCode::InvalidTokenAccount,
       constraint = player_token_account.mint == game.token_mint @ ErrorCode::InvalidTokenAccount 
   )]
   pub player_token_account: Option<Account<'info, TokenAccount>>,

   pub token_program: Program<'info, Token>,
   pub system_program: Program<'info, System>,
}

impl<'info> Claim<'info> {
   pub fn claim(&mut self, prize_amount: u64) -> Result<()> {
       // Verify game has ended
       let current_time = Clock::get()?.unix_timestamp;
       require!(current_time >= self.game.end_time, ErrorCode::GameNotEnded);

       // Transfer prize
       if prize_amount > 0 {
           let vault_bump = self.game.vault_bump;
           let seeds = &[
               b"vault",
               self.game.admin.as_ref(), 
               self.game.game_code.as_bytes(),
               &[vault_bump],
           ];
           let signer = &[&seeds[..]];

           if self.game.is_native {
               let transfer_ix = anchor_lang::system_program::Transfer {
                   from: self.vault.to_account_info(),
                   to: self.player.to_account_info(),
               };
               let transfer_ctx = CpiContext::new_with_signer(
                   self.system_program.to_account_info(),
                   transfer_ix,
                   signer,
               );
               anchor_lang::system_program::transfer(transfer_ctx, prize_amount)?;
           } else {
               let transfer_ctx = CpiContext::new_with_signer(
                   self.token_program.to_account_info(),
                   anchor_spl::token::Transfer {
                       from: self.vault_token_account.as_ref()
                           .ok_or(ErrorCode::VaultTokenAccountNotProvided)?.to_account_info(),
                       to: self.player_token_account.as_ref()
                           .ok_or(ErrorCode::PlayerTokenAccountNotProvided)?.to_account_info(),
                       authority: self.vault.to_account_info(),
                   },
                   signer,
               );
               anchor_spl::token::transfer(transfer_ctx, prize_amount)?;
           }
       }

       Ok(())
   }
}