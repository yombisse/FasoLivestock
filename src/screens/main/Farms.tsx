import React from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppImage from '../../components/AppImage';

const Farms = () => {
  const navigation = useNavigation();

  const farms = [
    { id: 1, name: 'Ferme principale', location: 'Ouagadougou', animals: 8 },
    { id: 2, name: 'Ferme secondaire', location: 'Bobo-Dioulasso', animals: 4 },
  ];

  const renderFarm = ({item}: any) => (
    <View style={styles.farmCard}>
      <View style={styles.farmInfo}>
        <AppText style={styles.farmName}>{item.name}</AppText>
        <AppText style={styles.farmLocation}>{item.location}</AppText>
        <AppText style={styles.farmAnimals}>{item.animals} animaux</AppText>
      </View>
      <AppButton 
        title="Voir"
        onPress={() => navigation.navigate('FarmDetail', { farmId: item.id })}
        style={styles.viewButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Mes élevages"
        subtitle="Gérez vos fermes"
        showBackground={true}
        showMenuButton={true}
        onMenuPress={() => (navigation as any).openDrawer()}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{paddingVertical: 24}} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <AppButton 
            title="+ Ajouter un élevage"
            onPress={() => navigation.navigate('AddFarm')}
            style={styles.addButton}
          />
          <FlatList
            data={farms}
            renderItem={renderFarm}
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
  farmCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  farmLocation: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  farmAnimals: {
    fontSize: 12,
    color: '#2E7D32',
  },
  viewButton: {
    width: 80,
    height: 36,
  },
});

export default Farms;
