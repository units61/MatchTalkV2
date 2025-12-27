import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {BottomNav} from '../components/v2/BottomNav';
import {useAuthStore} from '../stores/authStore';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const {user} = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [vibrateEnabled, setVibrateEnabled] = React.useState(true);

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.6)" />
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>
          <GradientText style={styles.title}>Ayarlar</GradientText>
        </Animated.View>

        {/* Profile Section */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Profil</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('EditProfile' as never)}>
              <View style={styles.settingLeft}>
                <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>Profili Düzenle</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ChangePassword' as never)}>
              <View style={styles.settingLeft}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>Şifre Değiştir</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ChangeEmail' as never)}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>E-posta Değiştir</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        {/* Notifications Section */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Bildirimler</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>Bildirimler</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{false: 'rgba(255,255,255,0.2)', true: 'rgba(34, 211, 238, 0.5)'}}
                thumbColor={notificationsEnabled ? '#22d3ee' : 'rgba(255,255,255,0.5)'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="volume-high-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>Ses</Text>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{false: 'rgba(255,255,255,0.2)', true: 'rgba(34, 211, 238, 0.5)'}}
                thumbColor={soundEnabled ? '#22d3ee' : 'rgba(255,255,255,0.5)'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="phone-portrait-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>Titreşim</Text>
              </View>
              <Switch
                value={vibrateEnabled}
                onValueChange={setVibrateEnabled}
                trackColor={{false: 'rgba(255,255,255,0.2)', true: 'rgba(34, 211, 238, 0.5)'}}
                thumbColor={vibrateEnabled ? '#22d3ee' : 'rgba(255,255,255,0.5)'}
              />
            </View>
          </GlassCard>
        </Animated.View>

        {/* App Section */}
        <Animated.View entering={FadeInDown.delay(400)}>
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Uygulama</Text>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>Yardım & Destek</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>Hakkında</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color="rgba(255,255,255,0.7)" />
                <Text style={styles.settingText}>Gizlilik Politikası</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        {/* Version */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.versionContainer}>
          <Text style={styles.versionText}>MatchTalk v1.0.0</Text>
        </Animated.View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  sectionCard: {
    padding: 0,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    padding: 16,
    paddingBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
});
