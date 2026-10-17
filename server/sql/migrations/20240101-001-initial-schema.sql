-- Create enums
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE message_status AS ENUM ('pending', 'delivered', 'read', 'deleted');
CREATE TYPE contact_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knot_id TEXT UNIQUE NOT NULL,
  knot_id_hash TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  identity_key TEXT NOT NULL,
  signed_pre_key TEXT NOT NULL,
  one_time_key_pool JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = knot_id_hash);

CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (true);

-- Create contact_requests table
CREATE TABLE contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_knot_id TEXT NOT NULL,
  to_knot_id TEXT NOT NULL,
  status contact_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contact requests" ON contact_requests
  FOR ALL USING (
    from_knot_id = current_setting('app.current_knot_id') OR
    to_knot_id = current_setting('app.current_knot_id')
  );

CREATE POLICY "Service role can manage contact requests" ON contact_requests
  FOR ALL USING (true);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_knot_id TEXT NOT NULL,
  recipient_knot_id TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  status message_status DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages" ON messages
  FOR SELECT USING (
    sender_knot_id = current_setting('app.current_knot_id') OR
    recipient_knot_id = current_setting('app.current_knot_id')
  );

CREATE POLICY "Service role can manage messages" ON messages
  FOR ALL USING (true);

-- Create offline_queue table (MongoDB sync)
CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_knot_id TEXT NOT NULL,
  sender_knot_id TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own offline queue" ON offline_queue
  FOR SELECT USING (
    recipient_knot_id = current_setting('app.current_knot_id')
  );

CREATE POLICY "Service role can manage offline queue" ON offline_queue
  FOR ALL USING (true);

-- Create indexes
CREATE INDEX idx_users_knot_id ON users(knot_id);
CREATE INDEX idx_users_knot_id_hash ON users(knot_id_hash);
CREATE INDEX idx_contact_requests_from ON contact_requests(from_knot_id);
CREATE INDEX idx_contact_requests_to ON contact_requests(to_knot_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_knot_id);
CREATE INDEX idx_messages_sender ON messages(sender_knot_id);
CREATE INDEX idx_offline_queue_recipient ON offline_queue(recipient_knot_id);
CREATE INDEX idx_offline_queue_status ON offline_queue(status);
CREATE INDEX idx_offline_queue_created ON offline_queue(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_requests_updated_at
  BEFORE UPDATE ON contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();