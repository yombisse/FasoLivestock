import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface AppTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  color?: string;
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  numberOfLines?: number;
}

const AppText = ({
  children,
  style,
  fontSize = 16,
  fontWeight = 'normal',
  color = '#333',
  textAlign = 'left',
  numberOfLines,
}: AppTextProps) => {
  return (
    <Text
      style={[styles.text, { fontSize, fontWeight, color, textAlign }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: '#333',
  },
});

export default AppText;
