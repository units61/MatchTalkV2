import {AppState, AppStateStatus} from 'react-native';
import {useEffect, useRef} from 'react';
import {useWebSocketStore} from '../stores/websocketStore';
import {useAgoraStore} from '../stores/agoraStore';

/**
 * App State Management Utility
 * Handles foreground/background state changes
 */

let appStateListeners: Array<(state: AppStateStatus) => void> = [];

/**
 * Add app state listener
 */
export function addAppStateListener(listener: (state: AppStateStatus) => void): () => void {
  appStateListeners.push(listener);
  return () => {
    appStateListeners = appStateListeners.filter(l => l !== listener);
  };
}

/**
 * Get current app state
 */
export function getAppState(): AppStateStatus {
  return AppState.currentState;
}

/**
 * React hook for app state management
 */
export function useAppState(
  onForeground?: () => void,
  onBackground?: () => void
) {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        console.log('[AppState] App has come to the foreground');
        if (onForeground) {
          onForeground();
        }
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App has gone to the background
        console.log('[AppState] App has gone to the background');
        if (onBackground) {
          onBackground();
        }
      }

      appState.current = nextAppState;
      
      // Notify all listeners
      appStateListeners.forEach(listener => listener(nextAppState));
    });

    return () => {
      subscription.remove();
    };
  }, [onForeground, onBackground]);
}

/**
 * Initialize app state management
 */
export function initAppStateManagement() {
  console.log('[AppState] App state management initialized');
  
  // Track app state changes for analytics
  AppState.addEventListener('change', (nextAppState) => {
    if (__DEV__) {
      console.log('[AppState] State changed to:', nextAppState);
    }
  });
}

