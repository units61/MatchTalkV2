import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {authApi} from '../services/api/authApi';
import {toast} from '../stores/toastStore';

export default function ChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';
  const passwordLengthValid = newPassword.length >= 6;
  const passwordHasLetter = /[a-zA-Z]/.test(newPassword);
  const passwordHasNumber = /[0-9]/.test(newPassword);
  const passwordStrong = passwordLengthValid && passwordHasLetter && passwordHasNumber;

  const handleSubmit = async () => {
    if (!passwordsMatch || !passwordStrong) {
      toast.error('Lütfen tüm şifre gereksinimlerini karşılayın');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        oldPassword,
        newPassword,
      });
      toast.info('Şifreniz başarıyla değiştirildi.');
      navigation.goBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Şifre değiştirilirken bir hata oluştu');
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

          <GradientText style={styles.title}>Şifre Değiştir</GradientText>

          <GlassCard style={styles.card}>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mevcut Şifre"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOldPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowOldPassword(!showOldPassword)}
                style={styles.eyeIcon}>
                <Ionicons
                  name={showOldPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Yeni Şifre"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}>
                <Ionicons
                  name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
            </View>
            {newPassword.length > 0 && (
              <View style={styles.validationContainer}>
                <View style={styles.validationItem}>
                  <Ionicons name={passwordLengthValid ? 'checkmark-circle' : 'close-circle'} size={16} color={passwordLengthValid ? '#4ade80' : '#ef4444'} />
                  <Text style={[styles.validationText, {color: passwordLengthValid ? '#4ade80' : '#ef4444'}]}>En az 6 karakter</Text>
                </View>
                <View style={styles.validationItem}>
                  <Ionicons name={passwordHasLetter ? 'checkmark-circle' : 'close-circle'} size={16} color={passwordHasLetter ? '#4ade80' : '#ef4444'} />
                  <Text style={[styles.validationText, {color: passwordHasLetter ? '#4ade80' : '#ef4444'}]}>En az bir harf</Text>
                </View>
                <View style={styles.validationItem}>
                  <Ionicons name={passwordHasNumber ? 'checkmark-circle' : 'close-circle'} size={16} color={passwordHasNumber ? '#4ade80' : '#ef4444'} />
                  <Text style={[styles.validationText, {color: passwordHasNumber ? '#4ade80' : '#ef4444'}]}>En az bir rakam</Text>
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Yeni Şifre Tekrar"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && (
              <View style={styles.validationContainer}>
                <View style={styles.validationItem}>
                  <Ionicons name={passwordsMatch ? 'checkmark-circle' : 'close-circle'} size={16} color={passwordsMatch ? '#4ade80' : '#ef4444'} />
                  <Text style={[styles.validationText, {color: passwordsMatch ? '#4ade80' : '#ef4444'}]}>Şifreler eşleşiyor</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, (loading || !passwordsMatch || !passwordStrong || !oldPassword) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !passwordsMatch || !passwordStrong || !oldPassword}>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Text style={styles.buttonText}>Şifreyi Değiştir</Text>
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
  validationContainer: {
    gap: 8,
    marginTop: -8,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationText: {
    fontSize: 14,
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



