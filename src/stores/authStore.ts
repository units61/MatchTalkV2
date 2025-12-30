import { create } from 'zustand';
import {
  User,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ChangeEmailInput,
} from '../types/user';
import { authApi } from '../services/api/authApi';
import { apiClient } from '../lib/apiClient';
import { setUserContext, clearUserContext } from '../utils/errorTracking';
import { trackEvent, trackConversion, trackFunnelStep, trackFunnelCompletion } from '../utils/analytics';
import { persist, errorTracking, logger } from './middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  changeEmail: (input: ChangeEmailInput) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

// Throttle loadUser calls to prevent rate limiting
let loadUserPromise: Promise<void> | null = null;
let lastLoadUserTime = 0;
const LOAD_USER_THROTTLE_MS = 2000; // Minimum 2 seconds between calls

export const useAuthStore = create<AuthState>(
  persist(
    errorTracking(
      logger((set) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        login: async (input: LoginInput) => {
          try {
            set({ loading: true, error: null });
            const response = await authApi.login(input);
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              loading: false,
              error: null,
            });

            // Set token in apiClient
            await apiClient.setToken(response.token);

            // Set Sentry user context
            if (response.user?.id) {
              setUserContext(response.user.id.toString(), {
                email: response.user.email,
                name: response.user.name,
              });
            }

            // Track login success
            trackEvent('user_login', {
              success: true,
              userId: response.user?.id,
            });

            // Track conversion if first login
            if (response.user?.createdAt) {
              const createdAt = new Date(response.user.createdAt);
              const isFirstLogin = Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000; // Within 24 hours
              if (isFirstLogin) {
                trackConversion('first_login', undefined, {
                  userId: response.user.id,
                });
              }
            }
          } catch (error) {
            // Track login failure
            trackEvent('user_login', {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Giriş başarısız',
              isAuthenticated: false,
              user: null,
              token: null,
            });
            throw error;
          }
        },

        register: async (input: RegisterInput) => {
          try {
            set({ loading: true, error: null });
            const response = await authApi.register(input);
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              loading: false,
              error: null,
            });

            // Set token in apiClient
            await apiClient.setToken(response.token);

            // Set Sentry user context
            if (response.user?.id) {
              setUserContext(response.user.id.toString(), {
                email: response.user.email,
                name: response.user.name,
              });
            }

            // Track registration success
            trackEvent('user_register', {
              success: true,
              userId: response.user?.id,
              email: response.user?.email,
            });

            // Track onboarding funnel - Step 1: Register
            trackFunnelStep('onboarding', 'register', {
              userId: response.user?.id,
            });

            // Track conversion - user registration
            trackConversion('user_registration', undefined, {
              userId: response.user?.id,
            });
          } catch (error) {
            // Track registration failure
            trackEvent('user_register', {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Kayıt başarısız',
              isAuthenticated: false,
              user: null,
              token: null,
            });
            throw error;
          }
        },

        logout: async () => {
          // Track logout before clearing user
          const currentUser = useAuthStore.getState().user;
          if (currentUser?.id) {
            trackEvent('user_logout', {
              userId: currentUser.id,
            });
          }

          await authApi.logout();

          // Clear token in apiClient
          await apiClient.setToken(null);

          // Clear Sentry user context
          clearUserContext();

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        },

        loadUser: async () => {
          // Throttle: If a request is already in progress, return the existing promise
          if (loadUserPromise) {
            return loadUserPromise;
          }

          // Throttle: If called too soon after last call, wait
          const timeSinceLastCall = Date.now() - lastLoadUserTime;
          if (timeSinceLastCall < LOAD_USER_THROTTLE_MS) {
            const waitTime = LOAD_USER_THROTTLE_MS - timeSinceLastCall;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }

          // Create and store the promise
          loadUserPromise = (async () => {
            try {
              lastLoadUserTime = Date.now();

              const token = await apiClient.getToken();
              if (!token) {
                set({
                  user: null,
                  token: null,
                  isAuthenticated: false,
                });
                return;
              }

              // Validate token format (basic check)
              if (!isValidTokenFormat(token)) {
                console.warn('[AuthStore] Invalid token format, logging out');
                await authApi.logout();
                set({
                  user: null,
                  token: null,
                  isAuthenticated: false,
                  loading: false,
                  error: null,
                });
                return;
              }

              set({ loading: true });
              const user = await authApi.getMe();
              set({
                user,
                token,
                isAuthenticated: true,
                loading: false,
                error: null,
              });

              // Set Sentry user context
              if (user?.id) {
                setUserContext(user.id.toString(), {
                  email: user.email,
                  name: user.name,
                });
              }

              // Track session restore (user loaded from token)
              trackEvent('user_session_restore', {
                userId: user.id,
                success: true,
              });
            } catch (error: any) {
              // Don't logout on rate limit errors - just log and keep current state
              if (error?.response?.status === 429) {
                console.warn('[AuthStore] Rate limit exceeded, skipping loadUser');
                set({ loading: false });
                return;
              }

              // Token geçersiz veya expired, logout yap
              console.warn('[AuthStore] Token validation failed, logging out:', error);
              await authApi.logout();
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                loading: false,
                error: null,
              });
            } finally {
              // Clear the promise so next call can proceed
              loadUserPromise = null;
            }
          })();

          return loadUserPromise;
        },

        clearError: () => {
          set({ error: null });
        },

        updateProfile: async (input: UpdateProfileInput) => {
          set({ loading: true, error: null });
          try {
            const user = await authApi.updateProfile(input);
            set({ user, loading: false });

            // Track profile update
            trackEvent('profile_update', {
              success: true,
              userId: user.id,
              fieldsUpdated: Object.keys(input),
            });
          } catch (error) {
            trackEvent('profile_update', {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Profil güncellenemedi',
            });
            throw error;
          }
        },

        changePassword: async (input: ChangePasswordInput) => {
          set({ loading: true, error: null });
          try {
            await authApi.changePassword(input);
            set({ loading: false });

            // Track password change
            const currentUser = useAuthStore.getState().user;
            trackEvent('password_change', {
              success: true,
              userId: currentUser?.id,
            });
          } catch (error) {
            trackEvent('password_change', {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Şifre değiştirilemedi',
            });
            throw error;
          }
        },

        changeEmail: async (input: ChangeEmailInput) => {
          set({ loading: true, error: null });
          try {
            const currentUser = useAuthStore.getState().user;
            const previousEmail = currentUser?.email;

            const result = await authApi.changeEmail(input);
            set((state) => ({
              user: state.user ? { ...state.user, email: result.email } : state.user,
              loading: false,
            }));

            // Track email change
            trackEvent('email_change', {
              success: true,
              userId: currentUser?.id,
              previousEmail,
              newEmail: result.email,
            });
          } catch (error) {
            trackEvent('email_change', {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            set({
              loading: false,
              error: error instanceof Error ? error.message : 'E-posta değiştirilemedi',
            });
            throw error;
          }
        },

        verifyEmail: async (token: string) => {
          set({ loading: true, error: null });
          try {
            await authApi.verifyEmail(token);
            const currentUser = useAuthStore.getState().user;
            set((state) => ({
              user: state.user ? { ...state.user, emailVerified: true } : state.user,
              loading: false,
            }));

            // Track email verification
            trackEvent('email_verification', {
              success: true,
              userId: currentUser?.id,
            });

            // Track onboarding funnel - Step 2: Email verification
            if (currentUser?.id) {
              trackFunnelStep('onboarding', 'email_verified', {
                userId: currentUser.id,
              });

              // Track conversion - email verified
              trackConversion('email_verified', undefined, {
                userId: currentUser.id,
              });
            }
          } catch (error) {
            trackEvent('email_verification', {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Email doğrulanamadı',
            });
            throw error;
          }
        },

        resendVerification: async () => {
          set({ loading: true, error: null });
          try {
            await authApi.resendVerification();
            set({ loading: false });
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'Verification email gönderilemedi',
            });
            throw error;
          }
        },
      }), 'authStore'),
      'authStore'
    ),
    {
      name: 'auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Basic token format validation
 * JWT tokens typically have 3 parts separated by dots
 */
function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Basic JWT format check (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Check if parts are not empty
  return parts.every(part => part.length > 0);
}

// React Native'de global store referansı gerekmez, doğrudan import edilebilir

