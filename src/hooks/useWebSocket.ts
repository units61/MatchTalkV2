import {useEffect, useRef} from 'react';
import {websocketClient} from '../lib/websocketClient';
import {useAuthStore} from '../stores/authStore';
import {useWebSocketEventStore} from '../stores/websocketEventStore';

interface UseWebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {isAuthenticated} = useAuthStore();
  const {onConnect, onDisconnect, onError} = options;
  const callbacksRef = useRef(options);
  const setupListeners = useWebSocketEventStore((state) => state.setupListeners);

  // Update callbacks ref when options change
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  useEffect(() => {
    if (!isAuthenticated) {
      websocketClient.disconnect();
      return;
    }

    let mounted = true;

    const connect = async () => {
      try {
        const socket = await websocketClient.connect();

        if (!mounted) {
          return;
        }

        socket.on('connect', () => {
          callbacksRef.current.onConnect?.();
          // Setup event listeners when connected
          setupListeners();
        });

        socket.on('disconnect', () => {
          callbacksRef.current.onDisconnect?.();
        });

        socket.on('connect_error', (error) => {
          callbacksRef.current.onError?.(error as Error);
        });
      } catch (error) {
        if (mounted) {
          callbacksRef.current.onError?.(error as Error);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      websocketClient.disconnect();
    };
  }, [isAuthenticated]);

  return {
    socket: websocketClient.getSocket(),
    isConnected: websocketClient.isConnected(),
    joinRoom: async (roomId: string) => {
      try {
        await websocketClient.joinRoom(roomId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('WebSocket joinRoom error:', errorMessage, error);
        throw new Error(`Odaya bağlanılamadı: ${errorMessage}`);
      }
    },
    leaveRoom: async (roomId: string) => {
      try {
        await websocketClient.leaveRoom(roomId);
      } catch (error) {
        console.warn('WebSocket leaveRoom error:', error);
        // Don't throw, leaving room is not critical
      }
    },
    voteExtension: async (roomId: string, vote: 'yes' | 'no') => {
      try {
        await websocketClient.voteExtension(roomId, vote);
      } catch (error) {
        console.error('WebSocket voteExtension error:', error);
        throw error;
      }
    },
    joinMatching: async () => {
      try {
        await websocketClient.joinMatching();
      } catch (error) {
        console.error('WebSocket joinMatching error:', error);
        throw error;
      }
    },
    leaveMatching: async () => {
      try {
        await websocketClient.leaveMatching();
      } catch (error) {
        console.warn('WebSocket leaveMatching error:', error);
      }
    },
    getMatchingStatus: async () => {
      try {
        await websocketClient.getMatchingStatus();
      } catch (error) {
        console.error('WebSocket getMatchingStatus error:', error);
        throw error;
      }
    },
    on: websocketClient.on.bind(websocketClient),
    off: websocketClient.off.bind(websocketClient),
  };
};

