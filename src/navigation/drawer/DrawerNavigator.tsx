import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CustomDrawerContent from '../stack/drawer/CustomDrawerContent';
import MainTabs from '../tabs/MainTabs';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ title: 'FasoLivestock' }}
      />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
