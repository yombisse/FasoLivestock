import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Splash from '../../../screens/auth/splash';
import Login from '../../../screens/auth/login';
import Register from '../../../screens/auth/register';

const AuthStack = createStackNavigator();

const Authstack = () => {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Splash" component={Splash} options={{ headerShown: false }} />
      <AuthStack.Screen name="Login" component={Login} options={{ headerShown: false }} />
      <AuthStack.Screen name="Register" component={Register} options={{ headerShown: false }} />
    </AuthStack.Navigator>
  );
};

export default Authstack;