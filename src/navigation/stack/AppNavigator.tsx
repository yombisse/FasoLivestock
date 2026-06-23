import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import Authstack from './auth/Authstack';

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Authstack />
    </NavigationContainer>
  );
};

export default AppNavigator;