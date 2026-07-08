import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppText from './AppText';
import AppButton from './AppButton';

interface AppEmptyStateProps {
  message: string;
  subMessage?: string;
  icon?: string;
  actionButtonTitle?: string;
  onActionButtonPress?: () => void;
}

const AppEmptyState = ({
  message,
  subMessage,
  icon = 'cow',
  actionButtonTitle,
  onActionButtonPress,
}: AppEmptyStateProps) => {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name={icon} size={64} color="#BDBDBD" />
      <AppText style={styles.emptyTitle} fontWeight="bold">
        {message}
      </AppText>
      {subMessage && (
        <AppText style={styles.emptyText} color="#757575">
          {subMessage}
        </AppText>
      )}
      {actionButtonTitle && onActionButtonPress && (
        <AppButton
          title={actionButtonTitle}
          onPress={onActionButtonPress}
          style={styles.emptyButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    width: 200,
  },
});

export default AppEmptyState;
