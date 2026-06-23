import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppTextInput from '../../components/AppTextInput';
import AppLink from '../../components/AppLink';
import AppText from '../../components/AppText';
import AppImage from '../../components/AppImage';

const Register = ({navigation}: any) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
        <AppHeader title="Inscription" />
        <View style={styles.content}>
          <View style={styles.scrollContent}>
            <View style={styles.logoContainer}>
              <AppImage 
                source={require('../../assets/images/LogoFLS.png')} 
                width={150} 
                height={150} 
              />
            </View>
            <AppText style={styles.title}>Inscription</AppText>
          </View>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <AppTextInput
                label="Nom complet"
                placeholder="Entrez votre nom complet"
                value={fullName}
                onChangeText={setFullName}
              />
              <AppTextInput
                label="Email"
                placeholder="Entrez votre email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <AppTextInput
                label="Mot de passe"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
              />
              <AppTextInput
                label="Confirmer mot de passe"
                placeholder="Confirmez votre mot de passe"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={true}
              />
              <AppButton onPress={() => {}} title="S'inscrire" />
              <View style={styles.loginContainer}>
                <AppText style={styles.loginText}>Déjà un compte? </AppText>
                <AppLink text="Se connecter" onPress={() => {navigation.navigate('Login')}} />
              </View>
            </View>
          </ScrollView>
        </View>
    </SafeAreaView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
  },
  logoContainer: {
    marginBottom: 20,
  },
});