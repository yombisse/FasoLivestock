import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TransactionListScreen from '../../screens/main/transactions/TransactionListScreen';
import TransactionDetailScreen from '../../screens/main/transactions/TransactionDetailScreen';
import TransactionFormScreen from '../../screens/main/transactions/TransactionFormScreen';
import TransactionAnimalSelectionScreen from '../../screens/main/transactions/TransactionAnimalSelectionScreen';
import AnimalVenteScreen from '../../screens/main/cheptel/AnimalVenteScreen';
import AnimalAchatScreen from '../../screens/main/transactions/AnimalAchatScreen';

export type TransactionStackParamList = {
  TransactionList: undefined;
  TransactionDetail: { transactionId: string };
  TransactionForm: { transactionId?: string };
  TransactionAnimalSelection: undefined;
  AnimalVente: { animalId: string };
  AnimalAchat: undefined;
};

const Stack = createStackNavigator<TransactionStackParamList>();

const TransactionStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TransactionList" component={TransactionListScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="TransactionForm" component={TransactionFormScreen} />
      <Stack.Screen name="TransactionAnimalSelection" component={TransactionAnimalSelectionScreen} />
      <Stack.Screen name="AnimalVente" component={AnimalVenteScreen} />
      <Stack.Screen name="AnimalAchat" component={AnimalAchatScreen} />
    </Stack.Navigator>
  );
};

export default TransactionStack;
