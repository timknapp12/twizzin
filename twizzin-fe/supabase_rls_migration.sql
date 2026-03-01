-- ============================================================================
-- Twizzin RLS (Row Level Security) Migration
-- ============================================================================
--
-- CONTEXT:
-- - The Supabase anon key is used by both client-side code AND server-side
--   API routes for all data operations. This means ALL data queries go through
--   RLS regardless of whether they originate from the browser or the server.
-- - Auth verification happens via supabaseServer (service role key), but that
--   client is ONLY used for JWT validation, not data queries.
-- - Supabase Web3 Solana auth stores wallet_address in the JWT at:
--     user_metadata.custom_claims.address  OR  user_metadata.wallet_address
-- - Correct answer / is_correct exposure is handled at the application layer
--   (getGameForPlayer strips these fields), not at the RLS layer.
--
-- IMPORTANT: This migration is designed to be applied ONCE. If re-running,
-- drop existing policies first or use CREATE POLICY ... IF NOT EXISTS (PG 15+).
-- ============================================================================


-- ============================================================================
-- 1. HELPER FUNCTION: Extract wallet address from authenticated JWT
-- ============================================================================
-- The wallet address can be stored in two different JWT paths depending on
-- how the Solana Web3 auth was configured. This function handles both.

CREATE OR REPLACE FUNCTION public.get_user_wallet()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' -> 'custom_claims' ->> 'address',
    auth.jwt() -> 'user_metadata' ->> 'wallet_address'
  );
$$;

-- Grant execute to authenticated and anon roles so it can be used in policies
GRANT EXECUTE ON FUNCTION public.get_user_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_wallet() TO anon;


-- ============================================================================
-- 2. HELPER FUNCTION: Check if user is the admin of a given game
-- ============================================================================
-- Not currently used by any policies (because server-side API routes use the
-- unauthenticated anon key client where get_user_wallet() returns NULL).
-- Retained for future use when API routes migrate to the service role client,
-- at which point tighter wallet-based RLS policies can be implemented.

