import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, CancelTokenSource } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from './config';
import { handleError, createErrorHandler } from '../utils/errorHandler';
import { captureException, addBreadcrumb } from '../utils/errorTracking';
import { trackEvent } from '../utils/analytics';
import { API_CONFIG } from '../constants/app';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: API_CONFIG.RETRY_ATTEMPTS,
  retryDelay: API_CONFIG.RETRY_DELAY,
  retryCondition: (error: AxiosError) => {
    // Don't retry on rate limit errors (429)
    if (error.response?.status === 429) {
      return false;
    }

    // Retry on network errors or 5xx server errors
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600) ||
      error.code === 'ECONNABORTED' || // Timeout
      error.code === 'ERR_NETWORK' // Network error
    );
  },
};

// Request deduplication cache
const pendingRequests = new Map<string, Promise<any>>();

// Request cancellation tokens
const cancelTokens = new Map<string, CancelTokenSource>();

class ApiClient {
  private client: AxiosInstance;
  private errorHandler = createErrorHandler({ component: 'ApiClient' });

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Generate request key for deduplication
   */
  private getRequestKey(method: string, url: string, data?: any): string {
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${dataStr}`;
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(requestKey: string): void {
    const cancelToken = cancelTokens.get(requestKey);
    if (cancelToken) {
      cancelToken.cancel('Request cancelled');
      cancelTokens.delete(requestKey);
      pendingRequests.delete(requestKey);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    cancelTokens.forEach((token, key) => {
      token.cancel('All requests cancelled');
      cancelTokens.delete(key);
      pendingRequests.delete(key);
    });
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      const axiosError = error as AxiosError;

      // Check if we should retry
      if (
        attempt <= retryConfig.retries &&
        retryConfig.retryCondition?.(axiosError)
      ) {
        // Calculate delay with exponential backoff
        const delay = retryConfig.retryDelay * Math.pow(2, attempt - 1);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Retry
        return this.retryRequest(requestFn, retryConfig, attempt + 1);
      }

      // No more retries, throw error
      throw error;
    }
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000, // Short timeout for health check
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private setupInterceptors() {
    // Request interceptor - Token ekleme
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Store request start time for performance tracking
        (config as any).metadata = {
          startTime: Date.now(),
        };

        // Add request ID for tracking
        const requestId = `${Date.now()}-${Math.random()}`;
        (config as any).requestId = requestId;

        // Add breadcrumb for Sentry
        addBreadcrumb(
          `API Request: ${config.method?.toUpperCase()} ${config.url}`,
          'http',
          'info',
          {
            method: config.method,
            url: config.url,
            requestId,
          }
        );

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Performance tracking ve error handling
    this.client.interceptors.response.use(
      (response) => {
        const config = response.config as InternalAxiosRequestConfig & {
          metadata?: { startTime: number };
          requestId?: string;
        };
        const duration = config.metadata
          ? Date.now() - config.metadata.startTime
          : 0;

        // Track successful API calls
        trackEvent('api_request_success', {
          endpoint: response.config.url,
          method: response.config.method,
          status: response.status,
          duration,
          requestId: config.requestId,
        }).catch(() => {
          // Ignore errors
        });

        // Add breadcrumb for successful response
        addBreadcrumb(
          `API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`,
          'http',
          'info',
          {
            status: response.status,
            duration,
            requestId: config.requestId,
          }
        );

        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & {
          metadata?: { startTime: number };
          requestId?: string;
        };
        const duration = config?.metadata
          ? Date.now() - config.metadata.startTime
          : 0;

        if (error.response) {
          // Server responded with error
          const status = error.response.status;
          const url = error.config?.url || 'unknown';
          const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

          // Track API errors
          trackEvent('api_request_error', {
            endpoint: url,
            method,
            status,
            duration,
            requestId: config?.requestId,
          }).catch(() => {
            // Ignore errors
          });

          // Send to Sentry (except for 401, 404, 429 which are expected)
          if (status !== 401 && status !== 404 && status !== 429) {
            captureException(
              new Error(`API Error: ${method} ${url} - ${status}`),
              {
                component: 'ApiClient',
                action: 'api_request',
                additionalData: {
                  status,
                  url,
                  method,
                  duration,
                  requestId: config?.requestId,
                  responseData: error.response.data,
                },
              },
              status >= 500 ? 'high' : 'medium'
            );
          }

          if (status === 401) {
            // Unauthorized - Try to refresh token first
            const token = await AsyncStorage.getItem('auth_token');
            const originalRequest = error.config;

            // Refresh endpoint'ine yapılan istekse, refresh yapma (sonsuz döngüyü önle)
            if (originalRequest?.url?.includes('/auth/refresh')) {
              // Refresh başarısız, token'ı temizle ve logout
              await AsyncStorage.removeItem('auth_token');
              // React Native'de global store referansı kullanılabilir
              try {
                // We use global require to avoid circular dependency
                const { useAuthStore } = require('../stores/authStore');
                useAuthStore.getState().logout();
              } catch (e) {
                // Store yet to be loaded, continue silently
              }
            } else if (token && originalRequest) {
              // Token refresh dene
              try {
                const { authApi } = require('../services/api/authApi');
                const refreshResponse = await authApi.refreshToken(token);

                // Yeni token ile orijinal isteği tekrar dene
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${refreshResponse.token}`;
                }
                return this.client.request(originalRequest);
              } catch (refreshError) {
                // Refresh failed, clear token and logout
                await AsyncStorage.removeItem('auth_token');
                // React Native'de global store referansı kullanılabilir
                try {
                  const { useAuthStore } = require('../stores/authStore');
                  useAuthStore.getState().logout();
                } catch (e) {
                  // Store yet to be loaded, continue silently
                }
              }
            } else {
              await AsyncStorage.removeItem('auth_token');
            }
          }

          // Use error handler for user-friendly messages
          const { userMessage } = this.errorHandler(error, {
            action: 'api_request',
            additionalData: {
              status,
              url: error.config?.url,
            },
          });

          // Create new error with user-friendly message
          const apiError = error.response.data as ApiResponse<unknown>;
          const errorMessage = apiError?.error || userMessage;
          const enhancedError = new Error(errorMessage);
          (enhancedError as any).status = status;
          (enhancedError as any).originalError = error;

          return Promise.reject(enhancedError);
        } else if (error.request) {
          // Request made but no response (network error)
          const url = error.config?.url || 'unknown';
          const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

          // Track network error
          trackEvent('api_network_error', {
            endpoint: url,
            method,
            errorCode: error.code,
            errorMessage: error.message,
            duration,
            requestId: config?.requestId,
          }).catch(() => {
            // Ignore errors
          });

          // Send network errors to Sentry
          captureException(
            new Error(`Network Error: ${method} ${url}`),
            {
              component: 'ApiClient',
              action: 'api_request',
              additionalData: {
                url,
                method,
                errorCode: error.code,
                errorMessage: error.message,
                duration,
                requestId: config?.requestId,
              },
            },
            'medium'
          );

          addBreadcrumb(
            `Network Error: ${method} ${url}`,
            'http',
            'error',
            {
              url,
              method,
              errorCode: error.code,
              errorMessage: error.message,
              duration,
              requestId: config?.requestId,
            }
          );

          const networkError = new Error('Ağ hatası. Lütfen bağlantınızı kontrol edin.');
          (networkError as any).code = error.code;
          (networkError as any).originalError = error;
          return Promise.reject(networkError);
        } else {
          // Request setup error
          captureException(error as Error, {
            component: 'ApiClient',
            action: 'api_request',
            additionalData: {
              message: error.message,
              requestId: config?.requestId,
            },
          });

          return Promise.reject(error);
        }
      }
    );
  }

  /**
   * Get authentication token
   */
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('auth_token');
  }

  /**
   * Set authentication token
   */
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem('auth_token', token);
  }

  /**
   * Clear authentication token
   */
  async clearToken(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
  }

  async get<T>(url: string, config?: any, retryConfig?: RetryConfig): Promise<T> {
    const requestKey = this.getRequestKey('GET', url);

    // Check for duplicate request
    if (pendingRequests.has(requestKey)) {
      if (__DEV__) {
        console.log(`[API] Deduplicating GET request: ${url}`);
      }
      const existingRequest = pendingRequests.get(requestKey);
      if (existingRequest) {
        return existingRequest;
      }
      // Fall through if somehow the request was removed between has() and get()
    }

    // Create cancel token
    const cancelTokenSource = axios.CancelToken.source();
    cancelTokens.set(requestKey, cancelTokenSource);

    // Create request promise
    const requestPromise = (async () => {
      try {
        // Development modda request loglama
        if (__DEV__) {
          console.log(`[API] GET ${url}`);
        }

        const response = await this.retryRequest(
          () => this.client.get<ApiResponse<T>>(url, {
            ...config,
            cancelToken: cancelTokenSource.token,
          }),
          retryConfig
        );

        // Development modda response loglama
        if (__DEV__) {
          console.log(`[API] GET ${url} Response:`, response.data);
        }

        // Response format kontrolü
        if (!response.data) {
          throw new Error('Geçersiz yanıt formatı. Sunucudan yanıt alınamadı.');
        }

        if (response.data.success && response.data.data) {
          return response.data.data;
        }

        // success: false durumu
        const errorMessage = response.data.error || 'İşlem başarısız oldu';
        throw new Error(errorMessage);
      } catch (error) {
        if (axios.isCancel(error)) {
          throw new Error('Request cancelled');
        }

        if (error instanceof AxiosError) {
          // 404 hatası için özel handling (sessizce null döndürmek için)
          if (error.response?.status === 404) {
            // 404 hatası için sessizce loglama (console.error yerine console.debug)
            if (__DEV__) {
              console.debug(`[API] GET ${url} 404 (Not Found) - This is expected for optional resources`);
            }
            const apiError = error.response.data as ApiResponse<unknown>;
            const errorMessage = apiError?.error || error.message || 'Kaynak bulunamadı';
            const notFoundError = new Error(errorMessage) as Error & { status?: number; response?: any };
            notFoundError.status = 404;
            notFoundError.response = error.response;
            throw notFoundError;
          }
        }

        // Development modda hata loglama (404 ve 503 Agora token hariç)
        if (__DEV__) {
          const is404 = error instanceof AxiosError && error.response?.status === 404;
          const is503Agora = error instanceof AxiosError && error.response?.status === 503 && url.includes('/agora/token');
          // /role-request/me endpoint'i için 404 hatası beklenen bir durum (talep yok demektir)
          const isRoleRequestMe = url.includes('/role-request/me');
          const shouldLogError = !is404 && !is503Agora && !(is404 && isRoleRequestMe);

          if (shouldLogError) {
            console.error(`[API] GET ${url} Error:`, error);
          } else if (is404 && isRoleRequestMe) {
            // /role-request/me için 404 hatası sessizce loglanır
            console.debug(`[API] GET ${url} 404 (Not Found) - No active speaker request (expected)`);
          }
        }

        if (error instanceof AxiosError) {
          if (error.response?.status === 404) {
            const apiError = error.response.data as ApiResponse<unknown>;
            const errorMessage = apiError?.error || error.message || 'Kaynak bulunamadı';
            const notFoundError = new Error(errorMessage) as Error & { status?: number; response?: any };
            notFoundError.status = 404;
            notFoundError.response = error.response;
            throw notFoundError;
          }

          if (error.response?.data) {
            const apiError = error.response.data as ApiResponse<unknown>;
            const errorMessage = apiError.error || error.message || 'Bilinmeyen bir hata oluştu';
            throw new Error(errorMessage);
          }
          if (error.request) {
            throw new Error('Ağ hatası. Lütfen bağlantınızı kontrol edin.');
          }
        }
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Beklenmeyen bir hata oluştu');
      } finally {
        // Clean up
        pendingRequests.delete(requestKey);
        cancelTokens.delete(requestKey);
      }
    })();

    // Store promise for deduplication
    pendingRequests.set(requestKey, requestPromise);

    return requestPromise;
  }

  async post<T>(url: string, data?: unknown, config?: any, retryConfig?: RetryConfig): Promise<T> {
    const requestKey = this.getRequestKey('POST', url, data);

    // Check for duplicate request
    if (pendingRequests.has(requestKey)) {
      if (__DEV__) {
        console.log(`[API] Deduplicating POST request: ${url}`);
      }
      const existingRequest = pendingRequests.get(requestKey);
      if (existingRequest) {
        return existingRequest;
      }
      // Fall through if somehow the request was removed between has() and get()
    }

    // Create cancel token
    const cancelTokenSource = axios.CancelToken.source();
    cancelTokens.set(requestKey, cancelTokenSource);

    // Create request promise
    const requestPromise = (async () => {
      try {
        // Development modda request loglama
        if (__DEV__) {
          console.log(`[API] POST ${url}`, data);
        }

        const response = await this.retryRequest(
          () => this.client.post<ApiResponse<T>>(url, data, {
            ...config,
            cancelToken: cancelTokenSource.token,
          }),
          retryConfig
        );

        // Development modda response loglama
        if (__DEV__) {
          console.log(`[API] POST ${url} Response:`, response.data);
        }

        // Response format kontrolü
        if (!response.data) {
          throw new Error('Geçersiz yanıt formatı. Sunucudan yanıt alınamadı.');
        }

        // Analytics endpoint'leri için özel handling (data field'ı opsiyonel)
        if (url.includes('/analytics/track')) {
          if (response.data.success) {
            // Analytics endpoint'leri sadece success döndürür, data field'ı yok
            return undefined as T;
          }
          const errorMessage = (response.data as any).message || response.data.error || 'İşlem başarısız oldu';
          throw new Error(errorMessage);
        }

        if (response.data.success && response.data.data) {
          return response.data.data;
        }

        // success: false durumu
        // Backend'den message veya error field'ı gelebilir
        const errorMessage = (response.data as any).message || response.data.error || 'İşlem başarısız oldu';
        throw new Error(errorMessage);
      } catch (error) {
        if (axios.isCancel(error)) {
          throw new Error('Request cancelled');
        }

        if (error instanceof AxiosError) {
          // 503 hatası için özel handling (Agora credentials eksik olabilir - beklenen bir durum)
          if (error.response?.status === 503 && url.includes('/agora/token')) {
            // Agora token için 503 hatası beklenen bir durum (credentials yok), sessizce loglama
            if (__DEV__) {
              console.debug(`[API] POST ${url} 503 (Service Unavailable) - Agora credentials not configured`);
            }
          }
        }

        // Development modda hata loglama (503 Agora token hariç)
        if (__DEV__) {
          const shouldLogError = !(error instanceof AxiosError && error.response?.status === 503 && url.includes('/agora/token'));
          if (shouldLogError) {
            console.error(`[API] POST ${url} Error:`, error);
            if (error instanceof AxiosError && error.response) {
              console.error(`[API] POST ${url} Response Status:`, error.response.status);
              console.error(`[API] POST ${url} Response Data:`, JSON.stringify(error.response.data, null, 2));
              console.error(`[API] POST ${url} Response Headers:`, error.response.headers);
            }
          }
        }

        if (error instanceof AxiosError) {
          if (error.response?.data) {
            const apiError = error.response.data as ApiResponse<unknown>;
            // Backend'den gelen hata mesajını kullan
            // Eğer response.data bir object ise ve error property'si varsa kullan
            let errorMessage = 'Bilinmeyen bir hata oluştu';

            if (apiError && typeof apiError === 'object') {
              // ApiResponse formatı: {success: false, error: "..."}
              if ('error' in apiError && typeof apiError.error === 'string') {
                errorMessage = apiError.error;
              } else if ('message' in apiError && typeof (apiError as any).message === 'string') {
                errorMessage = (apiError as any).message;
              }
            }

            throw new Error(errorMessage);
          }
          if (error.request) {
            throw new Error('Ağ hatası. Lütfen bağlantınızı kontrol edin.');
          }
        }
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Beklenmeyen bir hata oluştu');
      } finally {
        // Clean up
        pendingRequests.delete(requestKey);
        cancelTokens.delete(requestKey);
      }
    })();

    // Store promise for deduplication
    pendingRequests.set(requestKey, requestPromise);

    return requestPromise;
  }

  async put<T>(url: string, data?: unknown, config?: any, retryConfig?: RetryConfig): Promise<T> {
    const requestKey = this.getRequestKey('PUT', url, data);

    // Check for duplicate request
    if (pendingRequests.has(requestKey)) {
      if (__DEV__) {
        console.log(`[API] Deduplicating PUT request: ${url}`);
      }
      const existingRequest = pendingRequests.get(requestKey);
      if (existingRequest) {
        return existingRequest;
      }
      // Fall through if somehow the request was removed between has() and get()
    }

    // Create cancel token
    const cancelTokenSource = axios.CancelToken.source();
    cancelTokens.set(requestKey, cancelTokenSource);

    // Create request promise
    const requestPromise = (async () => {
      try {
        const response = await this.retryRequest(
          () => this.client.put<ApiResponse<T>>(url, data, {
            ...config,
            cancelToken: cancelTokenSource.token,
          }),
          retryConfig
        );

        if (response.data.success && response.data.data) {
          return response.data.data;
        }

        const errorMessage = response.data.error || 'İşlem başarısız oldu';
        throw new Error(errorMessage);
      } catch (error) {
        if (axios.isCancel(error)) {
          throw new Error('Request cancelled');
        }

        if (error instanceof AxiosError) {
          if (error.response?.data) {
            const apiError = error.response.data as ApiResponse<unknown>;
            const errorMessage = apiError.error || error.message || 'Bilinmeyen bir hata oluştu';
            throw new Error(errorMessage);
          }
          if (error.request) {
            throw new Error('Ağ hatası. Lütfen bağlantınızı kontrol edin.');
          }
        }
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Beklenmeyen bir hata oluştu');
      } finally {
        // Clean up
        pendingRequests.delete(requestKey);
        cancelTokens.delete(requestKey);
      }
    })();

    // Store promise for deduplication
    pendingRequests.set(requestKey, requestPromise);

    return requestPromise;
  }

  async delete<T>(url: string, config?: any, retryConfig?: RetryConfig): Promise<T> {
    const requestKey = this.getRequestKey('DELETE', url);

    // Check for duplicate request
    if (pendingRequests.has(requestKey)) {
      if (__DEV__) {
        console.log(`[API] Deduplicating DELETE request: ${url}`);
      }
      const existingRequest = pendingRequests.get(requestKey);
      if (existingRequest) {
        return existingRequest;
      }
      // Fall through if somehow the request was removed between has() and get()
    }

    // Create cancel token
    const cancelTokenSource = axios.CancelToken.source();
    cancelTokens.set(requestKey, cancelTokenSource);

    // Create request promise
    const requestPromise = (async () => {
      try {
        const response = await this.retryRequest(
          () => this.client.delete<ApiResponse<T>>(url, {
            ...config,
            cancelToken: cancelTokenSource.token,
          }),
          retryConfig
        );

        if (response.data.success && response.data.data) {
          return response.data.data;
        }

        const errorMessage = response.data.error || 'İşlem başarısız oldu';
        throw new Error(errorMessage);
      } catch (error) {
        if (axios.isCancel(error)) {
          throw new Error('Request cancelled');
        }

        if (error instanceof AxiosError) {
          if (error.response?.data) {
            const apiError = error.response.data as ApiResponse<unknown>;
            const errorMessage = apiError.error || error.message || 'Bilinmeyen bir hata oluştu';
            throw new Error(errorMessage);
          }
          if (error.request) {
            throw new Error('Ağ hatası. Lütfen bağlantınızı kontrol edin.');
          }
        }
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Beklenmeyen bir hata oluştu');
      } finally {
        // Clean up
        pendingRequests.delete(requestKey);
        cancelTokens.delete(requestKey);
      }
    })();

    // Store promise for deduplication
    pendingRequests.set(requestKey, requestPromise);

    return requestPromise;
  }
}

export const apiClient = new ApiClient();
