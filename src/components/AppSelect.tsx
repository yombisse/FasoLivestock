import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import AppText from './AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface AppSelectOption {
  label: string;
  value: string;
}

interface AppSelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  options: AppSelectOption[];
  onValueChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  containerStyle?: object;
  inputStyle?: object;
}

const AppSelect = ({
  label,
  placeholder = 'Sélectionner',
  value,
  options,
  onValueChange,
  error,
  disabled,
  containerStyle,
  inputStyle,
}: AppSelectProps) => {
  const [visible, setVisible] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setVisible(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <AppText style={styles.label}>{label}</AppText> : null}
      <TouchableOpacity
        style={[styles.input, inputStyle, disabled && styles.disabledInput]}
        onPress={() => { if (!disabled) setVisible(true); }}
        activeOpacity={0.8}
      >
        <AppText style={[styles.valueText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </AppText>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#757575" />
      </TouchableOpacity>

      {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

      <Modal visible={visible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>{label || 'Sélectionner'}</AppText>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => handleSelect(item.value)}
                >
                  <AppText style={[styles.optionLabel, item.value === value && styles.optionLabelSelected]}>
                    {item.label}
                  </AppText>
                  {item.value === value ? (
                    <MaterialCommunityIcons name="check" size={18} color="#2E7D32" />
                  ) : null}
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#212121',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledInput: {
    opacity: 0.6,
  },
  valueText: {
    fontSize: 16,
    color: '#212121',
  },
  placeholderText: {
    color: '#BDBDBD',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#212121',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionLabel: {
    fontSize: 16,
    color: '#212121',
  },
  optionLabelSelected: {
    fontWeight: '700',
    color: '#2E7D32',
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F5',
  },
});

export default AppSelect;