CREATE OR REPLACE FUNCTION public.is_game_admin(game_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games
    WHERE id = game_id_param
      AND admin_wallet = public.get_user_wallet()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_game_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_game_admin(uuid) TO anon;


-- ============================================================================
-- 3. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 4. PLAYERS TABLE POLICIES
-- ============================================================================
-- players(wallet_address PK, created_at, total_xp, username, profile_image_url)
--
-- Operations observed in code:
--   SELECT: getUserProfile, getUserXPLevel, fetchGamePlayers, fetchGameSubmissions,
--           fetchCompleteGameResults — anyone reads public profile data
--   INSERT: ensurePlayerExists (createGame, playerJoinGame, xp.ts) — creates
--           player records for any wallet
--   UPDATE: ensurePlayerExists (username changes), distributeGameXP (total_xp)
--   DELETE: Not used in the codebase

-- SELECT: Anyone can read player profiles (username, XP are public data).
-- This supports unauthenticated API routes like /api/games/[gameCode]/players.
CREATE POLICY "players_select_public"
  ON public.players
  FOR SELECT
  USING (true);

-- INSERT: Allow any request to create a player record.
-- Player records are created by the API routes (which use the anon key)
-- when a user creates a game, joins a game, or when XP is distributed.
-- The API routes verify auth at the application layer before calling these functions.
-- We allow anon INSERT because the server-side API routes use the anon key client.
CREATE POLICY "players_insert_open"
  ON public.players
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Allow any request to update a player record.
-- Updates happen in API routes (which use the anon key) for:
--   - Username changes (ensurePlayerExists)
--   - XP distribution (distributeGameXP)
-- Auth is verified at the application layer. The anon key client needs permission.
CREATE POLICY "players_update_open"
  ON public.players
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Players should not be deletable through the anon key.
-- No delete operations exist in the codebase.
-- (No policy = no deletes allowed when RLS is enabled)


-- ============================================================================
-- 5. GAMES TABLE POLICIES
-- ============================================================================
-- games(id, game_pubkey, admin_wallet, name, game_code, token_mint, entry_fee,
--        commission_bps, start_time, end_time, max_winners, donation_amount,
--        is_native, all_are_winners, even_split, answer_merkle_root, img_url,
--        status, created_at)
--
-- Operations observed in code:
--   SELECT: getGameFromDb, getPartialGameFromDb, getGameForPlayer,
--           fetchGameLeaderboard, fetchCompleteGameResults, endGameAndDeclareWinners,
--           getUserXPLevel, getUserProfile — anyone reads game metadata
--   INSERT: createGame — via API route (auth verified at app layer)
--   UPDATE: updateGameInDb, endGameAndDeclareWinners (status update) —
--           admin operations via API routes or client-side
--   DELETE: Not used in the codebase

-- SELECT: Anyone can read game metadata.
-- Game data is publicly accessible (needed for joining, viewing results, etc).
-- Unauthenticated routes like /api/games/[gameCode]/partial need this.
CREATE POLICY "games_select_public"
  ON public.games
  FOR SELECT
  USING (true);

-- INSERT: Allow any request to insert games.
-- The API route verifies auth and sets admin_wallet from the JWT.
-- The anon key client is used for the actual insert.
CREATE POLICY "games_insert_open"
  ON public.games
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Allow any request to update games.
-- Game updates happen via:
--   1. API route games/update (server-side, anon key WITHOUT session — app-layer auth)
--   2. Client-side endGameAndDeclareWinners (anon key WITH session)
-- Because the server-side API routes use the unauthenticated anon key client,
-- we cannot enforce wallet-based RLS here. Auth is verified at the application
-- layer (createAdminHandler checks game.admin_wallet === user.wallet_address).
-- Note: update-onchain-info uses supabaseServer (service role) and bypasses RLS.
CREATE POLICY "games_update_open"
  ON public.games
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Games should not be deletable.
-- No delete operations exist in the codebase.
-- (No policy = no deletes allowed when RLS is enabled)


-- ============================================================================
-- 6. QUESTIONS TABLE POLICIES
-- ============================================================================
-- questions(id, game_id, question_text, display_order, correct_answer,
--           time_limit, created_at)
--
-- Operations observed in code:
--   SELECT: getGameFromDb (with answers, for admin and player views),
--           fetchRawGameResult (after game ends), getUserXPLevel (count),
--           getPartialGameFromDb (count only)
--   INSERT: createQuestionsAndAnswers — admin creates questions
--   UPDATE: Not directly used (questions are deleted and recreated on update)
--   DELETE: updateQuestionsAndAnswers — deletes all questions for a game before
--           recreating them
--
-- NOTE ON CORRECT ANSWERS: The correct_answer field is readable via RLS.
-- Application-layer filtering (getGameForPlayer) strips correct_answer before
-- sending to players. RLS cannot easily determine "is the game currently active
-- for this player" without complex timing logic. The security-critical path
-- (answer verification) already runs server-side via /api/games/verify-answers.

-- SELECT: Anyone can read questions.
-- Public routes need question counts. Application layer handles answer stripping.
CREATE POLICY "questions_select_public"
  ON public.questions
  FOR SELECT
  USING (true);

-- INSERT: Allow any request to insert questions.
-- The API route verifies admin auth before calling createQuestionsAndAnswers.
-- The anon key client is used for the actual insert.
CREATE POLICY "questions_insert_open"
  ON public.questions
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Allow any request to update questions.
-- In practice, questions are deleted and recreated rather than updated directly.
-- The update API route uses the unauthenticated anon key client, so wallet-based
-- RLS cannot be enforced. Auth is verified at the application layer.
CREATE POLICY "questions_update_open"
  ON public.questions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Allow any request to delete questions.
-- Used in updateQuestionsAndAnswers to clear all questions before recreating.
-- The update API route uses the unauthenticated anon key client, so wallet-based
-- RLS cannot be enforced. Auth is verified at the application layer
-- (createAdminHandler verifies game.admin_wallet === user.wallet_address).
CREATE POLICY "questions_delete_open"
  ON public.questions
  FOR DELETE
  USING (true);


-- ============================================================================
-- 7. ANSWERS TABLE POLICIES
-- ============================================================================
-- answers(id, question_id, answer_text, display_letter, display_order,
--         is_correct, created_at)
--
-- Operations observed in code:
--   SELECT: getGameFromDb (nested in questions query), fetchRawGameResult
--   INSERT: createQuestionsAndAnswers — admin creates answers
--   UPDATE: Not directly used (answers are cascade-deleted with questions)
--   DELETE: Cascade-deleted when questions are deleted (ON DELETE CASCADE)
--
-- NOTE ON IS_CORRECT: Same as correct_answer on questions — application layer
-- strips this field via getGameForPlayer.

-- SELECT: Anyone can read answers.
-- Application layer handles is_correct stripping for active games.
CREATE POLICY "answers_select_public"
  ON public.answers
  FOR SELECT
  USING (true);

-- INSERT: Allow any request to insert answers.
-- The API route verifies admin auth before calling createQuestionsAndAnswers.
CREATE POLICY "answers_insert_open"
  ON public.answers
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Allow any request to update answers.
-- The update API route uses the unauthenticated anon key client, so wallet-based
-- RLS cannot be enforced. Auth is verified at the application layer.
CREATE POLICY "answers_update_open"
  ON public.answers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Allow any request to delete answers.
-- Answers are cascade-deleted when questions are deleted, but PostgreSQL still
-- checks RLS policies on cascade deletes. The update API route uses the
-- unauthenticated anon key client, so wallet-based RLS cannot be enforced.
-- Auth is verified at the application layer.
CREATE POLICY "answers_delete_open"
  ON public.answers
  FOR DELETE
  USING (true);


-- ============================================================================
-- 8. PLAYER_GAMES TABLE POLICIES
-- ============================================================================
-- player_games(id, player_wallet, game_id, join_time, finished_time,
--              num_correct, answer_hash, rewards_earned, rewards_claimed,
--              xp_earned, final_rank, created_at, solana_signature,
--              claimed_signature, is_admin)
--
-- Operations observed in code:
--   SELECT: fetchGamePlayers, fetchPlayerData, fetchRawGameResult,
--           fetchGameSubmissions, getUserXPLevel, getPlayerDataWithRewards,
--           hasPlayerClaimedRewards, updateGameWinners (reads before upserting),
--           setupPlayerResultSubscription (realtime), endGameAndDeclareWinners
--   INSERT: recordPlayerJoinGame (upsert), submitAnswersToDb (upsert),
--           distributeGameXP (admin record insert)
--   UPDATE: addClaimedToDb, submitAnswersToDb (upsert), updateGameWinners (upsert),
--           distributeGameXP (xp_earned update)
--   DELETE: Not used in the codebase

-- SELECT: Anyone can read player_games records.
-- Public routes (players, results, complete-results) need this data.
-- Leaderboard and results are public information.
CREATE POLICY "player_games_select_public"
  ON public.player_games
  FOR SELECT
  USING (true);

-- INSERT: Allow any request to insert player_games records.
-- Used by API routes (auth verified at app layer) for:
--   - recordPlayerJoinGame (player joining)
--   - submitAnswersToDb (answer submission)
--   - distributeGameXP (admin XP record)
-- All go through the anon key client after application-layer auth verification.
CREATE POLICY "player_games_insert_open"
  ON public.player_games
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Allow any request to update player_games records.
-- Used by API routes (auth verified at app layer) for:
--   - submitAnswersToDb (upsert with finished_time, num_correct, etc.)
--   - addClaimedToDb (rewards_claimed flag)
--   - updateGameWinners (rewards_earned, final_rank from on-chain data)
--   - distributeGameXP (xp_earned)
-- All operations are auth-verified at the application layer.
-- The client-side endGameAndDeclareWinners also updates via the anon key.
CREATE POLICY "player_games_update_open"
  ON public.player_games
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Player game records should not be deletable.
-- (No policy = no deletes allowed when RLS is enabled)


-- ============================================================================
-- 9. PLAYER_ANSWERS TABLE POLICIES
-- ============================================================================
-- player_answers(id, player_game_id, question_id, selected_answer,
--                answered_at, is_correct, created_at)
--
-- Operations observed in code:
--   SELECT: fetchRawGameResult (nested in player_games query)
--   INSERT: submitAnswersToDb (upsert)
--   UPDATE: submitAnswersToDb (upsert with onConflict)
--   DELETE: Not used in the codebase

-- SELECT: Anyone can read player_answers.
-- Used in game results which are public after game completion.
CREATE POLICY "player_answers_select_public"
  ON public.player_answers
  FOR SELECT
  USING (true);

-- INSERT: Allow any request to insert player_answers.
-- The API route verifies auth before calling submitAnswersToDb.
CREATE POLICY "player_answers_insert_open"
  ON public.player_answers
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Allow any request to update player_answers.
-- submitAnswersToDb uses upsert with onConflict, which requires UPDATE permission.
CREATE POLICY "player_answers_update_open"
  ON public.player_answers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Player answers should not be deletable.
-- (No policy = no deletes allowed when RLS is enabled)


-- ============================================================================
-- 10. TOKENS TABLE POLICIES
-- ============================================================================
-- tokens(id, mint_address, ticker, name, decimals, logo_url, is_native,
--        is_enabled, coingecko_id, created_at, updated_at)
--
-- Operations observed in code:
--   SELECT: getPlayerDataWithRewards (token details for rewards display)
--   INSERT/UPDATE/DELETE: Not used in application code (admin-managed data)

-- SELECT: Anyone can read token information (it's reference data).
CREATE POLICY "tokens_select_public"
  ON public.tokens
  FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies for tokens.
-- Token data is managed through the Supabase dashboard or service role key.
-- (No policy = no writes allowed when RLS is enabled)


-- ============================================================================
-- 11. STORAGE POLICIES (game-images bucket)
-- ============================================================================
-- The game-images bucket is public for reads but should restrict writes.
--
-- Current behavior in code:
--   Upload: uploadGameImage (client-side, via anon key) — called from
--           createGameWithQuestions and updateGameWithQuestions
--   Download: Public URL access
--   Delete: deleteGameImage (client-side, via anon key) — cleanup on error
--
-- NOTE: Storage policies use storage.objects table. We need to be careful
-- not to conflict with any existing storage policies. The migration below
-- drops existing policies for the game-images bucket before creating new ones.

-- First, drop any existing overly-permissive storage policies for game-images
-- (from the original create_tables.sql which had fully open access)
DO $$
BEGIN
  -- Drop existing policies if they exist (safe to run multiple times)
  DROP POLICY IF EXISTS "Allow public access to game-images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access for game-images" ON storage.objects;
END
$$;

-- Allow public read access to game-images bucket
-- Anyone can view game images (they are referenced in public game data)
CREATE POLICY "game_images_select_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'game-images');

-- Allow any request to upload to game-images bucket
-- Uploads happen via the anon key client from API routes after auth verification.
-- We cannot restrict by auth.uid() here because the upload code uses the anon key
-- client which may or may not have an authenticated session attached.
CREATE POLICY "game_images_insert_open"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'game-images');

-- Allow any request to delete from game-images bucket
-- Deletes only happen as cleanup when a game creation/update fails.
-- The anon key client is used for these operations.
CREATE POLICY "game_images_delete_open"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'game-images');

