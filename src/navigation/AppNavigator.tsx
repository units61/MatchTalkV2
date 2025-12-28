import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';
import { checkOnboardingCompleted } from '../screens/OnboardingScreen';

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
import OnboardingScreen from '../screens/OnboardingScreen';
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
          display: 'none',
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
  const { isAuthenticated, loadUser } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [showOnboarding, setShowOnboarding] = React.useState<boolean>(true);
  const [isReady, setIsReady] = React.useState(false);

  // Onboarding kontrolü - Kökten Çözüm (Zaman Aşımı Korumalı)
  useEffect(() => {
    let mounted = true;

    const timeout = (ms: number) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );

    const init = async () => {
      try {
        // En fazla 2 saniye bekle, cevap gelmezse varsayılan değerlerle devam et
        const completed = await Promise.race([
          checkOnboardingCompleted(),
          timeout(2000).then(() => false)
        ]) as boolean;

        if (mounted) {
          setShowOnboarding(!completed);

          if (completed) {
            // Kullanıcı yükleme işlemini de zaman aşımı ile koru
            try {
              await Promise.race([
                loadUser(),
                timeout(2000)
              ]);
            } catch (e) {
              console.warn('[AppNavigator] Kullanıcı yükleme zaman aşımı veya hata.');
            }
          }
        }
      } catch (e) {
        console.error('[AppNavigator] Kritik başlatma hatası:', e);
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    init();

    // Güvenlik: Eğer 3.5 saniye içinde isReady hala false ise zorla aç
    const forceTimer = setTimeout(() => {
      if (mounted && !isReady) {
        setIsReady(true);
      }
    }, 3500);

    return () => {
      mounted = false;
      clearTimeout(forceTimer);
    };
  }, [loadUser]);

  // Login sonrası MainTabs'a navigate et
  useEffect(() => {
    if (isReady && isAuthenticated && navigationRef.current) {
      const timer = setTimeout(() => {
        if (navigationRef.current) {
          // getCurrentRoute() ile zaten MainTabs'ta olup olmadığını kontrol et
          const currentRoute = navigationRef.current.getCurrentRoute();
          if (currentRoute?.name !== 'MainTabs') {
            navigationRef.current.navigate('MainTabs');
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isReady]);

  // Loading ekranı - Kökten çözüm: Beyaz/Boş ekranı Spinner ile değiştir
  if (!isReady) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: '#0f0c29',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  // Linking configuration
  const linking = {
    prefixes: ['matchtalk://', 'https://matchtalk.app'],
  };

  // Tüm ekranları her zaman tanımla - initialRouteName ile kontrol et
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f0c29' }
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
