// React Native Agora Client
// Using react-native-agora instead of agora-rtc-sdk-ng
import RtcEngine, {RtcEngineContext, IRtcEngineEventHandler} from 'react-native-agora';
import {config} from '../../lib/config';
import {Platform} from 'react-native';

export interface RemoteUser {
  uid: number | string;
  hasAudio: boolean;
  muted: boolean;
}

type AgoraEvent = 'user-joined' | 'user-left' | 'user-published' | 'user-unpublished' | 'audio-level' | 'error';

type EventCallback = (data: any) => void;

class AgoraClient {
  private engine: RtcEngine | null = null;
  private remoteUsers: Map<number | string, RemoteUser> = new Map();
  private eventListeners: Map<AgoraEvent, Set<EventCallback>> = new Map();
  private isInitialized = false;
  private currentChannel: string | null = null;
  private localUid: number | null = null;
  private isMuted = false;

  /**
   * Initialize Agora RTC engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.engine) {
      return;
    }

    const appId = config.agora.appId;
    if (!appId) {
      throw new Error('Agora App ID is not configured. Please set REACT_APP_AGORA_APP_ID in your .env file');
    }

    try {
      // Create Agora engine
      this.engine = await RtcEngine.create(appId);
      
      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      console.log('Agora: Engine initialized');
    } catch (error) {
      console.error('Error initializing Agora engine:', error);
      throw error;
    }
  }

  /**
   * Setup Agora engine event handlers
   */
  private setupEventHandlers(): void {
    if (!this.engine) return;

    // User joined
    this.engine.registerEventHandler({
      onUserJoined: (uid: number, elapsed: number) => {
        console.log('Agora: User joined', uid);
        const remoteUser: RemoteUser = {
          uid,
          hasAudio: false,
          muted: false,
        };
        this.remoteUsers.set(uid, remoteUser);
        this.emit('user-joined', remoteUser);
      },
    });

    // User left
    this.engine.registerEventHandler({
      onUserOffline: (uid: number, reason: number) => {
        console.log('Agora: User left', uid);
        this.remoteUsers.delete(uid);
        this.emit('user-left', {uid});
      },
    });

    // Remote audio state changed
    this.engine.registerEventHandler({
      onRemoteAudioStateChanged: (uid: number, state: number, reason: number, elapsed: number) => {
        const remoteUser = this.remoteUsers.get(uid);
        if (remoteUser) {
          remoteUser.hasAudio = state === 2; // STATE_PLAYING
          this.emit('user-published', {uid, mediaType: 'audio'});
        }
      },
    });

    // Audio level indication
    this.engine.registerEventHandler({
      onAudioVolumeIndication: (speakers: any[]) => {
        if (!speakers || !Array.isArray(speakers)) {
          return;
        }
        speakers.forEach((speaker) => {
          if (!speaker || typeof speaker !== 'object') {
            return;
          }
          try {
            if (speaker.uid === 0) {
              // Local user
              this.emit('audio-level', {uid: this.localUid || 0, level: (speaker.volume || 0) / 255});
            } else {
              // Remote user
              this.emit('audio-level', {uid: speaker.uid, level: (speaker.volume || 0) / 255});
            }
          } catch (error) {
            // Silently fail - don't crash on audio level errors
            if (__DEV__) {
              console.warn('[AgoraClient] Error processing audio level:', error);
            }
          }
        });
      },
    });

    // Connection state changed
    this.engine.registerEventHandler({
      onConnectionStateChanged: (state: number, reason: number) => {
        console.log('Agora: Connection state changed', state);
        if (state === 5) { // DISCONNECTED
          this.emit('error', {error: new Error('Connection disconnected')});
        }
      },
    });

    // Error handler
    this.engine.registerEventHandler({
      onError: (err: number, msg: string) => {
        console.error('Agora error:', err, msg);
        this.emit('error', {error: new Error(`Agora error ${err}: ${msg}`)});
      },
    });
  }

