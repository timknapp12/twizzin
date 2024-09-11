use crate::state::game::{Game, PlayerEntry};

// cargo test --lib find_winners -- --nocapture

pub fn find_winners(game: &Game) -> (Vec<PlayerEntry>, Vec<PlayerEntry>) {
    let mut players = game.players.clone();

    // Sort players by score (descending) and then by end_time (ascending)
    players.sort_by(|a, b| {
        b.num_correct
            .cmp(&a.num_correct)
            .then_with(|| a.player_end_time.cmp(&b.player_end_time))
    });

    // Get the highest score
    let highest_score = players.first().map(|p| p.num_correct).unwrap_or(0);

    // Filter players with the highest score
    let winners: Vec<PlayerEntry> = players
        .iter()
        .take_while(|p| p.num_correct == highest_score)
        .take(game.max_winners as usize)
        .cloned()
        .collect();

    (players, winners)
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;

    #[test]
    fn test_find_winners() {
        let game = Game {
            admin: Pubkey::new_unique(),
            name: "Test Game".to_string(),
            entry_fee: 100,
            commission: 5,
            game_code: "ABC123".to_string(),
            bump: 1,
            vault_bump: 1,
            start_time: 0,
            end_time: 100,
            max_winners: 3,
            players: vec![
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 3,
                    player_end_time: 1679000000000i64, // March 17, 2023
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000030000, // 30 seconds later
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000015000, // 15 seconds later
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 4,
                    player_end_time: 1679000010000, // 10 seconds later
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000045000, // 45 seconds later
                },
            ],
            answers: vec![],
        };

        let (sorted_players, winners) = find_winners(&game);

        // Existing assertions for winners
        assert_eq!(winners.len(), 3);
        assert_eq!(winners[0].num_correct, 5);
        assert_eq!(winners[0].player_end_time, 1679000015000);
        assert_eq!(winners[1].num_correct, 5);
        assert_eq!(winners[1].player_end_time, 1679000030000);
        assert_eq!(winners[2].num_correct, 5);
        assert_eq!(winners[2].player_end_time, 1679000045000);

        // Print sorted players
        println!("All players (sorted):");
        for (i, player) in sorted_players.iter().enumerate() {
            println!(
                "  {}. Score: {}, End Time: {}, Player: {}",
                i + 1,
                player.num_correct,
                player.player_end_time,
                player.player
            );
        }

        // Print winners
        println!("\nWinners:");
        for (i, winner) in winners.iter().enumerate() {
            println!(
                "  {}. Score: {}, End Time: {}, Player: {}",
                i + 1,
                winner.num_correct,
                winner.player_end_time,
                winner.player
            );
        }
    }

    #[test]
    fn test_find_clear_winner() {
        let game = Game {
            admin: Pubkey::new_unique(),
            name: "Test Game".to_string(),
            entry_fee: 100,
            commission: 5,
            game_code: "ABC123".to_string(),
            bump: 1,
            vault_bump: 1,
            start_time: 0,
            end_time: 100,
            max_winners: 3,
            players: vec![
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 9,
                    player_end_time: 1679000050000,
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000030000,
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000015000,
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 4,
                    player_end_time: 1679000010000,
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 3,
                    player_end_time: 1679000000000,
                },
            ],
            answers: vec![],
        };

        let (_sorted_players, winners) = find_winners(&game);

        // Assertions
        assert_eq!(winners.len(), 1);
        assert_eq!(winners[0].num_correct, 9);
        assert_eq!(winners[0].player_end_time, 1679000050000);

        // Print sorted players
    }

    #[test]
    fn test_find_winners_with_tie_and_max_winners() {
        let game = Game {
            admin: Pubkey::new_unique(),
            name: "Test Game".to_string(),
            entry_fee: 100,
            commission: 5,
            game_code: "ABC123".to_string(),
            bump: 1,
            vault_bump: 1,
            start_time: 0,
            end_time: 100,
            max_winners: 3,
            players: vec![
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000050000,
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000030000,
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000015000,
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000040000,
                },
                PlayerEntry {
                    player: Pubkey::new_unique(),
                    num_correct: 5,
                    player_end_time: 1679000020000,
                },
            ],
            answers: vec![],
        };

        let (_sorted_players, winners) = find_winners(&game);

        // Assertions
        assert_eq!(winners.len(), 3);
        assert_eq!(winners[0].num_correct, 5);
        assert_eq!(winners[0].player_end_time, 1679000015000);
        assert_eq!(winners[1].num_correct, 5);
        assert_eq!(winners[1].player_end_time, 1679000020000);
        assert_eq!(winners[2].num_correct, 5);
        assert_eq!(winners[2].player_end_time, 1679000030000);
    }
}
