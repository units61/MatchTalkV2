import React, {useEffect, useMemo, useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {BottomNav} from '../components/v2/BottomNav';
import {useRoomsStore} from '../stores/roomsStore';
import {toast} from '../stores/toastStore';
import {websocketClient} from '../lib/websocketClient';
import {useWebSocketEventStore} from '../stores/websocketEventStore';

const categories = ['Tümü', 'genel', 'hızlı-tanışma', 'oyun', 'eğlence', 'derin-sohbet', 'gece'];

function formatTime(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds ?? 0);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function RoomsScreen() {
  const navigation = useNavigation();
  const {rooms, fetchRooms, creating} = useRoomsStore();
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('genel');
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [durationSec, setDurationSec] = useState(300);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const {subscribe, unsubscribe} = useWebSocketEventStore();

  // İlk yükleme ve periyodik güncelleme
  useEffect(() => {
    fetchRooms().catch((error) => {
      console.error('Odalar yüklenemedi:', error);
      toast.error('Odalar yüklenirken bir hata oluştu.');
    });

    // Periyodik güncelleme (her 5 saniyede bir)
    pollingIntervalRef.current = setInterval(() => {
      fetchRooms().catch((error) => {
        console.error('Odalar güncellenemedi:', error);
      });
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchRooms]);

  // WebSocket ile real-time güncelleme
  useEffect(() => {
    const handleNewRoom = () => {
      fetchRooms().catch((error) => {
        console.error('Odalar güncellenemedi:', error);
      });
    };

    const handleRoomClosed = () => {
      fetchRooms().catch((error) => {
        console.error('Odalar güncellenemedi:', error);
      });
    };

    const handleRoomUpdated = () => {
      fetchRooms().catch((error) => {
        console.error('Odalar güncellenemedi:', error);
      });
    };

    const unsub1 = subscribe('room-created', handleNewRoom);
    const unsub2 = subscribe('room-closed', handleRoomClosed);
    const unsub3 = subscribe('room-update', handleRoomUpdated);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [subscribe, fetchRooms]);

  const filteredRooms = useMemo(
    () =>
      selectedCategory === 'Tümü'
        ? rooms
        : rooms.filter((room) => room.category === selectedCategory),
    [rooms, selectedCategory],
  );

  const handleRoomClick = (roomId: string) => {
    navigation.navigate('Room' as never, {roomId} as never);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('Lütfen bir oda adı girin.');
      return;
    }

    try {
      const room = await useRoomsStore.getState().createRoom({
        name: newRoomName.trim(),
        category: newRoomCategory,
        maxParticipants,
        durationSec,
        theme: 'default',
      });

      setShowCreateModal(false);
      setNewRoomName('');

      navigation.navigate('Room' as never, {roomId: room.id} as never);
    } catch (error) {
      console.error('Oda oluşturulamadı:', error);
      toast.error(
        error instanceof Error ? error.message : 'Lütfen daha sonra tekrar deneyin.',
      );
    }
  };

  const getCategoryEmoji = (category: string) => {
    if (category === 'gece') return '🌙';
    if (category === 'oyun') return '🎮';
    return '🎧';
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <GradientText style={styles.title}>Odalar</GradientText>
            <Text style={styles.subtitle}>{filteredRooms.length} aktif oda</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Oda Oluştur</Text>
          </TouchableOpacity>
        </View>

        {/* Category Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Room List */}
        <View style={styles.roomList}>
          {filteredRooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.roomCard}
              onPress={() => handleRoomClick(room.id)}>
              <GlassCard style={styles.roomCardContent}>
                <View style={styles.roomCardHeader}>
                  <View style={styles.roomIcon}>
                    <Text style={styles.roomIconText}>{getCategoryEmoji(room.category)}</Text>
                  </View>

                  <View style={styles.roomInfo}>
                    <Text style={styles.roomName} numberOfLines={1}>
                      {room.name}
                    </Text>
                    <Text style={styles.roomCategory}>{room.category}</Text>
                  </View>

                  <View style={styles.roomStats}>
                    <View style={styles.statBadge}>
                      <Ionicons name="people" size={14} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.statText}>{room.currentParticipants}</Text>
                    </View>

                    <View style={[styles.statBadge, styles.timeBadge]}>
                      <Ionicons name="time" size={14} color="#22d3ee" />
                      <Text style={[styles.statText, styles.timeText]}>
                        {formatTime(room.timeLeftSec)}
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {filteredRooms.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Bu kategoride oda bulunamadı</Text>
          </View>
        )}
      </ScrollView>

      {/* Create Room Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => !creating && setShowCreateModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !creating && setShowCreateModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <GlassCard style={styles.modalContent}>
              <Text style={styles.modalTitle}>Yeni Oda Oluştur</Text>

              <View style={styles.modalForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Oda Adı</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newRoomName}
                    onChangeText={setNewRoomName}
                    placeholder="Örn: Hızlı Sohbet"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Kategori</Text>
                  <View style={styles.selectContainer}>
                    <Text style={styles.selectText}>{newRoomCategory}</Text>
                    <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.6)" />
                  </View>
                  {/* TODO: Implement Picker for category selection */}
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, styles.formGroupHalf]}>
                    <Text style={styles.formLabel}>Maks. Katılımcı</Text>
                    <View style={styles.selectContainer}>
                      <Text style={styles.selectText}>{maxParticipants}</Text>
                      <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.6)" />
                    </View>
                    <Text style={styles.formHint}>Çift sayı olmalıdır (2, 4, 6, 8)</Text>
                  </View>

                  <View style={[styles.formGroup, styles.formGroupHalf]}>
                    <Text style={styles.formLabel}>Süre (sn)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={durationSec.toString()}
                      onChangeText={(text) => setDurationSec(Number(text) || 300)}
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                    />
                    <Text style={styles.formHint}>60-600 saniye arası</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setShowCreateModal(false)}
                  disabled={creating}>
                  <Text style={styles.modalButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleCreateRoom}
                  disabled={creating}>
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                      Oluştur ve Katıl
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categories: {
    marginBottom: 24,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
  categoryText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  roomList: {
    gap: 12,
  },
  roomCard: {
    marginBottom: 12,
  },
  roomCardContent: {
    padding: 16,
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  roomIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomIconText: {
    fontSize: 24,
  },
  roomInfo: {
    flex: 1,
    minWidth: 0,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  roomCategory: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  roomStats: {
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeBadge: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  timeText: {
    color: '#22d3ee',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  modalForm: {
    gap: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  formInput: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectText: {
    color: '#fff',
    fontSize: 16,
  },
  formHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalButtonPrimary: {
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
  },
  modalButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});
