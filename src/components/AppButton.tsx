import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Theme } from '../config/colors';

interface AppButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const AppButton = ({onPress, title, style, textStyle, disabled = false}: AppButtonProps) => {
  return (
    <TouchableOpacity 
    onPress={onPress}
    style={[styles.button, disabled && styles.buttonDisabled, style]}
    disabled={disabled}
    >
     <Text style={[styles.text, disabled && styles.textDisabled, textStyle]}>{title}</Text>
      
    </TouchableOpacity>
  );
};

export default AppButton;

const styles = StyleSheet.create({
    button:{
        width: '100%',
        height: 50,
        backgroundColor:Theme.primary,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: Theme.textSecondary,
    },
    text:{
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    textDisabled: {
        color: '#999999',
    }
});