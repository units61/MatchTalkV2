/**
 * Store utility functions
 * Helper functions for store management and synchronization
 */

import {useAuthStore} from './authStore';
import {useRoomsStore} from './roomsStore';
import {useFriendsStore} from './friendsStore';
import {useAgoraStore} from './agoraStore';
import {useWebSocketStore} from './websocketStore';

/**
 * Reset all stores (useful for logout)
 */
export function resetAllStores(): void {
  // Reset auth store
  useAuthStore.getState().logout().catch(console.error);
  
  // Reset rooms store
  useRoomsStore.setState({
    rooms: [],
    currentRoom: null,
    loading: false,
    fetching: false,
    creating: false,
    joining: false,
    error: null,
  });
  
  // Reset friends store
  useFriendsStore.setState({
    friends: [],
    searchResults: [],
    suggestions: [],
    receivedRequests: [],
    sentRequests: [],
    loading: false,
    error: null,
    pagination: undefined,
  });
  
  // Reset Agora store
  useAgoraStore.getState().leaveChannel().catch(console.error);
  
  // Reset WebSocket store
  useWebSocketStore.getState().disconnect();
}

/**
 * Get store state snapshot (for debugging)
 */
export function getStoreSnapshot(): Record<string, any> {
  return {
    auth: {
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      user: useAuthStore.getState().user ? {
        id: useAuthStore.getState().user?.id,
        email: useAuthStore.getState().user?.email,
        name: useAuthStore.getState().user?.name,
      } : null,
    },
    rooms: {
      roomsCount: useRoomsStore.getState().rooms.length,
      currentRoomId: useRoomsStore.getState().currentRoom?.id,
      loading: useRoomsStore.getState().loading,
    },
    friends: {
      friendsCount: useFriendsStore.getState().friends.length,
      loading: useFriendsStore.getState().loading,
    },
    agora: {
      isJoined: useAgoraStore.getState().isJoined,
      channelName: useAgoraStore.getState().channelName,
      isMuted: useAgoraStore.getState().isMuted,
    },
    websocket: {
      isConnected: useWebSocketStore.getState().isConnected,
    },
  };
}

/**
 * Validate store state integrity
 */
export function validateStoreState(): {valid: boolean; errors: string[]} {
  const errors: string[] = [];
  
  // Check auth store
  const authState = useAuthStore.getState();
  if (authState.isAuthenticated && !authState.user) {
    errors.push('Auth store: isAuthenticated is true but user is null');
  }
  if (authState.isAuthenticated && !authState.token) {
    errors.push('Auth store: isAuthenticated is true but token is null');
  }
  
  // Check rooms store
  const roomsState = useRoomsStore.getState();
  if (roomsState.currentRoom && !roomsState.rooms.find(r => r.id === roomsState.currentRoom?.id)) {
    errors.push('Rooms store: currentRoom not found in rooms array');
  }
  
  // Check Agora store
  const agoraState = useAgoraStore.getState();
  if (agoraState.isJoined && !agoraState.channelName) {
    errors.push('Agora store: isJoined is true but channelName is null');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}



