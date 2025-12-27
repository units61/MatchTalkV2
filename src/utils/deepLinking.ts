/**
 * Deep Linking Utilities
 * Handles URL parsing and navigation for deep links
 */

import {Linking} from 'react-native';

export interface DeepLinkParams {
  screen: string;
  params?: Record<string, any>;
}

/**
 * Parse deep link URL
 * Supports formats:
 * - matchtalk://room/:roomId
 * - matchtalk://profile/:userId
 * - matchtalk://chat/:userId
 * - matchtalk://friend/:userId
 * - matchtalk://invite/:inviteCode
 */
export function parseDeepLink(url: string): DeepLinkParams | null {
  try {
    // Remove scheme prefix
    const cleanUrl = url.replace(/^matchtalk:\/\//, '').replace(/^https?:\/\/[^\/]+\//, '');
    
    const parts = cleanUrl.split('/').filter(Boolean);
    
    if (parts.length === 0) {
      return {screen: 'Home'};
    }

    const [screen, ...paramParts] = parts;

    switch (screen) {
      case 'room':
        if (paramParts.length > 0) {
          return {
            screen: 'Room',
            params: {roomId: paramParts[0]},
          };
        }
        break;

      case 'profile':
        if (paramParts.length > 0) {
          return {
            screen: 'Profile',
            params: {userId: paramParts[0]},
          };
        }
        break;

      case 'chat':
      case 'message':
        if (paramParts.length > 0) {
          return {
            screen: 'Chat',
            params: {userId: paramParts[0]},
          };
        }
        break;

      case 'friend':
        if (paramParts.length > 0) {
          return {
            screen: 'Friends',
            params: {userId: paramParts[0]},
          };
        }
        break;

      case 'invite':
        if (paramParts.length > 0) {
          return {
            screen: 'Home',
            params: {inviteCode: paramParts[0]},
          };
        }
        break;

      case 'reset-password':
        if (paramParts.length > 0) {
          return {
            screen: 'ForgotPassword',
            params: {token: paramParts[0]},
          };
        }
        break;

      case 'verify-email':
        if (paramParts.length > 0) {
          return {
            screen: 'Login',
            params: {verificationToken: paramParts[0]},
          };
        }
        break;

      default:
        // Try to navigate to screen directly
        return {
          screen: screen.charAt(0).toUpperCase() + screen.slice(1),
          params: paramParts.length > 0 ? {id: paramParts[0]} : undefined,
        };
    }
  } catch (error) {
    console.error('[DeepLinking] Failed to parse URL:', url, error);
  }

  return null;
}

/**
 * Generate deep link URL
 */
export function generateDeepLink(screen: string, params?: Record<string, any>): string {
  const baseUrl = 'matchtalk://';
  
  switch (screen) {
    case 'Room':
      if (params?.roomId) {
        return `${baseUrl}room/${params.roomId}`;
      }
      break;

    case 'Profile':
      if (params?.userId) {
        return `${baseUrl}profile/${params.userId}`;
      }
      break;

    case 'Chat':
    case 'Message':
      if (params?.userId) {
        return `${baseUrl}chat/${params.userId}`;
      }
      break;

    case 'Friends':
      if (params?.userId) {
        return `${baseUrl}friend/${params.userId}`;
      }
      break;

    case 'Home':
      if (params?.inviteCode) {
        return `${baseUrl}invite/${params.inviteCode}`;
      }
      return `${baseUrl}home`;

    default:
      return `${baseUrl}${screen.toLowerCase()}`;
  }

  return baseUrl;
}

/**
 * Check if URL is a deep link
 */
export function isDeepLink(url: string): boolean {
  return url.startsWith('matchtalk://') || url.includes('matchtalk://');
}

/**
 * Get initial deep link URL (if app was opened via deep link)
 */
export async function getInitialURL(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL();
    return url;
  } catch (error) {
    console.error('[DeepLinking] Failed to get initial URL:', error);
    return null;
  }
}

/**
 * Setup deep link listener
 */
export function setupDeepLinkListener(
  callback: (url: string) => void
): () => void {
  const subscription = Linking.addEventListener('url', ({url}) => {
    callback(url);
  });

  return () => {
    subscription.remove();
  };
}


