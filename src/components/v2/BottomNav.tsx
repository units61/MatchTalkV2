import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {BlurView} from 'expo-blur';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const navItems = [
  {route: 'Rooms', icon: 'mic' as const, label: 'Odalar'},
  {route: 'Messages', icon: 'chatbubbles' as const, label: 'Mesajlar'},
  {route: 'Home', icon: 'home' as const, label: 'Ana Sayfa'},
  {route: 'Notifications', icon: 'notifications' as const, label: 'Bildirimler'},
  {route: 'Profile', icon: 'person' as const, label: 'Profil'},
];

export function BottomNav() {
  const navigation = useNavigation();
  const route = useRoute();
  const activeIndex = navItems.findIndex(item => item.route === route.name);

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="dark" style={styles.nav}>
        <View style={styles.navContent}>
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <NavItem
                key={item.route}
                item={item}
                isActive={isActive}
                onPress={() => navigation.navigate(item.route as never)}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

function NavItem({
  item,
  isActive,
  onPress,
}: {
  item: typeof navItems[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(isActive ? 1 : 0.9);
  const opacity = useSharedValue(isActive ? 1 : 0.6);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.9);
    opacity.value = withSpring(isActive ? 1 : 0.6);
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.navItem}
      activeOpacity={0.7}>
      {isActive && <View style={styles.activeIndicator} />}
      <Animated.View style={[styles.navItemContent, animatedStyle]}>
        <Ionicons
          name={item.icon}
          size={20}
          color={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'}
        />
        <Text
          style={[
            styles.navLabel,
            {color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'},
          ]}>
          {item.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  nav: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 8,
    gap: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 211, 238, 0.4)',
  },
  navItemContent: {
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});



