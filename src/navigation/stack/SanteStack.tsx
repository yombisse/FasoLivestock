import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SanteScreen from '../../screens/main/SanteScreen';
import SanteCreateScreen from '../../screens/main/sante/SanteCreateScreen';
import SanteAnimalSelectionScreen from '../../screens/main/sante/SanteAnimalSelectionScreen';

const Stack = createStackNavigator();

const SanteStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SanteMain" component={SanteScreen} />
      <Stack.Screen name="SanteAnimalSelection" component={SanteAnimalSelectionScreen} />
      <Stack.Screen name="SanteCreate" component={SanteCreateScreen} />
    </Stack.Navigator>
  );
};

export default SanteStack;
