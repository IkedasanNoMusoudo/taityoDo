-- Migration number: 0002 	 2025-08-02T15:31:38.637Z
-- Add line_id column to accounts table
-- This allows linking accounts with LINE user IDs for LINE bot integration

-- Add line_id column without UNIQUE constraint first
ALTER TABLE accounts ADD COLUMN line_id TEXT;

-- Create unique index for line_id (acts as UNIQUE constraint)
CREATE UNIQUE INDEX idx_accounts_line_id_unique ON accounts(line_id) WHERE line_id IS NOT NULL;
