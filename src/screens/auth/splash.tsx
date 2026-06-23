import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, StyleSheet } from 'react-native';
import AppButton from '../../components/AppButton';

const Splash = ({navigation}: {navigation: any}) => {
  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../../assets/images/LogoFLS.png')} style={styles.image} />
      <AppButton onPress={() => navigation.navigate('Login')} title="Commencer" />
    </SafeAreaView>
  );
};

export default Splash;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image:{
        width:200,
        height:200,
        borderRadius:100
    }
});