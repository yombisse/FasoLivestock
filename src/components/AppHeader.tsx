import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppBackgroundImage from './AppBackgroundImage';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../config/colors';

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
  showRightButton?: boolean;
  rightButtonIcon?: string;
  rightButtonIconSize?: number;
  onRightButtonPress?: () => void;
  showNotificationBadge?: boolean;
  notificationCount?: number;
  style?: any;
  titleStyle?: any;
  subtitleStyle?: any;
  source?: any;
  children?: React.ReactNode;
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
  showRightButton = false,
  rightButtonIcon = 'bell-outline',
  rightButtonIconSize = 22,
  onRightButtonPress,
  showNotificationBadge = false,
  notificationCount = 0,
  style,
  titleStyle,
  subtitleStyle,
  source,
  children
}: AppHeaderProps) => {
  return (
    <View style={[styles.container, { height }, style]}>
      {showBackground ? (
        <AppBackgroundImage source={source || require('../assets/images/header.png')}>
          <View style={styles.overlay} />
          {showBackButton && (
            <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {showMenuButton && (
            <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
              <MaterialCommunityIcons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {showLogoutButton && (
            <TouchableOpacity style={styles.logoutButton} onPress={onLogoutPress}>
              <MaterialCommunityIcons name="logout" size={24} color="#D32F2F" />
            </TouchableOpacity>
          )}
          {showRightButton && (
            <TouchableOpacity style={styles.rightButton} onPress={onRightButtonPress}>
              <View style={styles.rightButtonCircle}>
                <MaterialCommunityIcons 
                  name={rightButtonIcon} 
                  size={rightButtonIconSize} 
                  color="#FFFFFF" 
                />
              </View>
              {showNotificationBadge && notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {children ? (
            <View style={styles.childrenContainer}>{children}</View>
          ) : (
            <View style={styles.textContainer}>
              {title && <Text style={[styles.text, titleStyle]}>{title}</Text>}
              {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
            </View>
          )}
        </AppBackgroundImage>
      ) : (
        <View style={[styles.textContainer, styles.solidBackground]}>
          {showBackButton && (
            <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {showMenuButton && (
            <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
              <MaterialCommunityIcons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {showLogoutButton && (
            <TouchableOpacity style={styles.logoutButton} onPress={onLogoutPress}>
              <MaterialCommunityIcons name="logout" size={24} color="#D32F2F" />
            </TouchableOpacity>
          )}
          {showRightButton && (
            <TouchableOpacity style={styles.rightButton} onPress={onRightButtonPress}>
              <View style={styles.rightButtonCircle}>
                <MaterialCommunityIcons 
                  name={rightButtonIcon} 
                  size={rightButtonIconSize} 
                  color="#FFFFFF" 
                />
              </View>
              {showNotificationBadge && notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {children ? (
            <View style={styles.childrenContainer}>{children}</View>
          ) : (
            <>
              {title && <Text style={[styles.text, titleStyle]}>{title}</Text>}
              {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}
            </>
          )}
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
    backgroundColor: Theme.primary,
  },
  menuButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 100,
  },
  logoutButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    zIndex: 10,
  },
  rightButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    zIndex: 10,
  },
  rightButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#2D6A4F',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  childrenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
})