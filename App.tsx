/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import AppNavigator from './src/navigation/stack/AppNavigator';
import { initDatabase, cleanupDummyRecords } from './src/database';
import { subscribeToNetworkChanges } from './src/utils/networkStatus';
import { syncWatermelon } from './src/sync/watermelonSync';
import { farmStorage } from './src/storage/farmStorage';
import { Theme } from './src/config/colors';
import CategorieMappingService from './src/services/categorieMappingService';

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(async () => {
        setDbInitialized(true);
        // Clean up any dummy records that might cause sync errors
        await cleanupDummyRecords();

        // Initialize CategorieMappingService after database is ready
        try {
          await CategorieMappingService.initialize();
          console.log('[App] CategorieMappingService initialized successfully');
        } catch (error) {
          console.error('[App] Failed to initialize CategorieMappingService:', error);
          // Don't block app startup if mapping service fails
        }
      })
      .catch((error) => {
        console.error('[App] Database initialization failed:', error);
        setDbError('Impossible d\'initialiser la base locale');
      });
  }, []);

  // Automatic sync on network connection
  // TEMPORARILY DISABLED - Backend not ready for WatermelonDB sync
  /*
  useEffect(() => {
    if (!dbInitialized) return;

    const unsubscribe = subscribeToNetworkChanges(async (isConnected) => {
      if (isConnected) {
        try {
          const farm = await farmStorage.getActiveFarm();
          if (farm) {
            console.log('[App] Network connected, starting auto-sync...');
            await syncWatermelon(farm.id);
          }
        } catch (error: any) {
          console.error('[App] Auto-sync failed:', error);
          // Don't show error to user - sync happens in background
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dbInitialized]);
  */

  if (dbError) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar backgroundColor={Theme.primary} barStyle="light-content" translucent={false} />
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={Theme.primary} barStyle="light-content" translucent={false} />
        <ActivityIndicator size="large" color={Theme.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar backgroundColor={Theme.primary} barStyle="light-content" translucent={true} />
        <View style={styles.statusBarBackground}>
          <SafeAreaView style={{ backgroundColor: Theme.primary }} edges={['top']} />
        </View>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;



const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent:'center',
    alignItems:'center',
  },
  title:{
    textAlign:'center',
    color:'#fff',
    fontSize:24,
    fontWeight:'bold',
  },
  subtitle:{
    fontSize:18,
    color:'red',
    marginVertical:20,
    marginHorizontal:10
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.primary,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
  },
  statusBarBackground: {
    backgroundColor: Theme.primary,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});


