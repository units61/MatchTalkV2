import {create} from 'zustand';
import {TOAST_CONFIG} from '../constants/app';
import {errorTracking, logger} from './middleware';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // milliseconds, 0 = no auto-dismiss
}

interface ToastState {
  toasts: Toast[];
  
  // Actions
  showToast: (message: string, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastState>(
  errorTracking(
    logger((set) => ({
  toasts: [],

  showToast: (message: string, type: ToastType = 'info', duration: number = TOAST_CONFIG.DEFAULT_DURATION) => {
    const id = `toast-${++toastIdCounter}`;
    const toast: Toast = {
      id,
      message,
      type,
      duration,
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }

    return id;
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({toasts: []});
  },
    }), 'toastStore'),
    'toastStore'
  )
);

// Convenience functions
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'success', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'error', duration || TOAST_CONFIG.ERROR_DURATION),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'warning', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().showToast(message, 'info', duration),
};

