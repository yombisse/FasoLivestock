import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Modalize } from 'react-native-modalize';
import AppText from './AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface BottomSheetOption {
  id: string;
  label: string;
  icon: string;
  iconColor?: string;
  onPress: () => void;
}

export interface AppBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface AppBottomSheetProps {
  options: BottomSheetOption[];
  onClose?: () => void;
}

const AppBottomSheet = forwardRef<AppBottomSheetRef, AppBottomSheetProps>(
  ({ options, onClose }, ref) => {
    const modalizeRef = useRef<Modalize>(null);

    useImperativeHandle(ref, () => ({
      present: () => modalizeRef.current?.open(),
      dismiss: () => modalizeRef.current?.close(),
    }));

    const handleOptionPress = (option: BottomSheetOption) => {
      modalizeRef.current?.close();
      option.onPress();
    };

    return (
      <Modalize
        ref={modalizeRef}
        adjustToContentHeight
        onClose={onClose}
        modalStyle={styles.modal}
        handleStyle={styles.indicator}
      >
        <View style={styles.content}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              style={styles.option}
              onPress={() => handleOptionPress(option)}
            >
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={option.icon}
                  size={24}
                  color={option.iconColor || '#30A15E'}
                />
              </View>
              <AppText style={styles.label}>{option.label}</AppText>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#BDBDBD" />
            </Pressable>
          ))}
        </View>
      </Modalize>
    );
  }
);

const styles = StyleSheet.create({
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  indicator: {
    backgroundColor: '#E0E0E0',
    width: 40,
    height: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
});

export default AppBottomSheet;