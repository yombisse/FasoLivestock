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

const VerifyEmail = ({navigation, route}: any) => {
  const { email, verification_id } = route.params || {};
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [errors, setErrors] = useState<{code?: string; general?: string; success?: string}>({});

  const handleVerify = async () => {
    // Validation de base
    const newErrors: {code?: string} = {};
    
    if (!code) {
      newErrors.code = 'Le code est requis';
    } else if (code.length !== 6) {
      newErrors.code = 'Le code doit contenir 6 chiffres';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setLoading(true);
    
    try {
      const response = await authService.verify2fa({ verification_id: verification_id || '', code });
      
      if (response.success) {
        // Stocker le token et les données utilisateur
        if (response.data?.token) {
          await authStorage.setToken(response.data.token);
          if (response.data.user) {
            await authStorage.setUser(response.data.user);
          }
        }
        
        setErrors({ success: response.message || '2FA vérifié avec succès' });
        // Naviguer vers l'écran de connexion ou principal
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Erreur lors de la vérification' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setErrors({ general: 'Email non disponible' });
      return;
    }
    
    setLoadingResend(true);
    
    try {
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        setErrors({ success: response.message || 'Code renvoyé avec succès' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Erreur lors de l\'envoi du code' });
    } finally {
      setLoadingResend(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <AppHeader title="Vérifier l'email" />
        <View style={styles.content}>
          <View style={styles.scrollContent}>
            <View style={styles.logoContainer}>
              <AppImage 
                source={require('../../assets/images/LogoFLS.png')} 
                width={150} 
                height={150} 
              />
            </View>
            <AppText style={styles.title}>Vérifier votre email</AppText>
            <AppText style={styles.description}>
              Entrez le code de vérification envoyé à votre adresse email pour compléter votre inscription.
            </AppText>
          </View>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <AppTextInput
                label="Code de vérification"
                placeholder="Entrez le code à 6 chiffres"
                value={code}
                onChangeText={setCode}
                keyboardType="numeric"
                maxLength={6}
                error={errors.code}
              />
              {errors.general && <AppText style={styles.errorText}>{errors.general}</AppText>}
              {errors.success && <AppText style={styles.successText}>{errors.success}</AppText>}
              <AppButton 
                onPress={handleVerify} 
                title={loading ? 'Vérification...' : 'Vérifier'}
                disabled={loading}
              />
              <View style={styles.resendContainer}>
                <AppText style={styles.resendText}>Code non reçu? </AppText>
                <AppLink 
                  text={loadingResend ? 'Envoi...' : 'Renvoyer le code'} 
                  onPress={handleResendCode}
                  disabled={loadingResend}
                />
              </View>
              <View style={styles.backContainer}>
                <AppLink text="Retour" onPress={() => {navigation.goBack()}} />
              </View>
            </View>
          </ScrollView>
        </View>
    </SafeAreaView>
  );
};

export default VerifyEmail;

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
  logoContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#30A15E',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
});