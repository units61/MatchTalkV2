import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AnimatedBackground} from '../components/v2/AnimatedBackground';
import {GlassCard} from '../components/v2/GlassCard';
import {GradientText} from '../components/v2/GradientText';

const {width} = Dimensions.get('window');

const ONBOARDING_KEY = '@matchtalk_onboarding_completed';

const steps = [
  {
    icon: 'mic',
    title: 'Sesli Sohbet Odaları',
    description: 'Arkadaşlarınla veya yeni insanlarla sesli sohbet odalarında buluş',
  },
  {
    icon: 'people',
    title: 'Yeni İnsanlarla Tanış',
    description: 'İlgi alanlarına göre eşleş ve yeni arkadaşlıklar kur',
  },
  {
    icon: 'shield-checkmark',
    title: 'Güvenli Ortam',
    description: 'Moderasyonlu odalar ve güvenli iletişim ortamı',
  },
  {
    icon: 'sparkles',
    title: 'Hemen Başla',
    description: 'Şimdi kayıt ol ve MatchTalk deneyimini yaşa',
  },
];

interface OnboardingScreenProps {
  onComplete?: () => void;
}

export default function OnboardingScreen({onComplete}: OnboardingScreenProps = {}) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigation = useNavigation();
  const translateX = useSharedValue(0);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      translateX.value = withTiming(-width * nextStep, {duration: 300});
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      // Callback ile AppNavigator'a bildir
      if (onComplete) {
        onComplete();
      } else {
        // Fallback: direkt navigate et
        navigation.navigate('Login' as never);
      }
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    // Callback ile AppNavigator'a bildir
    if (onComplete) {
      onComplete();
    } else {
      // Fallback: direkt navigate et
      navigation.navigate('Login' as never);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));

  return (
    <View style={styles.container}>
      <AnimatedBackground />

      <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
        <Text style={styles.skipText}>Geç</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Animated.View style={[styles.stepsContainer, animatedStyle]}>
          {steps.map((step, index) => (
            <View key={index} style={[styles.step, {width}]}>
              <GlassCard style={styles.card}>
                <Animated.View
                  style={[
                    styles.iconContainer,
                    {
                      transform: [
                        {
                          scale: withSpring(currentStep === index ? 1 : 0.8, {
                            damping: 10,
                            stiffness: 100,
                          }),
                        },
                      ],
                    },
                  ]}>
                  <LinearGradient
                    colors={['rgba(6, 182, 212, 0.4)', 'rgba(168, 85, 247, 0.4)']}
                    style={styles.iconGradient}>
                    <Ionicons name={step.icon as any} size={48} color="white" />
                  </LinearGradient>
                </Animated.View>

                <GradientText style={styles.title}>{step.title}</GradientText>
                <Text style={styles.description}>{step.description}</Text>
              </GlassCard>
            </View>
          ))}
        </Animated.View>

        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={handleNext}
        style={styles.nextButton}
        activeOpacity={0.8}>
        <LinearGradient
          colors={['#06b6d4', '#a855f7']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={styles.nextButtonGradient}>
          <Text style={styles.nextButtonText}>
            {currentStep === steps.length - 1 ? 'Başla' : 'Devam Et'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export async function checkOnboardingCompleted(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
    return completed === 'true';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stepsContainer: {
    flexDirection: 'row',
    width: width * steps.length,
  },
  step: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 26,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressDotActive: {
    width: 32,
    backgroundColor: '#06b6d4',
  },
  nextButton: {
    marginBottom: 40,
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

