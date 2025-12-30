import { apiClient } from '../../lib/apiClient';
import { User } from '../../types/user';

export interface UpdateUserInput {
  name?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  birthdate?: string;
  avatar?: string;
}

export interface UserStats {
  totalRooms: number;
  totalFriends: number;
  totalMessages: number;
  level: number;
  experience: number;
}

export const usersApi = {
  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User> {
    return await apiClient.get<User>(`/users/${userId}`);
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return await apiClient.get<User>('/users/me');
  },

  /**
   * Update user profile
   */
  async updateUser(input: UpdateUserInput): Promise<User> {
    return await apiClient.put<User>('/users/me', input);
  },

  /**
   * Upload avatar
   */
  async uploadAvatar(fileUri: string): Promise<{ avatar: string }> {
    // Note: In a real implementation, you would use FormData to upload the file
    // For now, this is a placeholder
    const formData = new FormData();
    formData.append('avatar', {
      uri: fileUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    return await apiClient.post<{ avatar: string }>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    } as any);
  },

  /**
   * Get user stats
   */
  async getUserStats(userId?: string): Promise<UserStats> {
    const endpoint = userId ? `/users/${userId}/stats` : '/users/me/stats';
    return await apiClient.get<UserStats>(endpoint);
  },

  /**
   * Search users
   */
  async searchUsers(query: string, limit?: number): Promise<User[]> {
    return await apiClient.get<User[]>('/users/search', {
      params: {
        q: query,
        limit: limit || 20,
      },
    });
  },

  /**
   * Get user's rooms
   */
  async getUserRooms(userId?: string, limit?: number, offset?: number): Promise<any[]> {
    const endpoint = userId ? `/users/${userId}/rooms` : '/users/me/rooms';
    return await apiClient.get<any[]>(endpoint, {
      params: {
        limit: limit || 20,
        offset: offset || 0,
      },
    });
  },
};
