import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';
import AppImage from '../../components/AppImage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OnboardingScreen = ({navigation}: {navigation: any}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const onboardingData = [
    {
      title: 'Gérez votre Cheptel',
      description: 'Suivez facilement tous vos animaux : leur santé, leur reproduction et leurs mouvements. Une vue d\'ensemble complète de votre élevage.',
      imageSource: require('../../assets/images/cheptel.png'),
    },
    {
      title: 'Événements Sanitaires & Reproductifs',
      description: 'Enregistrez les vaccinations, traitements, chaleurs, saillies et mises bas. Recevez des rappels pour ne rien manquer.',
      imageSource: require('../../assets/images/sante.png'),
    },
    {
      title: 'Transactions Financières',
      description: 'Suivez vos revenus et dépenses : ventes, achats, coûts vétérinaires. Une comptabilité claire pour votre activité.',
      imageSource: require('../../assets/images/transaction.png'),
    },
  ];

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleCompleteOnboarding();
    }
  };

  const handleSkip = async () => {
    await handleCompleteOnboarding();
  };

  const handleCompleteOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    navigation.navigate('AuthStack');
  };

  const currentSlide = onboardingData[currentIndex];
  const isLast = currentIndex === onboardingData.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <AppImage 
            source={currentSlide.imageSource}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.textContainer}>
          <AppText 
            style={styles.title}
            fontSize={28}
            fontWeight="bold"
            color="#FFFFFF"
            textAlign="center"
          >
            {currentSlide.title}
          </AppText>
          <AppText 
            style={styles.description}
            fontSize={16}
            color="#FFFFFF"
            textAlign="center"
          >
            {currentSlide.description}
          </AppText>
        </View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <AppButton 
          title="Passer"
          onPress={handleSkip}
          style={styles.skipButton}
          textStyle={styles.skipButtonText}
        />
        
        <AppButton 
          title={isLast ? 'Commencer' : 'Suivant'}
          onPress={handleNext}
          style={[styles.nextButton, isLast && styles.getStartedButton]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B4D3E',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4/3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 16,
  },
  description: {
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  skipButtonText: {
    color: '#FFFFFF',
  },
  nextButton: {
    flex: 1,
  },
  getStartedButton: {
    backgroundColor: '#2A6B54',
  },
});

export default OnboardingScreen;
