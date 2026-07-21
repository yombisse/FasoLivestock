import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../../screens/main/HomeScreen';
import CheptelStack from '../stack/CheptelStack';
import ReproductionStack from '../stack/ReproductionStack';
import AlimentationScreen from '../../screens/main/AlimentationScreen';
import SanteStack from '../stack/SanteStack';
import TransactionStack from '../stack/TransactionStack';
import { Theme } from '../../config/colors';
import { farmStorage } from '../../storage/farmStorage';
import santeService from '../../services/sante.service';
import { useSync } from '../../hooks/useSync';
import { cleanupDummyRecords } from '../../database';
import { getActiveHealthAlerts } from '../../database/repositories/santeEvenementsRepository';
import database from '../../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const insets = useSafeAreaInsets();
  const [healthAlerts, setHealthAlerts] = useState(0);
  const [farmId, setFarmId] = useState<string | null>(null);

  // Always call useSync with empty string initially, it will be disabled until farmId is set
  const { isSyncing, lastSyncedAt } = useSync({
    farmId: farmId || '',
    autoSync: !!farmId, // Only enable auto-sync when farmId is loaded
    intervalMs: 60000,
  });

  useEffect(() => {
    const loadActiveFarm = async () => {
      try {
        // Clean up any dummy records that might cause sync errors
        await cleanupDummyRecords();

        const farm = await farmStorage.getActiveFarm();
        if (farm) {
          console.log('[MainTabs] Active farm loaded:', farm.id, farm.name);
          setFarmId(farm.id);
        } else {
          console.warn('[MainTabs] No active farm found');
          setFarmId(null);
        }
      } catch (error) {
        console.error('[MainTabs] Error loading active farm:', error);
      }
    };
    loadActiveFarm();
  }, []);

  useEffect(() => {
    const loadHealthAlerts = async () => {
      try {
        const farm = await farmStorage.getActiveFarm();
        console.log('[MainTabs] Active farm:', farm);
        if (farm) {
          console.log('[MainTabs] Fetching health alerts for farm ID:', farm.id);
          // Use local WatermelonDB data instead of API
          const alerts = await getActiveHealthAlerts(farm.id);
          const alertCount = alerts?.length || 0;
          setHealthAlerts(alertCount);
        }
      } catch (error) {
        console.error('Error loading health alerts:', error);
      }
    };
    loadHealthAlerts();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          paddingBottom: insets.bottom + 5,
          height: 80 + insets.bottom,
        },
        tabBarActiveTintColor: Theme.primary,
        tabBarInactiveTintColor: Theme.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name="home" 
              size={32} 
              color={focused ? Theme.primary : Theme.textSecondary} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Cheptel" 
        component={CheptelStack}
        options={{
          tabBarLabel: 'Cheptel',
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name="scatter-plot" 
              size={32} 
              color={focused ? Theme.primary : Theme.textSecondary} 
            />
          ),
        }}
      />
       <Tab.Screen 
        name="Reproduction" 
        component={ReproductionStack}
        options={{
          tabBarLabel: 'Reproduction',
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name="face-man-profile" 
              size={32} 
              color={focused ? Theme.primary : Theme.textSecondary} 
            />
          ),
        }}
      />
     
      <Tab.Screen 
        name="Sante" 
        component={SanteStack}
        options={{
          tabBarLabel: 'Santé',
          tabBarIcon: ({ focused, color }) => (
            <View style={{position: 'relative'}}>
              <MaterialCommunityIcons 
                name="heart-pulse" 
                size={32} 
                color={focused ? Theme.primary : Theme.textSecondary} 
              />
              {healthAlerts > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{healthAlerts > 9 ? '9+' : healthAlerts}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Finance" 
        component={TransactionStack}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name="cash" 
              size={32} 
              color={focused ? Theme.primary : Theme.textSecondary} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: 80,
    paddingBottom: 5,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FCE0E0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#C0392B',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default MainTabs;
