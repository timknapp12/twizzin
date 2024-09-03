use crate::state::game::{AnswerInput, CorrectAnswers};
use sha2::{Digest, Sha256};

// cargo test --lib hash -- --nocapture

pub fn hash_with_salt(input: &str, salt: &str) -> [u8; 32] {
    let combined = format!("{}{}", input, salt);
    let mut hasher = Sha256::new();
    hasher.update(combined.as_bytes());
    hasher.finalize().into()
}

pub fn hash_answers(answers: Vec<AnswerInput>) -> Vec<CorrectAnswers> {
    answers
        .into_iter()
        .map(|answer| {
            let hashed = hash_with_salt(&answer.answer, &answer.salt);
            CorrectAnswers {
                display_order: answer.display_order,
                answer: hashed,
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
        let salt = "testsalt";

        let hashed_value = hash_with_salt(input, salt);
        println!("Hashed value: {:?}", hashed_value);

        assert_eq!(hashed_value.len(), 32, "Hash should be 32 bytes long");
    }

    #[test]
    fn test_hash_answers() {
        let answers = vec![
            AnswerInput {
                display_order: 1,
                answer: "a".to_string(),
                salt: "salt1".to_string(),
            },
            AnswerInput {
                display_order: 2,
                answer: "b".to_string(),
                salt: "salt2".to_string(),
            },
            AnswerInput {
                display_order: 3,
                answer: "c".to_string(),
                salt: "salt3".to_string(),
            },
            AnswerInput {
                display_order: 4,
                answer: "d".to_string(),
                salt: "salt4".to_string(),
            },
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
                correct_answer.display_order, answers[i].display_order,
                "Display order should match input"
            );
        }

        // Verify that hashing the same answer with the same salt produces the same result
        let first_answer = &answers[0];
        let first_answer_rehashed = hash_with_salt(&first_answer.answer, &first_answer.salt);
        assert_eq!(
            hashed_answers[0].answer, first_answer_rehashed,
            "Hashing the same answer with the same salt should produce the same result"
        );
    }
}
