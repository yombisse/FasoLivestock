import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CheptelListScreen from '../../screens/main/cheptel/CheptelListScreen';
import AnimalDetailScreen from '../../screens/main/cheptel/AnimalDetailScreen';
import AnimalFormScreen from '../../screens/main/cheptel/AnimalFormScreen';
import AnimalAchatScreen from '../../screens/main/transactions/AnimalAchatScreen';
import AnimalNaissanceScreen from '../../screens/main/cheptel/AnimalNaissanceScreen';
import AnimalVenteScreen from '../../screens/main/cheptel/AnimalVenteScreen';
import AnimalTransfertScreen from '../../screens/main/cheptel/AnimalTransfertScreen';
import AnimalDecesScreen from '../../screens/main/cheptel/AnimalDecesScreen';
import AnimalPerteScreen from '../../screens/main/cheptel/AnimalPerteScreen';
import AnimalAbattageScreen from '../../screens/main/cheptel/AnimalAbattageScreen';
import AnimalHistoriqueScreen from '../../screens/main/cheptel/AnimalHistoriqueScreen';
import AnimalSanteHistoriqueScreen from '../../screens/main/cheptel/AnimalSanteHistoriqueScreen';
import AnimalReproductionHistoriqueScreen from '../../screens/main/cheptel/AnimalReproductionHistoriqueScreen';
import AnimalTransactionHistoriqueScreen from '../../screens/main/cheptel/AnimalTransactionHistoriqueScreen';
import AnimalHistoryScreen from '../../screens/main/cheptel/AnimalHistoryScreen';

export type CheptelStackParamList = {
  CheptelList: undefined;
  AnimalDetail: { animalId: string; readOnly?: boolean };
  AnimalForm: { animalId?: string };
  AnimalAchat: { categorieId?: string };
  AnimalNaissance: { motherId?: string; motherName?: string } | undefined;
  AnimalVente: { animalId: string; typeEvenementId?: string };
  AnimalTransfert: { animalId: string; typeEvenementId?: string };
  AnimalDeces: { animalId: string; typeEvenementId?: string };
  AnimalPerte: { animalId: string; typeEvenementId?: string };
  AnimalAbattage: { animalId: string; typeEvenementId?: string };
  AnimalHistorique: { animalId: string };
  AnimalSanteHistorique: { animalId: string };
  AnimalReproductionHistorique: { animalId: string };
  AnimalTransactionHistorique: { animalId: string };
  AnimalHistory: undefined;
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
      <Stack.Screen name="AnimalAchat" component={AnimalAchatScreen} />
      <Stack.Screen name="AnimalNaissance" component={AnimalNaissanceScreen} />
      <Stack.Screen name="AnimalVente" component={AnimalVenteScreen} />
      <Stack.Screen name="AnimalTransfert" component={AnimalTransfertScreen} />
      <Stack.Screen name="AnimalDeces" component={AnimalDecesScreen} />
      <Stack.Screen name="AnimalPerte" component={AnimalPerteScreen} />
      <Stack.Screen name="AnimalAbattage" component={AnimalAbattageScreen} />
      <Stack.Screen name="AnimalHistorique" component={AnimalHistoriqueScreen} />
      <Stack.Screen name="AnimalSanteHistorique" component={AnimalSanteHistoriqueScreen} />
      <Stack.Screen name="AnimalReproductionHistorique" component={AnimalReproductionHistoriqueScreen} />
      <Stack.Screen name="AnimalTransactionHistorique" component={AnimalTransactionHistoriqueScreen} />
      <Stack.Screen name="AnimalHistory" component={AnimalHistoryScreen} />
    </Stack.Navigator>
  );
};

export default CheptelStack;
