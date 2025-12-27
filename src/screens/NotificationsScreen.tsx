import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {BottomNav} from '../components/v2/BottomNav';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {notificationsApi, Notification} from '../services/api/notificationsApi';
import {toast} from '../stores/toastStore';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
      toast.error('Bildirimler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? {...n, read: true} : n))
      );
    } catch (error) {
      console.error('Bildirim okundu olarak işaretlenemedi:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({...n, read: true})));
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
      toast.error('Bildirimler güncellenemedi');
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.read : true
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'person-add';
      case 'room_invite':
        return 'mic';
      case 'message':
        return 'chatbubble';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'friend_request':
        return '#a855f7';
      case 'room_invite':
        return '#22d3ee';
      case 'message':
        return '#ec4899';
      case 'system':
        return '#fbbf24';
      default:
        return 'rgba(255,255,255,0.7)';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes}dk önce`;
    if (hours < 24) return `${hours}sa önce`;
    if (days < 7) return `${days}gün önce`;
    return date.toLocaleDateString('tr-TR', {day: 'numeric', month: 'short'});
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <GradientText style={styles.title}>Bildirimler</GradientText>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={handleMarkAllAsRead}>
                <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Filters */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}>
            <Text
              style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'unread' && styles.filterChipActive]}
            onPress={() => setFilter('unread')}>
            <Text
              style={[
                styles.filterText,
                filter === 'unread' && styles.filterTextActive,
              ]}>
              Okunmamış
              {unreadCount > 0 && (
                <Text style={styles.filterBadge}> {unreadCount}</Text>
              )}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Notifications List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : filteredNotifications.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color="rgba(255,255,255,0.3)"
            />
            <Text style={styles.emptyText}>
              {filter === 'unread' ? 'Okunmamış bildirim yok' : 'Henüz bildirim yok'}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.notificationsList}>
            {filteredNotifications.map((notification, index) => (
              <Animated.View
                key={notification.id}
                entering={FadeInDown.delay(300 + index * 50)}>
                <TouchableOpacity
                  style={styles.notificationCard}
                  onPress={() => !notification.read && handleMarkAsRead(notification.id)}>
                  <GlassCard style={styles.notificationContent}>
                    <View style={styles.notificationRow}>
                      {/* Icon */}
                      <View
                        style={[
                          styles.iconContainer,
                          {backgroundColor: `${getNotificationColor(notification.type)}20`},
                        ]}>
                        <Ionicons
                          name={getNotificationIcon(notification.type) as any}
                          size={24}
                          color={getNotificationColor(notification.type)}
                        />
                      </View>

                      {/* Content */}
                      <View style={styles.notificationInfo}>
                        <View style={styles.notificationHeader}>
                          <Text style={styles.notificationTitle} numberOfLines={1}>
                            {notification.title}
                          </Text>
                          {!notification.read && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.notificationMessage} numberOfLines={2}>
                          {notification.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatTime(notification.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              </Animated.View>
            ))}
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
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
  },
  markAllText: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: '500',
  },
  filters: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
  filterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterBadge: {
    color: '#22d3ee',
    fontWeight: 'bold',
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
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    marginBottom: 12,
  },
  notificationContent: {
    padding: 16,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationInfo: {
    flex: 1,
    minWidth: 0,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});
