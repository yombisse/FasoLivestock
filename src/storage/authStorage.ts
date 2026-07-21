import AsyncStorage from '@react-native-async-storage/async-storage';
import { farmStorage } from './farmStorage';

// Fonctions utilitaires pour le stockage des tokens et données utilisateur
export const authStorage = {
  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing token:', error);
      throw error;
    }
  },

  async setUser(user: any): Promise<void> {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  },

  async getUser(): Promise<any> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  },

  async clearAuth(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      await farmStorage.removeActiveFarm();
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item:', error);
      throw error;
    }
  },

  async getUserId(): Promise<string> {
    try {
      const user = await this.getUser();
      return user?.id || 'system_user';
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'system_user';
    }
  },
};
