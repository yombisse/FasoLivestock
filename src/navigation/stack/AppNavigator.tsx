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
import database from '../../database/watermelonIndex';
import syncService from '../../services/sync.service';

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
        return;
      }

      // Check if local database has farms
      const localFarms = await database.get('farms').query().fetch();
      console.log('[AppNavigator] Local farms count:', localFarms.length);
      
      // Schema migration cleanup: reset reference tables if api_id column is missing
      // This handles the migration from version 3 to 4 where api_id was added
      try {
        const sampleFarm = localFarms[0] as any;
        if (sampleFarm && !sampleFarm.api_id) {
          console.log('[AppNavigator] Schema migration detected: api_id column missing, resetting reference tables');
          await database.write(async () => {
            await database.get('especes').query().destroyAllPermanently();
            await database.get('categories').query().destroyAllPermanently();
            await database.get('type_evenements').query().destroyAllPermanently();
            await database.get('farm_user').query().destroyAllPermanently();
            await database.get('farms').query().destroyAllPermanently();
          });
          console.log('[AppNavigator] Reference tables reset for migration');
          // Trigger initial sync after reset
          await syncService.initialSync();
          console.log('[AppNavigator] Initial sync completed after migration');
          
          // Reload farms after sync
          const updatedFarms = await database.get('farms').query().fetch();
          console.log('[AppNavigator] Farms after migration sync:', updatedFarms.length);
          
          // Check if active farm still exists after sync
          const activeFarmExists = updatedFarms.some(f => (f as any).api_id === activeFarm.id);
          if (!activeFarmExists) {
            console.warn('[AppNavigator] Active farm not found after migration, redirecting to farm picker');
            await farmStorage.removeActiveFarm();
            setNavigationState('farmPicker');
            return;
          }
        }
      } catch (migrationError: any) {
        console.warn('[AppNavigator] Migration check failed:', migrationError);
        // If SQLite error about missing column, force full database reset
        if (migrationError.message && migrationError.message.includes('no column named api_id')) {
          console.log('[AppNavigator] SQLite migration error detected, forcing full database reset');
          await database.unsafeResetDatabase();
          console.log('[AppNavigator] Database reset completed, triggering initial sync');
          await syncService.initialSync();
          console.log('[AppNavigator] Initial sync completed after database reset');
          
          // After reset, redirect to farm picker to reselect farm
          await farmStorage.removeActiveFarm();
          setNavigationState('farmPicker');
          return;
        }
        // If SQLite error about missing sync_status/version columns (version 4 to 5 migration)
        if (migrationError.message && (migrationError.message.includes('no column named sync_status') || migrationError.message.includes('no column named version'))) {
          console.log('[AppNavigator] Schema migration v4->v5 detected, forcing full database reset');
          await database.unsafeResetDatabase();
          console.log('[AppNavigator] Database reset completed, triggering initial sync');
          await syncService.initialSync();
          console.log('[AppNavigator] Initial sync completed after database reset');
          
          // After reset, redirect to farm picker to reselect farm
          await farmStorage.removeActiveFarm();
          setNavigationState('farmPicker');
          return;
        }
        // Continue anyway for other errors
      }
      
      if (localFarms.length === 0) {
        console.log('[AppNavigator] No local farms, triggering initial sync');
        try {
          await syncService.initialSync();
          console.log('[AppNavigator] Initial sync completed');
          // Verify farms were inserted
          const updatedFarms = await database.get('farms').query().fetch();
          console.log('[AppNavigator] Farms after initial sync:', updatedFarms.length);
          
          // Check if active farm still exists after sync
          const activeFarmExists = updatedFarms.some(f => f.id === activeFarm.id);
          if (!activeFarmExists) {
            console.warn('[AppNavigator] Active farm not found after initial sync, redirecting to farm picker');
            await farmStorage.removeActiveFarm();
            setNavigationState('farmPicker');
            return;
          }
        } catch (error) {
          console.error('[AppNavigator] Initial sync failed:', error);
          // Continue to main anyway if sync fails, user can retry later
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