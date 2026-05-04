/**
 * Frontend Application Constants
 */

// Editor constants
export const EDITOR_MIN_HEIGHT = 200;
export const EDITOR_MAX_HEIGHT_OFFSET = 200;
export const EDITOR_DEFAULT_HEIGHT = 360;

// Query constants
export const DEFAULT_QUERY_LIMIT = 1000;
export const TRUNCATION_WARNING_THRESHOLD = 1000;

// API constants
export const API_TIMEOUT_MS = 30000;

// UI constants
export const RESIZER_HEIGHT = 4;
export const COLUMN_SPAN_AUTO = 0;
export const COLUMN_SPAN_FULL = 1;

// Status values
export const DB_STATUS = {
  ACTIVE: 'active',
  ERROR: 'error',
  CONNECTING: 'connecting',
} as const;

export type DatabaseStatus = typeof DB_STATUS[keyof typeof DB_STATUS];

// Color values (matching theme)
export const COLORS = {
  PRIMARY: '#B8860B',
  PRIMARY_LIGHT: '#E8F4FD',
  BACKGROUND_LIGHT: '#F5F5F5',
  BACKGROUND_DARK: '#FAFAFA',
  BORDER: '#F0F0F0',
  TEXT_DARK: '#333333',
  TEXT_MEDIUM: '#666666',
  TEXT_LIGHT: '#8C8C8C',
  ERROR: '#DC3545',
} as const;
