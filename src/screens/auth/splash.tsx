import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStorage } from '../../storage/authStorage';
import { farmStorage } from '../../storage/farmStorage';
import farmService from '../../services/farm.service';
import { upsertFarms } from '../../database/repositories/farmRepository';

const Splash = ({navigation}: {navigation: any}) => {
  useEffect(() => {
    const checkAppStatus = async () => {
      try {
        // Check if onboarding was completed
        const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
        
        if (!onboardingCompleted) {
          navigation.navigate('Onboarding');
          return;
        }

        // Check if user has a valid token
        const isTokenValid = await authStorage.isTokenValid();
        const user = await authStorage.getUser();
        
        if (isTokenValid && user) {
          console.log('[Splash] Valid token found, auto-login user:', user.email);
          
          // Vérifier si une ferme active existe déjà localement
          const activeFarm = await farmStorage.getActiveFarm();
          
          if (activeFarm) {
            console.log('[Splash] Active farm found locally:', activeFarm.name);
            // Naviguer directement vers le MainDrawer sans appel backend
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainDrawer' }],
            });
            return;
          }
          
          console.log('[Splash] No active farm found, loading farms from server');
          
          // Charger les fermes du serveur si connecté
          try {
            const farms = await farmService.getFarms();
            console.log(`[Splash] Loaded ${farms.length} farms from server`);
            
            // Stocker les fermes dans WatermelonDB
            await upsertFarms(farms);
            console.log('[Splash] Farms stored in WatermelonDB');
          } catch (farmError: any) {
            console.error('[Splash] Error loading farms from server:', farmError);
            // Continuer même si le chargement des fermes échoue
            // FarmPicker essaiera de charger les fermes localement
          }

          // Navigate to farm picker directly (user is already authenticated)
          navigation.reset({
            index: 0,
            routes: [{ name: 'FarmPicker' }],
          });
        } else {
          console.log('[Splash] No valid token found, showing login');
          navigation.navigate('AuthStack');
        }
      } catch (error) {
        console.error('[Splash] Error checking auth status:', error);
        navigation.navigate('AuthStack');
      }
    };

    checkAppStatus();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../../assets/images/LogoFLS.png')} style={styles.image} />
      <ActivityIndicator size="large" color="#fff" style={styles.spinner} />
    </SafeAreaView>
  );
};

export default Splash;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1B4D3E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image:{
        width:200,
        height:200,
        borderRadius:100,
        marginBottom: 30,
    },
    spinner: {
        marginTop: 20,
    },
});