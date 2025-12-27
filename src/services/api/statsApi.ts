import {apiClient} from '../../lib/apiClient';

export interface UserStats {
  totalRooms: number;
  totalHours: number;
  totalMinutes: number;
  totalFriends: number;
}

export const statsApi = {
  /**
   * Kullanıcı istatistiklerini getir
   */
  async getStats(): Promise<UserStats> {
    return await apiClient.get<UserStats>('/stats');
  },
};

