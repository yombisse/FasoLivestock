import React from 'react';
import { View, StyleSheet, TouchableOpacity, TextStyle, ScrollView } from 'react-native';
import AppText from './AppText';

export interface TabOption {
  id: string;
  label: string;
  count?: number;
}

interface AppTabProps {
  options: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  style?: any;
  tabStyle?: any;
  textStyle?: TextStyle;
  activeTextStyle?: TextStyle;
}

const AppTab: React.FC<AppTabProps> = ({ 
  options, 
  activeTab, 
  onTabChange, 
  style,
  tabStyle,
  textStyle,
  activeTextStyle
}) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[styles.tab, activeTab === option.id && styles.tabActive, tabStyle]}
          onPress={() => onTabChange(option.id)}
        >
          <AppText style={[styles.tabText, activeTab === option.id && styles.tabTextActive, textStyle, activeTab === option.id && activeTextStyle]}>
            {option.label}
            {option.count !== undefined && ` (${option.count})`}
          </AppText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    minWidth: 80,
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#2D6A4F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#2D6A4F',
    fontWeight: '600',
  },
});

export default AppTab;
