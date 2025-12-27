import {StateCreator, StoreApi} from 'zustand';
import {captureException, addBreadcrumb} from '../utils/errorTracking';

/**
 * Zustand middleware for logging (development only)
 */
export const logger = <T extends object>(
  config: StateCreator<T>,
  name?: string
): StateCreator<T> => {
  return (set, get, api) => {
    const store = config(set, get, api);
    
    if (__DEV__) {
      return new Proxy(store, {
        get: (target, prop) => {
          const value = target[prop as keyof T];
          if (typeof value === 'function') {
            return (...args: any[]) => {
              console.log(`[Store${name ? `:${name}` : ''}] ${String(prop)}`, args);
              const result = value(...args);
              if (result instanceof Promise) {
                return result.catch(error => {
                  console.error(`[Store${name ? `:${name}` : ''}] ${String(prop)} error:`, error);
                  throw error;
                });
              }
              return result;
            };
          }
          return value;
        },
      });
    }
    return store;
  };
};

/**
 * Zustand middleware for error tracking
 */
export const errorTracking = <T extends object>(
  config: StateCreator<T>,
  storeName?: string
): StateCreator<T> => {
  return (set, get, api) => {
    const store = config(set, get, api);
    
    return new Proxy(store, {
      get: (target, prop) => {
        const value = target[prop as keyof T];
        if (typeof value === 'function') {
          return (...args: any[]) => {
            try {
              addBreadcrumb({
                message: `Store action: ${String(prop)}`,
                category: 'store',
                level: 'info',
                data: {
                  store: storeName || 'unknown',
                  action: String(prop),
                  args: args.length > 0 ? JSON.stringify(args) : undefined,
                },
              });
              
              const result = value(...args);
              if (result instanceof Promise) {
                return result.catch(error => {
                  captureException(error as Error, {
                    component: storeName || 'store',
                    action: String(prop),
                  });
                  throw error;
                });
              }
              return result;
            } catch (error) {
              captureException(error as Error, {
                component: storeName || 'store',
                action: String(prop),
              });
              throw error;
            }
          };
        }
        return value;
      },
    });
  };
};

/**
 * Zustand middleware for persistence (using AsyncStorage)
 */
export const createPersistStorage = <T>(storageKey: string) => {
  return {
    getItem: async (): Promise<string | null> => {
      try {
        const {default: AsyncStorage} = await import('@react-native-async-storage/async-storage');
        return await AsyncStorage.getItem(storageKey);
      } catch (error) {
        console.error(`[Persist] Failed to get ${storageKey}:`, error);
        return null;
      }
    },
    setItem: async (value: string): Promise<void> => {
      try {
        const {default: AsyncStorage} = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.setItem(storageKey, value);
      } catch (error) {
        console.error(`[Persist] Failed to set ${storageKey}:`, error);
      }
    },
    removeItem: async (): Promise<void> => {
      try {
        const {default: AsyncStorage} = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.removeItem(storageKey);
      } catch (error) {
        console.error(`[Persist] Failed to remove ${storageKey}:`, error);
      }
    },
  };
};

/**
 * Simple persist middleware for Zustand (without external dependencies)
 */
export const persist = <T extends object>(
  config: StateCreator<T>,
  options: {
    name: string;
    partialize?: (state: T) => Partial<T>;
  }
): StateCreator<T> => {
  return (set, get, api) => {
    const store = config(set, get, api);
    const storage = createPersistStorage<T>(`@matchtalk_${options.name}`);
    
    // Load persisted state on initialization
    storage.getItem().then(savedState => {
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          const partialState = options.partialize ? options.partialize(parsed) : parsed;
          set(partialState as Partial<T>);
        } catch (error) {
          console.error(`[Persist] Failed to parse ${options.name}:`, error);
        }
      }
    });
    
    // Save state on changes
    const originalSet = set;
    set = ((partial, replace) => {
      originalSet(partial, replace);
      const currentState = get();
      const stateToSave = options.partialize ? options.partialize(currentState) : currentState;
      storage.setItem(JSON.stringify(stateToSave)).catch(console.error);
    }) as typeof set;
    
    return store;
  };
};


