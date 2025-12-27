import {apiClient} from '../../lib/apiClient';
import {User} from '../../types/user';

export interface Friend {
  id: string;
  friend: User;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUser: User;
  toUser: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export const friendsApi = {
  /**
   * Arkadaş listesini getir
   */
  async getFriends(): Promise<Friend[]> {
    return await apiClient.get<Friend[]>('/friends');
  },

  /**
   * Kullanıcı ara
   */
  async searchUsers(query: string): Promise<User[]> {
    return await apiClient.get<User[]>(`/friends/search?q=${encodeURIComponent(query)}`);
  },

  /**
   * Arkadaş ekle
   */
  async addFriend(friendId: string): Promise<{success: boolean; friend: User}> {
    return await apiClient.post<{success: boolean; friend: User}>('/friends', {
      friendId,
    });
  },

  /**
   * Arkadaşlığı kaldır
   */
  async removeFriend(friendId: string): Promise<{success: boolean}> {
    return await apiClient.delete<{success: boolean}>(`/friends/${friendId}`);
  },

  /**
   * Gelen arkadaşlık isteklerini getir
   */
  async getReceivedRequests(): Promise<FriendRequest[]> {
    return await apiClient.get<FriendRequest[]>('/friends/requests/received');
  },

  /**
   * Gönderilen arkadaşlık isteklerini getir
   */
  async getSentRequests(): Promise<FriendRequest[]> {
    return await apiClient.get<FriendRequest[]>('/friends/requests/sent');
  },

  /**
   * Arkadaşlık isteği gönder
   */
  async sendRequest(friendId: string): Promise<FriendRequest> {
    return await apiClient.post<FriendRequest>('/friends/requests', { friendId });
  },

  /**
   * Arkadaşlık isteğini kabul et
   */
  async acceptRequest(requestId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/friends/requests/${requestId}/accept`);
  },

  /**
   * Arkadaşlık isteğini reddet
   */
  async rejectRequest(requestId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/friends/requests/${requestId}/reject`);
  },

  /**
   * Friend suggestions (ortak arkadaşlara göre öneriler)
   */
  async getSuggestions(limit?: number): Promise<User[]> {
    const params = limit ? `?limit=${limit}` : '';
    return await apiClient.get<User[]>(`/friends/suggestions${params}`);
  },
};

