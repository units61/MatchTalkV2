import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useAuthStore} from '../../stores/authStore';
import {generateAvatarFromSeed, getGradientStyle} from '../../utils/avatarUtils';

export interface MessageReaction {
  type: 'like' | 'love' | 'laugh';
  userId: string;
  userName: string;
}

export interface RoomMessage {
  id: string;
  participantId?: string;
  userId?: string;
  blindName?: string;
  userName?: string;
  avatarSeed?: number;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  userType: 'speaker' | 'listener';
  isPinned?: boolean;
  reactions?: MessageReaction[];
  onReaction?: (messageId: string, reactionType: 'like' | 'love' | 'laugh') => void;
  onPin?: (messageId: string) => void;
  onReport?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  canDelete?: boolean;
}

interface RoomChatProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  messages: RoomMessage[];
  onSendMessage: (message: string) => void;
  currentUserType?: 'speaker' | 'listener';
  isLoading?: boolean;
  rateLimitActive?: boolean;
  rateLimitCountdown?: number;
}

export function RoomChat({
  isOpen,
  onClose,
  roomId,
  messages,
  onSendMessage,
  currentUserType = 'listener',
  isLoading = false,
  rateLimitActive = false,
  rateLimitCountdown = 0,
}: RoomChatProps) {
  const {user} = useAuthStore();
  const [message, setMessage] = useState('');
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (message.trim() && currentUserType === 'listener') {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getReactionCount = (msg: RoomMessage, type: 'like' | 'love' | 'laugh') => {
    return msg.reactions?.filter((r) => r.type === type).length || 0;
  };

  const hasUserReacted = (msg: RoomMessage, type: 'like' | 'love' | 'laugh') => {
    return msg.reactions?.some((r) => r.userId === user?.id && r.type === type) || false;
  };

  // Sort messages: pinned first, then by timestamp
  const sortedMessages = [...messages].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return a.timestamp.getTime() - b.timestamp.getTime();
  });

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.chatPanel}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sohbet</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Messages List */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}>
            {isLoading && sortedMessages.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Yükleniyor...</Text>
              </View>
            ) : sortedMessages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Henüz mesaj yok</Text>
                <Text style={styles.emptySubtext}>İlk mesajı sen gönder!</Text>
              </View>
            ) : (
              sortedMessages.map((msg) => {
                const isCurrentUser = (msg.userId || msg.participantId) === user?.id;
                const displayName = msg.blindName || msg.userName || 'User';
                const avatarSeed = msg.avatarSeed;
                const avatar = avatarSeed !== undefined ? generateAvatarFromSeed(avatarSeed) : null;

                return (
                  <View key={msg.id} style={styles.messageContainer}>
                    {msg.isPinned && (
                      <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={12} color="#fbbf24" />
                        <Text style={styles.pinnedText}>Sabitlendi</Text>
                      </View>
                    )}
                    <View style={styles.messageRow}>
                      {/* Avatar */}
                      <View style={styles.avatarContainer}>
                        {avatar?.gradient ? (
                          <LinearGradient
                            colors={[avatar.gradient.from, avatar.gradient.to]}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                            style={[
                              styles.avatar,
                              msg.userType === 'speaker' && styles.avatarSpeaker,
                            ]}>
                            <Text style={styles.avatarText}>
                              {displayName.charAt(0).toUpperCase()}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View
                            style={[
                              styles.avatar,
                              msg.userType === 'speaker' && styles.avatarSpeaker,
                            ]}>
                            <Text style={styles.avatarText}>
                              {displayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {/* User Type Badge */}
                        <View
                          style={[
                            styles.typeBadge,
                            msg.userType === 'speaker' ? styles.typeBadgeSpeaker : styles.typeBadgeListener,
                          ]}>
                          <Ionicons
                            name={msg.userType === 'speaker' ? 'mic' : 'headset'}
                            size={10}
                            color="#fff"
                          />
                        </View>
                      </View>

                      {/* Message Content */}
                      <View style={styles.messageContent}>
                        <View style={styles.messageHeader}>
                          <Text style={styles.messageName}>{displayName}</Text>
                          {msg.userType === 'speaker' && (
                            <View style={styles.speakerBadge}>
                              <Text style={styles.speakerBadgeText}>Konuşmacı</Text>
                            </View>
                          )}
                          <Text style={styles.messageTime}>{formatTime(msg.timestamp)}</Text>
                        </View>
                        <View
                          style={[
                            styles.messageBubble,
                            msg.userType === 'speaker' ? styles.messageBubbleSpeaker : styles.messageBubbleListener,
                          ]}>
                          <Text style={styles.messageText}>{msg.message}</Text>
                        </View>

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <View style={styles.reactionsContainer}>
                            {(['like', 'love', 'laugh'] as const).map((type) => {
                              const count = getReactionCount(msg, type);
                              if (count === 0) return null;
                              const icons = {like: 'thumbs-up', love: 'heart', laugh: 'happy'};
                              const iconName = icons[type];
                              return (
                                <View key={type} style={styles.reactionBadge}>
                                  <Ionicons name={iconName as any} size={12} color="rgba(255,255,255,0.6)" />
                                  <Text style={styles.reactionCount}>{count}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}

                        {/* Message Actions */}
                        <View style={styles.messageActions}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              hasUserReacted(msg, 'like') && styles.actionButtonActive,
                            ]}
                            onPress={() => msg.onReaction?.(msg.id, 'like')}>
                            <Ionicons
                              name="thumbs-up"
                              size={16}
                              color={hasUserReacted(msg, 'like') ? '#22d3ee' : 'rgba(255,255,255,0.4)'}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              hasUserReacted(msg, 'love') && styles.actionButtonActive,
                            ]}
                            onPress={() => msg.onReaction?.(msg.id, 'love')}>
                            <Ionicons
                              name="heart"
                              size={16}
                              color={hasUserReacted(msg, 'love') ? '#ec4899' : 'rgba(255,255,255,0.4)'}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              hasUserReacted(msg, 'laugh') && styles.actionButtonActive,
                            ]}
                            onPress={() => msg.onReaction?.(msg.id, 'laugh')}>
                            <Ionicons
                              name="happy"
                              size={16}
                              color={hasUserReacted(msg, 'laugh') ? '#fbbf24' : 'rgba(255,255,255,0.4)'}
                            />
                          </TouchableOpacity>
                          
                          {/* Additional Actions (Pin, Report, Delete) */}
                          {msg.onPin && (
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => msg.onPin?.(msg.id)}>
                              <Ionicons
                                name={msg.isPinned ? 'pin' : 'pin-outline'}
                                size={16}
                                color={msg.isPinned ? '#fbbf24' : 'rgba(255,255,255,0.4)'}
                              />
                            </TouchableOpacity>
                          )}
                          
                          {msg.onReport && (
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => msg.onReport?.(msg.id)}>
                              <Ionicons
                                name="flag-outline"
                                size={16}
                                color="rgba(255,255,255,0.4)"
                              />
                            </TouchableOpacity>
                          )}
                          
                          {msg.onDelete && msg.canDelete && (
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => msg.onDelete?.(msg.id)}>
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color="rgba(239, 68, 68, 0.8)"
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Input Area */}
          {currentUserType === 'listener' && (
            <View style={styles.inputContainer}>
              {rateLimitActive && (
                <View style={styles.rateLimitBanner}>
                  <Text style={styles.rateLimitText}>
                    Çok hızlı mesaj gönderiyorsunuz. {rateLimitCountdown} saniye bekleyin.
                  </Text>
                </View>
              )}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Mesaj yazın..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  multiline
                  maxLength={500}
                  editable={!rateLimitActive}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={!message.trim() || rateLimitActive}>
                  <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  chatPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: 'rgba(15, 12, 41, 0.35)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 12,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 4,
  },
  messageContainer: {
    marginBottom: 8,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingLeft: 8,
  },
  pinnedText: {
    color: '#fbbf24',
    fontSize: 12,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarSpeaker: {
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0f0c29',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeSpeaker: {
    backgroundColor: 'rgba(34, 211, 238, 0.8)',
  },
  typeBadgeListener: {
    backgroundColor: 'rgba(156, 163, 175, 0.8)',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  messageName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  speakerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  speakerBadgeText: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '500',
  },
  messageTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginLeft: 'auto',
  },
  messageBubble: {
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
  },
  messageBubbleSpeaker: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  messageBubbleListener: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  messageText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  reactionsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    marginLeft: 44,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reactionCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    marginLeft: 44,
  },
  actionButton: {
    padding: 6,
    borderRadius: 16,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  rateLimitBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  rateLimitText: {
    color: '#ef4444',
    fontSize: 12,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});


