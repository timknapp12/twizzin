use crate::state::game::CorrectAnswers;
use hex;
use sha2::{Digest, Sha256};

// cargo test --lib hash_and_salt -- --nocapture

pub fn hash_with_salt(input: &str, salt: String) -> String {
    // Combine the input string and the salt
    let combined = format!("{}{}", input, salt.to_string());
    // Create a Sha256 hasher instance
    let mut hasher = Sha256::new();
    // Feed the combined string into the hasher
    hasher.update(combined);
    // Get the final hash result
    let result = hasher.finalize();
    // Convert the hash to a hexadecimal string
    format!("{:x}", result)
}

pub fn hash_answers(answers: Vec<(u8, String, String)>) -> Vec<CorrectAnswers> {
    answers
        .iter()
        .map(|(display_order, answer, salt)| {
            let hashed = hash_with_salt(answer, salt.clone());
            let mut bytes = [0u8; 32];
            hex::decode_to_slice(&hashed, &mut bytes).expect("Failed to decode hex");
            CorrectAnswers {
                display_order: *display_order,
                answer: bytes,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_with_salt() {
        let input = "a";
        let salt = generate_salt();

        let hashed_value = hash_with_salt(input, salt);
        println!("Hashed value: {}", hashed_value);

        assert!(!hashed_value.is_empty(), "Hash should not be empty");
        assert_eq!(hashed_value.len(), 64, "Hash should be 64 characters long");
    }

    #[test]
    fn test_hash_answers() {
        let answers = vec![
            (1, "a".to_string(), generate_salt()),
            (2, "b".to_string(), generate_salt()),
            (3, "c".to_string(), generate_salt()),
            (4, "d".to_string(), generate_salt()),
        ];

        let hashed_answers = hash_answers(answers.clone());

        assert_eq!(
            hashed_answers.len(),
            answers.len(),
            "Number of hashed answers should match input"
        );

        for (i, correct_answer) in hashed_answers.iter().enumerate() {
            println!(
                "Display order: {}, Hashed answer {}: {:?}",
                correct_answer.display_order,
                i + 1,
                correct_answer.answer
            );
            assert_eq!(
                correct_answer.answer.len(),
                32,
                "Hashed answer should be 32 bytes long"
            );
            assert_eq!(
                correct_answer.display_order, answers[i].0,
                "Display order should match input"
            );
        }

        // Verify that hashing the same answer with the same salt produces the same result
        let (_, first_answer, first_salt) = &answers[0];
        let first_answer_rehashed = hash_with_salt(first_answer, first_salt.clone());
        let mut first_answer_bytes = [0u8; 32];
        hex::decode_to_slice(&first_answer_rehashed, &mut first_answer_bytes)
            .expect("Failed to decode hex");
        assert_eq!(
            hashed_answers[0].answer, first_answer_bytes,
            "Hashing the same answer with the same salt should produce the same result"
        );
    }

    fn generate_salt() -> String {
        use rand::Rng;

        rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(16)
            .map(char::from)
            .collect()
    }
}