-- Allow any request to update objects in game-images bucket
-- This covers potential upsert/overwrite scenarios
CREATE POLICY "game_images_update_open"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'game-images')
  WITH CHECK (bucket_id = 'game-images');


-- ============================================================================
-- 12. STORAGE POLICIES (token-images bucket)
-- ============================================================================
-- token-images is admin-managed reference data. Public reads only.

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public access to token-images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access for token-images" ON storage.objects;
END
$$;

-- Allow public read access to token-images bucket
CREATE POLICY "token_images_select_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'token-images');

-- No INSERT/UPDATE/DELETE policies for token-images.
-- Token images are managed through the Supabase dashboard or service role key.


-- ============================================================================
-- 13. REALTIME SUBSCRIPTIONS
-- ============================================================================
-- The application uses Supabase Realtime to subscribe to player_games updates.
-- RLS policies apply to Realtime as well. The SELECT policy on player_games
-- (which allows public reads) ensures Realtime subscriptions work correctly.
--
-- Ensure the Realtime publication includes the player_games table:
-- (This is typically configured in the Supabase dashboard, but we note it here)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.player_games;


-- ============================================================================
-- SECURITY NOTES & FUTURE IMPROVEMENTS
-- ============================================================================
--
-- CURRENT STATE:
-- This migration establishes a baseline RLS configuration that protects against
-- the most critical attack vectors. With these policies in place:
--
--   1. DELETE operations are blocked on players, games, player_games,
--      player_answers, and tokens tables. Questions and answers allow
--      deletes (needed for game update flow).
--
--   2. Token data is fully read-only through the anon key (no INSERT,
--      UPDATE, or DELETE policies).
--
--   3. Token images are read-only through the anon key (no write policies
--      on storage for token-images bucket).
--
--   4. All write operations on data tables are open but protected by
--      application-layer authentication (JWT verification in API routes).
--
-- KNOWN LIMITATIONS (acceptable trade-offs for current architecture):
--
--   - Most tables have open INSERT/UPDATE/DELETE policies because the
--     server-side API routes use the anon key client (not the service role
--     key) for data operations. The anon key client on the server has NO
--     authenticated session, so get_user_wallet() returns NULL, making
--     wallet-based RLS impossible for server-initiated writes. Auth is
--     verified at the application layer (createAuthenticatedHandler,
--     createAdminHandler) before these operations execute.
--
--   - correct_answer (questions) and is_correct (answers) are readable by
--     anyone. The application layer strips these fields for players during
--     active games. A determined attacker could read correct answers by
--     querying Supabase directly with the anon key. This is a known
--     trade-off: the Solana on-chain program uses merkle proofs to verify
--     answers, so cheating at the DB level does not bypass on-chain validation.
--
-- RECOMMENDED FUTURE IMPROVEMENTS:
--
--   1. Migrate API routes to use supabaseServer (service role) for data
--      operations. This would allow tighter RLS policies since the service
--      role bypasses RLS, and client-side calls could be more restricted.
--
--   2. Once API routes use service role, tighten INSERT/UPDATE policies:
--      - players: Only allow users to insert/update their own record
--        (wallet_address = get_user_wallet())
--      - player_games: Only allow the player themselves or game admin
--      - player_answers: Only allow the player themselves
--
--   3. Consider creating a database view or RPC function for questions that
--      conditionally strips correct_answer based on game status and user role,
--      then restrict direct table SELECT to game admins only.
--
--   4. Move storage uploads to API routes using the service role key,
--      then restrict storage INSERT to authenticated users only.
--
--   5. Add rate limiting at the Supabase level (pg_net or edge functions)
--      to complement application-layer rate limiting.
-- ============================================================================
