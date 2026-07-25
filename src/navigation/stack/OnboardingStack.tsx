import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingScreen from '../../screens/onboarding/OnboardingScreen';

const Stack = createStackNavigator();

const OnboardingStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingStack;
