-- PrinceVChat Supabase Schema
-- Uses TEXT for user IDs since they are session-generated strings (not UUIDs)

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT,
    host_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 50
);

-- Room participants (tracks who joined/left)
CREATE TABLE IF NOT EXISTS room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT 'User',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_host BOOLEAN DEFAULT false,
    is_muted BOOLEAN DEFAULT false,
    is_hand_raised BOOLEAN DEFAULT false,
    UNIQUE(room_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- Policies - allow service role full access
CREATE POLICY "Service full access rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service full access participants" ON room_participants FOR ALL USING (true) WITH CHECK (true);