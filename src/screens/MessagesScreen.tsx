import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {BottomNav} from '../components/v2/BottomNav';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {useAuthStore} from '../stores/authStore';
import {privateMessagesApi} from '../services/api/privateMessagesApi';
import {generateAvatarFromSeed} from '../utils/avatarUtils';
import {toast} from '../stores/toastStore';

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  avatarSeed?: number;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline?: boolean;
}

export default function MessagesScreen() {
  const navigation = useNavigation();
  const {user} = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await privateMessagesApi.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Konuşmalar yüklenemedi:', error);
      toast.error('Mesajlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes}dk`;
    if (hours < 24) return `${hours}sa`;
    if (days < 7) return `${days}g`;
    return date.toLocaleDateString('tr-TR', {day: 'numeric', month: 'short'});
  };

  const handleConversationPress = (userId: string) => {
    // Navigate to chat screen
    navigation.navigate('Chat' as never, {userId} as never);
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <GradientText style={styles.title}>Mesajlar</GradientText>
          <Text style={styles.subtitle}>{conversations.length} konuşma</Text>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.searchContainer}>
          <GlassCard style={styles.searchCard}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Mesajlarda ara..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </GlassCard>
        </Animated.View>

        {/* Conversations List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : filteredConversations.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Henüz mesajınız yok'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Farklı bir arama terimi deneyin' : 'Arkadaşlarınızla sohbet etmeye başlayın'}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.conversationsList}>
            {filteredConversations.map((conv, index) => {
              const avatar = conv.avatarSeed !== undefined
                ? generateAvatarFromSeed(conv.avatarSeed)
                : null;

              return (
                <Animated.View
                  key={conv.id}
                  entering={FadeInDown.delay(300 + index * 50)}>
                  <TouchableOpacity
                    style={styles.conversationCard}
                    onPress={() => handleConversationPress(conv.userId)}>
                    <GlassCard style={styles.conversationContent}>
                      <View style={styles.conversationRow}>
                        {/* Avatar */}
                        <View style={styles.avatarContainer}>
                          {avatar?.gradient ? (
                            <View
                              style={[
                                styles.avatar,
                                {backgroundColor: avatar.gradient.from},
                              ]}>
                              <Text style={styles.avatarText}>
                                {conv.userName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.avatar}>
                              <Text style={styles.avatarText}>
                                {conv.userName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          {conv.isOnline && <View style={styles.onlineIndicator} />}
                        </View>

                        {/* Content */}
                        <View style={styles.conversationInfo}>
                          <View style={styles.conversationHeader}>
                            <Text style={styles.conversationName} numberOfLines={1}>
                              {conv.userName}
                            </Text>
                            {conv.lastMessageTime && (
                              <Text style={styles.conversationTime}>
                                {formatTime(conv.lastMessageTime)}
                              </Text>
                            )}
                          </View>
                          <View style={styles.conversationFooter}>
                            <Text style={styles.lastMessage} numberOfLines={1}>
                              {conv.lastMessage || 'Henüz mesaj yok'}
                            </Text>
                            {conv.unreadCount > 0 && (
                              <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{conv.unreadCount}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </View>
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
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    paddingVertical: 48,
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
  conversationsList: {
    gap: 12,
  },
  conversationCard: {
    marginBottom: 12,
  },
  conversationContent: {
    padding: 16,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4ade80',
    borderWidth: 3,
    borderColor: '#0f0c29',
  },
  conversationInfo: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 8,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22d3ee',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
