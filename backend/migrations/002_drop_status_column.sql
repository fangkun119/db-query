-- Migration: 002_drop_status_column.sql
-- Description: Drop unused status column from database_connections table
-- Version: 1.2.0
-- Date: 2026-05-06
-- Reason: Status field is not used in API responses or frontend UI

-- Drop the status column
ALTER TABLE database_connections
DROP COLUMN status;
