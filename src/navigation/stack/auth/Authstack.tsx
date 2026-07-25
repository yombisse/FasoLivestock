import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Login from '../../../screens/auth/login';
import Register from '../../../screens/auth/register';
import VerifyEmail from '../../../screens/auth/verifyEmail';
import ForgotPassword from '../../../screens/auth/forgotPassword';
const AuthStack = createStackNavigator();

const Authstack = () => {
  return (
    <AuthStack.Navigator initialRouteName="Login">
      <AuthStack.Screen name="Login" component={Login} options={{ headerShown: false }} />
      <AuthStack.Screen name="Register" component={Register} options={{ headerShown: false }} />
      <AuthStack.Screen name="VerifyEmail" component={VerifyEmail} options={{ headerShown: false }} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPassword} options={{ headerShown: false }} />
    </AuthStack.Navigator>
  );
};

export default Authstack;