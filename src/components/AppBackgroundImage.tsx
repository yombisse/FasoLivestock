import React from 'react';
import { ImageBackground, StyleSheet, ImageStyle } from 'react-native';

interface AppBackgroundImageProps {
  source: any;
  children: React.ReactNode;
  style?: ImageStyle;
}

const AppBackgroundImage = ({source, children, style}: AppBackgroundImageProps) => {
  return (
    <ImageBackground source={source} style={[styles.image, style]}>
      {children}
    </ImageBackground>
  );
};

export default AppBackgroundImage;

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});