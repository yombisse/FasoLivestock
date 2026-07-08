import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ReproductionScreen from '../../screens/main/ReproductionScreen';
import AddReproductionEventScreen from '../../screens/main/reproduction/AddReproductionEventScreen';

const Stack = createStackNavigator();

const ReproductionStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ReproductionMain" component={ReproductionScreen} />
      <Stack.Screen name="AddReproductionEvent" component={AddReproductionEventScreen} />
    </Stack.Navigator>
  );
};

export default ReproductionStack;
