import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {useAuthStore} from '../stores/authStore';
import {authApi} from '../services/api/authApi';
import {toast} from '../stores/toastStore';

export default function ChangeEmailScreen() {
  const navigation = useNavigation();
  const {user, logout} = useAuthStore();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);
  const isDifferent = newEmail.toLowerCase() !== user?.email?.toLowerCase();

  const handleSubmit = async () => {
    if (!emailValid) {
      toast.error('Geçerli bir e-posta adresi giriniz');
      return;
    }

    if (!isDifferent) {
      toast.error('Yeni e-posta adresi mevcut e-posta adresiyle aynı olamaz');
      return;
    }

    setLoading(true);
    try {
      await authApi.changeEmail({
        newEmail,
        password,
      });
      toast.info('E-posta adresiniz başarıyla değiştirildi. Lütfen tekrar giriş yapın.');
      await logout();
      navigation.navigate('Login' as never);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'E-posta değiştirilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AnimatedBackground />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.backText}>Geri</Text>
          </TouchableOpacity>

          <GradientText style={styles.title}>E-posta Değiştir</GradientText>

          <GlassCard style={styles.card}>
            <View style={styles.currentEmailContainer}>
              <Text style={styles.currentEmailLabel}>Mevcut E-posta:</Text>
              <Text style={styles.currentEmail}>{user?.email}</Text>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Yeni E-posta Adresi"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {newEmail && !emailValid && (
              <Text style={styles.errorText}>Geçerli bir e-posta adresi giriniz</Text>
            )}
            {newEmail && !isDifferent && (
              <Text style={styles.warningText}>Yeni e-posta adresi mevcut e-posta adresiyle aynı olamaz</Text>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mevcut Şifre"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>E-posta değiştirmek için mevcut şifrenizi girmeniz gerekmektedir.</Text>

            <TouchableOpacity
              style={[styles.button, (loading || !emailValid || !isDifferent || !password) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !emailValid || !isDifferent || !password}>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Text style={styles.buttonText}>E-postayı Değiştir</Text>
              )}
            </TouchableOpacity>
          </GlassCard>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  backText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    padding: 24,
    gap: 16,
  },
  currentEmailContainer: {
    marginBottom: 8,
  },
  currentEmailLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 4,
  },
  currentEmail: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: -8,
  },
  warningText: {
    color: '#fbbf24',
    fontSize: 14,
    marginTop: -8,
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: -8,
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});



