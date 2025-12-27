import {io, Socket} from 'socket.io-client';
import {apiClient} from './apiClient';
import {config} from './config';
import {WEBSOCKET_CONFIG} from '../constants/app';
import {captureException, addBreadcrumb} from '../utils/errorTracking';
import {trackEvent} from '../utils/analytics';

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private reconnectDelay = WEBSOCKET_CONFIG.RECONNECT_DELAY;
  private maxReconnectDelay = WEBSOCKET_CONFIG.MAX_RECONNECT_DELAY;
  private reconnectTimer: NodeJS.Timeout | null = null;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return this.socket;
    }

    const token = await apiClient.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    console.log('[WebSocket] Connecting to:', config.api.wsBaseUrl);

    // If socket exists but not connected, disconnect first
    if (this.socket) {
      this.socket.removeAllListeners(); // Clean up all listeners
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(config.api.wsBaseUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: WEBSOCKET_CONFIG.CONNECTION_TIMEOUT,
      // Exponential backoff configuration
      randomizationFactor: 0.5, // Add randomness to prevent thundering herd
    });

    // Wait for connection with timeout
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timeoutMs = WEBSOCKET_CONFIG.CONNECTION_TIMEOUT;
      
      // Periyodik olarak socket'in connected durumunu kontrol et
      const connectionCheckInterval = setInterval(() => {
        if (this.socket?.connected && !resolved) {
          // Socket bağlı ama connect event'i henüz tetiklenmemiş
          resolved = true;
          clearInterval(connectionCheckInterval);
          clearTimeout(timeout);
          console.log('[WebSocket] Connected (detected via status check)');
          this.reconnectAttempts = 0;
          if (this.socket) {
            this.socket.off('connect', connectHandler);
            this.socket.off('connect_error', errorHandler);
          }
          resolve(this.socket);
        }
      }, 100); // Her 100ms'de bir kontrol et
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          // Timeout öncesi son bir kontrol yap
          if (this.socket?.connected) {
            // Socket bağlı, timeout'u iptal et
            resolved = true;
            clearInterval(connectionCheckInterval);
            clearTimeout(timeout);
            console.log('[WebSocket] Connected (detected before timeout)');
            this.reconnectAttempts = 0;
            if (this.socket) {
              this.socket.off('connect', connectHandler);
              this.socket.off('connect_error', errorHandler);
            }
            resolve(this.socket);
            return;
          }
          
          // Gerçekten timeout
          resolved = true;
          clearInterval(connectionCheckInterval);
          const timeoutSeconds = timeoutMs / 1000;
          console.error(`[WebSocket] Connection timeout after ${timeoutSeconds} seconds`);
          console.error(`[WebSocket] Connection details:`, {
            url: config.api.wsBaseUrl,
            hasToken: !!token,
            socketId: this.socket?.id,
            connected: this.socket?.connected,
            transport: this.socket?.io?.engine?.transport?.name,
          });
          
          // Backend health check önerisi
          console.warn(`[WebSocket] Backend sunucusunun çalıştığını kontrol edin:`);
          console.warn(`[WebSocket] 1. Backend sunucusu çalışıyor mu? (http://localhost:4000)`);
          console.warn(`[WebSocket] 2. Redis çalışıyor mu? (WebSocket için gerekli)`);
          console.warn(`[WebSocket] 3. CORS ayarları doğru mu?`);
          
          // Clean up listeners
          if (this.socket) {
            this.socket.off('connect', connectHandler);
            this.socket.off('connect_error', errorHandler);
            this.socket.disconnect();
            this.socket = null;
          }

          // Send timeout to Sentry
          const timeoutError = new Error(`WebSocket connection timeout after ${timeoutSeconds} seconds`);
          captureException(timeoutError, {
            component: 'WebSocketClient',
            action: 'connection_timeout',
            additionalData: {
              url: config.api.wsBaseUrl,
              timeoutSeconds,
              hasToken: !!token,
            },
          }, 'high');

          addBreadcrumb(
            `WebSocket connection timeout: ${timeoutSeconds}s`,
            'websocket',
            'error',
            {
              url: config.api.wsBaseUrl,
              timeoutSeconds,
            }
          );

          reject(new Error(`WebSocket bağlantı zaman aşımı (${timeoutSeconds} saniye). Backend WebSocket server çalışıyor mu? URL: ${config.api.wsBaseUrl}. Lütfen backend sunucusunun ve Redis'in çalıştığından emin olun.`));
        }
      }, timeoutMs * 0.75); // 75% of connection timeout

      const connectHandler = () => {
        if (!resolved) {
          resolved = true;
          clearInterval(connectionCheckInterval);
          clearTimeout(timeout);
          console.log('[WebSocket] Connected successfully');
          this.reconnectAttempts = 0;
          
          // Track connection quality (connection time)
          const connectionTime = Date.now() - (this.socket as any)?._connectionStartTime || 0;
          trackEvent('websocket_connection_quality', {
            connectionTime,
            reconnectAttempts: this.reconnectAttempts,
            success: true,
          }).catch(() => {
            // Ignore errors
          });
          
          if (this.socket) {
            this.socket.off('connect', connectHandler);
            this.socket.off('connect_error', errorHandler);
            resolve(this.socket);
          } else {
            // This should never happen, but handle it safely
            reject(new Error('Socket instance is null after connection'));
          }
        }
      };

      const errorHandler = (error: Error | string) => {
        if (!resolved) {
          resolved = true;
          clearInterval(connectionCheckInterval);
          clearTimeout(timeout);
          const errorMessage = typeof error === 'string' ? error : (error.message || String(error));
          console.error('[WebSocket] Connection error:', errorMessage);
          console.error('[WebSocket] Connection details:', {
            url: config.api.wsBaseUrl,
            hasToken: !!token,
            errorType: typeof error,
            errorDetails: error,
            socketId: this.socket?.id,
            connected: this.socket?.connected,
          });

          // Send to Sentry
          const wsError = error instanceof Error ? error : new Error(errorMessage);
          captureException(wsError, {
            component: 'WebSocketClient',
            action: 'connect_error',
            additionalData: {
              url: config.api.wsBaseUrl,
              hasToken: !!token,
              socketId: this.socket?.id,
              connected: this.socket?.connected,
              reconnectAttempts: this.reconnectAttempts,
            },
          }, 'high');

          addBreadcrumb(
            `WebSocket connection error: ${errorMessage}`,
            'websocket',
            'error',
            {
              url: config.api.wsBaseUrl,
              errorMessage,
            }
          );

          this.reconnectAttempts++;
          if (this.socket) {
            this.socket.off('connect', connectHandler);
            this.socket.off('connect_error', errorHandler);
          }
          
          // Daha açıklayıcı hata mesajları
          let userFriendlyMessage = 'WebSocket bağlantı hatası';
          if (errorMessage.includes('Authentication') || errorMessage.includes('token')) {
            userFriendlyMessage = 'Kimlik doğrulama hatası. Lütfen tekrar giriş yapın.';
          } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch') || errorMessage.includes('xhr poll error')) {
            userFriendlyMessage = `Backend WebSocket server'a bağlanılamıyor. Lütfen backend sunucusunun çalıştığından emin olun. URL: ${config.api.wsBaseUrl}`;
          } else {
            userFriendlyMessage = `WebSocket bağlantı hatası: ${errorMessage}`;
          }
          
          reject(new Error(userFriendlyMessage));
        }
      };

      // Check if already connected (can happen with fast connections)
      if (this.socket!.connected) {
        if (!resolved) {
          resolved = true;
          clearInterval(connectionCheckInterval);
          clearTimeout(timeout);
          console.log('[WebSocket] Connected immediately');
          this.reconnectAttempts = 0;
          resolve(this.socket!);
        }
        return;
      }

      this.socket!.on('connect', connectHandler);
      this.socket!.on('connect_error', errorHandler);
      
      // Additional debugging events
      this.socket!.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected during connection attempt:', reason);
      });
      
      this.socket!.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[WebSocket] Reconnection attempt ${attemptNumber} during initial connection`);
      });

      this.socket!.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        // Handle reconnection with exponential backoff
        if (reason === 'io server disconnect' || reason === 'transport close') {
          // Server closed connection or transport error - attempt reconnection
          this.scheduleReconnect();
        }
      });

      this.socket!.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[WebSocket] Reconnection attempt ${attemptNumber}`);
        this.reconnectAttempts = attemptNumber;
        
        // Track reconnection attempt
        trackEvent('websocket_reconnect_attempt', {
          attemptNumber,
          maxAttempts: this.maxReconnectAttempts,
        }).catch(() => {
          // Ignore errors
        });
      });

      this.socket!.on('reconnect', (attemptNumber) => {
        console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
        this.reconnectAttempts = 0;
        this.reconnectDelay = WEBSOCKET_CONFIG.RECONNECT_DELAY; // Reset delay on successful reconnect
        
        // Track successful reconnection
        trackEvent('websocket_reconnect_success', {
          attemptNumber,
          totalAttempts: attemptNumber,
        }).catch(() => {
          // Ignore errors
        });
      });

      this.socket!.on('reconnect_failed', () => {
        console.error('[WebSocket] Reconnection failed after all attempts');
        
        // Track reconnection failure
        trackEvent('websocket_reconnect_failed', {
          maxAttempts: this.maxReconnectAttempts,
          finalAttempt: this.reconnectAttempts,
        }).catch(() => {
          // Ignore errors
        });
        
        // Send to Sentry
        captureException(
          new Error('WebSocket reconnection failed after all attempts'),
          {
            component: 'WebSocketClient',
            action: 'reconnect_failed',
            additionalData: {
              url: config.api.wsBaseUrl,
              maxReconnectAttempts: this.maxReconnectAttempts,
            },
          },
          'high'
        );

        addBreadcrumb(
          'WebSocket reconnection failed after all attempts',
          'websocket',
          'error',
          {
            maxAttempts: this.maxReconnectAttempts,
          }
        );

        this.reconnectAttempts = 0;
        this.reconnectDelay = WEBSOCKET_CONFIG.RECONNECT_DELAY; // Reset delay
      });
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.reconnectDelay = WEBSOCKET_CONFIG.RECONNECT_DELAY;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection attempt failed:', error);
        // Schedule next attempt
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });
    }, delay);
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Room events
  async joinRoom(roomId: string): Promise<void> {
    try {
      if (!this.socket || !this.socket.connected) {
        // Try to connect first
        console.log('[WebSocket] Socket not connected, attempting to connect...');
        try {
          await this.connect();
        } catch (connectError) {
          const connectErrorMessage = connectError instanceof Error ? connectError.message : String(connectError);
          console.warn(`[WebSocket] Connection failed for joinRoom: ${connectErrorMessage}`);
          // WebSocket bağlantısı başarısız olsa bile hata fırlatma
          // HTTP API ile odaya katılım zaten yapılıyor, sadece real-time güncellemeler olmayacak
          console.warn(`[WebSocket] WebSocket bağlantısı olmadan devam ediliyor. Odaya HTTP API ile katılım yapılabilir.`);
          return; // Sessizce çık, hata fırlatma
        }
      }
      
      if (!this.socket) {
        console.warn('[WebSocket] Socket instance is null, skipping joinRoom');
        return; // Sessizce çık, hata fırlatma
      }
      
      if (!this.socket.connected) {
        // Try one more time to check connection status
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!this.socket.connected) {
          console.warn('[WebSocket] Socket still not connected after wait, skipping joinRoom');
          return; // Sessizce çık, hata fırlatma
        }
      }
      
      console.log(`[WebSocket] Joining room: ${roomId}`);
      this.socket.emit('join-room', {roomId});
      console.log(`[WebSocket] Join room event emitted for: ${roomId}`);

      // Track WebSocket join room
      const {trackEvent} = await import('../utils/analytics');
      trackEvent('websocket_join_room', {
        roomId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[WebSocket] Error in joinRoom for ${roomId}:`, errorMessage);
      
      // Send to Sentry
      captureException(
        error instanceof Error ? error : new Error(errorMessage),
        {
          component: 'WebSocketClient',
          action: 'joinRoom',
          additionalData: {
            roomId,
            errorMessage,
          },
        },
        'medium'
      );

      // Hata fırlatma, sadece logla
      // HTTP API ile odaya katılım zaten yapılıyor
      console.warn(`[WebSocket] joinRoom başarısız, ancak HTTP API ile odaya katılım devam ediyor`);
    }
  }

  async leaveRoom(roomId: string) {
    if (!this.socket || !this.socket.connected) {
      return; // Already disconnected, no need to emit
    }
    this.socket.emit('leave-room', {roomId});

    // Track WebSocket leave room
    const {trackEvent} = await import('../utils/analytics');
    trackEvent('websocket_leave_room', {
      roomId,
    });
  }

  async voteExtension(roomId: string, vote: 'yes' | 'no') {
    if (!this.socket || !this.socket.connected) {
      await this.connect();
    }
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('vote-extension', {roomId, vote});
  }

  // Matching events
  async joinMatching() {
    if (!this.socket || !this.socket.connected) {
      await this.connect();
    }
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('matching-join');

    // Track WebSocket join matching
    const {trackEvent} = await import('../utils/analytics');
    trackEvent('websocket_join_matching', {});
  }

  async leaveMatching() {
    if (!this.socket || !this.socket.connected) {
      return; // Already disconnected
    }
    this.socket.emit('matching-leave');

    // Track WebSocket leave matching
    const {trackEvent} = await import('../utils/analytics');
    trackEvent('websocket_leave_matching', {});
  }

  async getMatchingStatus() {
    if (!this.socket || !this.socket.connected) {
      await this.connect();
    }
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('matching-status');
  }

  // Event listeners
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      // Queue the listener to be set up when socket connects
      this.connect().then(() => {
        if (this.socket) {
          this.socket.on(event, callback);
        }
      }).catch(() => {
        // Connection failed, listener won't be set up
      });
      return;
    }
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) {
      return;
    }
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }
}

export const websocketClient = new WebSocketClient();


