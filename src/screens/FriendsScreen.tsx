import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedBackground } from '../components/v2/AnimatedBackground';
import { GlassCard } from '../components/v2/GlassCard';
import { GradientText } from '../components/v2/GradientText';
import { BottomNav } from '../components/v2/BottomNav';
import { LoadingSpinner } from '../components/v2/LoadingSpinner';
import { useFriendsStore } from '../stores/friendsStore';
import { generateAvatarFromSeed } from '../utils/avatarUtils';
import { toast } from '../stores/toastStore';

type TabType = 'friends' | 'requests' | 'suggestions';

export default function FriendsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    friends,
    receivedRequests,
    sentRequests,
    suggestions,
    loading,
    fetchFriends,
    fetchReceivedRequests,
    fetchSentRequests,
    fetchSuggestions,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    addFriend,
  } = useFriendsStore();

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriends().catch(console.error);
    } else if (activeTab === 'requests') {
      fetchReceivedRequests().catch(console.error);
      fetchSentRequests().catch(console.error);
    } else if (activeTab === 'suggestions') {
      fetchSuggestions().catch(console.error);
    }
  }, [activeTab, fetchFriends, fetchReceivedRequests, fetchSentRequests, fetchSuggestions]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
      toast.success('Arkadaşlık isteği kabul edildi');
    } catch (error) {
      toast.error('İstek kabul edilemedi');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectRequest(requestId);
      toast.success('Arkadaşlık isteği reddedildi');
    } catch (error) {
      toast.error('İstek reddedilemedi');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelRequest(requestId);
      toast.success('İstek iptal edildi');
    } catch (error) {
      toast.error('İstek iptal edilemedi');
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await addFriend(userId);
      toast.success('Arkadaşlık isteği gönderildi');
    } catch (error) {
      toast.error('İstek gönderilemedi');
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuggestions = suggestions.filter((suggestion) =>
    suggestion.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <GradientText style={styles.title}>Arkadaşlar</GradientText>
          <Text style={styles.subtitle}>
            {activeTab === 'friends' && `${friends.length} arkadaş`}
            {activeTab === 'requests' && `${receivedRequests.length} gelen istek`}
            {activeTab === 'suggestions' && `${suggestions.length} öneri`}
          </Text>
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
            onPress={() => setActiveTab('friends')}>
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
              Arkadaşlar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
            onPress={() => setActiveTab('requests')}>
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              İstekler
              {receivedRequests.length > 0 && (
                <Text style={styles.tabBadge}> {receivedRequests.length}</Text>
              )}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'suggestions' && styles.tabActive]}
            onPress={() => setActiveTab('suggestions')}>
            <Text style={[styles.tabText, activeTab === 'suggestions' && styles.tabTextActive]}>
              Öneriler
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Search */}
        {(activeTab === 'friends' || activeTab === 'suggestions') && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.searchContainer}>
            <GlassCard style={styles.searchCard}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Ara..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </GlassCard>
          </Animated.View>
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : (
          <>
            {activeTab === 'friends' && (
              <View style={styles.list}>
                {filteredFriends.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyText}>Henüz arkadaşınız yok</Text>
                  </View>
                ) : (
                  filteredFriends.map((friend, index) => (
                    <Animated.View
                      key={friend.id}
                      entering={FadeInDown.delay(400 + index * 50)}>
                      <GlassCard style={styles.friendCard}>
                        <View style={styles.friendRow}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {friend.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.friendInfo}>
                            <Text style={styles.friendName}>{friend.name}</Text>
                            <Text style={styles.friendEmail}>{friend.email}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.messageButton}
                            onPress={() => (navigation as any).navigate('Chat', { userId: friend.id })}>
                            <Ionicons name="chatbubble" size={20} color="#22d3ee" />
                          </TouchableOpacity>
                        </View>
                      </GlassCard>
                    </Animated.View>
                  ))
                )}
              </View>
            )}

            {activeTab === 'requests' && (
              <View style={styles.list}>
                {receivedRequests.length === 0 && sentRequests.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="mail-outline" size={64} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyText}>Henüz istek yok</Text>
                  </View>
                ) : (
                  <>
                    {receivedRequests.length > 0 && (
                      <>
                        <Text style={styles.sectionTitle}>Gelen İstekler</Text>
                        {receivedRequests.map((request, index) => (
                          <Animated.View
                            key={request.id}
                            entering={FadeInDown.delay(400 + index * 50)}>
                            <GlassCard style={styles.requestCard}>
                              <View style={styles.requestRow}>
                                <View style={styles.avatar}>
                                  <Text style={styles.avatarText}>
                                    {request.fromUser.name.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.requestInfo}>
                                  <Text style={styles.requestName}>{request.fromUser.name}</Text>
                                </View>
                                <View style={styles.requestActions}>
                                  <TouchableOpacity
                                    style={styles.acceptButton}
                                    onPress={() => handleAcceptRequest(request.id)}>
                                    <Ionicons name="checkmark" size={20} color="#fff" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.rejectButton}
                                    onPress={() => handleRejectRequest(request.id)}>
                                    <Ionicons name="close" size={20} color="#fff" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </GlassCard>
                          </Animated.View>
                        ))}
                      </>
                    )}

                    {sentRequests.length > 0 && (
                      <>
                        <Text style={styles.sectionTitle}>Gönderilen İstekler</Text>
                        {sentRequests.map((request, index) => (
                          <Animated.View
                            key={request.id}
                            entering={FadeInDown.delay(400 + index * 50)}>
                            <GlassCard style={styles.requestCard}>
                              <View style={styles.requestRow}>
                                <View style={styles.avatar}>
                                  <Text style={styles.avatarText}>
                                    {request.toUser.name.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.requestInfo}>
                                  <Text style={styles.requestName}>{request.toUser.name}</Text>
                                </View>
                                <TouchableOpacity
                                  style={styles.cancelButton}
                                  onPress={() => handleCancelRequest(request.id)}>
                                  <Ionicons name="close" size={20} color="#fff" />
                                </TouchableOpacity>
                              </View>
                            </GlassCard>
                          </Animated.View>
                        ))}
                      </>
                    )}
                  </>
                )}
              </View>
            )}

            {activeTab === 'suggestions' && (
              <View style={styles.list}>
                {filteredSuggestions.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="person-add-outline" size={64} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyText}>Öneri bulunamadı</Text>
                  </View>
                ) : (
                  filteredSuggestions.map((suggestion, index) => (
                    <Animated.View
                      key={suggestion.id}
                      entering={FadeInDown.delay(400 + index * 50)}>
                      <GlassCard style={styles.suggestionCard}>
                        <View style={styles.suggestionRow}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                              {suggestion.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.suggestionInfo}>
                            <Text style={styles.suggestionName}>{suggestion.name}</Text>
                            <Text style={styles.suggestionEmail}>{suggestion.email}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => handleAddFriend(suggestion.id)}>
                            <Ionicons name="person-add" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </GlassCard>
                    </Animated.View>
                  ))
                )}
              </View>
            )}
          </>
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
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    color: '#22d3ee',
    fontWeight: 'bold',
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
  list: {
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
  friendCard: {
    padding: 16,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  friendEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  messageButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
    marginBottom: 8,
  },
  requestCard: {
    padding: 16,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4ade80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionCard: {
    padding: 16,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  suggestionEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
