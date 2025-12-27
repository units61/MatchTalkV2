import {create} from 'zustand';
import {agoraClient, RemoteUser} from '../services/agora/agoraClient';
import {errorTracking, logger} from './middleware';

// React Native için audio track type (agora-rtc-sdk-ng yerine react-native-agora)
type LocalAudioTrack = any; // react-native-agora için uygun type

interface AgoraState {
  // State
  isInitialized: boolean;
  isJoined: boolean;
  channelName: string | null;
  localAudioTrack: LocalAudioTrack | null;
  remoteUsers: RemoteUser[];
  speakingUsers: Record<string | number, boolean>;
  isMuted: boolean;
  isPublishing: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  joinChannel: (channelName: string, token?: string, uid?: number, role?: 'speaker' | 'listener') => Promise<void>;
  leaveChannel: () => Promise<void>;
  toggleMute: () => void;
  publishAudio: () => Promise<void>;
  unpublishAudio: () => Promise<void>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAgoraStore = create<AgoraState>(
  errorTracking(
    logger((set, get) => ({
  // Initial state
  isInitialized: false,
  isJoined: false,
  channelName: null,
  localAudioTrack: null,
  remoteUsers: [],
  speakingUsers: {},
  isMuted: false,
  isPublishing: false,
  error: null,

  // Initialize Agora client
  initialize: async () => {
    try {
      await agoraClient.initialize();
      set({isInitialized: true, error: null});

      // Setup event listeners
      agoraClient.on('user-joined', (user: RemoteUser) => {
        const currentUsers = get().remoteUsers;
        if (!currentUsers.find((u) => u.uid === user.uid)) {
          set({remoteUsers: [...currentUsers, user]});
        }
      });

      agoraClient.on('user-left', (data: {uid: number | string}) => {
        const currentUsers = get().remoteUsers;
        const updatedUsers = currentUsers.filter((u) => u.uid !== data.uid);
        const speaking = {...get().speakingUsers};
        delete speaking[data.uid];
        set({remoteUsers: updatedUsers, speakingUsers: speaking});
      });

      agoraClient.on('user-published', (data: {uid: number | string}) => {
        const remoteUsers = agoraClient.getRemoteUsers();
        set({remoteUsers});
      });

      agoraClient.on('user-unpublished', (data: {uid: number | string}) => {
        const remoteUsers = agoraClient.getRemoteUsers();
        set({remoteUsers});
      });

      // Audio level events (konuşma göstergesi)
      agoraClient.on('audio-level', (data: {uid: number | string; level: number}) => {
        const threshold = 0.2; // Basit eşik, ileride ayarlanabilir
        const isSpeaking = data.level > threshold;
        const current = get().speakingUsers;
        if (current[data.uid] === isSpeaking) {
          return;
        }
        set({
          speakingUsers: {
            ...current,
            [data.uid]: isSpeaking,
          },
        });
      });

      agoraClient.on('error', (data: {error: Error}) => {
        set({error: data.error.message});
        console.error('Agora error:', data.error);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize Agora';
      set({error: errorMessage, isInitialized: false});
      throw error;
    }
  },

  // Join channel
  joinChannel: async (channelName: string, token?: string, uid?: number, role: 'speaker' | 'listener' = 'listener') => {
    try {
      const state = get();
      if (!state.isInitialized) {
        await state.initialize();
      }

      await agoraClient.joinChannel(channelName, token, uid, role);
      const localAudioTrack = agoraClient.getLocalAudioTrack();
      const remoteUsers = agoraClient.getRemoteUsers();

      set({
        isJoined: true,
        channelName,
        localAudioTrack,
        remoteUsers,
        isPublishing: role === 'speaker',
        isMuted: localAudioTrack?.muted || false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join channel';
      set({error: errorMessage, isJoined: false, channelName: null});
      throw error;
    }
  },

  // Leave channel
  leaveChannel: async () => {
    try {
      await agoraClient.leaveChannel();
      set({
        isJoined: false,
        channelName: null,
        localAudioTrack: null,
        remoteUsers: [],
        isPublishing: false,
        isMuted: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave channel';
      set({error: errorMessage});
      throw error;
    }
  },

  // Toggle mute
  toggleMute: () => {
    const state = get();
    if (!state.localAudioTrack) {
      return;
    }

    const newMutedState = !state.isMuted;
    agoraClient.muteLocalAudio(newMutedState);
    set({isMuted: newMutedState});
  },

  // Publish audio
  publishAudio: async () => {
    try {
      await agoraClient.publishAudio();
      set({isPublishing: true, error: null});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish audio';
      set({error: errorMessage});
      throw error;
    }
  },

  // Unpublish audio
  unpublishAudio: async () => {
    try {
      await agoraClient.unpublishAudio();
      set({isPublishing: false, error: null});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unpublish audio';
      set({error: errorMessage});
      throw error;
    }
  },

  // Set error
  setError: (error: string | null) => {
    set({error});
  },

  // Clear error
  clearError: () => {
    set({error: null});
  },
    }), 'agoraStore'),
    'agoraStore'
  )
);

