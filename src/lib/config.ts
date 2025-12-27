/**
 * Centralized configuration management
 * Reads environment variables with fallback defaults
 */

import Constants from 'expo-constants';

const getEnvVar = (key: string, defaultValue?: string): string => {
  // First try expo-constants (Expo way)
  if (Constants?.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // Fallback to process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue || '';
  }
  
  return defaultValue || '';
};

export const config = {
  // API Configuration
  api: {
    baseUrl: getEnvVar('REACT_APP_API_BASE_URL', 'http://localhost:4000'),
    wsBaseUrl: getEnvVar('REACT_APP_WS_BASE_URL', 'http://localhost:4000'),
  },

  // Agora WebRTC Configuration
  agora: {
    appId: getEnvVar('REACT_APP_AGORA_APP_ID', ''),
    appCertificate: getEnvVar('REACT_APP_AGORA_APP_CERTIFICATE', ''),
  },

  // JWT (development only)
  jwt: {
    secret: getEnvVar('REACT_APP_JWT_SECRET', ''),
  },

  // Sentry Configuration
  sentry: {
    dsn: getEnvVar('SENTRY_DSN', ''),
    enabled: getEnvVar('SENTRY_ENABLED', 'true') === 'true',
    environment: __DEV__ ? 'development' : 'production',
  },
} as const;

export default config;

