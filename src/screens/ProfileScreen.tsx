import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {BottomNav} from '../components/v2/BottomNav';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {useAuthStore} from '../stores/authStore';
import {usersApi} from '../services/api/usersApi';
import {generateAvatarFromSeed} from '../utils/avatarUtils';
import {toast} from '../stores/toastStore';

interface UserStats {
  totalRooms: number;
  totalFriends: number;
  totalMessages: number;
  level: number;
  experience: number;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const {user, logout} = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userStats = await usersApi.getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigation.navigate('Login' as never);
    } catch (error) {
      toast.error('Çıkış yapılırken bir hata oluştu');
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <AnimatedBackground />
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
        <BottomNav />
      </View>
    );
  }

  const avatar = user.avatar
    ? {uri: user.avatar}
    : generateAvatarFromSeed(user.id.charCodeAt(0));

  const experienceForNextLevel = stats ? (stats.level + 1) * 100 : 100;
  const experienceProgress = stats
    ? (stats.experience / experienceForNextLevel) * 100
    : 0;

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <GradientText style={styles.title}>Profil</GradientText>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <GlassCard style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {avatar && typeof avatar === 'object' && 'uri' in avatar ? (
                  <Image source={avatar} style={styles.avatarImage} />
                ) : avatar && 'gradient' in avatar ? (
                  <LinearGradient
                    colors={[avatar.gradient.from, avatar.gradient.to]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>

              {/* User Info */}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {stats && (
                  <View style={styles.levelBadge}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    <Text style={styles.levelText}>Seviye {stats.level}</Text>
                  </View>
                )}
              </View>

              {/* Edit Button */}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProfile' as never)}>
                <Ionicons name="create-outline" size={20} color="#22d3ee" />
              </TouchableOpacity>
            </View>

            {/* Experience Bar */}
            {stats && (
              <View style={styles.experienceContainer}>
                <View style={styles.experienceHeader}>
                  <Text style={styles.experienceLabel}>Deneyim</Text>
                  <Text style={styles.experienceValue}>
                    {stats.experience} / {experienceForNextLevel} XP
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {width: `${experienceProgress}%`}]} />
                </View>
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* Stats */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : stats ? (
          <Animated.View entering={FadeInDown.delay(300)}>
            <GlassCard style={styles.statsCard}>
              <Text style={styles.sectionTitle}>İstatistikler</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Ionicons name="mic" size={24} color="#22d3ee" />
                  <Text style={styles.statValue}>{stats.totalRooms}</Text>
                  <Text style={styles.statLabel}>Oda</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={24} color="#a855f7" />
                  <Text style={styles.statValue}>{stats.totalFriends}</Text>
                  <Text style={styles.statLabel}>Arkadaş</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="chatbubbles" size={24} color="#ec4899" />
                  <Text style={styles.statValue}>{stats.totalMessages}</Text>
                  <Text style={styles.statLabel}>Mesaj</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        ) : null}

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.actionsContainer}>
          <GlassCard style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Settings' as never)}>
              <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.7)" />
              <Text style={styles.actionText}>Ayarlar</Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Friends' as never)}>
              <Ionicons name="people-outline" size={20} color="rgba(255,255,255,0.7)" />
              <Text style={styles.actionText}>Arkadaşlar</Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Notifications' as never)}>
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.7)" />
              <Text style={styles.actionText}>Bildirimler</Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={[styles.actionText, styles.logoutText]}>Çıkış Yap</Text>
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileCard: {
    padding: 24,
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fbbf24',
  },
  editButton: {
    padding: 8,
  },
  experienceContainer: {
    marginTop: 16,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  experienceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  experienceValue: {
    fontSize: 14,
    color: '#22d3ee',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: 4,
  },
  statsCard: {
    padding: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionsCard: {
    padding: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  logoutText: {
    color: '#ef4444',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
});
