import React, {useEffect, useRef} from 'react';
import {NavigationContainer, NavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuthStore} from '../stores/authStore';
import {checkOnboardingCompleted} from '../screens/OnboardingScreen';

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
  const {isAuthenticated, loadUser} = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const [showOnboarding, setShowOnboarding] = React.useState<boolean>(true);
  const [isReady, setIsReady] = React.useState(false);

  // Onboarding kontrolü - basit ve güvenli
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
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [loadUser]);

  // Loading ekranı - çok kısa
  if (!isReady) {
    return null; // Native splash screen gösterilsin
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
