-- message_blobs table for encrypted messages (supabase postgres)
-- Mirrors the MongoDB schema but in Postgres for consistency

CREATE TYPE message_direction AS ENUM ('outgoing', 'incoming');

CREATE TYPE message_type AS ENUM ('text', 'image', 'voice', 'video');

CREATE TABLE message_blobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knot_id TEXT NOT NULL, -- the recipient's knot_id
  sender_knot_id TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  direction message_direction DEFAULT 'outgoing',
  ciphertext TEXT NOT NULL, -- base64-encoded encrypted content
  auth_tag TEXT, -- base64-encoded HMAC tag
  nonce TEXT, -- base64-encoded nonce (if used)
  status message_status DEFAULT 'pending', -- pending, delivered, read, deleted
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ -- for disappearing messages

-- Indexes for query performance
CREATE INDEX idx_message_blobs_recipient ON message_blobs(knot_id);
CREATE INDEX idx_message_blobs_sender ON message_blobs(sender_knot_id);
CREATE INDEX idx_message_blobs_status ON message_blobs(status);
CREATE INDEX idx_message_blobs_created ON message_blobs(created_at);
CREATE INDEX idx_message_blobs_expires ON message_blobs(expires_at);

-- RLS policies
ALTER TABLE message_blobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages" ON message_blobs
  FOR SELECT USING (
    knot_id = current_setting('app.current_knot_id') OR
    sender_knot_id = current_setting('app.current_knot_id')
  );

CREATE POLICY "Service role can manage messages" ON message_blobs
  FOR ALL USING (true);

-- Trigger for created_at
CREATE OR REPLACE FUNCTION update_message_blobs_created_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_blobs_created_at
  BEFORE INSERT ON message_blobs
  FOR EACH ROW
  EXECUTE FUNCTION update_message_blobs_created_at();