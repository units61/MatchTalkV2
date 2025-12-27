/**
 * Utility functions for sharing room links and deep linking
 */

import {Platform, Share} from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Get the current base URL (for building share links)
 */
const getBaseUrl = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  // React Native: Use deep link base URL
  return 'https://matchtalk.app';
};

/**
 * Generate a shareable room link
 */
export const getRoomShareLink = (roomId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/room/${roomId}`;
};

/**
 * Generate an invite link
 */
export const getInviteLink = (roomId: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/invite/${roomId}`;
};

/**
 * Copy text to clipboard
 */
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else if (typeof document !== 'undefined') {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } else {
      // React Native: Clipboard API is deprecated, use Share API instead
      // For now, return false and let the caller use Share API
      // TODO: Install @react-native-clipboard/clipboard or expo-clipboard if needed
      if (__DEV__) {
        console.warn('[ShareUtils] Clipboard not available on React Native, use Share API instead');
      }
      return false;
    }
    return false;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Share room link using Web Share API or fallback to clipboard
 */
export const shareRoomLink = async (roomId: string, roomName?: string): Promise<boolean> => {
  const link = getRoomShareLink(roomId);
  const text = roomName ? `Join "${roomName}" on MatchTalk: ${link}` : `Join this room on MatchTalk: ${link}`;

  try {
    if (Platform.OS === 'web' && navigator.share) {
      // Web: Try Web Share API first
      await navigator.share({
        title: roomName || 'MatchTalk Room',
        text: text,
        url: link,
      });
      return true;
    } else if (Platform.OS !== 'web') {
      // React Native: Use Share API
      await Share.share({
        message: text,
        url: link,
        title: roomName || 'MatchTalk Room',
      });
      return true;
    }
  } catch (error: any) {
    // User cancelled or error occurred, fallback to clipboard
    if (error.name !== 'AbortError' && error.message !== 'User canceled') {
      console.error('Share error:', error);
    }
  }

  // Fallback to clipboard
  return await copyToClipboard(link);
};

/**
 * Share invite link
 */
export const shareInviteLink = async (roomId: string, roomName?: string): Promise<boolean> => {
  const link = getInviteLink(roomId);
  const text = roomName
    ? `You're invited to join "${roomName}" on MatchTalk: ${link}`
    : `You're invited to join this room on MatchTalk: ${link}`;

  try {
    if (Platform.OS === 'web' && navigator.share) {
      // Web: Try Web Share API first
      await navigator.share({
        title: roomName ? `Invitation: ${roomName}` : 'MatchTalk Invitation',
        text: text,
        url: link,
      });
      return true;
    } else if (Platform.OS !== 'web') {
      // React Native: Use Share API
      await Share.share({
        message: text,
        url: link,
        title: roomName ? `Invitation: ${roomName}` : 'MatchTalk Invitation',
      });
      return true;
    }
  } catch (error: any) {
    if (error.name !== 'AbortError' && error.message !== 'User canceled') {
      console.error('Share error:', error);
    }
  }

  // Fallback to clipboard
  return await copyToClipboard(link);
};











