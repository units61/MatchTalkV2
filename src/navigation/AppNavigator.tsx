import React, {useRef} from 'react';
import {NavigationContainer, NavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

// Screens - sadece gerekli olanlar
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  
  // EN BASİT HAL - hiçbir state kontrolü yok, direkt Onboarding göster
  // Tüm useEffect'ler ve async işlemler kaldırıldı

  // Linking configuration - basitleştirilmiş, sadece temel
  const linking = {
    prefixes: ['matchtalk://', 'https://matchtalk.app'],
  };

  // EN BASİT HAL - sadece Onboarding ekranı, hiçbir state kontrolü yok
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false, 
          contentStyle: {backgroundColor: '#0f0c29'} 
        }}
        initialRouteName="Onboarding">
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

