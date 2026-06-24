import React from 'react';
import { Text, StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';

interface AppLinkProps {
  text: string;
  onPress: (event: GestureResponderEvent) => void;
  color?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  underline?: boolean;
  style?: any;
  disabled?: boolean;
}

const AppLink = ({
  text,
  onPress,
  color = '#007AFF',
  fontSize = 14,
  fontWeight = '600',
  underline = true,
  style,
  disabled = false,
}: AppLinkProps) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={disabled}>
      <Text style={[styles.link, { color: disabled ? '#cccccc' : color, fontSize, fontWeight, textDecorationLine: underline ? 'underline' : 'none' }, style]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
});

export default AppLink;
