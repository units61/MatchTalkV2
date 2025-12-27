// React Native Agora Client
// Using react-native-agora instead of agora-rtc-sdk-ng
import {
  createAgoraRtcEngine,
  IRtcEngine,
  RtcConnection,
  IRtcEngineEventHandler,
  ClientRoleType,
  AudioProfileType,
  AudioScenarioType,
  ConnectionStateType,
  LOCAL_AUDIO_STREAM_STATE,
} from 'react-native-agora';
import { config } from '../../lib/config';
import { Platform } from 'react-native';

export interface RemoteUser {
  uid: number | string;
  hasAudio: boolean;
  muted: boolean;
}

type AgoraEvent = 'user-joined' | 'user-left' | 'user-published' | 'user-unpublished' | 'audio-level' | 'error';
type EventCallback = (data: any) => void;

class AgoraClient {
  private engine: IRtcEngine | null = null;
  private remoteUsers: Map<number | string, RemoteUser> = new Map();
  private eventListeners: Map<AgoraEvent, Set<EventCallback>> = new Map();
  private isInitialized = false;
  private currentChannel: string | null = null;
  private localUid: number | null = null;
  private isMuted = false;

  async initialize(): Promise<void> {
    if (this.isInitialized && this.engine) {
      return;
    }

    const appId = config.agora.appId;
    if (!appId) {
      throw new Error('Agora App ID is not configured.');
    }

    try {
      this.engine = createAgoraRtcEngine();
      this.engine.initialize({
        appId: appId,
        channelProfile: 1, // CHANNEL_PROFILE_COMMUNICATION
      });

      this.setupEventHandlers();

      this.isInitialized = true;
      console.log('Agora: v4 Engine initialized');
    } catch (error) {
      console.error('Error initializing Agora v4 engine:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.engine) return;

    this.engine.registerEventHandler({
      onUserJoined: (connection: RtcConnection, remoteUid: number, elapsed: number) => {
        console.log('Agora: User joined', remoteUid);
        const remoteUser: RemoteUser = {
          uid: remoteUid,
          hasAudio: false,
          muted: false,
        };
        this.remoteUsers.set(remoteUid, remoteUser);
        this.emit('user-joined', remoteUser);
      },
      onUserOffline: (connection: RtcConnection, remoteUid: number, reason: number) => {
        console.log('Agora: User left', remoteUid);
        this.remoteUsers.delete(remoteUid);
        this.emit('user-left', { uid: remoteUid });
      },
      onRemoteAudioStateChanged: (connection: RtcConnection, remoteUid: number, state: number, reason: number, elapsed: number) => {
        const remoteUser = this.remoteUsers.get(remoteUid);
        if (remoteUser) {
          remoteUser.hasAudio = state === 2; // RemoteAudioState.Decoding
          this.emit('user-published', { uid: remoteUid, mediaType: 'audio' });
        }
      },
      onAudioVolumeIndication: (connection: RtcConnection, speakers: any[], speakerNumber: number, totalVolume: number) => {
        if (!speakers) return;
        speakers.forEach((speaker) => {
          const uid = speaker.uid === 0 ? (this.localUid || 0) : speaker.uid;
          this.emit('audio-level', { uid, level: (speaker.volume || 0) / 255 });
        });
      },
      onConnectionStateChanged: (connection: RtcConnection, state: ConnectionStateType, reason: any) => {
        console.log('Agora: Connection state changed', state);
        if (state === ConnectionStateType.ConnectionStateFailed) {
          this.emit('error', { error: new Error('Connection failed') });
        }
      },
      onError: (err: number, msg: string) => {
        console.error('Agora error:', err, msg);
        this.emit('error', { error: new Error(`Agora error ${err}: ${msg}`) });
      }
    });
  }


  async joinChannel(channelName: string, token?: string, uid?: number, role: 'speaker' | 'listener' = 'listener'): Promise<void> {
    if (!this.isInitialized || !this.engine) {
      await this.initialize();
    }

    if (!this.engine) {
      throw new Error('Agora engine not initialized');
    }

    try {
      await this.engine.enableAudio();
      await this.engine.setAudioProfile(AudioProfileType.AudioProfileDefault, AudioScenarioType.AudioScenarioDefault);

      const assignedUid = uid || 0;
      this.localUid = assignedUid;

      await this.engine.joinChannel(token || '', channelName, assignedUid, {
        clientRoleType: role === 'speaker' ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
      });

      this.currentChannel = channelName;
      this.isMuted = role === 'listener';

      await this.engine.muteLocalAudioStream(this.isMuted);

      console.log('Agora: Joined channel', channelName, 'as', role);
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

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

  async publishAudio(): Promise<void> {
    if (!this.engine || !this.currentChannel) {
      throw new Error('Not in a channel');
    }

    try {
      await this.engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      await this.engine.muteLocalAudioStream(false);
      this.isMuted = false;
      console.log('Agora: Published audio');
    } catch (error) {
      console.error('Error publishing audio:', error);
      throw error;
    }
  }

  async unpublishAudio(): Promise<void> {
    if (!this.engine || !this.currentChannel) {
      return;
    }

    try {
      await this.engine.setClientRole(ClientRoleType.ClientRoleAudience);
      await this.engine.muteLocalAudioStream(true);
      this.isMuted = true;
      console.log('Agora: Unpublished audio');
    } catch (error) {
      console.error('Error unpublishing audio:', error);
      throw error;
    }
  }

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

  getRemoteUsers(): RemoteUser[] {
    return Array.from(this.remoteUsers.values());
  }

  getLocalAudioTrack(): any | null {
    return null;
  }

  isJoined(): boolean {
    return this.currentChannel !== null && this.engine !== null;
  }

  getCurrentChannel(): string | null {
    return this.currentChannel;
  }

  on(event: AgoraEvent, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

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

  async destroy(): Promise<void> {
    try {
      await this.leaveChannel();
      if (this.engine) {
        this.engine.release();
        this.engine = null;
      }
      this.remoteUsers.clear();
      this.eventListeners.clear();
      this.isInitialized = false;
      console.log('Agora: Engine released');
    } catch (error) {
      console.error('Error destroying Agora engine:', error);
      throw error;
    }
  }
}

export const agoraClient = new AgoraClient();



