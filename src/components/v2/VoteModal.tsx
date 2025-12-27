import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import {GlassCard} from './GlassCard';
import {GradientText} from './GradientText';

interface VoteModalProps {
  isOpen: boolean;
  onVote: (vote: 'yes' | 'no') => void;
  onClose: () => void;
  timeLeft?: number; // Kalan oylama süresi (saniye)
  hasVoted?: boolean; // Kullanıcı oy kullandı mı?
  voteResult?: {
    yes: number;
    no: number;
    total: number;
  }; // Oylama sonuçları
}

export function VoteModal({
  isOpen,
  onVote,
  onClose,
  timeLeft = 10,
  hasVoted = false,
  voteResult,
}: VoteModalProps) {
  const [localTimeLeft, setLocalTimeLeft] = useState(timeLeft);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isOpen && !hasVoted && !voteResult) {
      setLocalTimeLeft(timeLeft);
      
      // Pulse animation for timer
      pulseScale.value = withRepeat(
        withTiming(1.1, {duration: 1000, easing: Easing.inOut(Easing.ease)}),
        -1,
        true
      );

      const interval = setInterval(() => {
        setLocalTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, timeLeft, hasVoted, voteResult]);

  const formatTime = (seconds: number) => {
    return seconds.toString().padStart(2, '0');
  };

  const handleVote = (vote: 'yes' | 'no') => {
    if (!hasVoted && !voteResult) {
      onVote(vote);
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulseScale.value}],
  }));

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <GlassCard style={styles.modal}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {/* Timer */}
            {!voteResult && (
              <Animated.View style={[styles.timerContainer, pulseStyle]}>
                <Ionicons name="time" size={20} color="#22d3ee" />
                <Text style={styles.timerText}>
                  {hasVoted ? 'Oylama devam ediyor...' : `${formatTime(localTimeLeft)} saniye kaldı`}
                </Text>
              </Animated.View>
            )}

            {/* Vote Result */}
            {voteResult && (
              <View style={styles.resultContainer}>
                <GradientText style={styles.resultTitle}>Oylama Sonucu</GradientText>
                <View style={styles.resultStats}>
                  <View style={styles.resultItem}>
                    <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                    <Text style={styles.resultLabel}>Evet</Text>
                    <Text style={styles.resultValue}>{voteResult.yes}</Text>
                    <View style={styles.resultBarContainer}>
                      <View
                        style={[
                          styles.resultBar,
                          styles.resultBarYes,
                          {width: `${(voteResult.yes / voteResult.total) * 100}%`},
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.resultItem}>
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                    <Text style={styles.resultLabel}>Hayır</Text>
                    <Text style={styles.resultValue}>{voteResult.no}</Text>
                    <View style={styles.resultBarContainer}>
                      <View
                        style={[
                          styles.resultBar,
                          styles.resultBarNo,
                          {width: `${(voteResult.no / voteResult.total) * 100}%`},
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <Text style={styles.resultSummary}>
                  {voteResult.yes > voteResult.no
                    ? '✅ Oda süresi 3 dakika uzatıldı!'
                    : '❌ Oda süresi uzatılmadı.'}
                </Text>
              </View>
            )}

            {/* Title */}
            <View style={styles.titleContainer}>
              <GradientText style={styles.title}>Süreyi Uzatalım mı?</GradientText>
            </View>
            <Text style={styles.description}>
              Oda süresi bitmek üzere. 3 dakika daha uzatmak ister misiniz?
            </Text>

            {/* Vote Buttons */}
            {!voteResult && (
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[styles.voteButton, hasVoted && styles.voteButtonDisabled]}
                  onPress={() => handleVote('yes')}
                  disabled={hasVoted}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.voteButtonText}>Evet, +3 dakika uzat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.voteButton,
                    styles.voteButtonSecondary,
                    hasVoted && styles.voteButtonDisabled,
                  ]}
                  onPress={() => handleVote('no')}
                  disabled={hasVoted}>
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={[styles.voteButtonText, styles.voteButtonTextSecondary]}>
                    Hayır, bitir
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Close button when vote result is shown */}
            {voteResult && (
              <TouchableOpacity style={styles.closeResultButton} onPress={onClose}>
                <Text style={styles.closeResultButtonText}>Kapat</Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  timerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 16,
  },
  buttonsContainer: {
    gap: 16,
  },
  voteButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteButtonSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  voteButtonTextSecondary: {
    color: '#fff',
  },
  voteButtonDisabled: {
    opacity: 0.5,
  },
  resultContainer: {
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  resultStats: {
    gap: 16,
    marginBottom: 16,
  },
  resultItem: {
    gap: 8,
  },
  resultLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  resultValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  resultBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  resultBar: {
    height: '100%',
    borderRadius: 4,
  },
  resultBarYes: {
    backgroundColor: '#4ade80',
  },
  resultBarNo: {
    backgroundColor: '#ef4444',
  },
  resultSummary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  closeResultButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeResultButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});


