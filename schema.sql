-- PrinceVChat Supabase Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT,
    host_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 50,
    settings JSONB DEFAULT '{}'::JSONB
);

-- Room participants (who is in the room now)
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_host BOOLEAN DEFAULT false,
    is_muted BOOLEAN DEFAULT false,
    is_hand_raised BOOLEAN DEFAULT false
);

-- Room invitations (for tracking invites)
CREATE TABLE IF NOT EXISTS room_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES users(id),
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    used_at TIMESTAMP WITH TIME ZONE
);

-- Security: Add indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all usernames (for displaying in chat)
CREATE POLICY "Anyone can read usernames" ON users
    FOR SELECT USING (true);

-- Policy: Users can create their own profile
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Anyone can read active rooms
CREATE POLICY "Anyone can read rooms" ON rooms
    FOR SELECT USING (is_active = true);

-- Policy: Authenticated users can create rooms
CREATE POLICY "Auth users can create rooms" ON rooms
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function: Update last_seen when user活跃
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update last_seen
DROP TRIGGER IF EXISTS user_last_seen_trigger ON users;
CREATE TRIGGER user_last_seen_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_seen();

-- Function: Get room participant count
CREATE OR REPLACE FUNCTION get_room_participant_count(room_id TEXT)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER FROM room_participants 
    WHERE room_id = $1 AND left_at IS NULL;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean up old room participants (run periodically)
CREATE OR REPLACE FUNCTION cleanup_stale_participants()
RETURNS VOID AS $$
BEGIN
    UPDATE room_participants 
    SET left_at = NOW() 
    WHERE left_at IS NULL 
    AND joined_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;