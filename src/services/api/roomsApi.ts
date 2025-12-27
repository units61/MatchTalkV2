import {apiClient} from '../../lib/apiClient';
import {Room, CreateRoomInput} from '../../types/room';
import {trackEvent, trackConversion, trackFunnelStep, trackFunnelCompletion} from '../../utils/analytics';

export const roomsApi = {
  /**
   * Aktif odaları listele
   */
  async getRooms(): Promise<Room[]> {
    return await apiClient.get<Room[]>('/rooms');
  },

  /**
   * Oda detaylarını getir
   */
  async getRoomById(id: string): Promise<Room> {
    return await apiClient.get<Room>(`/rooms/${id}`);
  },

  /**
   * Oda oluştur
   */
  async createRoom(input: CreateRoomInput): Promise<Room> {
    try {
      const room = await apiClient.post<Room>('/rooms', input);
      
      // Track room creation
      trackEvent('room_create', {
        roomId: room.id,
        roomName: room.name,
        category: room.category,
        maxParticipants: room.maxParticipants,
        durationSec: room.durationSec,
      });

      // Track room creation funnel - Step 1: Create room
      trackFunnelStep('room_creation', 'create', {
        roomId: room.id,
      });

      // Track conversion - first room created
      trackConversion('first_room_created', undefined, {
        roomId: room.id,
      });

      return room;
    } catch (error) {
      trackEvent('room_create', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  /**
   * Odaya katıl
   */
  async joinRoom(roomId: string): Promise<Room> {
    try {
      const room = await apiClient.post<Room>(`/rooms/${roomId}/join`);
      
      // Track room join
      trackEvent('room_join', {
        roomId: room.id,
        roomName: room.name,
        category: room.category,
        participantCount: room.participants?.length || 0,
      });

      // Track room creation funnel - Step 2: Join room
      trackFunnelStep('room_creation', 'join', {
        roomId: room.id,
      });

      // Track onboarding funnel - Step 3: First room join
      trackFunnelStep('onboarding', 'first_room_join', {
        roomId: room.id,
      });

      // Track conversion - first room join
      trackConversion('first_room_join', undefined, {
        roomId: room.id,
      });

      return room;
    } catch (error) {
      trackEvent('room_join', {
        roomId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  /**
   * Odadan ayrıl
   */
  async leaveRoom(roomId: string): Promise<{success: boolean}> {
    try {
      const result = await apiClient.post<{success: boolean}>(`/rooms/${roomId}/leave`);
      
      // Track room leave
      trackEvent('room_leave', {
        roomId,
      });

      return result;
    } catch (error) {
      trackEvent('room_leave', {
        roomId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  /**
   * Odayı sonlandır (sadece host)
   */
  async endRoom(roomId: string): Promise<{success: boolean; message?: string}> {
    try {
      const result = await apiClient.post<{success: boolean; message?: string}>(`/rooms/${roomId}/end`);
      
      // Track room close
      trackEvent('room_close', {
        roomId,
        reason: 'host_ended',
      });

      return result;
    } catch (error) {
      trackEvent('room_close', {
        roomId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  /**
   * Dinleyici -> konuşmacı rol talebi oluştur
   */
  async requestSpeakerRole(roomId: string): Promise<{id: string; roomId: string; userId: string; status: string}> {
    return await apiClient.post<{id: string; roomId: string; userId: string; status: string}>(`/rooms/${roomId}/role-request`);
  },

  /**
   * Bekleyen konuşmacı rol isteklerini getir
   */
  async getPendingRoleRequests(roomId: string): Promise<Array<{
    id: string;
    roomId: string;
    userId: string;
    status: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      gender: string;
    };
  }>> {
    return await apiClient.get<Array<{
      id: string;
      roomId: string;
      userId: string;
      status: string;
      createdAt: string;
      user: {
        id: string;
        name: string;
        gender: string;
      };
    }>>(`/rooms/${roomId}/role-requests`);
  },

  /**
   * Konuşmacı rol talebini onayla
   */
  async approveRoleRequest(roomId: string, requestId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/rooms/${roomId}/role-request/${requestId}/approve`);
  },

  /**
   * Konuşmacı rol talebini reddet
   */
  async rejectRoleRequest(roomId: string, requestId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/rooms/${roomId}/role-request/${requestId}/reject`);
  },

  /**
   * Konuşmacının kendi isteğiyle dinleyiciye dönmesi
   */
  async leaveStage(roomId: string): Promise<{success: boolean; roomClosed?: boolean}> {
    return await apiClient.post<{success: boolean; roomClosed?: boolean}>(`/rooms/${roomId}/leave-stage`);
  },

  /**
   * Host'un konuşmacıyı dinleyiciye düşürmesi
   */
  async demoteSpeaker(roomId: string, userId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/rooms/${roomId}/demote-speaker/${userId}`);
  },

  /**
   * Konuşmacı rol talebini iptal et
   */
  async cancelSpeakerRequest(roomId: string, requestId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/rooms/${roomId}/role-request/${requestId}/cancel`);
  },

  /**
   * Kullanıcının aktif konuşmacı talebini getir
   */
  async getMySpeakerRequest(roomId: string): Promise<{
    id: string;
    roomId: string;
    userId: string;
    status: string;
    createdAt: string;
  } | null> {
    try {
      return await apiClient.get<{
        id: string;
        roomId: string;
        userId: string;
        status: string;
        createdAt: string;
      }>(`/rooms/${roomId}/role-request/me`);
    } catch (error: any) {
      // 404 ise talep yok demektir - sessizce null döndür
      if (error?.response?.status === 404 || error?.status === 404) {
        return null;
      }
      // Diğer hatalar için error'ı fırlat
      throw error;
    }
  },

  /**
   * Otomatik en uygun odayı bul ve katıl
   */
  async autoJoinRoom(): Promise<Room | null> {
    try {
      // apiClient.post zaten success durumunda direkt Room objesini döndürüyor
      // success: false durumunda hata fırlatıyor
      const room = await apiClient.post<Room>('/rooms/auto-join');
      return room;
    } catch (error) {
      // Backend'den success: false geldiğinde (oda bulunamadı) null döndür
      // Diğer hatalar için error'ı fırlat
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('uygun oda bulunamadı') || 
            errorMessage.includes('oda bulunamadı') ||
            errorMessage.includes('no suitable room')) {
          return null;
        }
      }
      throw error;
    }
  },
};

/**
 * Mesaj API'leri
 */
export interface RoomMessage {
  id: string;
  roomId: string;
  participantId: string;   // Anonim participant ID
  content: string;
  pinned: boolean;
  deleted: boolean;
  createdAt: string;
  blindName: string;       // Anonim isim
  avatarSeed?: number;     // Avatar seed
  gender: string;
  // Deprecated: userId ve user alanları artık kullanılmıyor
  userId?: string;         // Deprecated - backward compatibility için
  user?: {                 // Deprecated - backward compatibility için
    id: string;
    name: string;
    gender: string;
  };
}

export interface RateLimitError {
  success: false;
  error: string;
  code: 'RATE_LIMIT_EXCEEDED';
  retryAfter: number;
  resetTime: string;
}

export const messagesApi = {
  /**
   * Mesaj gönder
   */
  async sendMessage(roomId: string, content: string): Promise<RoomMessage> {
    try {
      const message = await apiClient.post<RoomMessage>(`/rooms/${roomId}/messages`, { content });
      
      // Track message send
      trackEvent('message_send', {
        roomId,
        messageId: message.id,
        messageLength: content.length,
      });

      // Track room creation funnel - Step 3: First message
      trackFunnelStep('room_creation', 'first_message', {
        roomId,
        messageId: message.id,
      });

      // Complete room creation funnel
      trackFunnelCompletion('room_creation');

      // Track conversion - first message sent
      trackConversion('first_message_sent', undefined, {
        roomId,
        messageId: message.id,
      });

      return message;
    } catch (error: any) {
      trackEvent('message_send', {
        roomId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Rate limit hatası kontrolü
      if (error?.response?.status === 429) {
        const rateLimitData = error.response.data as RateLimitError;
        throw {
          ...error,
          rateLimit: {
            retryAfter: rateLimitData.retryAfter || 10,
            resetTime: rateLimitData.resetTime,
            message: rateLimitData.error || 'Çok hızlı mesaj gönderiyorsunuz. Lütfen bekleyin.',
          },
        };
      }
      throw error;
    }
  },

  /**
   * Oda mesajlarını getir
   */
  async getRoomMessages(roomId: string, limit?: number, before?: string): Promise<RoomMessage[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    const query = params.toString();
    return await apiClient.get<RoomMessage[]>(`/rooms/${roomId}/messages${query ? `?${query}` : ''}`);
  },

  /**
   * Mesaj sil
   */
  async deleteMessage(roomId: string, messageId: string): Promise<{success: boolean}> {
    return await apiClient.delete<{success: boolean}>(`/rooms/${roomId}/messages/${messageId}`);
  },

  /**
   * Katılımcı at (host veya moderator)
   */
  async kickParticipant(roomId: string, userId: string): Promise<Room> {
    return await apiClient.post<Room>(`/rooms/${roomId}/kick/${userId}`);
  },

  /**
   * Katılımcı sustur/aç (host veya moderator)
   */
  async muteParticipant(roomId: string, userId: string, muted: boolean): Promise<Room> {
    return await apiClient.post<Room>(`/rooms/${roomId}/mute/${userId}`, { muted });
  },

  /**
   * Dinleyici mesajlarını aç/kapat (host)
   */
  async toggleListenerMessages(roomId: string, enabled: boolean): Promise<Room> {
    return await apiClient.put<Room>(`/rooms/${roomId}/listener-messages`, { enabled });
  },

  /**
   * Oda ayarlarını güncelle (host)
   */
  async updateRoomSettings(
    roomId: string,
    updates: {
      name?: string;
      category?: string;
      description?: string;
      rules?: string;
      theme?: string;
      maxParticipants?: number;
      durationSec?: number;
    }
  ): Promise<Room> {
    return await apiClient.put<Room>(`/rooms/${roomId}/settings`, updates);
  },

  /**
   * Host yetkisini devret (host)
   */
  async transferHost(roomId: string, newHostId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/rooms/${roomId}/transfer-host/${newHostId}`);
  },

  /**
   * Kullanıcıyı odaya davet et (host)
   */
  async inviteToRoom(roomId: string, inviteeId: string): Promise<any> {
    return await apiClient.post(`/rooms/${roomId}/invite/${inviteeId}`);
  },

  /**
   * Oda davetini onayla
   */
  async approveInvite(inviteId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/rooms/invites/${inviteId}/approve`);
  },

  /**
   * Mesaj pinle/unpin
   */
  async pinMessage(roomId: string, messageId: string): Promise<{id: string; pinned: boolean}> {
    return await apiClient.post<{id: string; pinned: boolean}>(`/rooms/${roomId}/messages/${messageId}/pin`);
  },
};

