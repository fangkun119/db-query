-- Migration: 001_add_db_type.sql
-- Description: Add db_type column to database_connections table
-- Version: 1.1.0 (MySQL Support)
-- Date: 2026-05-05

-- Add db_type column with default value "postgresql"
ALTER TABLE database_connections
ADD COLUMN db_type VARCHAR(50) NOT NULL DEFAULT 'postgresql';

-- Update existing PostgreSQL connections to have correct db_type
UPDATE database_connections
SET db_type = 'postgresql'
WHERE url LIKE 'postgresql://%' OR url LIKE 'postgres://%';

-- Update existing MySQL connections to have correct db_type
UPDATE database_connections
SET db_type = 'mysql'
WHERE url LIKE 'mysql://%';
