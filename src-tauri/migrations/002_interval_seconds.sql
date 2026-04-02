-- Rename interval_minutes to interval_seconds for existing databases
-- This migration is safe to run multiple times (fails silently if already applied)
ALTER TABLE tasks RENAME COLUMN interval_minutes TO interval_seconds;
