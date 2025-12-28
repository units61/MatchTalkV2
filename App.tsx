import React, {useEffect, useState} from 'react';
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
import * as Updates from 'expo-updates';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
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
            batchInterval: 5000,
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

        // Kısa bir bekleme - native modüllerin hazır olması için
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        // Hata olsa bile uygulamayı başlat
        if (__DEV__) {
          console.warn('[App] Error during initialization:', e);
        }
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  const handleRestart = async () => {
    try {
      // expo-updates kullan (hem dev hem production'da çalışır)
      if (Updates.isEnabled) {
        await Updates.reloadAsync();
      } else {
        // Eğer updates devre dışıysa, uygulamayı kapat ve kullanıcıdan manuel açmasını iste
        if (__DEV__) {
          console.warn('[App] Updates not enabled, cannot reload');
        }
      }
    } catch (error) {
      console.error('[App] Failed to restart app:', error);
    }
  };

  // Hazır değilse loading ekranı göster
  if (!isReady) {
    return (
      <View style={{flex: 1, backgroundColor: '#0f0c29', justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: '#06b6d4', fontSize: 32, fontWeight: 'bold'}}>MatchTalk</Text>
      </View>
    );
  }

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
                onPress={handleRestart}
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
