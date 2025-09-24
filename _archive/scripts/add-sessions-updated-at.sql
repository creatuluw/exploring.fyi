-- Migration: Add missing updated_at field to sessions table
-- This fixes the database trigger error: record "new" has no field "updated_at"

-- Add the missing updated_at column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have the updated_at field set to created_at initially
UPDATE sessions SET updated_at = created_at WHERE updated_at IS NULL;

-- Verify the change
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' 
AND column_name = 'updated_at';
