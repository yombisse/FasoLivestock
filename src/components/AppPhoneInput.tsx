import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Text,
} from 'react-native';
import PhoneInput from 'react-native-phone-number-input';
import AppText from './AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface AppPhoneInputProps {
  label?: string;
  value?: string;
  onChange: (
    phoneNumber: string,
    formattedNumber: string,
    isValid: boolean,
    countryCode: string
  ) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppPhoneInput: React.FC<AppPhoneInputProps> = ({
  label,
  value,
  onChange,
  error,
  placeholder = '70 00 00 00',
  disabled = false,
  required = false,
  style,
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>(value || '');
  const [isValid, setIsValid] = useState<boolean>(false);

  const handleChange = (text: string, isValidNumber: boolean) => {
    setPhoneNumber(text);
    setIsValid(isValidNumber);

    // Validation simple interne
    const cleanedNumber = text.replace(/[\s-]/g, '');
    const hasValidLength = cleanedNumber.length >= 8;
    const isOnlyDigits = /^\d+$/.test(cleanedNumber);
    const internalValid = isValidNumber && hasValidLength && isOnlyDigits;

    onChange(text, text, internalValid, 'BF');
  };

  const containerStyle = {
    opacity: disabled ? 0.5 : 1,
  };

  const fieldStyle = {
    borderColor: error ? '#D32F2F' : '#BDBDBD',
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <AppText style={styles.label}>{label}</AppText>
          {required && <AppText style={styles.required}> *</AppText>}
        </View>
      )}

      {/* Champ téléphone */}
      <View style={[styles.phoneContainer, fieldStyle]}>
        <PhoneInput
          defaultValue={phoneNumber}
          defaultCode="BF"
          layout="first"
          onChangeText={handleChange}
          onChangeFormattedText={handleChange}
          countryPickerProps={{
            countryCodes: ['BF'],
          }}
          disabled={disabled}
          placeholder={placeholder}
          containerStyle={styles.phoneInputContainer}
          textContainerStyle={styles.phoneTextContainer}
          textInputStyle={styles.phoneTextInput}
          codeTextStyle={styles.phoneCodeText}
          flagButtonStyle={styles.flagButton}
          countryPickerButtonStyle={styles.countryPickerButton}
          withDarkTheme={false}
          withShadow={false}
          autoFocus={false}
        />
      </View>

      {/* Message d'erreur */}
      {error && <AppText style={styles.error}>{error}</AppText>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#212121',
  },
  required: {
    fontSize: 14,
    color: '#D32F2F',
  },
  phoneContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 48,
  },
  phoneInputContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  phoneTextContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
  },
  phoneTextInput: {
    fontSize: 16,
    color: '#212121',
  },
  phoneCodeText: {
    fontSize: 16,
    color: '#212121',
  },
  flagButton: {
    width: 50,
  },
  countryPickerButton: {
    width: 50,
  },
  error: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
  },
});

export default AppPhoneInput;

// Dans RegisterScreen ou ProfileScreen :
// <AppPhoneInput
//   label="Numéro de téléphone"
//   value={formData.phone}
//   onChange={(number, formatted, isValid, country) => {
//     setFormData(prev => ({ ...prev, phone: formatted }))
//     setPhoneValid(isValid)
//   }}
//   placeholder="70 00 00 00"
//   required
//   error={errors.phone}
// />