  /**
   * Join a channel
   */
  async joinChannel(channelName: string, token?: string, uid?: number, role: 'speaker' | 'listener' = 'listener'): Promise<void> {
    if (!this.isInitialized || !this.engine) {
      await this.initialize();
    }

    if (!this.engine) {
      throw new Error('Agora engine not initialized');
    }

    // Leave current channel if joined
    if (this.currentChannel && this.currentChannel !== channelName) {
      await this.leaveChannel();
    }

    try {
      // Enable audio
      await this.engine.enableAudio();
      
      // Set audio profile
      await this.engine.setAudioProfile(1, 1); // AUDIO_PROFILE_DEFAULT, AUDIO_SCENARIO_DEFAULT

      // Join channel
      const appId = config.agora.appId;
      const assignedUid = uid || 0; // 0 means Agora assigns a UID
      this.localUid = assignedUid;

      await this.engine.joinChannel(token || null, channelName, assignedUid, {
        clientRoleType: role === 'speaker' ? 1 : 2, // BROADCASTER : AUDIENCE
      });

      this.currentChannel = channelName;
      this.isMuted = role === 'listener';
      
      if (role === 'speaker') {
        await this.engine.muteLocalAudioStream(false);
      } else {
        await this.engine.muteLocalAudioStream(true);
      }

      console.log('Agora: Joined channel', channelName, 'as', role);
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

  /**
   * Leave current channel
   */
  async leaveChannel(): Promise<void> {
    if (!this.engine) {
      return;
    }

    try {
      await this.engine.leaveChannel();
      this.currentChannel = null;
      this.localUid = null;
      this.remoteUsers.clear();
      this.isMuted = false;
      console.log('Agora: Left channel');
    } catch (error) {
      console.error('Error leaving channel:', error);
      throw error;
    }
  }

  /**
   * Publish local audio (switch from listener to speaker)
   */
  async publishAudio(): Promise<void> {
    if (!this.engine || !this.currentChannel) {
      throw new Error('Not in a channel');
    }

    try {
      await this.engine.setClientRole(1); // BROADCASTER
      await this.engine.muteLocalAudioStream(false);
      this.isMuted = false;
      console.log('Agora: Published audio');
    } catch (error) {
      console.error('Error publishing audio:', error);
      throw error;
    }
  }

  /**
   * Unpublish local audio (switch from speaker to listener)
   */
  async unpublishAudio(): Promise<void> {
    if (!this.engine || !this.currentChannel) {
      return;
    }

    try {
      await this.engine.setClientRole(2); // AUDIENCE
      await this.engine.muteLocalAudioStream(true);
      this.isMuted = true;
      console.log('Agora: Unpublished audio');
    } catch (error) {
      console.error('Error unpublishing audio:', error);
      throw error;
    }
  }

  /**
   * Mute or unmute local audio
   */
  muteLocalAudio(muted: boolean): void {
    if (!this.engine) {
      return;
    }

    try {
      this.engine.muteLocalAudioStream(muted);
      this.isMuted = muted;
      console.log('Agora: Local audio', muted ? 'muted' : 'unmuted');
    } catch (error) {
      console.error('Error muting/unmuting audio:', error);
      throw error;
    }
  }

  /**
   * Get remote users
   */
  getRemoteUsers(): RemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  /**
   * Get local audio track (not applicable in React Native, returns null)
   */
  getLocalAudioTrack(): any | null {
    return null; // React Native doesn't expose track objects
  }

  /**
   * Check if joined to a channel
   */
  isJoined(): boolean {
    return this.currentChannel !== null && this.engine !== null;
  }

  /**
   * Get current channel name
   */
  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  /**
   * Subscribe to events
   */
  on(event: AgoraEvent, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event: AgoraEvent, callback?: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      return;
    }

    if (callback) {
      this.eventListeners.get(event)!.delete(callback);
    } else {
      this.eventListeners.get(event)!.clear();
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: AgoraEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Cleanup and destroy engine
   */
  async destroy(): Promise<void> {
    try {
      await this.leaveChannel();
      if (this.engine) {
        await RtcEngine.destroy();
        this.engine = null;
      }
      this.remoteUsers.clear();
      this.eventListeners.clear();
      this.isInitialized = false;
      console.log('Agora: Engine destroyed');
    } catch (error) {
      console.error('Error destroying Agora engine:', error);
      throw error;
    }
  }
}

export const agoraClient = new AgoraClient();


