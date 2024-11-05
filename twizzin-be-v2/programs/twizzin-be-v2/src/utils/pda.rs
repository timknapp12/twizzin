use crate::constants::seeds::*;
use anchor_lang::prelude::*;

pub fn get_config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[CONFIG_SEED], program_id)
}

pub fn get_game_pda(admin: &Pubkey, game_code: &str, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[GAME_SEED, admin.as_ref(), game_code.as_bytes()],
        program_id,
    )
}

pub fn get_player_pda(game: &Pubkey, player: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[PLAYER_SEED, game.as_ref(), player.as_ref()], program_id)
}
