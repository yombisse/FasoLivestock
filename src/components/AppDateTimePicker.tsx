import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppText from './AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface AppDateTimePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date, formatted: string) => void;
  mode?: 'date' | 'time' | 'datetime';
  displayFormat?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppDateTimePicker: React.FC<AppDateTimePickerProps> = ({
  label,
  value,
  onChange,
  mode = 'date',
  displayFormat,
  minimumDate,
  maximumDate,
  placeholder = 'Sélectionner une date',
  error,
  disabled = false,
  required = false,
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>(mode === 'time' ? 'time' : 'date');
  const [tempDate, setTempDate] = useState<Date | null>(null);

  // Formatage manuel des dates sans librairie externe
  const formatDate = (date: Date, currentMode: 'date' | 'time' | 'datetime'): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (currentMode === 'date') {
      return `${day}/${month}/${year}`;
    }
    if (currentMode === 'time') {
      return `${hours}:${minutes}`;
    }
    // datetime
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getDisplayValue = (): string => {
    if (!value) return placeholder;
    return formatDate(value, mode);
  };

  const handlePress = () => {
    if (disabled) return;

    if (mode === 'datetime') {
      // Pour datetime, commencer par le picker date
      setPickerMode('date');
      setShowPicker(true);
    } else {
      setPickerMode(mode);
      setShowPicker(true);
    }
  };

  const handlePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // Sur Android, le picker se ferme automatiquement
      setShowPicker(false);
    }

    if (selectedDate) {
      if (mode === 'datetime' && pickerMode === 'date') {
        // Premier picker (date) terminé, ouvrir le picker heure
        setTempDate(selectedDate);
        setPickerMode('time');
        setShowPicker(true);
      } else if (mode === 'datetime' && pickerMode === 'time' && tempDate) {
        // Deuxième picker (heure) terminé, combiner date et heure
        const combinedDate = new Date(tempDate);
        combinedDate.setHours(selectedDate.getHours());
        combinedDate.setMinutes(selectedDate.getMinutes());
        onChange(combinedDate, formatDate(combinedDate, 'datetime'));
        setTempDate(null);
      } else {
        // Mode simple (date ou time)
        onChange(selectedDate, formatDate(selectedDate, mode));
      }
    }
  };

  const getIconName = (): string => {
    if (mode === 'time') return 'clock-outline';
    return 'calendar';
  };

  const containerStyle = {
    opacity: disabled ? 0.5 : 1,
  };

  const fieldStyle = {
    borderColor: error ? '#D32F2F' : showPicker ? '#2E7D32' : '#BDBDBD',
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

      {/* Champ */}
      <TouchableOpacity
        style={[styles.field, fieldStyle]}
        onPress={handlePress}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {getDisplayValue()}
        </Text>
        <MaterialCommunityIcons
          name={getIconName()}
          size={20}
          color="#757575"
          style={styles.icon}
        />
      </TouchableOpacity>

      {/* Message d'erreur */}
      {error && <AppText style={styles.error}>{error}</AppText>}

      {/* Picker natif */}
      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode={pickerMode}
          onChange={handlePickerChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          display={Platform.OS === 'ios' ? 'default' : 'default'}
        />
      )}
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  value: {
    fontSize: 16,
    color: '#212121',
    flex: 1,
  },
  placeholder: {
    fontSize: 16,
    color: '#BDBDBD',
    flex: 1,
  },
  icon: {
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
  },
});

export default AppDateTimePicker;

// Sélection date de naissance animal :
// <AppDateTimePicker
//   label="Date de naissance"
//   value={formData.date_naissance}
//   onChange={(date, formatted) =>
//     setFormData(prev => ({ ...prev, date_naissance: formatted }))
//   }
//   mode="date"
//   maximumDate={new Date()}
//   placeholder="JJ/MM/AAAA"
// />

// Sélection date et heure d'un événement :
// <AppDateTimePicker
//   label="Date et heure"
//   value={formData.date_evenement}
//   onChange={(date, formatted) =>
//     setFormData(prev => ({ ...prev, date_evenement: formatted }))
//   }
//   mode="datetime"
//   required
// />
