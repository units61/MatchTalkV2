# iOS App Store Canlıya Alma - Adaptasyon Planı

## Durum
- ✅ Klasör yapısı oluşturuldu
- ✅ package.json güncellendi (production paketleri eklendi)
- ✅ Temel config ve utils dosyaları oluşturuldu
- ⏳ Store'lar, API'ler, servisler kopyalanıyor
- ⏳ Component'ler React Native'e adapte ediliyor
- ⏳ Ekranlar React Native'e adapte ediliyor
- ⏳ Navigation yapısı kuruluyor

## Yapılacaklar

### 1. Temel Dosyalar (Devam Ediyor)
- [x] config.ts
- [x] utils-v2.ts (React Native versiyonu)
- [ ] apiClient.ts (kopyala ve adapte et)
- [ ] websocketClient.ts (kopyala ve adapte et)
- [ ] Tüm utils dosyaları (errorTracking, analytics, errorHandler, avatarUtils, timeUtils)

### 2. Store'lar
- [ ] authStore.ts
- [ ] roomsStore.ts
- [ ] friendsStore.ts
- [ ] agoraStore.ts
- [ ] websocketStore.ts
- [ ] websocketEventStore.ts
- [ ] navigationStore.ts
- [ ] toastStore.ts

### 3. API Servisleri
- [ ] authApi.ts
- [ ] roomsApi.ts
- [ ] friendsApi.ts
- [ ] agoraApi.ts
- [ ] notificationsApi.ts
- [ ] privateMessagesApi.ts
- [ ] inviteApi.ts
- [ ] statsApi.ts
- [ ] usersApi.ts
- [ ] analyticsApi.ts

### 4. Component'ler (React Native Adaptasyonu)
- [ ] AnimatedBackground (framer-motion → react-native-reanimated)
- [ ] GlassCard (div → View, className → StyleSheet)
- [ ] GradientText (span → Text, gradient → LinearGradient)
- [ ] LoadingSpinner (framer-motion → ActivityIndicator)
- [ ] BottomNav (Link → navigation, lucide-react → @expo/vector-icons)
- [ ] RoomChat (HTML → React Native components)
- [ ] VoteModal (HTML → React Native Modal)

### 5. Ekranlar (React Native Adaptasyonu)
- [ ] OnboardingScreen
- [ ] LoginScreen
- [ ] RegisterScreen
- [ ] HomeScreen
- [ ] RoomsScreen
- [ ] RoomScreen
- [ ] MessagesScreen
- [ ] ChatScreen
- [ ] FriendsScreen
- [ ] ProfileScreen
- [ ] SettingsScreen
- [ ] NotificationsScreen
- [ ] MatchingScreen
- [ ] EditProfileScreen
- [ ] ChangePasswordScreen
- [ ] ChangeEmailScreen
- [ ] ForgotPasswordScreen
- [ ] SupportScreen
- [ ] AboutScreen
- [ ] PrivacyPolicyScreen
- [ ] DeleteAccountScreen
- [ ] OAuthCallbackScreen

### 6. Navigation
- [ ] App.tsx güncelle (React Navigation stack/tab navigator)
- [ ] Auth flow (Onboarding → Login → Register → Home)
- [ ] Main flow (Home, Messages, Friends, Profile, Rooms)
- [ ] Protected routes
- [ ] Deep linking

### 7. Production Özellikleri
- [ ] Error Boundary
- [ ] Sentry entegrasyonu
- [ ] Network monitoring
- [ ] App state handling
- [ ] Image handling (expo-image)
- [ ] Push notifications

### 8. Agora React Native SDK
- [ ] agoraClient.ts adaptasyonu (agora-rtc-sdk-ng → react-native-agora)
- [ ] agoraStore.ts güncellemesi
- [ ] iOS permissions

### 9. Test ve Düzeltmeler
- [ ] Tüm ekranları test et
- [ ] Navigation test et
- [ ] API bağlantılarını test et
- [ ] Build al ve test et

## Notlar
- Web component'leri (div, span, className) → React Native (View, Text, StyleSheet)
- framer-motion → react-native-reanimated
- lucide-react → @expo/vector-icons
- react-router-dom → @react-navigation/native
- Tailwind CSS → StyleSheet
- window.location → Linking API



