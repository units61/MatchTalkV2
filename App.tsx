import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ErrorBoundary} from './src/components/common/ErrorBoundary';
import {AppNavigator} from './src/navigation/AppNavigator';
import {initErrorTracking} from './src/utils/errorTracking';
import {initAnalytics} from './src/utils/analytics';
import {initAppStateManagement} from './src/utils/appState';
import {initPerformanceMonitoring} from './src/utils/performance';

// Initialize error tracking (Sentry) - wrap in try-catch to prevent crashes
try {
  initErrorTracking({
    enabled: true,
    environment: __DEV__ ? 'development' : 'production',
    service: 'sentry',
  });
} catch (error) {
  // Silently fail - don't crash the app if error tracking initialization fails
  if (__DEV__) {
    console.error('[App] Failed to initialize error tracking:', error);
  }
}

// Initialize analytics - wrap in try-catch to prevent crashes
try {
  initAnalytics({
    enabled: true,
    batchSize: 10,
    flushInterval: 5000,
  });
} catch (error) {
  // Silently fail - don't crash the app if analytics initialization fails
  if (__DEV__) {
    console.error('[App] Failed to initialize analytics:', error);
  }
}

// Initialize app state management - wrap in try-catch to prevent crashes
try {
  initAppStateManagement();
} catch (error) {
  // Silently fail - don't crash the app if app state initialization fails
  if (__DEV__) {
    console.error('[App] Failed to initialize app state management:', error);
  }
}

// Initialize performance monitoring - wrap in try-catch to prevent crashes
try {
  initPerformanceMonitoring();
} catch (error) {
  // Silently fail - don't crash the app if performance monitoring initialization fails
  if (__DEV__) {
    console.error('[App] Failed to initialize performance monitoring:', error);
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ErrorBoundary
          fallback={
            <View style={{flex: 1, backgroundColor: '#0f0c29', justifyContent: 'center', alignItems: 'center', padding: 20}}>
              <Text style={{color: '#fff', fontSize: 18, marginBottom: 20, textAlign: 'center'}}>
                Uygulama başlatılırken bir hata oluştu
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  // Force app restart by reloading
                  if (__DEV__) {
                    console.log('Restarting app...');
                  }
                }}
                style={{backgroundColor: '#06b6d4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8}}>
                <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>Yeniden Başlat</Text>
              </TouchableOpacity>
            </View>
          }>
          <StatusBar style="light" />
          <AppNavigator />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
