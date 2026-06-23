import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const AppButton = ({onPress, title}: {onPress: () => void; title: string}) => {
  return (
    <TouchableOpacity 
    onPress={onPress}
    style={styles.button}
    >
     <Text style={styles.text}>{title}</Text>
      
    </TouchableOpacity>
  );
};

export default AppButton;

const styles = StyleSheet.create({
    button:{
        width: '100%',
        height: 50,
        backgroundColor: '#30A15E',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text:{
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});