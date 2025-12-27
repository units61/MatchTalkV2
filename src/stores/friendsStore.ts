import {create} from 'zustand';
import {User} from '../types/user';
import {friendsApi, FriendRequest} from '../services/api/friendsApi';
import {trackEvent, trackConversion} from '../utils/analytics';
import {errorTracking, logger} from './middleware';

interface FriendsState {
  friends: User[];
  searchResults: User[];
  suggestions: User[];
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  loading: boolean;
  error: string | null;
  pagination?: {
    total: number;
    hasMore: boolean;
    offset: number;
  };

  // Actions
  fetchFriends: (limit?: number, offset?: number) => Promise<void>;
  fetchReceivedRequests: () => Promise<void>;
  fetchSentRequests: () => Promise<void>;
  fetchSuggestions: (limit?: number) => Promise<void>;
  searchUsers: (query: string, filters?: {gender?: 'male' | 'female'; onlineOnly?: boolean; hasMutualFriends?: boolean}) => Promise<void>;
  addFriend: (friendId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  sendRequest: (friendId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;
}

export const useFriendsStore = create<FriendsState>(
  errorTracking(
    logger((set, get) => ({
  friends: [],
  searchResults: [],
  suggestions: [],
  receivedRequests: [],
  sentRequests: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    hasMore: false,
    offset: 0,
  },

  fetchFriends: async (limit?: number, offset?: number) => {
    try {
      set({loading: true, error: null});
      const result = await friendsApi.getFriends(false, limit, offset);
      const friends = (result.friends || []).map((f) => f.friend);
      
      if (offset !== undefined && offset > 0) {
        // Append to existing friends (infinite scroll)
        set((state) => ({
          friends: [...state.friends, ...friends],
          loading: false,
          error: null,
          pagination: result.pagination ? {
            total: result.pagination.total,
            hasMore: result.pagination.hasMore,
            offset: offset + (limit || 20),
          } : state.pagination,
        }));
      } else {
        // Replace friends (initial load)
        set({
          friends,
          loading: false,
          error: null,
          pagination: result.pagination ? {
            total: result.pagination.total,
            hasMore: result.pagination.hasMore,
            offset: limit || 20,
          } : {
            total: 0,
            hasMore: false,
            offset: 0,
          },
        });
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Arkadaşlar yüklenemedi',
      });
    }
  },

  fetchReceivedRequests: async () => {
    try {
      set({loading: true, error: null});
      const requests = await friendsApi.getReceivedRequests();
      set({receivedRequests: requests, loading: false, error: null});
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Gelen istekler yüklenemedi',
      });
    }
  },

  fetchSentRequests: async () => {
    try {
      set({loading: true, error: null});
      const requests = await friendsApi.getSentRequests();
      set({sentRequests: requests, loading: false, error: null});
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Gönderilen istekler yüklenemedi',
      });
    }
  },

  searchUsers: async (query: string, filters?: {gender?: 'male' | 'female'; onlineOnly?: boolean; hasMutualFriends?: boolean}) => {
    try {
      if (!query.trim()) {
        set({searchResults: []});
        return;
      }

      set({loading: true, error: null});
      const users = await friendsApi.searchUsers(query, filters);
      set({searchResults: users, loading: false, error: null});
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Arama başarısız',
        searchResults: [],
      });
    }
  },

  addFriend: async (friendId: string) => {
    try {
      set({loading: true, error: null});
      const response = await friendsApi.addFriend(friendId);
      set((state) => ({
        friends: [...state.friends, response.friend],
        loading: false,
        error: null,
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Arkadaş eklenemedi',
      });
      throw error;
    }
  },

  removeFriend: async (friendId: string) => {
    try {
      set({loading: true, error: null});
      await friendsApi.removeFriend(friendId);
      set((state) => ({
        friends: state.friends.filter((f) => f.id !== friendId),
        loading: false,
        error: null,
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Arkadaşlık kaldırılamadı',
      });
      throw error;
    }
  },

  clearSearch: () => {
    set({searchResults: []});
  },

  sendRequest: async (friendId: string) => {
    try {
      set({loading: true, error: null});
      const request = await friendsApi.sendRequest(friendId);
      set((state) => ({
        sentRequests: [...state.sentRequests, request],
        loading: false,
        error: null,
      }));

      // Track friend request sent
      trackEvent('friend_request_sent', {
        friendId,
        requestId: request.id,
      });
    } catch (error) {
      trackEvent('friend_request_sent', {
        friendId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'İstek gönderilemedi',
      });
      throw error;
    }
  },

  acceptRequest: async (requestId: string) => {
    try {
      set({loading: true, error: null});
      const request = useFriendsStore.getState().receivedRequests.find(r => r.id === requestId);
      await friendsApi.acceptRequest(requestId);
      set((state) => ({
        receivedRequests: state.receivedRequests.filter((r) => r.id !== requestId),
        loading: false,
        error: null,
      }));
      // Arkadaş listesini yenile
      await friendsApi.getFriends().then((friendList) => {
        const friends = (friendList.friends || []).map((f) => f.friend);
        set({friends});
      }).catch((error) => {
        // Arkadaş listesi yenileme hatası kritik değil, sessizce devam et
        if (__DEV__) {
          console.warn('[FriendsStore] Failed to refresh friends list:', error);
        }
      });

      // Track friend request accepted
      trackEvent('friend_request_accepted', {
        requestId,
        friendId: request?.fromUser?.id,
      });

      // Track conversion - first friend added
      if (request?.fromUser?.id) {
        trackConversion('first_friend_added', undefined, {
          friendId: request.fromUser.id,
        });
      }
    } catch (error) {
      trackEvent('friend_request_accepted', {
        requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'İstek kabul edilemedi',
      });
      throw error;
    }
  },

  rejectRequest: async (requestId: string) => {
    try {
      set({loading: true, error: null});
      await friendsApi.rejectRequest(requestId);
      set((state) => ({
        receivedRequests: state.receivedRequests.filter((r) => r.id !== requestId),
        loading: false,
        error: null,
      }));

      // Track friend request rejected
      trackEvent('friend_request_rejected', {
        requestId,
      });
    } catch (error) {
      trackEvent('friend_request_rejected', {
        requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'İstek reddedilemedi',
      });
      throw error;
    }
  },

  cancelRequest: async (requestId: string) => {
    try {
      set({loading: true, error: null});
      await friendsApi.cancelRequest(requestId);
      set((state) => ({
        sentRequests: state.sentRequests.filter((r) => r.id !== requestId),
        loading: false,
        error: null,
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'İstek iptal edilemedi',
      });
      throw error;
    }
  },

  clearError: () => {
    set({error: null});
  },

  fetchSuggestions: async (limit?: number) => {
    try {
      set({loading: true, error: null});
      const suggestions = await friendsApi.getSuggestions(limit);
      set({suggestions, loading: false, error: null});
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Öneriler yüklenemedi',
        suggestions: [],
      });
    }
  },
  }), 'friendsStore'),
  'friendsStore'
)
);

