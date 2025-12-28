import React from 'react';
import {View, Text} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

export default function App() {
  // EN BASİT TEST - hiçbir navigation, hiçbir async işlem yok
  // Eğer bu görünüyorsa sorun navigation'da, görünmüyorsa daha üst seviyede
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <View style={{flex: 1, backgroundColor: '#0f0c29', justifyContent: 'center', alignItems: 'center'}}>
          <StatusBar style="light" />
          <Text style={{color: '#06b6d4', fontSize: 32, fontWeight: 'bold', marginBottom: 20}}>
            MatchTalk
          </Text>
          <Text style={{color: '#fff', fontSize: 18, textAlign: 'center', paddingHorizontal: 20}}>
            Eğer bu görünüyorsa App.tsx çalışıyor
          </Text>
          <Text style={{color: '#888', fontSize: 14, marginTop: 10, textAlign: 'center', paddingHorizontal: 20}}>
            Sorun navigation'da değil, başka bir yerde
          </Text>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
