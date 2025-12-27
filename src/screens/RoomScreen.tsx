import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {RoomChat, RoomMessage} from '../components/v2/RoomChat';
import {VoteModal} from '../components/v2/VoteModal';
import {useAuthStore} from '../stores/authStore';
import {useRoomsStore} from '../stores/roomsStore';
import {useAgoraStore} from '../stores/agoraStore';
import {useWebSocketStore} from '../stores/websocketStore';
import {websocketClient} from '../lib/websocketClient';
import {roomsApi, messagesApi} from '../services/api/roomsApi';
import {agoraApi} from '../services/api/agoraApi';
import {toast} from '../stores/toastStore';
import {generateAvatarFromSeed, getGradientStyle} from '../utils/avatarUtils';
import {Participant, Room} from '../types/room';
import {
  RoomUpdateEvent,
  ExtensionVoteStartEvent,
  VoteResultEvent,
  RoomClosedEvent,
  RoomMessageEvent,
  SpeakerRequestCreatedEvent,
} from '../types/websocket';
import {getRelativeTime} from '../utils/timeUtils';
import {trackEvent} from '../utils/analytics';

const {width} = Dimensions.get('window');

export default function RoomScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const {roomId} = route.params as {roomId?: string};
  const {user} = useAuthStore();
  const {currentRoom, setCurrentRoom, updateRoom, leaveRoom} = useRoomsStore();
  const {
    isJoined: isAgoraJoined,
    joinChannel: joinAgoraChannel,
    leaveChannel: leaveAgoraChannel,
    toggleMute: toggleAgoraMute,
    publishAudio,
    isMuted: agoraIsMuted,
  } = useAgoraStore();
  const {socket: wsSocket} = useWebSocketStore();

  // State
  const [remainingTime, setRemainingTime] = useState(300);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteTimeLeft, setVoteTimeLeft] = useState(10);
  const [hasVoted, setHasVoted] = useState(false);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserType, setCurrentUserType] = useState<'speaker' | 'listener'>('listener');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [pendingRequests, setPendingRequests] = useState<Array<{
    id: string;
    userId: string;
    user: {id: string; name: string; gender: string};
    createdAt: string;
  }>>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [rateLimitActive, setRateLimitActive] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Refs
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const agoraJoinedRef = useRef(false);
  const roomLoadAttemptedRef = useRef(false);
  const isNavigatingAwayRef = useRef(false);

  const isModerator = user?.role === 'admin' || user?.role === 'moderator';
  const isHost = currentRoom?.hostId === user?.id;
  const speakers = participants.filter((p) => p.role === 'speaker');
  const listeners = participants.filter((p) => p.role === 'listener');
  const maxParticipants = currentRoom?.maxParticipants || 2;

  // Helper: Update timer state
  const updateTimerState = (room: Room) => {
    const isTimerStarted = (room.timeLeftSec || 0) > 0;
    setTimerStarted(isTimerStarted);
    if (isTimerStarted) {
      setRemainingTime(room.timeLeftSec || 0);
    } else {
      setRemainingTime(0);
    }
  };

  // Load room data
  useEffect(() => {
    if (!roomId || roomLoadAttemptedRef.current) return;

    const loadRoomData = async () => {
      roomLoadAttemptedRef.current = true;
      try {
        const room = await roomsApi.getRoomById(roomId);
        if (room) {
          // Map participants to ensure they have required fields
          const mappedParticipants: Participant[] = (room.participants || []).map((p: any) => ({
            id: p.id,
            blindName: p.blindName || p.name || 'User',
            avatarSeed: p.avatarSeed,
            gender: p.gender,
            role: (p.role || 'listener') as 'speaker' | 'listener',
            isSpeaking: p.isSpeaking || false,
            isMuted: p.isMuted || false,
            userId: p.userId,
            name: p.name, // Deprecated but keep for compatibility
            avatar: p.avatar, // Deprecated but keep for compatibility
          }));

          // Create Room object with all required fields
          const roomWithParticipants: Room = {
            ...room,
            participants: mappedParticipants,
            createdAt: (room as any).createdAt || new Date().toISOString(),
          };

          updateRoom(room.id, roomWithParticipants as Partial<Room>);
          setCurrentRoom(roomWithParticipants);
          updateTimerState(roomWithParticipants);
          setParticipants(mappedParticipants);

          const userParticipant = mappedParticipants.find(
            (p) => p.userId === user?.id || p.id === user?.id
          );
          const userType = userParticipant?.role === 'speaker' ? 'speaker' : 'listener';
          setCurrentUserType(userType);

          // Load messages
          try {
            const roomMessages = await messagesApi.getRoomMessages(roomId);
            const formattedMessages: RoomMessage[] = roomMessages.map((msg) => ({
              id: msg.id,
              participantId: msg.participantId,
              userId: msg.userId,
              blindName: msg.blindName,
              userName: msg.user?.name,
              avatarSeed: msg.avatarSeed,
              message: msg.content,
              timestamp: new Date(msg.createdAt),
              userType: 'listener' as 'speaker' | 'listener', // Default to listener, will be updated from participant
              isPinned: msg.pinned,
              reactions: [],
            }));
            setMessages(formattedMessages);
          } catch (error) {
            console.error('Error loading messages:', error);
          }

          trackEvent('room_join', {
            roomId: room.id,
            roomName: room.name,
            category: room.category,
            userType,
            participantCount: room.participants?.length || 0,
          });
        }
      } catch (error) {
        console.error('Error loading room data:', error);
        toast.error('Oda yüklenemedi');
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    };

    loadRoomData();

    return () => {
      roomLoadAttemptedRef.current = false;
    };
  }, [roomId, user?.id]);

  // Join WebSocket room
  useEffect(() => {
    if (!roomId) return;

    const joinRoomSocket = async () => {
      try {
        await websocketClient.connect();
        await websocketClient.joinRoom(roomId);
      } catch (error) {
        console.warn('WebSocket connection warning:', error);
      }
    };

    joinRoomSocket();
  }, [roomId]);

  // Join Agora channel
  useEffect(() => {
    if (!roomId || !user?.id || participants.length === 0) return;
    if (agoraJoinedRef.current || isAgoraJoined) return;

    agoraJoinedRef.current = true;

    const joinAgora = async () => {
      try {
        const tokenResponse = await agoraApi.generateToken(roomId);
        const userParticipant = participants.find((p) => p.id === user.id);
        const userRole = userParticipant?.role === 'speaker' ? 'speaker' : 'listener';
        await joinAgoraChannel(
          tokenResponse.channelName,
          tokenResponse.token,
          tokenResponse.uid,
          userRole
        );
        agoraJoinedRef.current = true;
      } catch (error) {
        console.error('Error joining Agora channel:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (
          !errorMessage.includes('credentials not configured') &&
          !errorMessage.includes('503')
        ) {
          toast.error('Ses bağlanamadı');
        }
      }
    };

    joinAgora();

    return () => {
      agoraJoinedRef.current = false;
      if (isAgoraJoined) {
        leaveAgoraChannel().catch(console.error);
      }
    };
  }, [roomId, user?.id, participants.length, joinAgoraChannel, leaveAgoraChannel, isAgoraJoined]);

  // Timer countdown
  useEffect(() => {
    if (!timerStarted || remainingTime <= 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timerStarted, remainingTime]);

  // Vote timer
  useEffect(() => {
    if (!showVoteModal || voteTimeLeft <= 0) {
      if (voteTimerRef.current) {
        clearInterval(voteTimerRef.current);
        voteTimerRef.current = null;
      }
      if (voteTimeLeft <= 0 && showVoteModal) {
        setShowVoteModal(false);
      }
      return;
    }

    voteTimerRef.current = setInterval(() => {
      setVoteTimeLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (voteTimerRef.current) {
        clearInterval(voteTimerRef.current);
        voteTimerRef.current = null;
      }
    };
  }, [showVoteModal, voteTimeLeft]);

  // WebSocket event listeners
  useEffect(() => {
    if (!roomId) return;

    const handleRoomUpdate = (data: RoomUpdateEvent) => {
      if (data.room) {
        // Map participants
        const mappedParticipants: Participant[] = ((data.room as any).participants || []).map((p: any) => ({
          id: p.id,
          blindName: p.blindName || p.name || 'User',
          avatarSeed: p.avatarSeed,
          gender: p.gender,
          role: (p.role || 'listener') as 'speaker' | 'listener',
          isSpeaking: p.isSpeaking || false,
          isMuted: p.isMuted || false,
          userId: p.userId,
          name: p.name,
          avatar: p.avatar,
        }));

        const roomWithParticipants: Room = {
          ...data.room,
          participants: mappedParticipants,
          createdAt: (data.room as any).createdAt || new Date().toISOString(),
        };

        updateRoom(roomWithParticipants.id, roomWithParticipants as Partial<Room>);
        setCurrentRoom(roomWithParticipants);
        updateTimerState(roomWithParticipants);
        setParticipants(mappedParticipants);

        const userParticipant = mappedParticipants.find(
          (p) => p.userId === user?.id || p.id === user?.id
        );
        if (userParticipant) {
          const newUserType = userParticipant.role === 'speaker' ? 'speaker' : 'listener';
          setCurrentUserType(newUserType);
        }
      }
    };

    const handleRoomMessage = (data: RoomMessageEvent) => {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.id === data.id);
        if (exists) return prev;

        const newMessage: RoomMessage = {
          id: data.id,
          participantId: data.participantId,
          userId: data.userId,
          blindName: data.blindName,
          userName: data.user?.name,
          avatarSeed: data.avatarSeed,
          message: data.content,
          timestamp: new Date(data.createdAt),
          userType: currentUserType,
          isPinned: data.pinned,
          reactions: [],
        };
        return [...prev, newMessage];
      });
    };

    const handleRoomClosed = (data: RoomClosedEvent) => {
      if (data.roomId === roomId) {
        toast.error('Oda kapatıldı');
        setTimeout(() => {
          navigation.goBack();
        }, 1000);
      }
    };

    const handleExtensionVoteStart = (data: ExtensionVoteStartEvent) => {
      if (data.roomId === roomId) {
        setShowVoteModal(true);
        setVoteTimeLeft(data.timeLeft || 10);
        setHasVoted(false);
      }
    };

    const handleVoteResult = (data: VoteResultEvent) => {
      if (data.roomId === roomId) {
        setShowVoteModal(false);
        if (data.extended) {
          toast.success('Oda süresi uzatıldı!');
        } else {
          toast.info('Oda süresi uzatılmadı');
        }
      }
    };

    const socket = wsSocket || websocketClient.getSocket();
    if (!socket) return;

    socket.on('room-update', handleRoomUpdate);
    socket.on('room-message', handleRoomMessage);
    socket.on('room-closed', handleRoomClosed);
    socket.on('extension-vote-start', handleExtensionVoteStart);
    socket.on('vote-result', handleVoteResult);

    return () => {
      socket.off('room-update', handleRoomUpdate);
      socket.off('room-message', handleRoomMessage);
      socket.off('room-closed', handleRoomClosed);
      socket.off('extension-vote-start', handleExtensionVoteStart);
      socket.off('vote-result', handleVoteResult);
    };
  }, [roomId, user?.id, currentUserType, wsSocket]);

  // Handlers
  const handleSendMessage = async (message: string) => {
    if (!roomId || !user) return;

    try {
      const socket = websocketClient.getSocket();
      if (!socket || !socket.connected) {
        toast.error('WebSocket bağlantısı yok');
        return;
      }

      socket.emit('room-message', {
        roomId,
        message,
        userType: currentUserType,
      });

      trackEvent('message_send', {
        roomId,
        messageLength: message.length,
        userType: currentUserType,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Mesaj gönderilirken bir hata oluştu');
    }
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      toggleAgoraMute();
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleVote = async (vote: 'yes' | 'no') => {
    if (!roomId || hasVoted) return;

    try {
      const socket = websocketClient.getSocket();
      if (!socket || !socket.connected) {
        toast.error('WebSocket bağlantısı yok');
        return;
      }

      socket.emit('extension-vote', {roomId, vote});
      setHasVoted(true);
      setShowVoteModal(false);
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Oylama gönderilirken bir hata oluştu');
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId) return;

    Alert.alert('Odadan Ayrıl', 'Odadan ayrılmak istediğinize emin misiniz?', [
      {text: 'İptal', style: 'cancel'},
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveRoom(roomId);
            if (isAgoraJoined) {
              await leaveAgoraChannel();
            }
            websocketClient.leaveRoom(roomId).catch(console.error);
            navigation.goBack();
          } catch (error) {
            console.error('Error leaving room:', error);
            toast.error('Odadan ayrılırken bir hata oluştu');
          }
        },
      },
    ]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCirclePosition = (index: number, total: number) => {
    const angle = (index * 360) / total - 90;
    const radius = 120;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    return {x: width / 2 + x, y: 200 + y};
  };

  if (!roomId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Oda ID bulunamadı</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AnimatedBackground />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeaveRoom} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.roomName}>{currentRoom?.name || 'Oda'}</Text>
            <Text style={styles.roomCategory}>{currentRoom?.category || ''}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsChatOpen(true)}
            style={styles.headerButton}>
            <Ionicons name="chatbubbles" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Timer */}
        {timerStarted && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.timerContainer}>
            <GlassCard style={styles.timerCard}>
              <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
            </GlassCard>
          </Animated.View>
        )}

        {/* Participant Circle */}
        <View style={styles.participantCircle}>
          {speakers.map((participant, index) => {
            const position = getCirclePosition(index, maxParticipants);
            const isCurrentUser = participant.id === user?.id;
            const avatar = participant.avatarSeed !== undefined
              ? generateAvatarFromSeed(participant.avatarSeed)
              : null;

            return (
              <Animated.View
                key={participant.id}
                style={[
                  styles.participantAvatar,
                  {
                    left: position.x - 32,
                    top: position.y - 32,
                  },
                ]}>
                {avatar?.gradient ? (
                  <LinearGradient
                    colors={[avatar.gradient.from, avatar.gradient.to]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={[
                      styles.avatarGradient,
                      participant.isSpeaking && styles.avatarSpeaking,
                    ]}>
                    <Text style={styles.avatarText}>
                      {(participant.blindName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      styles.avatarGradient,
                      participant.isSpeaking && styles.avatarSpeaking,
                    ]}>
                    <Text style={styles.avatarText}>
                      {(participant.blindName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {participant.isMuted && (
                  <View style={styles.mutedOverlay}>
                    <Ionicons name="mic-off" size={16} color="#ef4444" />
                  </View>
                )}
                {participant.userId === currentRoom?.hostId && (
                  <View style={styles.hostBadge}>
                    <Ionicons name="star" size={12} color="#fbbf24" />
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {currentUserType === 'speaker' ? (
            <View style={styles.speakerControls}>
              <TouchableOpacity
                onPress={handleToggleMute}
                style={[styles.micButton, isMuted && styles.micButtonMuted]}>
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={32}
                  color={isMuted ? '#ef4444' : '#22d3ee'}
                />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{isMuted ? 'Mikrofon Kapalı' : 'Mikrofon Açık'}</Text>
            </View>
          ) : (
            <View style={styles.listenerControls}>
              <Text style={styles.listenerText}>Dinleyici olarak katıldınız</Text>
              <Text style={styles.listenerSubtext}>Konuşmacı olmak için host'tan izin isteyin</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.infoText}>
            {speakers.length} Konuşmacı • {listeners.length} Dinleyici
          </Text>
        </View>
      </ScrollView>

      {/* Chat Modal */}
      <RoomChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        roomId={roomId}
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUserType={currentUserType}
        rateLimitActive={rateLimitActive}
        rateLimitCountdown={rateLimitCountdown}
      />

      {/* Vote Modal */}
      <VoteModal
        isOpen={showVoteModal}
        onVote={handleVote}
        onClose={() => setShowVoteModal(false)}
        timeLeft={voteTimeLeft}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  headerButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  roomCategory: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timerCard: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#22d3ee',
  },
  participantCircle: {
    width: width,
    height: 400,
    position: 'relative',
    marginVertical: 32,
  },
  participantAvatar: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSpeaking: {
    borderColor: '#22d3ee',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  mutedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    padding: 24,
    alignItems: 'center',
  },
  speakerControls: {
    alignItems: 'center',
    gap: 16,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
    borderWidth: 3,
    borderColor: '#22d3ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#ef4444',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  listenerControls: {
    alignItems: 'center',
    gap: 8,
  },
  listenerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  listenerSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  info: {
    padding: 16,
    alignItems: 'center',
  },
  infoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
