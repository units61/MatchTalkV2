import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sentry from '@sentry/react-native';

const { width, height } = Dimensions.get('window');

function AnimatedBackgroundInner() {
  // Animation values for gradient orbs
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb1Scale = useSharedValue(1);

  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb2Scale = useSharedValue(1);

  const [ready, setReady] = React.useState(false);

  // Start animations
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setReady(true);

      // Orb 1 animation
      orb1X.value = withRepeat(
        withTiming(100, { duration: 20000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      orb1Y.value = withRepeat(
        withTiming(50, { duration: 20000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      orb1Scale.value = withRepeat(
        withTiming(1.1, { duration: 20000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );

      // Orb 2 animation
      orb2X.value = withRepeat(
        withTiming(-100, { duration: 25000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      orb2Y.value = withRepeat(
        withTiming(-50, { duration: 25000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      orb2Scale.value = withRepeat(
        withTiming(1.2, { duration: 25000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  if (!ready) {
    return <View style={styles.container} />;
  }

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: orb1X.value },
      { translateY: orb1Y.value },
      { scale: orb1Scale.value },
    ] as any,
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: orb2X.value },
      { translateY: orb2Y.value },
      { scale: orb2Scale.value },
    ] as any,
  }));

  return (
    <View style={styles.container}>
      {/* Gradient Orb 1 */}
      <Animated.View style={[styles.orb, orb1Style]}>
        <LinearGradient
          colors={['rgba(6, 182, 212, 0.3)', 'rgba(168, 85, 247, 0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Gradient Orb 2 */}
      <Animated.View style={[styles.orb, orb2Style, styles.orb2]}>
        <LinearGradient
          colors={['rgba(236, 72, 153, 0.3)', 'rgba(168, 85, 247, 0.3)']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Floating Particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <FloatingParticle key={i} index={i} />
      ))}
    </View>
  );
}

export function AnimatedBackground() {
  try {
    return <AnimatedBackgroundInner />;
  } catch (error) {
    // Hata durumunda Sentry'ye gönder ve fallback göster
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        component: 'AnimatedBackground',
      },
      extra: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    
    // Fallback: Basit gradient background
    return (
      <View style={[styles.container, { backgroundColor: '#0f0c29' }]}>
        <LinearGradient
          colors={['#0f0c29', '#1a0f3d', '#2d1b4e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }
}

function FloatingParticle({ index }: { index: number }) {
  const opacity = useSharedValue(0.2);
  const translateY = useSharedValue(0);
  const left = useSharedValue(Math.random() * width);
  const top = useSharedValue(Math.random() * height);

  React.useEffect(() => {
    const duration = 3000 + Math.random() * 2000;
    const delay = Math.random() * 2000;

    opacity.value = withRepeat(
      withTiming(0.5, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    translateY.value = withRepeat(
      withTiming(-30, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const particleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }] as any,
    left: left.value,
    top: top.value,
  }));

  return (
    <Animated.View style={[styles.particle, particleStyle]} />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 1.5,
    borderRadius: width * 0.75,
    top: -height * 0.5,
    left: -width * 0.5,
  },
  orb2: {
    top: height * 0.5,
    left: width * 0.5,
  },
  gradient: {
    flex: 1,
    borderRadius: width * 0.75,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
});



