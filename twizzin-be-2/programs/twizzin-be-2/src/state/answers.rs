use anchor_lang::prelude::*;
// Input structure for a single answer
#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct AnswerInput {
    pub display_order: u8,
    pub answer: String,       // The player's guess ('a', 'b', 'c'
    pub question_id: String,  // The GUID that serves as the salt
    pub proof: Vec<[u8; 32]>, // Merkle proof for this answer
}

#[event]
pub struct AnswersSubmitted {
    pub game: Pubkey,
    pub player: Pubkey,
    pub num_correct: u8,
    pub finished_time: i64,
}
