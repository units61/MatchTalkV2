import React from 'react';
import {Text, StyleSheet, TextStyle} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MaskedView} from '@react-native-masked-view/masked-view';

interface GradientTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  className?: string;
}

export function GradientText({children, style, className}: GradientTextProps) {
  return (
    <MaskedView
      maskElement={
        <Text style={[styles.text, style]}>{children}</Text>
      }>
      <LinearGradient
        colors={['#22d3ee', '#a855f7', '#ec4899']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}>
        <Text style={[styles.text, style, {opacity: 0}]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});



