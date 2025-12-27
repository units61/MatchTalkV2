import {apiClient} from '../../lib/apiClient';
import {
  User,
  LoginResponse,
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ChangeEmailInput,
} from '../../types/user';

export const authApi = {
  /**
   * Kullanıcı kaydı
   */
  async register(input: RegisterInput): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/register', input);
    // Token'ı kaydet
    await apiClient.setToken(response.token);
    return response;
  },

  /**
   * Kullanıcı girişi
   */
  async login(input: LoginInput): Promise<LoginResponse> {
    try {
      if (__DEV__) {
        console.log('[authApi] Login request:', input);
      }
      const response = await apiClient.post<LoginResponse>('/auth/login', input);
      if (__DEV__) {
        console.log('[authApi] Login response:', response);
      }
      // Token'ı kaydet
      await apiClient.setToken(response.token);
      return response;
    } catch (error) {
      if (__DEV__) {
        console.error('[authApi] Login error:', error);
      }
      throw error;
    }
  },

  /**
   * Mevcut kullanıcı bilgilerini getir
   */
  async getMe(): Promise<User> {
    return await apiClient.get<User>('/auth/me');
  },

  /**
   * Çıkış yap
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Logout hatası olsa bile token'ı temizle
      console.error('Logout error:', error);
    } finally {
      await apiClient.setToken(null);
    }
  },

  /**
   * Profil güncelle
   */
  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const updated = await apiClient.put<User>('/users/profile', input);
    return updated;
  },

  /**
   * Şifre değiştir
   */
  async changePassword(input: ChangePasswordInput): Promise<{success: boolean}> {
    return await apiClient.put<{success: boolean}>('/users/password', input);
  },

  /**
   * E-posta değiştir
   */
  async changeEmail(input: ChangeEmailInput): Promise<{success: boolean; email: string}> {
    return await apiClient.put<{success: boolean; email: string}>('/users/email', input);
  },

  /**
   * Token yenileme
   */
  async refreshToken(token: string): Promise<{token: string}> {
    const response = await apiClient.post<{token: string}>('/auth/refresh', { token });
    await apiClient.setToken(response.token);
    return response;
  },

  /**
   * Şifre sıfırlama isteği gönder
   */
  async forgotPassword(email: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>('/auth/forgot-password', { email });
  },

  /**
   * Şifre sıfırlama token'ı ile şifreyi değiştir
   */
  async resetPassword(token: string, newPassword: string): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>('/auth/reset-password', { token, newPassword });
  },

  /**
   * Email doğrulama token'ı ile email'i doğrula
   */
  async verifyEmail(token: string): Promise<{success: boolean; alreadyVerified?: boolean}> {
    return await apiClient.post<{success: boolean; alreadyVerified?: boolean}>('/auth/verify-email', { token });
  },

  /**
   * Email doğrulama token'ını yeniden gönder
   */
  async resendVerification(): Promise<{success: boolean}> {
    return await apiClient.post<{success: boolean}>('/auth/resend-verification');
  },

  /**
   * Apple OAuth ile giriş
   */
  async appleAuth(identityToken: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/apple', { identityToken });
    await apiClient.setToken(response.token);
    return response;
  },
};


