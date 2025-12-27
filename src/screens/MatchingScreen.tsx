import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {BottomNav} from '../components/v2/BottomNav';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {toast} from '../stores/toastStore';

export default function MatchingScreen() {
  const navigation = useNavigation();
  const [isMatching, setIsMatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isMatching) {
      // Pulse animation
      pulseScale.value = withRepeat(
        withTiming(1.1, {duration: 1000, easing: Easing.inOut(Easing.ease)}),
        -1,
        true
      );

      // Progress simulation
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsMatching(false);
            toast.success('Eşleşme bulundu!');
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isMatching, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulseScale.value}],
  }));

  const handleStartMatching = () => {
    setIsMatching(true);
    toast.info('Eşleşme aranıyor...');
  };

  const handleStopMatching = () => {
    setIsMatching(false);
    setProgress(0);
    toast.info('Eşleşme durduruldu');
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <GradientText style={styles.title}>Eşleşme</GradientText>
          <Text style={styles.subtitle}>
            İlgi alanlarınıza göre yeni insanlarla eşleşin
          </Text>
        </Animated.View>

        {/* Matching Card */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <GlassCard style={styles.matchingCard}>
            {!isMatching ? (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="people" size={64} color="#22d3ee" />
                </View>
                <Text style={styles.matchingTitle}>Eşleşmeye Hazır mısın?</Text>
                <Text style={styles.matchingDescription}>
                  Benzer ilgi alanlarına sahip kişilerle eşleş ve yeni arkadaşlıklar kur
                </Text>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={handleStartMatching}>
                  <Ionicons name="play" size={24} color="#fff" />
                  <Text style={styles.startButtonText}>Eşleşmeyi Başlat</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Animated.View style={[styles.iconContainer, pulseStyle]}>
                  <Ionicons name="search" size={64} color="#22d3ee" />
                </Animated.View>
                <Text style={styles.matchingTitle}>Eşleşme Aranıyor...</Text>
                <Text style={styles.matchingDescription}>
                  Size uygun kişiler aranıyor, lütfen bekleyin
                </Text>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, {width: `${progress}%`}]} />
                  </View>
                  <Text style={styles.progressText}>%{progress}</Text>
                </View>

                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={handleStopMatching}>
                  <Ionicons name="stop" size={20} color="#fff" />
                  <Text style={styles.stopButtonText}>Durdur</Text>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        </Animated.View>

        {/* Info Cards */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={24} color="#4ade80" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Güvenli Eşleşme</Text>
                <Text style={styles.infoDescription}>
                  Tüm kullanıcılar doğrulanmış ve moderasyon altında
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)}>
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="sparkles" size={24} color="#fbbf24" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Akıllı Eşleşme</Text>
                <Text style={styles.infoDescription}>
                  İlgi alanlarınıza ve tercihlerinize göre eşleşme yapılır
                </Text>
              </View>
            </View>
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
  matchingCard: {
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  matchingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  matchingDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: 4,
  },
  progressText: {
    color: '#22d3ee',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    padding: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
