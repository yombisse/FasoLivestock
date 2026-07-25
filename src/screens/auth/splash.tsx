import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Splash = ({navigation}: {navigation: any}) => {
  useEffect(() => {
    const checkAppStatus = async () => {
      // Check if onboarding was completed
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      
      if (!onboardingCompleted) {
        navigation.navigate('Onboarding');
      } else {
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