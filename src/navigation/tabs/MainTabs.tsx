import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../../screens/main/HomeScreen';
import CheptelStack from '../stack/CheptelStack';
import ReproductionStack from '../stack/ReproductionStack';
import AlimentationScreen from '../../screens/main/AlimentationScreen';
import SanteStack from '../stack/SanteStack';
import TransactionStack from '../stack/TransactionStack';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          paddingBottom: insets.bottom + 5,
          height: 65 + insets.bottom,
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarLabelStyle: {
          fontSize: 11,
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
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home" size={32} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Cheptel" 
        component={CheptelStack}
        options={{
          tabBarLabel: 'Cheptel',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cow" size={32} color={color} />
          ),
        }}
      />
       <Tab.Screen 
        name="Reproduction" 
        component={ReproductionStack}
        options={{
          tabBarLabel: 'Reproduction',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="gender-male-female" size={32} color={color} />
          ),
        }}
      />
     
      <Tab.Screen 
        name="Sante" 
        component={SanteStack}
        options={{
          tabBarLabel: 'Santé',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="medical-bag" size={32} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Finance" 
        component={TransactionStack}
        options={{
          tabBarLabel: 'Finance',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cash" size={32} color={color} />
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
    height: 65,
    paddingBottom: 5,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
});

export default MainTabs;
