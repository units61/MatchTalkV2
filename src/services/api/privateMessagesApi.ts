import {apiClient} from '../../lib/apiClient';

export interface PrivateMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  deleted: boolean;
  createdAt: string;
  editedAt?: string;
  pinned?: boolean;
  pinnedAt?: string;
  replyToId?: string;
  deliveredAt?: string;
  readAt?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  sender?: {id: string; name: string; avatar?: string};
  receiver?: {id: string; name: string; avatar?: string};
  replyTo?: PrivateMessage;
}

export interface Conversation {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
}

export const privateMessagesApi = {
  /**
   * Özel mesaj gönder
   */
  async sendMessage(receiverId: string, content: string, options?: { replyToId?: string }): Promise<PrivateMessage> {
    return await apiClient.post<PrivateMessage>('/private-messages', {
      receiverId,
      content,
      ...options,
    });
  },

  /**
   * Konuşmaları listele
   */
  async getConversations(): Promise<Conversation[]> {
    return await apiClient.get<Conversation[]>('/private-messages/conversations');
  },

  /**
   * Belirli kullanıcı ile mesajları getir
   */
  async getMessages(userId: string, limit?: number, before?: string): Promise<PrivateMessage[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    const query = params.toString();
    return await apiClient.get<PrivateMessage[]>(`/private-messages/${userId}${query ? `?${query}` : ''}`);
  },

  /**
   * Mesajı okundu işaretle
   */
  async markAsRead(messageId: string): Promise<{success: boolean}> {
    return await apiClient.put<{success: boolean}>(`/private-messages/${messageId}/read`);
  },

  /**
   * Konuşmayı okundu işaretle
   */
  async markConversationAsRead(userId: string): Promise<{updatedCount: number}> {
    return await apiClient.put<{updatedCount: number}>(`/private-messages/${userId}/read-all`);
  },

  /**
   * Mesajı sil
   */
  async deleteMessage(messageId: string): Promise<{success: boolean}> {
    return await apiClient.delete<{success: boolean}>(`/private-messages/${messageId}`);
  },

  /**
   * Okunmamış mesaj sayısı
   */
  async getUnreadCount(): Promise<{count: number}> {
    return await apiClient.get<{count: number}>('/private-messages/unread-count');
  },

  /**
   * Mesaj içeriğinde arama
   */
  async searchMessages(query: string, limit?: number): Promise<PrivateMessage[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit) params.append('limit', limit.toString());
    return await apiClient.get<PrivateMessage[]>(`/private-messages/search?${params.toString()}`);
  },

  /**
   * Mesaj reaction ekle/kaldır
   */
  async addReaction(messageId: string, reaction: string): Promise<{added: boolean}> {
    return await apiClient.post<{added: boolean}>(`/private-messages/${messageId}/reactions`, { reaction });
  },

  /**
   * Mesaj reaction'larını getir
   */
  async getMessageReactions(messageId: string): Promise<Record<string, any[]>> {
    return await apiClient.get<Record<string, any[]>>(`/private-messages/${messageId}/reactions`);
  },

  /**
   * Mesajı düzenle
   */
  async editMessage(messageId: string, content: string): Promise<PrivateMessage> {
    return await apiClient.put<PrivateMessage>(`/private-messages/${messageId}`, { content });
  },

  /**
   * Mesajı ilet
   */
  async forwardMessage(messageId: string, receiverId: string): Promise<PrivateMessage> {
    return await apiClient.post<PrivateMessage>(`/private-messages/${messageId}/forward`, { receiverId });
  },

  /**
   * Mesajı sabitle
   */
  async pinMessage(messageId: string): Promise<PrivateMessage> {
    return await apiClient.post<PrivateMessage>(`/private-messages/${messageId}/pin`);
  },

  /**
   * Mesaj sabitlemeyi kaldır
   */
  async unpinMessage(messageId: string): Promise<PrivateMessage> {
    return await apiClient.delete<PrivateMessage>(`/private-messages/${messageId}/pin`);
  },

  /**
   * Mesajı zamanla
   */
  async scheduleMessage(receiverId: string, content: string, scheduledFor: Date, options?: { replyToId?: string }): Promise<PrivateMessage> {
    return await apiClient.post<PrivateMessage>('/private-messages/schedule', {
      receiverId,
      content,
      scheduledFor: scheduledFor.toISOString(),
      ...options,
    });
  },
};


