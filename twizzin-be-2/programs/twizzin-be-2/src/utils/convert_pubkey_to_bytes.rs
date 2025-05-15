use anchor_lang::prelude::Pubkey;
use bs58;
use std::str::FromStr;

pub fn convert_pubkey_to_bytes(pubkey_str: &str) -> Result<[u8; 32], String> {
    match Pubkey::from_str(pubkey_str) {
        Ok(pubkey) => {
            let bytes = pubkey.to_bytes();
            println!("Bytes array for {}: {:?}", pubkey_str, bytes);
            Ok(bytes)
        }
        Err(e) => Err(format!("Failed to convert pubkey: {}", e)),
    }
}

pub fn convert_private_key_to_bytes(private_key_str: &str) -> Result<[u8; 64], String> {
    match bs58::decode(private_key_str).into_vec() {
        Ok(bytes) => {
            if bytes.len() != 64 {
                return Err("Invalid private key length".to_string());
            }
            let mut array = [0u8; 64];
            array.copy_from_slice(&bytes);
            Ok(array)
        }
        Err(e) => Err(format!("Failed to decode private key: {}", e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_convert_pubkey_to_bytes() {
        let test_pubkey = "BKV7zy1Q74pyk3eehMrVQeau9pj2kEp6k36RZwFTFdHk";
        let result = convert_pubkey_to_bytes(test_pubkey).unwrap();
        assert_eq!(result.len(), 32);

        // Verify conversion back to string
        let pubkey_from_bytes = Pubkey::new_from_array(result);
        assert_eq!(&pubkey_from_bytes.to_string(), test_pubkey);
    }

    #[test]
    #[ignore]
    fn test_convert_private_key_to_bytes() {
        let args: Vec<String> = env::args().collect();

        let private_key_str = args
            .get(2)
            .expect("Usage: cargo test test_convert_private_key_to_bytes -- your_private_key_here");

        println!("Private key received: {}", private_key_str);

        let result = convert_private_key_to_bytes(private_key_str).unwrap();
        assert_eq!(result.len(), 64);
        println!("Result array: {:?}", result);

        let encoded = bs58::encode(&result).into_string();
        assert_eq!(&encoded, private_key_str);
    }

    #[test]
    fn test_invalid_pubkey() {
        let result = convert_pubkey_to_bytes("invalid_pubkey");
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_private_key() {
        let result = convert_private_key_to_bytes("invalid_key");
        assert!(result.is_err());
    }
}

// cargo test convert_pubkey_to_bytes -- --nocapture

// cargo test test_convert_private_key_to_bytes -- your_private_key_here --include-ignored --nocapture
