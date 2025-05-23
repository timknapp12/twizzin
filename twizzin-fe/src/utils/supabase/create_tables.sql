-- -- Enable UUID generation
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -- Function to generate random 6-char game codes
-- CREATE OR REPLACE FUNCTION generate_game_code() 
-- RETURNS TEXT AS $$
-- DECLARE
--     chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding similar looking chars like I,1,0,O
--     result TEXT := '';
--     i INTEGER := 0;
--     success BOOLEAN := false;
--     max_attempts INTEGER := 10;
-- BEGIN
--     WHILE i < max_attempts AND NOT success LOOP
--         -- Generate a 6-char code
--         result := '';
--         FOR j IN 1..6 LOOP
--             result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
--         END LOOP;
        
--         -- Check if it exists
--         IF NOT EXISTS (SELECT 1 FROM games WHERE game_code = result) THEN
--             success := true;
--         END IF;
        
--         i := i + 1;
--     END LOOP;
    
--     IF NOT success THEN
--         RAISE EXCEPTION 'Could not generate unique game code after % attempts', max_attempts;
--     END IF;
    
--     RETURN result;
-- END;
-- $$ LANGUAGE plpgsql VOLATILE;

-- -- Players table
-- CREATE TABLE players (
--     wallet_address TEXT PRIMARY KEY,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     total_xp INTEGER DEFAULT 0,
--     username TEXT,
--     profile_image_url TEXT
-- );

-- CREATE TYPE game_status AS ENUM ('not_started', 'active', 'ended');

-- -- Games table
-- CREATE TABLE games (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     game_pubkey TEXT NOT NULL,
--     admin_wallet TEXT NOT NULL REFERENCES players(wallet_address),
--     name TEXT NOT NULL,
--     game_code TEXT NOT NULL UNIQUE DEFAULT generate_game_code(),
--     token_mint TEXT,
--     entry_fee NUMERIC,
--     commission_bps INTEGER,
--     start_time TIMESTAMPTZ,
--     end_time TIMESTAMPTZ,
--     max_winners INTEGER,
--     donation_amount NUMERIC DEFAULT 0,
--     is_native BOOLEAN DEFAULT true,
--     all_are_winners BOOLEAN DEFAULT false,
--     even_split BOOLEAN DEFAULT false,
--     answer_merkle_root TEXT,
--     img_url TEXT,
--     status game_status DEFAULT 'not_started',
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Questions table
-- CREATE TABLE questions (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
--     question_text TEXT NOT NULL,
--     display_order INTEGER NOT NULL,
--     correct_answer TEXT NOT NULL,
--     time_limit INTEGER NOT NULL DEFAULT 30,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Answers table
-- CREATE TABLE answers (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
--     answer_text TEXT NOT NULL,
--     display_letter TEXT NOT NULL,
--     display_order INTEGER NOT NULL,
--     is_correct BOOLEAN NOT NULL DEFAULT false,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Player Games table
-- CREATE TABLE player_games (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     player_wallet TEXT NOT NULL REFERENCES players(wallet_address),
--     game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
--     join_time TIMESTAMPTZ,
--     finished_time TIMESTAMPTZ,
--     num_correct INTEGER DEFAULT 0,
--     answer_hash TEXT,
--     rewards_earned NUMERIC DEFAULT 0,
--     rewards_claimed BOOLEAN DEFAULT false,
--     xp_earned INTEGER DEFAULT 0,
--     final_rank INTEGER,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     UNIQUE(player_wallet, game_id),
--     solana_signature TEXT,
--     claimed_signature TEXT,
--     is_admin BOOLEAN DEFAULT false
-- );

-- -- Player Answers table
-- CREATE TABLE player_answers (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     player_game_id UUID NOT NULL REFERENCES player_games(id) ON DELETE CASCADE,
--     question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
--     selected_answer TEXT,
--     answered_at TIMESTAMPTZ DEFAULT NOW(),
--     is_correct BOOLEAN,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     UNIQUE(player_game_id, question_id)
-- );

-- -- Tokens table
-- CREATE TABLE tokens (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     mint_address TEXT NOT NULL UNIQUE,
--     ticker TEXT NOT NULL,
--     name TEXT NOT NULL,
--     decimals INTEGER NOT NULL,
--     logo_url TEXT,
--     is_native BOOLEAN DEFAULT false,
--     is_enabled BOOLEAN DEFAULT true,
--     coingecko_id TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- -- Create indexes for common queries
-- CREATE INDEX idx_games_game_code ON games(game_code);
-- CREATE INDEX idx_games_admin_wallet ON games(admin_wallet);
-- CREATE INDEX idx_player_games_player_wallet ON player_games(player_wallet);
-- CREATE INDEX idx_player_games_game_id ON player_games(game_id);
-- CREATE INDEX idx_questions_game_id ON questions(game_id);
-- CREATE INDEX idx_answers_question_id ON answers(question_id);
-- CREATE INDEX idx_player_answers_player_game_id ON player_answers(player_game_id);
-- CREATE INDEX idx_tokens_mint_address ON tokens(mint_address);

-- -- Add initial SOL token
-- INSERT INTO tokens (
--     mint_address,
--     ticker,
--     name,
--     decimals,
--     is_native,
--     is_enabled,
--     coingecko_id
-- ) VALUES (
--     'So11111111111111111111111111111111111111112',  -- Native SOL wrapped address
--     'SOL',
--     'Solana',
--     9,
--     true,
--     true,
--     'solana'
-- );

-- -- IMAGES - storage bucket
-- -- First, check if the bucket exists and create it if it doesn't
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('game-images', 'game-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- -- Allow public access for both upload and download
-- CREATE POLICY "Allow public access to game-images"
-- ON storage.objects FOR ALL
-- USING ( bucket_id = 'game-images' )

-- WITH CHECK ( bucket_id = 'game-images' );
-- CREATE POLICY "Allow public read access for game-images" 
-- ON storage.objects 
-- FOR SELECT 
-- TO public 
-- USING (bucket_id = 'game-images');

-- -- First, check if the bucket exists and create it if it doesn't
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('token-images', 'token-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- -- Allow public access for both upload and download
-- CREATE POLICY "Allow public access to token-images"
-- ON storage.objects FOR ALL
-- USING ( bucket_id = 'token-images' )
-- WITH CHECK ( bucket_id = 'token-images' );

-- CREATE POLICY "Allow public read access for token-images" 
-- ON storage.objects 
-- FOR SELECT 
-- TO public 
-- USING (bucket_id = 'token-images');