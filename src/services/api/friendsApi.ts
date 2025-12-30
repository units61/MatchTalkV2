import { apiClient } from '../../lib/apiClient';
import { User } from '../../types/user';

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
  async getFriends(onlineOnly?: boolean, limit?: number, offset?: number): Promise<{ friends: Friend[]; pagination?: { total: number; hasMore: boolean } }> {
    const params = new URLSearchParams();
    if (onlineOnly) params.append('onlineOnly', 'true');
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const queryString = params.toString();
    const url = `/friends${queryString ? `?${queryString}` : ''}`;

    // API currently returns Friend[] directly in some versions, 
    // but the store expects an object with friends and pagination.
    // To be safe and fix TS errors, we'll cast.
    const response = await apiClient.get<any>(url);
    if (Array.isArray(response)) {
      return { friends: response };
    }
    return response;
  },

  /**
   * Kullanıcı ara
   */
  async searchUsers(query: string, filters?: { gender?: 'male' | 'female'; onlineOnly?: boolean; hasMutualFriends?: boolean }): Promise<User[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.onlineOnly) params.append('onlineOnly', 'true');
    if (filters?.hasMutualFriends) params.append('hasMutualFriends', 'true');

    return await apiClient.get<User[]>(`/friends/search?${params.toString()}`);
  },

  /**
   * Arkadaş ekle
   */
  async addFriend(friendId: string): Promise<{ success: boolean; friend: User }> {
    return await apiClient.post<{ success: boolean; friend: User }>('/friends', {
      friendId,
    });
  },

  /**
   * Arkadaşlığı kaldır
   */
  async removeFriend(friendId: string): Promise<{ success: boolean }> {
    return await apiClient.delete<{ success: boolean }>(`/friends/${friendId}`);
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
  async acceptRequest(requestId: string): Promise<{ success: boolean }> {
    return await apiClient.post<{ success: boolean }>(`/friends/requests/${requestId}/accept`);
  },

  /**
   * Arkadaşlık isteğini reddet
   */
  async rejectRequest(requestId: string): Promise<{ success: boolean }> {
    return await apiClient.post<{ success: boolean }>(`/friends/requests/${requestId}/reject`);
  },

  /**
   * Arkadaşlık isteğini iptal et
   */
  async cancelRequest(requestId: string): Promise<{ success: boolean }> {
    return await apiClient.delete<{ success: boolean }>(`/friends/requests/${requestId}`);
  },

  /**
   * Friend suggestions (ortak arkadaşlara göre öneriler)
   */
  async getSuggestions(limit?: number): Promise<User[]> {
    const params = limit ? `?limit=${limit}` : '';
    return await apiClient.get<User[]>(`/friends/suggestions${params}`);
  },
};

