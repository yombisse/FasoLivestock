import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CustomDrawerContent from './drawer/CustomDrawerContent';
import MainTabs from '../tabs/MainTabs';
import NotificationScreen from '../../screens/main/NotificationScreen';

const Drawer = createDrawerNavigator();

const MainDrawer = () => {
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
      <Drawer.Screen name="NotificationScreen" component={NotificationScreen} options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer.Navigator>
  );
};

export default MainDrawer;
