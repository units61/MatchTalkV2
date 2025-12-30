import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedBackground } from '../components/v2/AnimatedBackground';
import { BottomNav } from '../components/v2/BottomNav';
import { GlassCard } from '../components/v2/GlassCard';
import { GradientText } from '../components/v2/GradientText';
import { LoadingSpinner } from '../components/v2/LoadingSpinner';
import { roomsApi } from '../services/api/roomsApi';
import { toast } from '../stores/toastStore';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [isSearching, setIsSearching] = useState(false);
  const navigation = useNavigation();

  // Animation values
  const micScale = useSharedValue(1);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0.3);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0.3);
  const ring3Scale = useSharedValue(1);
  const ring3Opacity = useSharedValue(0.3);
  const rotateValue = useSharedValue(0);

  const [ready, setReady] = useState(false);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setReady(true);

      // Animated rings
      ring1Scale.value = withRepeat(
        withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ring1Opacity.value = withRepeat(
        withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      ring2Scale.value = withRepeat(
        withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ring2Opacity.value = withRepeat(
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      ring3Scale.value = withRepeat(
        withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ring3Opacity.value = withRepeat(
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Rotating ring
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      );
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  if (!ready) {
    return <View style={[styles.container, { backgroundColor: '#000' }]} />;
  }

  React.useEffect(() => {
    if (isSearching) {
      micScale.value = withRepeat(
        withSpring(1.05, { damping: 8 }),
        -1,
        true
      );
    } else {
      micScale.value = withSpring(1);
    }
  }, [isSearching]);

  const handleMicPress = async () => {
    if (isSearching) return;

    setIsSearching(true);
    try {
      const room = await roomsApi.autoJoinRoom();
      if (room) {
        toast.success('Oda bulundu! Katılıyorsunuz...');
        setTimeout(() => {
          navigation.navigate('Room' as any, { roomId: room.id } as any);
        }, 500);
      } else {
        toast.info('Uygun oda bulunamadı. Aktif odaları görüntülüyorsunuz...');
        navigation.navigate('Rooms' as any);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu');
      navigation.navigate('Rooms' as any);
    } finally {
      setIsSearching(false);
    }
  };

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const micButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <AnimatedBackground />
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(200)} style={styles.headerCard}>
          <GlassCard style={styles.card}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#22d3ee', '#06b6d4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}>
                  <Ionicons name="mic" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <GradientText style={styles.title}>Oda Bul</GradientText>
              <Text style={styles.subtitle}>Sesli sohbet odalarına anında katıl</Text>
            </View>
          </GlassCard>
        </Animated.View>

        <View style={styles.micContainer}>
          {/* Animated rings */}
          <Animated.View style={[styles.ring, ring3Style]} />
          <Animated.View style={[styles.ring, ring2Style]} />
          <Animated.View style={[styles.ring, ring1Style]} />

          {/* Rotating outer ring */}
          <Animated.View style={[styles.outerRing, rotateStyle]}>
            {Array.from({ length: 60 }).map((_, i) => {
              const angle = (i * 360) / 60;
              const isActive = i % 3 === 0;
              return (
                <View
                  key={i}
                  style={[
                    styles.equalizerBar,
                    {
                      transform: [{ rotate: `${angle}deg` }],
                      height: isActive ? 16 : 8,
                    },
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Inner ring */}
          <Animated.View style={[styles.innerRing, { transform: [{ rotate: '-360deg' }] }]}>
            {Array.from({ length: 40 }).map((_, i) => {
              const angle = (i * 360) / 40;
              const isActive = i % 2 === 0;
              return (
                <View
                  key={i}
                  style={[
                    styles.equalizerBarInner,
                    {
                      transform: [{ rotate: `${angle}deg` }],
                      height: isActive ? 12 : 6,
                    },
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Center microphone button */}
          <Animated.View style={micButtonStyle}>
            <TouchableOpacity
              style={styles.micButton}
              onPress={handleMicPress}
              disabled={isSearching}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#a855f7', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.micButtonGradient}>
                <Ionicons name="mic" size={80} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.delay(400)} style={styles.bottomButton}>
          <TouchableOpacity
            style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
            onPress={handleMicPress}
            disabled={isSearching}
            activeOpacity={0.8}>
            <LinearGradient
              colors={['rgba(34, 211, 238, 0.2)', 'rgba(168, 85, 247, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.searchButtonGradient}>
              {isSearching ? (
                <>
                  <LoadingSpinner size="small" />
                  <Text style={styles.searchButtonText}>En uygun oda aranıyor...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#22d3ee" />
                  <Text style={styles.searchButtonText}>Başlamak için mikrofona dokunun</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  content: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 100,
    justifyContent: 'space-between',
  },
  headerCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    position: 'relative',
    overflow: 'visible',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconContainer: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  iconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  micContainer: {
    width: 288,
    height: 288,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  outerRing: {
    position: 'absolute',
    width: 288,
    height: 288,
    borderRadius: 144,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equalizerBar: {
    position: 'absolute',
    width: 3,
    backgroundColor: '#fff',
    top: -8,
    left: '50%',
    transformOrigin: 'center 152px',
  },
  innerRing: {
    position: 'absolute',
    width: 224,
    height: 224,
    borderRadius: 112,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equalizerBarInner: {
    position: 'absolute',
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    top: -6,
    left: '50%',
    transformOrigin: 'center 120px',
  },
  micButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  micButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButton: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  searchButton: {
    borderRadius: 16,
    height: 56,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

