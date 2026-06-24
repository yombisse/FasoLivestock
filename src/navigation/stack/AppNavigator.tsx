import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Authstack from './auth/Authstack';
import MainDrawer from './MainDrawer';
import FarmPickerScreen from '../../screens/farm/FarmPickerScreen';
import { authStorage } from '../../storage/authStorage';
import { farmStorage } from '../../storage/farmStorage';
import { Farm } from '../../types/farm.types';

type NavigationState = 'loading' | 'auth' | 'farmPicker' | 'main';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [navigationState, setNavigationState] = useState<NavigationState>('loading');

  useEffect(() => {
    checkNavigationState();
  }, []);

  const checkNavigationState = async () => {
    try {
      const token = await authStorage.getToken();
      
      if (!token) {
        setNavigationState('auth');
        return;
      }

      const activeFarm = await farmStorage.getActiveFarm();
      
      if (!activeFarm) {
        setNavigationState('farmPicker');
      } else {
        setNavigationState('main');
      }
    } catch (error) {
      console.error('Error checking navigation state:', error);
      setNavigationState('auth');
    }
  };

  const handleLoginSuccess = (farms: Farm[]) => {
    if (farms.length === 0) {
      // Afficher erreur "Aucune ferme assignée à votre compte"
      console.error('Aucune ferme assignée à votre compte');
      return;
    }
    
    if (farms.length === 1) {
      farmStorage.setActiveFarm(farms[0]).then(() => {
        setNavigationState('main');
      });
    } else {
      setNavigationState('farmPicker');
    }
  };

  if (navigationState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={
          navigationState === 'auth' ? 'AuthStack' :
          navigationState === 'farmPicker' ? 'FarmPicker' :
          'MainDrawer'
        }
      >
        <Stack.Screen name="AuthStack" component={Authstack} />
        <Stack.Screen name="FarmPicker" component={FarmPickerScreen} />
        <Stack.Screen name="MainDrawer" component={MainDrawer} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default AppNavigator;