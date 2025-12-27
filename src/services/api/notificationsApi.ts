import {apiClient} from '../../lib/apiClient';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  /**
   * Bildirimleri getir
   */
  async getNotifications(limit?: number, offset?: number): Promise<Notification[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString();
    return await apiClient.get<Notification[]>(`/notifications${query ? `?${query}` : ''}`);
  },

  /**
   * Okunmamış bildirim sayısını getir
   */
  async getUnreadCount(): Promise<{count: number}> {
    return await apiClient.get<{count: number}>('/notifications/unread-count');
  },

  /**
   * Bildirimi okundu işaretle
   */
  async markAsRead(notificationId: string): Promise<{success: boolean}> {
    return await apiClient.put<{success: boolean}>(`/notifications/${notificationId}/read`);
  },

  /**
   * Tüm bildirimleri okundu işaretle
   */
  async markAllAsRead(): Promise<{updatedCount: number}> {
    return await apiClient.put<{updatedCount: number}>('/notifications/read-all');
  },

  /**
   * Bildirimi sil
   */
  async deleteNotification(notificationId: string): Promise<{success: boolean}> {
    return await apiClient.delete<{success: boolean}>(`/notifications/${notificationId}`);
  },

  /**
   * Push notification token'ı kaydet
   */
  async registerPushToken(token: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>('/notifications/register-token', {token});
  },

  /**
   * Push notification token'ı kaldır
   */
  async unregisterPushToken(token: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>('/notifications/unregister-token', {token});
  },
};








