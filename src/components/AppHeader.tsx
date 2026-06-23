import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBackgroundImage from './AppBackgroundImage';
import { StyleSheet, Text, View } from 'react-native';

interface AppHeaderProps {
  title?: string;
  showBackground?: boolean;
  height?: number;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const AppHeader = ({
  title,
  showBackground = true,
  height = 180,
  showBackButton = false,
  onBackPress,
}: AppHeaderProps) => {
  return (
    <View style={[styles.container, { height }]}>
      {showBackground ? (
        <AppBackgroundImage source={require('../assets/images/header.png')}>
          <View style={styles.textContainer}>
            {title && <Text style={styles.text}>{title}</Text>}
          </View>
        </AppBackgroundImage>
      ) : (
        <View style={[styles.textContainer, styles.solidBackground]}>
          {title && <Text style={styles.text}>{title}</Text>}
        </View>
      )}
    </View>
  );
};

export default AppHeader;
const styles=StyleSheet.create({
  container:{
    width:'100%',
    height:180,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  text:{
    color:'white',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  solidBackground: {
    backgroundColor: '#007AFF',
  }
})