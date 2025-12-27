import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {useAuthStore} from '../stores/authStore';
import {privateMessagesApi, PrivateMessage} from '../services/api/privateMessagesApi';
import {generateAvatarFromSeed} from '../utils/avatarUtils';
import {toast} from '../stores/toastStore';

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const {userId} = route.params as {userId: string};
  const {user} = useAuthStore();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMessages();
  }, [userId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await privateMessagesApi.getMessages(userId);
      setMessages(data);
    } catch (error) {
      console.error('Mesajlar yüklenemedi:', error);
      toast.error('Mesajlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const messageText = message.trim();
    setMessage('');
    setSending(true);

    try {
      const newMessage = await privateMessagesApi.sendMessage(userId, messageText);
      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      toast.error('Mesaj gönderilemedi');
      setMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const otherUser = messages[0]?.senderId === user?.id
    ? messages[0]?.receiver
    : messages[0]?.sender;

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            {otherUser && (
              <>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {otherUser.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.headerName}>{otherUser.name}</Text>
                  <Text style={styles.headerStatus}>Çevrimiçi</Text>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Messages */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}>
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Henüz mesaj yok</Text>
                <Text style={styles.emptySubtext}>İlk mesajı sen gönder!</Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isCurrentUser = msg.senderId === user?.id;
                const sender = msg.sender || otherUser;

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageContainer,
                      isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft,
                    ]}>
                    <GlassCard
                      style={[
                        styles.messageBubble,
                        isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
                      ]}>
                      <Text style={styles.messageText}>{msg.content}</Text>
                      <Text style={styles.messageTime}>{formatTime(msg.createdAt)}</Text>
                    </GlassCard>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Input */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.inputContainer}>
          <GlassCard style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Mesaj yazın..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!message.trim() || sending}>
              {sending ? (
                <LoadingSpinner size="small" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 8,
  },
  messageContainer: {
    marginBottom: 8,
  },
  messageContainerLeft: {
    alignItems: 'flex-start',
  },
  messageContainerRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
  },
  messageBubbleLeft: {
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    borderTopRightRadius: 4,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
  },
  messageText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    padding: 12,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
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


