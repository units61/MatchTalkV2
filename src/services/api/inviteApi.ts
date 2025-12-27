import {apiClient} from '../../lib/apiClient';

export interface Invite {
  id: string;
  inviterId: string;
  inviteeId: string;
  roomId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  respondedAt?: string;
  inviter?: {
    id: string;
    name: string;
    email: string;
  };
  invitee?: {
    id: string;
    name: string;
    email: string;
  };
  room?: {
    id: string;
    name: string;
    category: string;
    maxParticipants: number;
    currentParticipants: number;
    timeLeftSec: number;
  };
}

export const inviteApi = {
  /**
   * Davet gönder
   */
  async sendInvite(roomId: string, friendId: string): Promise<Invite> {
    return await apiClient.post<Invite>('/invites', {roomId, friendId});
  },

  /**
   * Davetleri listele
   */
  async getInvites(): Promise<Invite[]> {
    return await apiClient.get<Invite[]>('/invites');
  },

  /**
   * Daveti kabul et
   */
  async acceptInvite(inviteId: string): Promise<{roomId: string}> {
    return await apiClient.post<{roomId: string}>(`/invites/${inviteId}/accept`);
  },

  /**
   * Daveti reddet
   */
  async rejectInvite(inviteId: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>(`/invites/${inviteId}/reject`);
  },
};

