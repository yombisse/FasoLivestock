import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppTextInput from '../../components/AppTextInput';
import AppLink from '../../components/AppLink';
import AppText from '../../components/AppText';
import AppImage from '../../components/AppImage';
import authService from '../../services/auth.service';
import { authStorage } from '../../storage/authStorage';

const Login = ({navigation}: any) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{login?: string; password?: string; general?: string}>({});

  const handleLogin = async () => {
    // Validation de base
    const newErrors: {login?: string; password?: string} = {};
    
    if (!login) {
      newErrors.login = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(login)) {
      newErrors.login = 'Email invalide';
    }
    
    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setLoading(true);
    
    try {
      const response = await authService.login({ login, password });
      
      if (response.success && response.data?.token) {
        // Stocker le token et les données utilisateur
        await authStorage.setToken(response.data.token);
        if (response.data.user) {
          await authStorage.setUser(response.data.user);
        }
        
        console.log('Login successful:', response.data);

        // Navigate to farm picker - sync will handle data pull
        navigation.reset({
          index: 0,
          routes: [{ name: 'FarmPicker' }],
        });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Erreur lors de la connexion' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <AppHeader title="Connexion" subtitle="Accédez à votre espace personnel" />
        <View style={styles.content}>
          <View style={styles.scrollContent}>
            <View style={styles.logoContainer}>
              <AppImage 
                source={require('../../assets/images/LogoFLS.png')} 
                width={150} 
                height={150} 
              />
            </View>
          </View>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <AppTextInput
                label="Email"
                placeholder="Entrez votre email"
                value={login}
                onChangeText={setLogin}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.login}
              />
              <AppTextInput
                label="Mot de passe"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                error={errors.password}
              />
              {errors.general && <AppText style={styles.errorText}>{errors.general}</AppText>}
              <View style={styles.forgotPasswordContainer}>
                <AppLink text="Mot de passe oublié?" onPress={() => {navigation.navigate('ForgotPassword')}} />
              </View>
              <AppButton 
                onPress={handleLogin} 
                title={loading ? 'Connexion...' : 'Se connecter'}
                disabled={loading}
              />
              <View style={styles.registerContainer}>
                <AppText style={styles.registerText}>Pas encore de compte? </AppText>
                <AppLink text="S'inscrire" onPress={() => {navigation.navigate('Register')}} />
              </View>
            </View>
          </ScrollView>
        </View>
    </SafeAreaView>
  );
};

export default Login;
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
  },
  logoContainer: {
    marginBottom: 20,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
});