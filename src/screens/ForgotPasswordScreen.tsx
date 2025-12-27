import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';
import {LoadingSpinner} from '../components/v2/LoadingSpinner';
import {authApi} from '../services/api/authApi';
import {toast} from '../stores/toastStore';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigation = useNavigation();
  const scale = useSharedValue(1);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!emailValid) {
      toast.error('Geçerli bir e-posta adresi giriniz');
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
      toast.info('E-posta gönderildi! Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'E-posta gönderilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  React.useEffect(() => {
    if (success) {
      scale.value = withSpring(1, {damping: 10});
    }
  }, [success]);

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

          <View style={styles.header}>
            <GradientText style={styles.title}>Şifremi Unuttum</GradientText>
            <Text style={styles.subtitle}>E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz</Text>
          </View>

          <GlassCard style={styles.card}>
            {success ? (
              <Animated.View style={[styles.successContainer, animatedStyle]}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#4ade80" />
                </View>
                <Text style={styles.successTitle}>E-posta Gönderildi!</Text>
                <Text style={styles.successMessage}>
                  {email} adresine şifre sıfırlama bağlantısı gönderildi. Lütfen e-posta kutunuzu kontrol edin.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login' as never)}
                  style={styles.successButton}>
                  <Text style={styles.buttonText}>Giriş Sayfasına Dön</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="E-posta Adresi"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {email && !emailValid && (
                  <Text style={styles.errorText}>Geçerli bir e-posta adresi giriniz</Text>
                )}

                <TouchableOpacity
                  style={[styles.button, (loading || !emailValid) && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading || !emailValid}>
                  {loading ? (
                    <LoadingSpinner />
                  ) : (
                    <Text style={styles.buttonText}>Şifre Sıfırlama Bağlantısı Gönder</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate('Login' as never)}>
                  <Text style={styles.linkText}>
                    Şifrenizi hatırladınız mı? <Text style={styles.linkTextBold}>Giriş Yap</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
    justifyContent: 'center',
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  card: {
    padding: 24,
  },
  form: {
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
  errorText: {
    color: '#ef4444',
    fontSize: 14,
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
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#22d3ee',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successIconContainer: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: 50,
    padding: 16,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  successButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
});



