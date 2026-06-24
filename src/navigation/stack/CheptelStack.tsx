import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CheptelListScreen from '../../screens/main/cheptel/CheptelListScreen';
import AnimalDetailScreen from '../../screens/main/cheptel/AnimalDetailScreen';
import AnimalFormScreen from '../../screens/main/cheptel/AnimalFormScreen';

export type CheptelStackParamList = {
  CheptelList: undefined;
  AnimalDetail: { animalId: string };
  AnimalForm: { animalId?: string };
};

const Stack = createStackNavigator<CheptelStackParamList>();

const CheptelStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="CheptelList" component={CheptelListScreen} />
      <Stack.Screen name="AnimalDetail" component={AnimalDetailScreen} />
      <Stack.Screen name="AnimalForm" component={AnimalFormScreen} />
    </Stack.Navigator>
  );
};

export default CheptelStack;
