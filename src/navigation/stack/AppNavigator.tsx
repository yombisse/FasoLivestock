import React, { useEffect, useState } from 'react'; 
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Authstack from './auth/Authstack';
import MainDrawer from './MainDrawer';
import FarmPickerScreen from '../../screens/farm/FarmPickerScreen';
import OnboardingStack from './OnboardingStack';
import Splash from '../../screens/auth/splash';
import { authStorage } from '../../storage/authStorage';
import { farmStorage } from '../../storage/farmStorage';
import { Farm } from '../../types/farm.types';
import database from '../../database/watermelonIndex';
import syncService from '../../services/sync.service';
import NetInfo from '@react-native-community/netinfo';

type NavigationState = 'auth' | 'farmPicker' | 'main';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [navigationState, setNavigationState] = useState<NavigationState>('auth');

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
        return;
      }

      // Check if local database has farms
      const localFarms = await database.get('farms').query().fetch();
      console.log('[AppNavigator] Local farms count:', localFarms.length);
      
      // No migration check needed for api_id - removed from schema
      
      if (localFarms.length === 0) {
        console.log('[AppNavigator] No local farms, checking network before initial sync');
        const netInfo = await NetInfo.fetch();
        const isOnline = netInfo.isConnected && netInfo.isInternetReachable;
        
        if (isOnline) {
          console.log('[AppNavigator] Online, triggering initial sync');
          try {
            await syncService.initialSync();
            console.log('[AppNavigator] Initial sync completed');
          } catch (error) {
            console.error('[AppNavigator] Initial sync failed:', error);
            // Continue to farm picker if sync fails
            setNavigationState('farmPicker');
            return;
          }
        } else {
          console.log('[AppNavigator] Offline, skipping initial sync and redirecting to farm picker');
          setNavigationState('farmPicker');
          return;
        }
      }

      setNavigationState('main');
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

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName="Splash"
      >
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Onboarding" component={OnboardingStack} />
        <Stack.Screen name="AuthStack" component={Authstack} />
        <Stack.Screen name="FarmPicker" component={FarmPickerScreen} />
        <Stack.Screen name="MainDrawer" component={MainDrawer} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};


export default AppNavigator;