import {apiClient} from '../../lib/apiClient';

interface GenerateTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expirationTimeInSeconds: number;
}

export const agoraApi = {
  /**
   * Belirli bir oda (kanal) için Agora RTC token üretir
   */
  async generateToken(channelName: string): Promise<GenerateTokenResponse> {
    const response = await apiClient.post<{
      success: boolean;
      data: GenerateTokenResponse;
    }>('/agora/token', {
      channelName,
    });

    if (!response || !('data' in response)) {
      // apiClient genelde direkt data döndürüyor; bu durumda adaptasyon yap
      return (response as any).data ?? (response as any);
    }

    return response.data;
  },
};

















