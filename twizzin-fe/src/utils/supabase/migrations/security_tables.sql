-- Create wallet_verifications table
CREATE TABLE IF NOT EXISTS wallet_verifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    nonce TEXT NOT NULL,
    signature TEXT NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address TEXT NOT NULL,
    geolocation JSONB,
    device_fingerprint TEXT NOT NULL,
    session_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS verification_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE NOT NULL,
    wallet_address TEXT,
    success BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    device_fingerprint TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_verifications_wallet_address ON wallet_verifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_verifications_verified_at ON wallet_verifications(verified_at);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_ip_address ON verification_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_attempt_time ON verification_attempts(attempt_time);
CREATE INDEX IF NOT EXISTS idx_sessions_wallet_address ON sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Add RLS policies
ALTER TABLE wallet_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow insert for all" ON wallet_verifications;
DROP POLICY IF EXISTS "Allow select for own wallet" ON wallet_verifications;
DROP POLICY IF EXISTS "Allow insert for all" ON verification_attempts;
DROP POLICY IF EXISTS "Allow select for own IP" ON verification_attempts;
DROP POLICY IF EXISTS "Allow insert for all" ON sessions;
DROP POLICY IF EXISTS "Allow select for own wallet" ON sessions;
DROP POLICY IF EXISTS "Enable all access for players" ON players;

-- Create new policies
DROP POLICY IF EXISTS "Enable insert for all users" ON wallet_verifications;
CREATE POLICY "Enable insert for all users" ON wallet_verifications
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for all users" ON wallet_verifications;
CREATE POLICY "Enable select for all users" ON wallet_verifications
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON verification_attempts;
CREATE POLICY "Enable insert for all users" ON verification_attempts
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for all users" ON verification_attempts;
CREATE POLICY "Enable select for all users" ON verification_attempts
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON sessions;
CREATE POLICY "Enable insert for all users" ON sessions
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for all users" ON sessions;
CREATE POLICY "Enable select for all users" ON sessions
    FOR SELECT TO authenticated, anon
    USING (true);

-- Add policies for players table
DROP POLICY IF EXISTS "Enable all access for players" ON players;
CREATE POLICY "Enable all access for players" ON players
    FOR ALL TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run cleanup every hour
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_sessions()
RETURNS trigger AS $$
BEGIN
    PERFORM cleanup_expired_sessions();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS cleanup_sessions_trigger ON sessions;

CREATE TRIGGER cleanup_sessions_trigger
    AFTER INSERT ON sessions
    EXECUTE FUNCTION trigger_cleanup_expired_sessions(); 