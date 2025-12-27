/**
 * WebSocket Event Type Definitions
 */

export interface RoomUpdateEvent {
  room?: {
    id: string;
    name: string;
    category: string;
    maxParticipants: number;
    currentParticipants: number;
    timeLeftSec: number;
    durationSec: number;
    extended: boolean;
    participants: Array<{
      id: string;
      name: string;
      gender: 'male' | 'female';
      avatar?: string;
    }>;
    maleCount: number;
    femaleCount: number;
  };
  joinedUser?: {
    id: string;
    name: string;
    gender: 'male' | 'female';
    avatar?: string;
  };
  leftUser?: {
    id: string;
    name: string;
  };
}

export interface RoomCreatedEvent {
  room: {
    id: string;
    name: string;
    category: string;
    maxParticipants: number;
  };
}

export interface RoomClosedEvent {
  roomId: string;
  reason: string;
}

export interface TimerUpdateEvent {
  roomId: string;
  timeLeft: number;
}

export interface ExtensionVoteStartEvent {
  roomId: string;
  timeLeft: number;
  message?: string;
}

export interface VoteRecordedEvent {
  roomId: string;
  userId: string;
  vote: 'yes' | 'no';
}

export interface VoteResultEvent {
  roomId: string;
  extensionYes: number;
  extensionNo: number;
  extended: boolean;
}

export interface MatchFoundEvent {
  roomId: string;
  room: {
    id: string;
    name: string;
    category: string;
  };
}

export interface MatchingProgressEvent {
  participants: number;
  required: number;
  estimatedTime?: number;
}

export interface RoomMessageEvent {
  id: string;
  roomId: string;
  participantId: string;   // Anonim participant ID
  content: string;
  pinned: boolean;
  createdAt: string;
  blindName: string;       // Anonim isim
  avatarSeed?: number;     // Avatar seed
  gender: 'male' | 'female';
  // Deprecated: userId ve user alanları artık kullanılmıyor
  userId?: string;         // Deprecated - backward compatibility için
  user?: {                 // Deprecated - backward compatibility için
    id: string;
    name: string;
    gender: 'male' | 'female';
  };
}

export interface RoomLikeEvent {
  roomId: string;
  fromUserId: string;
  toUserId: string;
}

export interface SpeakerRequestCreatedEvent {
  requestId: string;
  userId: string;
  roomId: string;
  user: {
    id: string;
    name: string;
    gender: 'male' | 'female';
  };
}

export interface SpeakerRequestExpiredEvent {
  requestId: string;
  userId: string;
  roomId: string;
}

export interface FriendRequestReceivedEvent {
  requestId: string;
  fromUserId: string;
  fromUser: {
    id: string;
    name: string;
    email: string;
    gender: 'male' | 'female';
  };
}

export interface FriendRequestAcceptedEvent {
  requestId: string;
  friend: {
    id: string;
    name: string;
    email: string;
    gender: 'male' | 'female';
  };
}

export interface FriendRequestRejectedEvent {
  requestId: string;
}

export interface FriendOnlineEvent {
  userId: string;
}

export interface ParticipantKickedEvent {
  userId: string;
  kickedBy: string;
  roomId: string;
}

export interface ParticipantMutedEvent {
  userId: string;
  muted: boolean;
  mutedBy: string;
  roomId: string;
}

export interface RoomInviteEvent {
  inviteId: string;
  roomId: string;
  inviterId: string;
  inviteeId: string;
}

export interface FriendOfflineEvent {
  userId: string;
}

export interface UserTypingEvent {
  userId: string;
  isTyping: boolean;
}

export interface MessageReactionAddedEvent {
  messageId: string;
  userId: string;
  reaction: string;
}

export interface MessageReactionRemovedEvent {
  messageId: string;
  userId: string;
  reaction: string;
}

export type WebSocketEvent =
  | {type: 'room-update'; data: RoomUpdateEvent}
  | {type: 'room-created'; data: RoomCreatedEvent}
  | {type: 'room-closed'; data: RoomClosedEvent}
  | {type: 'timer-update'; data: TimerUpdateEvent}
  | {type: 'extension-vote-start'; data: ExtensionVoteStartEvent}
  | {type: 'vote-recorded'; data: VoteRecordedEvent}
  | {type: 'vote-result'; data: VoteResultEvent}
  | {type: 'match-found'; data: MatchFoundEvent}
  | {type: 'matching-progress'; data: MatchingProgressEvent}
  | {type: 'room-message'; data: RoomMessageEvent}
  | {type: 'room-like-received'; data: RoomLikeEvent}
  | {type: 'speaker-request-created'; data: SpeakerRequestCreatedEvent}
  | {type: 'speaker-request-expired'; data: SpeakerRequestExpiredEvent}
  | {type: 'friend-request-received'; data: FriendRequestReceivedEvent}
  | {type: 'friend-request-accepted'; data: FriendRequestAcceptedEvent}
  | {type: 'friend-request-rejected'; data: FriendRequestRejectedEvent}
  | {type: 'participant-kicked'; data: ParticipantKickedEvent}
  | {type: 'participant-muted'; data: ParticipantMutedEvent}
  | {type: 'room-invite'; data: RoomInviteEvent};

export interface WebSocketEventMap {
  'room-update': RoomUpdateEvent;
  'room-created': RoomCreatedEvent;
  'room-closed': RoomClosedEvent;
  'timer-update': TimerUpdateEvent;
  'extension-vote-start': ExtensionVoteStartEvent;
  'vote-recorded': VoteRecordedEvent;
  'vote-result': VoteResultEvent;
  'match-found': MatchFoundEvent;
  'matching-progress': MatchingProgressEvent;
  'room-message': RoomMessageEvent;
  'room-like-received': RoomLikeEvent;
  'speaker-request-created': SpeakerRequestCreatedEvent;
  'speaker-request-expired': SpeakerRequestExpiredEvent;
  'friend-request-received': FriendRequestReceivedEvent;
  'friend-request-accepted': FriendRequestAcceptedEvent;
  'friend-request-rejected': FriendRequestRejectedEvent;
  'participant-kicked': ParticipantKickedEvent;
  'participant-muted': ParticipantMutedEvent;
  'room-invite': RoomInviteEvent;
}








