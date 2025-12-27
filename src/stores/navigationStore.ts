import {create} from 'zustand';
import {errorTracking, logger} from './middleware';

export type ScreenName =
  | 'home'
  | 'friends'
  | 'profile'
  | 'settings'
  | 'room'
  | 'notifications'
  | 'invite'
  | 'matching'
  | 'editProfile'
  | 'changeEmail'
  | 'changePassword'
  | 'login'
  | 'register';

export type NavigationParams = Record<string, any>;

interface NavigationStackItem {
  screen: ScreenName;
  params?: NavigationParams;
}

interface NavigationState {
  stack: NavigationStackItem[];
  modal: NavigationStackItem | null;
  navigateRef: any; // React Navigation navigation ref

  // Actions
  setNavigateRef: (ref: any) => void;
  navigate: (screen: ScreenName, params?: NavigationParams) => void;
  goBack: () => void;
  replace: (screen: ScreenName, params?: NavigationParams) => void;
  reset: () => void;
  openModal: (screen: ScreenName, params?: NavigationParams) => void;
  closeModal: () => void;
  getCurrentScreen: () => ScreenName;
  getCurrentParams: () => NavigationParams | undefined;
}

export const useNavigationStore = create<NavigationState>(
  errorTracking(
    logger((set, get) => ({
  stack: [{screen: 'home'}],
  modal: null,
  navigateRef: null,

  setNavigateRef: (ref: any) => {
    set({navigateRef: ref});
  },

  navigate: (screen: ScreenName, params?: NavigationParams) => {
    const state = get();
    
    // Update internal stack
    set({
      stack: [...state.stack, {screen, params}],
    });
    
    // Navigate using React Navigation
    if (state.navigateRef) {
      state.navigateRef(screen, params);
    }
  },

  goBack: () => {
    const state = get();
    if (state.stack.length > 1) {
      // Update internal stack
      set({
        stack: state.stack.slice(0, -1),
      });
      
      // Navigate back using React Navigation
      if (state.navigateRef) {
        state.navigateRef.goBack();
      }
    }
  },

  replace: (screen: ScreenName, params?: NavigationParams) => {
    const state = get();
    
    // Update internal stack
    if (state.stack.length > 0) {
      set({
        stack: [...state.stack.slice(0, -1), {screen, params}],
      });
    } else {
      set({
        stack: [{screen, params}],
      });
    }
    
    // Replace using React Navigation
    if (state.navigateRef) {
      state.navigateRef.replace(screen, params);
    }
  },

  reset: () => {
    set({
      stack: [{screen: 'home'}],
      modal: null,
    });
  },

  openModal: (screen: ScreenName, params?: NavigationParams) => {
    set({
      modal: {screen, params},
    });
  },

  closeModal: () => {
    set({
      modal: null,
    });
  },

  getCurrentScreen: () => {
    const state = get();
    const stack = state.stack;
    return stack[stack.length - 1]?.screen || 'home';
  },

  getCurrentParams: () => {
    const state = get();
    const stack = state.stack;
    return stack[stack.length - 1]?.params;
  },
    }), 'navigationStore'),
    'navigationStore'
  )
);

