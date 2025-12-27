/**
 * Navigation Helper Functions
 * Utility functions for navigation operations
 */

import {NavigationContainerRef} from '@react-navigation/native';
import {generateDeepLink} from './deepLinking';
import {Share} from 'react-native';

let navigationRef: NavigationContainerRef<any> | null = null;

/**
 * Set navigation reference
 */
export function setNavigationRef(ref: NavigationContainerRef<any> | null) {
  navigationRef = ref;
}

/**
 * Navigate to a screen
 */
export function navigate(screen: string, params?: Record<string, any>) {
  if (navigationRef?.isReady()) {
    navigationRef.navigate(screen as never, params as never);
  } else {
    console.warn('[Navigation] Navigation ref is not ready');
  }
}

/**
 * Go back
 */
export function goBack() {
  if (navigationRef?.isReady()) {
    navigationRef.goBack();
  }
}

/**
 * Reset navigation stack
 */
export function reset(screen: string, params?: Record<string, any>) {
  if (navigationRef?.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{name: screen as never, params: params as never}],
    });
  }
}

/**
 * Get current route name
 */
export function getCurrentRouteName(): string | undefined {
  if (navigationRef?.isReady()) {
    try {
      const state = navigationRef.getState();
      // Safely access routes array and index
      if (state?.routes && Array.isArray(state.routes) && typeof state.index === 'number') {
        const route = state.routes[state.index];
        if (route?.name) {
          return route.name;
        }
      }
    } catch (error) {
      console.error('[Navigation] Error getting current route name:', error);
    }
  }
  return undefined;
}

/**
 * Share room link
 */
export async function shareRoomLink(roomId: string) {
  try {
    const deepLink = generateDeepLink('Room', {roomId});
    await Share.share({
      message: `MatchTalk odasına katıl: ${deepLink}`,
      url: deepLink,
      title: 'Oda Davetiyesi',
    });
  } catch (error) {
    console.error('[Navigation] Failed to share room link:', error);
  }
}

/**
 * Share profile link
 */
export async function shareProfileLink(userId: string) {
  try {
    const deepLink = generateDeepLink('Profile', {userId});
    await Share.share({
      message: `MatchTalk profilini görüntüle: ${deepLink}`,
      url: deepLink,
      title: 'Profil Paylaş',
    });
  } catch (error) {
    console.error('[Navigation] Failed to share profile link:', error);
  }
}

/**
 * Share invite link
 */
export async function shareInviteLink(inviteCode: string) {
  try {
    const deepLink = generateDeepLink('Home', {inviteCode});
    await Share.share({
      message: `MatchTalk'a katıl: ${deepLink}`,
      url: deepLink,
      title: 'Davet Linki',
    });
  } catch (error) {
    console.error('[Navigation] Failed to share invite link:', error);
  }
}

