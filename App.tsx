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
        // Init işlemleri - paralel çalışsın, hızlı olsun
        const initPromises = [
          Promise.resolve().then(() => {
            try { 
              initErrorTracking({ 
                enabled: true, 
                environment: __DEV__ ? 'development' : 'production', 
                service: 'sentry' 
              }); 
            } catch {}
          }),
          Promise.resolve().then(() => {
            try { 
              initAnalytics({ 
                enabled: true, 
                batchSize: 10, 
                batchInterval: 5000 
              }); 
            } catch {}
          }),
          Promise.resolve().then(() => {
            try { 
              initAppStateManagement(); 
            } catch {}
          }),
          Promise.resolve().then(() => {
            try { 
              initPerformanceMonitoring(); 
            } catch {}
          }),
        ];
        
        // Tüm init işlemlerini paralel çalıştır, max 500ms bekle
        await Promise.race([
          Promise.all(initPromises),
          new Promise(resolve => setTimeout(resolve, 500))
        ]);
      } catch (e) {
        // Hata olsa bile devam et
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

  // Loading ekranını kaldır - direkt AppNavigator'a geç (max 500ms bekle)
  if (!isReady) {
    return null;
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
