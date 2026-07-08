/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import AppNavigator from './src/navigation/stack/AppNavigator';
import { initDatabase } from './src/database';
import { subscribeToNetworkChanges } from './src/utils/networkStatus';
import { fullSync } from './src/sync/syncService';
import { farmStorage } from './src/storage/farmStorage';

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => {
        setDbInitialized(true);
      })
      .catch((error) => {
        console.error('[App] Database initialization failed:', error);
        setDbError('Impossible d\'initialiser la base locale');
      });
  }, []);

  // Automatic sync on network connection
  useEffect(() => {
    if (!dbInitialized) return;

    const unsubscribe = subscribeToNetworkChanges(async (isConnected) => {
      if (isConnected) {
        try {
          const farm = await farmStorage.getActiveFarm();
          if (farm) {
            console.log('[App] Network connected, starting auto-sync...');
            await fullSync(farm.id);
          }
        } catch (error) {
          console.error('[App] Auto-sync failed:', error);
          // Don't show error to user - sync happens in background
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dbInitialized]);

  if (dbError) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 16,
  },
});


