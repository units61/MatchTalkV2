import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import * as Sentry from '@sentry/react-native';
import { ErrorUtils } from 'react-native';

// 🛡️ Global error handler to prevent SIGABRT crashes
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[GlobalErrorHandler]', error, 'isFatal:', isFatal);
  // Don't call original handler if it's from Expo's error recovery queue
  if (originalHandler && !error?.message?.includes('errorRecoveryQueue')) {
    originalHandler(error, isFatal);
  }
});

// Sentry is initialized in BootScreen, but we wrap it here too for maximum stability
const SentryApp = Sentry.wrap(App);
export default SentryApp;

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
