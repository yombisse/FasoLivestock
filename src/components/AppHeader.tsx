import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBackgroundImage from './AppBackgroundImage';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBackground?: boolean;
  height?: number;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showMenuButton?: boolean;
  onMenuPress?: () => void;
  showLogoutButton?: boolean;
  onLogoutPress?: () => void;
  style?: any;
  titleStyle?: any;
  subtitleStyle?: any;
}

const AppHeader = ({
  title,
  subtitle,
  showBackground = true,
  height = 180,
  showBackButton = false,
  onBackPress,
  showMenuButton = false,
  onMenuPress,
  showLogoutButton = false,
  onLogoutPress,
  style,
  titleStyle,
  subtitleStyle,
}: AppHeaderProps) => {
  return (
    <View style={[styles.container, { height }, style]}>
      {showBackground ? (
        <AppBackgroundImage source={require('../assets/images/header.png')}>
          <View style={styles.overlay} />
          {showMenuButton && (
            <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
              <MaterialCommunityIcons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {showLogoutButton && (
            <TouchableOpacity style={styles.logoutButton} onPress={onLogoutPress}>
              <MaterialCommunityIcons name="logout" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={styles.textContainer}>
            {title && <Text style={[styles.text, titleStyle]}>{title}</Text>}
            {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
          </View>
        </AppBackgroundImage>
      ) : (
        <View style={[styles.textContainer, styles.solidBackground]}>
          {showMenuButton && (
            <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
              <MaterialCommunityIcons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {showLogoutButton && (
            <TouchableOpacity style={styles.logoutButton} onPress={onLogoutPress}>
              <MaterialCommunityIcons name="logout" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {title && <Text style={[styles.text, titleStyle]}>{title}</Text>}
          {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
  subtitle: {
    color:'white',
    fontSize: 14,
    fontWeight: 'normal',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 8,
  },
  solidBackground: {
    backgroundColor: '#007AFF',
  },
  menuButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 10,
  },
  logoutButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    zIndex: 10,
  }
})