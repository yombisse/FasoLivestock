import AsyncStorage from '@react-native-async-storage/async-storage';
import { Farm } from '../types/farm.types';

const ACTIVE_FARM_KEY = 'active_farm';

export const farmStorage = {
  async setActiveFarm(farm: Farm): Promise<void> {
    try {
      await AsyncStorage.setItem(ACTIVE_FARM_KEY, JSON.stringify(farm));
    } catch (error) {
      console.error('Error saving active farm:', error);
      throw error;
    }
  },

  async getActiveFarm(): Promise<Farm | null> {
    try {
      const farmStr = await AsyncStorage.getItem(ACTIVE_FARM_KEY);
      return farmStr ? JSON.parse(farmStr) : null;
    } catch (error) {
      console.error('Error getting active farm:', error);
      return null;
    }
  },

  async removeActiveFarm(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACTIVE_FARM_KEY);
    } catch (error) {
      console.error('Error removing active farm:', error);
      throw error;
    }
  },
};
