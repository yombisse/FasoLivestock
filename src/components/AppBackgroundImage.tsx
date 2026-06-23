import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

const AppBackgroundImage = ({source, children}: {source: any; children: React.ReactNode}) => {
  return (
    <ImageBackground source={source} style={styles.image}>
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