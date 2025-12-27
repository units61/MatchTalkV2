import {create} from 'zustand';
import {errorTracking, logger} from './middleware';
import {websocketClient} from '../lib/websocketClient';
import {trackEvent} from '../utils/analytics';

type WebSocketEvent =
  | 'room-update'
  | 'room-created'
  | 'room-closed'
  | 'room-joined'
  | 'room-left'
  | 'room-error'
  | 'timer-update'
  | 'vote-result'
  | 'vote-recorded'
  | 'extension-vote-start'
  | 'participant-joined'
  | 'participant-left'
  | 'match-found'
  | 'matching-progress'
  | 'matching-joined'
  | 'matching-left'
  | 'room-message'
  | 'room-like-received'
  | 'speaker-request-created'
  | 'speaker-request-expired'
  | 'friend-request-received'
  | 'friend-request-accepted'
  | 'friend-request-rejected';

type EventHandler = (data: any) => void;

interface WebSocketEventState {
  listeners: Map<WebSocketEvent, Set<EventHandler>>;
  
  // Actions
  subscribe: (event: WebSocketEvent, handler: EventHandler) => () => void;
  unsubscribe: (event: WebSocketEvent, handler: EventHandler) => void;
  emit: (event: WebSocketEvent, data: any) => void;
  setupListeners: () => void;
  cleanupListeners: () => void;
}

export const useWebSocketEventStore = create<WebSocketEventState>(
  errorTracking(
    logger((set, get) => {
  const listeners = new Map<WebSocketEvent, Set<EventHandler>>();

  const setupListeners = () => {
    const socket = websocketClient.getSocket();
    if (!socket || !socket.connected) {
      return;
    }

    // Setup a single listener for each event type that dispatches to all handlers
    const events: WebSocketEvent[] = [
      'room-update',
      'room-created',
      'room-closed',
      'room-joined',
      'room-left',
      'room-error',
      'timer-update',
      'vote-result',
      'vote-recorded',
      'extension-vote-start',
      'participant-joined',
      'participant-left',
      'match-found',
      'matching-progress',
      'matching-joined',
      'matching-left',
      'room-message',
      'room-like-received',
      'speaker-request-created',
      'speaker-request-expired',
      'friend-request-received',
      'friend-request-accepted',
      'friend-request-rejected',
    ];

    events.forEach((event) => {
      // Remove existing listener to avoid duplicates
      socket.off(event);
      
      // Add new listener that dispatches to all registered handlers
      socket.on(event, (data: any) => {
        // Track WebSocket events for analytics
        try {
          switch (event) {
            case 'room-created':
              trackEvent('websocket_room_created', {
                roomId: data?.roomId || data?.id,
                roomName: data?.name,
              });
              break;
            case 'room-closed':
              trackEvent('websocket_room_closed', {
                roomId: data?.roomId || data?.id,
              });
              break;
            case 'match-found':
              trackEvent('websocket_match_found', {
                matchId: data?.matchId,
                roomId: data?.roomId,
              });
              break;
            case 'participant-joined':
              trackEvent('websocket_participant_joined', {
                roomId: data?.roomId,
                participantId: data?.participantId || data?.userId,
                role: data?.role,
              });
              break;
            case 'participant-left':
              trackEvent('websocket_participant_left', {
                roomId: data?.roomId,
                participantId: data?.participantId || data?.userId,
              });
              break;
            case 'vote-result':
              trackEvent('websocket_vote_result', {
                roomId: data?.roomId,
                result: data?.result,
                yesVotes: data?.yesVotes,
                noVotes: data?.noVotes,
              });
              break;
            case 'extension-vote-start':
              trackEvent('websocket_extension_vote_start', {
                roomId: data?.roomId,
              });
              break;
            case 'friend-request-received':
              trackEvent('websocket_friend_request_received', {
                requestId: data?.requestId,
                fromUserId: data?.fromUserId,
              });
              break;
            case 'friend-request-accepted':
              trackEvent('websocket_friend_request_accepted', {
                requestId: data?.requestId,
                friendId: data?.friendId,
              });
              break;
            case 'speaker-request-created':
              trackEvent('websocket_speaker_request_created', {
                roomId: data?.roomId,
                requestId: data?.requestId,
                userId: data?.userId,
              });
              break;
          }
        } catch (error) {
          // Analytics errors should not break the app
          if (__DEV__) {
            console.error(`[Analytics] Error tracking WebSocket event ${event}:`, error);
          }
        }

        const currentListeners = get().listeners.get(event);
        if (currentListeners) {
          currentListeners.forEach((handler) => {
            try {
              handler(data);
            } catch (error) {
              console.error(`Error in ${event} handler:`, error);
            }
          });
        }
      });
    });
  };

  const cleanupListeners = () => {
    const socket = websocketClient.getSocket();
    if (!socket) {
      return;
    }

    const events: WebSocketEvent[] = [
      'room-update',
      'room-created',
      'room-closed',
      'room-joined',
      'room-left',
      'room-error',
      'timer-update',
      'vote-result',
      'vote-recorded',
      'extension-vote-start',
      'participant-joined',
      'participant-left',
      'match-found',
      'matching-progress',
      'matching-joined',
      'matching-left',
      'room-message',
      'room-like-received',
      'speaker-request-created',
      'speaker-request-expired',
      'friend-request-received',
      'friend-request-accepted',
      'friend-request-rejected',
    ];

    events.forEach((event) => {
      socket.off(event);
    });
  };

  return {
    listeners,

    subscribe: (event: WebSocketEvent, handler: EventHandler) => {
      const currentListeners = get().listeners;
      if (!currentListeners.has(event)) {
        currentListeners.set(event, new Set());
      }
      currentListeners.get(event)!.add(handler);

      // Setup listeners if socket is connected
      const socket = websocketClient.getSocket();
      if (socket && socket.connected) {
        setupListeners();
      }

      // Return unsubscribe function
      return () => {
        get().unsubscribe(event, handler);
      };
    },

    unsubscribe: (event: WebSocketEvent, handler: EventHandler) => {
      const handlers = listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          listeners.delete(event);
        }
      }
    },

    emit: (event: WebSocketEvent, data: any) => {
      const handlers = listeners.get(event);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in ${event} handler:`, error);
          }
        });
      }
    },

    setupListeners,
    cleanupListeners,
  };
    }, 'websocketEventStore'),
    'websocketEventStore'
  )
);

