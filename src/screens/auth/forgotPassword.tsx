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

const ForgotPassword = ({navigation}: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; general?: string; success?: string}>({});

  const handleResetPassword = async () => {
    // Validation de base
    const newErrors: {email?: string} = {};
    
    if (!email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setLoading(true);
    
    try {
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        setErrors({ success: response.message || 'Un lien de réinitialisation a été envoyé à votre email' });
        setEmail('');
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Erreur lors de l\'envoi du lien' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <AppHeader title="Mot de passe oublié" />
        <View style={styles.content}>
          <View style={styles.scrollContent}>
            <View style={styles.logoContainer}>
              <AppImage 
                source={require('../../assets/images/LogoFLS.png')} 
                width={150} 
                height={150} 
              />
            </View>
            <AppText style={styles.title}>Réinitialiser le mot de passe</AppText>
            <AppText style={styles.description}>
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </AppText>
          </View>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <AppTextInput
                label="Email"
                placeholder="Entrez votre email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
              {errors.general && <AppText style={styles.errorText}>{errors.general}</AppText>}
              {errors.success && <AppText style={styles.successText}>{errors.success}</AppText>}
              <AppButton 
                onPress={handleResetPassword} 
                title={loading ? 'Envoi...' : 'Envoyer le lien'}
                disabled={loading}
              />
              <View style={styles.backContainer}>
                <AppLink text="Retour à la connexion" onPress={() => {navigation.navigate('Login')}} />
              </View>
            </View>
          </ScrollView>
        </View>
    </SafeAreaView>
  );
};

export default ForgotPassword;

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
  backContainer: {
    alignItems: 'center',
    marginTop: 24,
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