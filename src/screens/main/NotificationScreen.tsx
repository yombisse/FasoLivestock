import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppText from '../../components/AppText';
import AppHeader from '../../components/AppHeader';
import AppEmptyState from '../../components/AppEmptyState';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../../config/colors';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
}

const NotificationScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler le chargement des notifications
    // À remplacer par un vrai appel API ou WatermelonDB
    setTimeout(() => {
      setNotifications([
        {
          id: '1',
          title: 'Synchronisation réussie',
          message: 'Vos données ont été synchronisées avec succès',
          type: 'success',
          createdAt: new Date().toISOString(),
          read: false,
        },
        {
          id: '2',
          title: 'Rappel vaccination',
          message: 'Certains animaux nécessitent une vaccination',
          type: 'warning',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          read: false,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert';
      case 'error':
        return 'alert-circle';
      default:
        return 'information';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#2E7D32';
      case 'warning':
        return '#F57C00';
      case 'error':
        return '#D32F2F';
      default:
        return '#1976D2';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR');
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getNotificationColor(item.type)}20` }]}>
        <MaterialCommunityIcons
          name={getNotificationIcon(item.type)}
          size={24}
          color={getNotificationColor(item.type)}
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <AppText style={styles.notificationTitle} fontWeight="600">
            {item.title}
          </AppText>
          <AppText style={styles.notificationTime} color="#757575" fontSize={12}>
            {formatTime(item.createdAt)}
          </AppText>
        </View>
        <AppText style={styles.notificationMessage} color="#616161" fontSize={14}>
          {item.message}
        </AppText>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <AppEmptyState
      message="Aucune notification"
      subMessage="Vous n'avez pas de nouvelles notifications"
      icon="bell-outline"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Notifications"
        showBackButton
        onBackPress={() => navigation.goBack()}
        showBackground={false}
        style={styles.header}
      />

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons name="loading" size={48} color="#2E7D32" />
            <AppText style={styles.loadingText}>Chargement...</AppText>
          </View>
        ) : notifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#30A15E',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Theme.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  unreadCard: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#30A15E',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#212121',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30A15E',
    marginLeft: 8,
  },
});

export default NotificationScreen;
