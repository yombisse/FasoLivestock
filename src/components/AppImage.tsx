import React from 'react';
import { Image, StyleSheet, ImageStyle } from 'react-native';

interface AppImageProps {
  source: any;
  style?: ImageStyle;
  width?: number;
  height?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const AppImage = ({
  source,
  style,
  width,
  height,
  resizeMode = 'contain',
}: AppImageProps) => {
  return (
    <Image
      source={source}
      style={[styles.image, { width, height, resizeMode }, style]}
      resizeMode={resizeMode}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    resizeMode: 'contain',
  },
});

export default AppImage;