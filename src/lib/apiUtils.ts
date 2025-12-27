/**
 * API Utility Functions
 * Helper functions for API management and monitoring
 */

import {apiClient} from './apiClient';
import NetInfo from '@react-native-community/netinfo';

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

/**
 * Wait for network connection
 */
export async function waitForNetwork(timeout: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const online = await isOnline();
    if (online) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

/**
 * Check API health
 */
export async function checkApiHealth(): Promise<{healthy: boolean; latency?: number}> {
  try {
    const startTime = Date.now();
    const healthy = await apiClient.healthCheck();
    const latency = Date.now() - startTime;
    
    return {healthy, latency};
  } catch (error) {
    return {healthy: false};
  }
}

/**
 * Retry API call with network check
 */
export async function retryWithNetworkCheck<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check network before retry
      if (attempt > 0) {
        const online = await isOnline();
        if (!online) {
          await waitForNetwork(5000);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
      
      return await apiCall();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof Error && (error as any).status) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) {
          throw error;
        }
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Batch API requests
 */
export async function batchRequests<T>(
  requests: Array<() => Promise<T>>,
  concurrency: number = 3
): Promise<T[]> {
  const results: T[] = [];
  const errors: Error[] = [];
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(request => request())
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[i + index] = result.value;
      } else {
        errors.push(result.reason);
      }
    });
  }
  
  if (errors.length > 0 && errors.length === requests.length) {
    throw errors[0];
  }
  
  return results;
}

/**
 * Debounce API call
 */
export function debounceApiCall<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  delay: number = 300
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<any> | null = null;
  let resolvePending: ((value: any) => void) | null = null;
  
  return ((...args: any[]) => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (pendingPromise) {
        // Cancel previous promise
        pendingPromise.catch(() => {
          // Ignore cancellation errors
        });
      }
      
      timeoutId = setTimeout(async () => {
        try {
          const result = await apiCall(...args);
          resolve(result);
          if (resolvePending) {
            resolvePending(result);
            resolvePending = null;
          }
        } catch (error) {
          reject(error);
        } finally {
          pendingPromise = null;
          timeoutId = null;
        }
      }, delay);
      
      pendingPromise = new Promise(resolve => {
        resolvePending = resolve;
      });
    });
  }) as T;
}



