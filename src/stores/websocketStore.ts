import {create} from 'zustand';
import {Socket} from 'socket.io-client';
import {websocketClient} from '../lib/websocketClient';
import {errorTracking, logger} from './middleware';

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWebSocketStore = create<WebSocketState>(
  errorTracking(
    logger((set) => ({
  socket: null,
  isConnected: false,

  connect: async () => {
    try {
      const socket = await websocketClient.connect();
      set({
        socket,
        isConnected: socket.connected,
      });

      socket.on('connect', () => {
        set({isConnected: true});
      });

      socket.on('disconnect', () => {
        set({isConnected: false});
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      set({isConnected: false});
    }
  },

  disconnect: () => {
    websocketClient.disconnect();
    set({
      socket: null,
      isConnected: false,
    });
  },
    }), 'websocketStore'),
    'websocketStore'
  )
);

