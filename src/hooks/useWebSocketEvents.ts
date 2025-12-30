import { useEffect, useRef } from 'react';
import { useWebSocketEventStore } from '../stores/websocketEventStore';
import { useRoomsStore } from '../stores/roomsStore';
import { useNavigation } from './useNavigation';
import {
  RoomUpdateEvent,
  RoomCreatedEvent,
  RoomClosedEvent,
  TimerUpdateEvent,
  VoteResultEvent,
  MatchFoundEvent,
  MatchingProgressEvent,
} from '../types/websocket';

interface UseWebSocketEventsOptions {
  onRoomUpdate?: (data: RoomUpdateEvent) => void;
  onRoomCreated?: (data: RoomCreatedEvent) => void;
  onRoomClosed?: (data: RoomClosedEvent) => void;
  onTimerUpdate?: (data: TimerUpdateEvent) => void;
  onVoteResult?: (data: VoteResultEvent) => void;
  onParticipantJoined?: (data: RoomUpdateEvent) => void;
  onParticipantLeft?: (data: RoomUpdateEvent) => void;
  onMatchFound?: (data: MatchFoundEvent) => void;
  onMatchingProgress?: (data: MatchingProgressEvent) => void;
}

export const useWebSocketEvents = (options: UseWebSocketEventsOptions = {}) => {
  const subscribe = useWebSocketEventStore((state) => state.subscribe);
  const { fetchRooms, updateRoom } = useRoomsStore();
  const navigation = useNavigation();
  const optionsRef = useRef(options);

  // Update options ref
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Room update handler
    if (options.onRoomUpdate || true) {
      const unsubscribe = subscribe('room-update', (data: RoomUpdateEvent) => {
        if (data.room) {
          updateRoom(data.room.id, data.room as any);
        }
        optionsRef.current.onRoomUpdate?.(data);
      });
      unsubscribers.push(unsubscribe);
    }

    // Room created handler
    if (options.onRoomCreated || true) {
      const unsubscribe = subscribe('room-created', (data: RoomCreatedEvent) => {
        fetchRooms();
        optionsRef.current.onRoomCreated?.(data);
      });
      unsubscribers.push(unsubscribe);
    }

    // Room closed handler
    if (options.onRoomClosed || true) {
      const unsubscribe = subscribe('room-closed', (data: RoomClosedEvent) => {
        fetchRooms();
        // Navigate back if we're in the closed room
        const currentParams = (navigation as any).currentParams;
        if (currentParams?.roomId === data.roomId) {
          (navigation as any).goBack();
        }
        optionsRef.current.onRoomClosed?.(data);
      });
      unsubscribers.push(unsubscribe);
    }

    // Timer update handler
    if (options.onTimerUpdate) {
      const unsubscribe = subscribe('timer-update', (data: TimerUpdateEvent) => {
        optionsRef.current.onTimerUpdate?.(data);
      });
      unsubscribers.push(unsubscribe);
    }

    // Vote result handler
    if (options.onVoteResult) {
      const unsubscribe = subscribe('vote-result', (data: VoteResultEvent) => {
        optionsRef.current.onVoteResult?.(data);
      });
      unsubscribers.push(unsubscribe);
    }

    // Participant joined handler
    if (options.onParticipantJoined) {
      const unsubscribe = subscribe('room-update', (data: RoomUpdateEvent) => {
        if (data.joinedUser) {
          optionsRef.current.onParticipantJoined?.(data);
        }
      });
      unsubscribers.push(unsubscribe);
    }

    // Participant left handler
    if (options.onParticipantLeft) {
      const unsubscribe = subscribe('room-update', (data: RoomUpdateEvent) => {
        if (data.leftUser) {
          optionsRef.current.onParticipantLeft?.(data);
        }
      });
      unsubscribers.push(unsubscribe);
    }

    // Match found handler
    if (options.onMatchFound) {
      const unsubscribe = subscribe('match-found', (data: MatchFoundEvent) => {
        optionsRef.current.onMatchFound?.(data);
      });
      unsubscribers.push(unsubscribe);
    }

    // Matching progress handler
    if (options.onMatchingProgress) {
      const unsubscribe = subscribe('matching-progress', (data: MatchingProgressEvent) => {
        optionsRef.current.onMatchingProgress?.(data);
      });
      unsubscribers.push(unsubscribe);
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [subscribe, fetchRooms, updateRoom, navigation, options]);
};


















