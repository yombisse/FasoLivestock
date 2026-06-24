import React from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';

const Animals = () => {
  const navigation = useNavigation();

  const animals = [
    { id: 1, name: 'Vache #1', type: 'Bovin', age: '3 ans', status: 'Sain' },
    { id: 2, name: 'Vache #2', type: 'Bovin', age: '2 ans', status: 'Sain' },
    { id: 3, name: 'Mouton #1', type: 'Ovin', age: '1 an', status: 'En traitement' },
  ];

  const renderAnimal = ({item}: any) => (
    <View style={styles.animalCard}>
      <View style={styles.animalInfo}>
        <AppText style={styles.animalName}>{item.name}</AppText>
        <AppText style={styles.animalType}>{item.type} • {item.age}</AppText>
        <AppText 
          style={styles.animalStatus}
          color={item.status === 'Sain' ? '#2E7D32' : '#F57C00'}
        >
          {item.status}
        </AppText>
      </View>
      <AppButton 
        title="Détails"
        onPress={() => navigation.navigate('AnimalDetail', { animalId: item.id })}
        style={styles.detailButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Mes animaux"
        subtitle="Gérez votre bétail"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{paddingVertical: 24}} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <AppButton 
            title="+ Ajouter un animal"
            onPress={() => navigation.navigate('AddAnimal')}
            style={styles.addButton}
          />
          <FlatList
            data={animals}
            renderItem={renderAnimal}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  addButton: {
    marginBottom: 20,
  },
  animalCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animalInfo: {
    flex: 1,
  },
  animalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  animalType: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  animalStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailButton: {
    width: 80,
    height: 36,
  },
});

export default Animals;
