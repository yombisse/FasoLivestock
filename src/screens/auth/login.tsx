import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import AppButton from '../../components/AppButton';
import AppTextInput from '../../components/AppTextInput';
import AppLink from '../../components/AppLink';
import AppText from '../../components/AppText';
import AppImage from '../../components/AppImage';
import authService from '../../services/auth.service';
import { authStorage } from '../../storage/authStorage';
import { Theme } from '../../config/colors';
import farmService from '../../services/farm.service';
import { upsertFarms } from '../../database/repositories/farmRepository';

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

        // Charger les fermes du serveur
        try {
          const farms = await farmService.getFarms();
          console.log(`[Login] Loaded ${farms.length} farms from server`);
          
          // Stocker les fermes dans WatermelonDB
          await upsertFarms(farms);
          console.log('[Login] Farms stored in WatermelonDB');
        } catch (farmError: any) {
          console.error('[Login] Error loading farms:', farmError);
          // Continuer même si le chargement des fermes échoue
          // FarmPicker essaiera de charger les fermes localement
        }

        // Navigate to farm picker
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
      <LinearGradient
        colors={[Theme.primary, Theme.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoSquare}>
            <AppImage 
              source={require('../../assets/images/LogoFLS.png')} 
              width={80} 
              height={80} 
            />
          </View>
          <AppText style={styles.appTitle}>FasoLivestock</AppText>
          <AppText style={styles.appSubtitle}>Gestion intelligente de vos fermes</AppText>
        </View>
      </LinearGradient>
      <View style={styles.content}>
        <View style={styles.formCard}>
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
                style={styles.loginButton}
              />
              <View style={styles.registerContainer}>
                <AppText style={styles.registerText}>Pas encore de compte? </AppText>
                <AppLink text="S'inscrire" onPress={() => {navigation.navigate('Register')}} />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;
const styles = StyleSheet.create({
  container: {  
    flex: 1,
    backgroundColor: Theme.primary,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoSquare: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formCard: {
    flex: 1,
    backgroundColor: Theme.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
  loginButton: {
    borderRadius: 28,
    marginTop: 8,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
});