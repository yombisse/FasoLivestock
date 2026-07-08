import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import AppText from '../AppText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface ListItemCardProps {
  icon: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; color: string; backgroundColor: string };
  isActive?: boolean;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  footer?: React.ReactNode;
  imageUri?: string;
  accessibilityLabel?: string;
}

const ListItemCard: React.FC<ListItemCardProps> = ({
  icon,
  iconColor = '#2E7D32',
  iconBackgroundColor = '#E8F5E9',
  title,
  subtitle,
  badge,
  isActive,
  onPress,
  rightContent,
  footer,
  imageUri,
  accessibilityLabel,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessible={!!onPress}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole={onPress ? 'button' : 'none'}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.iconImage} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons name={icon} size={28} color={iconColor} />
          )}
        </View>
        <View style={styles.info}>
          <AppText style={styles.title} fontWeight="bold" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle && (
            <AppText style={styles.subtitle} color="#757575" numberOfLines={1}>
              {subtitle}
            </AppText>
          )}
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
            <AppText style={[styles.badgeText, { color: badge.color }]} fontSize={12}>
              {badge.label}
            </AppText>
          </View>
        )}
        {rightContent}
      </View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontWeight: '500',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
});

export default ListItemCard;
