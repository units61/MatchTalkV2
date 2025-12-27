/**
 * App-wide constants
 */

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second initial delay
} as const;

// WebSocket Configuration
export const WEBSOCKET_CONFIG = {
  CONNECTION_TIMEOUT: 20000, // 20 seconds
  RECONNECT_DELAY: 1000, // 1 second initial delay
  MAX_RECONNECT_DELAY: 30000, // 30 seconds max delay
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 25000, // 25 seconds
  PING_TIMEOUT: 60000, // 60 seconds
} as const;

// Toast Configuration
export const TOAST_CONFIG = {
  DEFAULT_DURATION: 3000, // 3 seconds
  ERROR_DURATION: 5000, // 5 seconds for errors
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;








