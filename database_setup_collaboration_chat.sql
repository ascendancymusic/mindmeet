-- SQL script to create the collaboration_chat table in Supabase
-- Run this in the Supabase SQL editor to set up the chat functionality

CREATE TABLE IF NOT EXISTS collaboration_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mindmap_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_collaboration_chat_mindmap_id ON collaboration_chat(mindmap_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_chat_created_at ON collaboration_chat(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE collaboration_chat ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Users can read chat messages for mindmaps they have access to
CREATE POLICY "Users can read chat messages for accessible mindmaps" ON collaboration_chat
  FOR SELECT
  USING (
    -- Allow if user is the creator or a collaborator of the mindmap
    EXISTS (
      SELECT 1 FROM mindmaps 
      WHERE mindmaps.id = collaboration_chat.mindmap_id
      AND (
        mindmaps.creator = auth.uid()
        OR auth.uid()::text = ANY(mindmaps.collaborators)
        OR mindmaps.visibility = 'public'
      )
    )
  );

-- Users can insert chat messages for mindmaps they have access to
CREATE POLICY "Users can insert chat messages for accessible mindmaps" ON collaboration_chat
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM mindmaps 
      WHERE mindmaps.id = collaboration_chat.mindmap_id
      AND (
        mindmaps.creator = auth.uid()
        OR auth.uid()::text = ANY(mindmaps.collaborators)
      )
    )
  );

-- Users can only update/delete their own messages
CREATE POLICY "Users can update their own chat messages" ON collaboration_chat
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chat messages" ON collaboration_chat
  FOR DELETE
  USING (user_id = auth.uid());

-- Optional: Create a function to automatically clean up old messages (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM collaboration_chat
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- You can set up a cron job to run this cleanup function periodically
-- This is optional and can be configured in the Supabase dashboard under Database > Cron Jobs
