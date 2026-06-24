import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppTextInput from '../../components/AppTextInput';
import AppLink from '../../components/AppLink';
import AppText from '../../components/AppText';
import AppImage from '../../components/AppImage';
import authService from '../../services/auth.service';
import { authStorage } from '../../storage/authStorage';

const Register = ({navigation}: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{name?: string; email?: string; password?: string; passwordConfirmation?: string; general?: string}>({});

  const handleRegister = async () => {
    // Validation de base
    const newErrors: {name?: string; email?: string; password?: string; passwordConfirmation?: string} = {};
    
    if (!name) {
      newErrors.name = 'Le nom complet est requis';
    } else if (name.length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (!passwordConfirmation) {
      newErrors.passwordConfirmation = 'La confirmation du mot de passe est requise';
    } else if (password !== passwordConfirmation) {
      newErrors.passwordConfirmation = 'Les mots de passe ne correspondent pas';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setLoading(true);
    
    try {
      const response = await authService.register({ 
        name, 
        email, 
        password, 
        password_confirmation: passwordConfirmation 
      });
      
      if (response.success) {
        // Si le token est renvoyé, le stocker
        if (response.data?.token) {
          await authStorage.setToken(response.data.token);
          if (response.data.user) {
            await authStorage.setUser(response.data.user);
          }
        }
        
        console.log('Register successful:', response.data);
        // Naviguer vers l'écran de vérification 2FA avec verification_id
        navigation.navigate('VerifyEmail', { 
          email, 
          verification_id: response.data?.verification_id 
        });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Erreur lors de l\'inscription' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <AppHeader title="Inscription" subtitle="Créez votre compte et découvrez nos services" />
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
          <ScrollView style={styles.scrollView} contentContainerStyle={{paddingVertical: 24}} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <AppTextInput
                label="Nom complet"
                placeholder="Entrez votre nom complet"
                value={name}
                onChangeText={setName}
                error={errors.name}
              />
              <AppTextInput
                label="Email"
                placeholder="Entrez votre email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
              <AppTextInput
                label="Mot de passe"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                error={errors.password}
              />
              <AppTextInput
                label="Confirmer mot de passe"
                placeholder="Confirmez votre mot de passe"
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                secureTextEntry={true}
                error={errors.passwordConfirmation}
              />
              {errors.general && <AppText style={styles.errorText}>{errors.general}</AppText>}
              <AppButton 
                onPress={handleRegister} 
                title={loading ? 'Inscription...' : 'S\'inscrire'}
                disabled={loading}
              />
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
    marginBottom: 10,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
});