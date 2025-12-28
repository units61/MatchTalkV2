import React, {useEffect, useRef} from 'react';
import {View, Text} from 'react-native';
import {NavigationContainer, NavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Linking} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from '../stores/authStore';
import {useWebSocketStore} from '../stores/websocketStore';
import NetInfo from '@react-native-community/netinfo';
import {updateOnlineStatus} from '../utils/analytics';
import {registerForPushNotifications, setupNotificationListeners} from '../utils/pushNotifications';
import {useAppState} from '../utils/appState';
import {parseDeepLink, getInitialURL, setupDeepLinkListener} from '../utils/deepLinking';
import {useNavigationStore} from '../stores/navigationStore';
import {setNavigationRef} from '../utils/navigationHelpers';

// Screens
import HomeScreen from '../screens/HomeScreen';
import RoomsScreen from '../screens/RoomsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RoomScreen from '../screens/RoomScreen';
import FriendsScreen from '../screens/FriendsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MatchingScreen from '../screens/MatchingScreen';
import OnboardingScreen, {checkOnboardingCompleted} from '../screens/OnboardingScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ChangeEmailScreen from '../screens/ChangeEmailScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none', // We'll use custom BottomNav component
        },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Rooms" component={RoomsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const {isAuthenticated, loadUser} = useAuthStore();
  const {connect, disconnect} = useWebSocketStore();
  const {setNavigateRef} = useNavigationStore();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [showOnboarding, setShowOnboarding] = React.useState<boolean>(true);

  // Onboarding kontrolü - arka planda yap, blocking yapma
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        const completed = await checkOnboardingCompleted();
        if (mounted) {
          setShowOnboarding(!completed);
          
          // Eğer onboarding tamamsa kullanıcıyı yükle
          if (completed) {
            loadUser().catch(console.error);
          }
        }
      } catch (e) {
        // Hata olsa bile onboarding göster
        if (mounted) {
          setShowOnboarding(true);
        }
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [loadUser]);

  useEffect(() => {
    // Setup network status listener
    const unsubscribe = NetInfo.addEventListener(state => {
      updateOnlineStatus(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Setup app state management (foreground/background)
  useAppState(
    () => {
      // On foreground - reconnect WebSocket if authenticated
      if (isAuthenticated) {
        connect().catch(console.error);
      }
    },
    () => {
      // On background - disconnect WebSocket to save resources
      if (isAuthenticated) {
        disconnect();
      }
    }
  );

  useEffect(() => {
    // Connect WebSocket when authenticated
    if (isAuthenticated) {
      connect().catch(console.error);
      
      // Register for push notifications
      registerForPushNotifications().catch(console.error);
      
      // Setup notification listeners
      const cleanup = setupNotificationListeners(
        (notification) => {
          // Handle foreground notification
          console.log('Notification received:', notification);
        },
        (response) => {
          // Handle notification tap
          console.log('Notification tapped:', response);
          
          // Navigate based on notification data
          // Use optional chaining to safely access nested properties
          const data = response?.notification?.request?.content?.data;
          if (data?.screen && navigationRef.current) {
            try {
              // @ts-ignore - Navigation params type is complex
              navigationRef.current.navigate(data.screen, data.params);
            } catch (error) {
              console.error('[AppNavigator] Navigation error from notification:', error);
            }
          }
        }
      );
      
      return cleanup;
    }
  }, [isAuthenticated, connect]);

  // Setup navigation ref
  useEffect(() => {
    if (navigationRef.current) {
      setNavigateRef(navigationRef.current);
      setNavigationRef(navigationRef.current);
    }
  }, [setNavigateRef]);


  // Handle deep linking
  useEffect(() => {
    // Get initial URL (if app was opened via deep link)
    getInitialURL()
      .then((url) => {
        if (url) {
          handleDeepLink(url);
        }
      })
      .catch(error => {
        console.error('[AppNavigator] Failed to get initial URL:', error);
      });

    // Setup deep link listener
    const unsubscribe = setupDeepLinkListener((url) => {
      handleDeepLink(url);
    });

    return unsubscribe;
  }, [isAuthenticated]);

  const handleDeepLink = (url: string) => {
    if (!isAuthenticated || !navigationRef.current) {
      // Store deep link for later navigation after authentication
      console.log('[DeepLinking] Storing deep link for later:', url);
      return;
    }

    const parsed = parseDeepLink(url);
    if (parsed) {
      console.log('[DeepLinking] Navigating to:', parsed);
      try {
        // @ts-ignore - Navigation params type is complex
        navigationRef.current.navigate(parsed.screen, parsed.params);
      } catch (error) {
        console.error('[DeepLinking] Navigation error:', error);
      }
    }
  };

  // Linking configuration for React Navigation
  const linking = {
    prefixes: ['matchtalk://', 'https://matchtalk.app', 'https://*.matchtalk.app'],
    config: {
      screens: {
        Onboarding: 'onboarding',
        Login: 'login',
        Register: 'register',
        ForgotPassword: 'reset-password/:token?',
        MainTabs: {
          screens: {
            Home: 'home',
            Rooms: 'rooms',
            Messages: 'messages',
            Notifications: 'notifications',
            Profile: 'profile',
          },
        },
        Room: 'room/:roomId',
        Friends: 'friends',
        Settings: 'settings',
        Matching: 'matching',
        EditProfile: 'settings/edit-profile',
        ChangePassword: 'settings/change-password',
        ChangeEmail: 'settings/change-email',
        Chat: 'chat/:userId',
      },
    },
    async getInitialURL() {
      const url = await getInitialURL();
      return url;
    },
    subscribe(listener: (url: string) => void) {
      const unsubscribe = setupDeepLinkListener(listener);
      return unsubscribe;
    },
  };

  // Tüm ekranları her zaman tanımla - conditional rendering sorun çıkarıyor
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false, 
          contentStyle: {backgroundColor: '#0f0c29'} 
        }}
        initialRouteName={showOnboarding ? "Onboarding" : (!isAuthenticated ? "Login" : "MainTabs")}>
        <Stack.Screen name="Onboarding">
          {(props) => (
            <OnboardingScreen
              {...props}
              onComplete={async () => {
                await AsyncStorage.setItem('@matchtalk_onboarding_completed', 'true');
                setShowOnboarding(false);
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="Friends" component={FriendsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Matching" component={MatchingScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

