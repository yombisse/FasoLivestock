import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CustomDrawerContent from './drawer/CustomDrawerContent';
import MainTabs from '../tabs/MainTabs';
import SyncConflictsScreen from '../../screens/settings/SyncConflictsScreen';
import { useSyncTrigger } from '../../hooks/useSyncTrigger';

const Drawer = createDrawerNavigator();

const MainDrawer = () => {
  // Mount sync trigger at root of authenticated app
  // This will auto-sync when network is restored
  useSyncTrigger();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: 280,
        },
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
      <Drawer.Screen
        name="SyncConflicts"
        component={SyncConflictsScreen}
        options={{
          headerShown: true,
          title: 'Conflits de synchronisation',
        }}
      />
    </Drawer.Navigator>
  );
};

export default MainDrawer;
