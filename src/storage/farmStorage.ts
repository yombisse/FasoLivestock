import AsyncStorage from '@react-native-async-storage/async-storage';
import { Farm } from '../types/farm.types';
import database from '../database/watermelonIndex';
import { Q } from '@nozbe/watermelondb';

const ACTIVE_FARM_KEY = 'active_farm_id';

export const farmStorage = {
  async setActiveFarm(farm: Farm): Promise<void> {
    try {
      await AsyncStorage.setItem(ACTIVE_FARM_KEY, farm.id);
      console.log('[farmStorage] Active farm ID stored:', farm.id);
    } catch (error) {
      console.error('Error saving active farm ID:', error);
      throw error;
    }
  },

  async getActiveFarm(): Promise<Farm | null> {
    try {
      const farmId = await AsyncStorage.getItem(ACTIVE_FARM_KEY);
      if (!farmId) {
        console.log('[farmStorage] No active farm ID found in storage');
        return null;
      }

      console.log('[farmStorage] Looking for farm API ID in WatermelonDB:', farmId);
      const farms = await database.get('farms').query(Q.where('api_id', farmId)).fetch();
      console.log('[farmStorage] WatermelonDB query returned:', farms.length, 'farms');
      
      if (farms.length === 0) {
        console.warn('[farmStorage] Farm API ID found in storage but not in WatermelonDB:', farmId);
        
        // Debug: list all farms in database
        const allFarms = await database.get('farms').query().fetch();
        console.log('[farmStorage] All farms in database:', allFarms.length);
        allFarms.forEach((f: any) => {
          console.log('[farmStorage] Farm in DB - WatermelonDB ID:', f.id, 'API ID:', f.api_id, 'Name:', f.name);
        });
        
        await AsyncStorage.removeItem(ACTIVE_FARM_KEY);
        return null;
      }

      const farm = farms[0] as any;
      return {
        id: farm.api_id, // Return API ID for compatibility
        name: farm.name,
        location: farm.location,
        description: farm.description,
        type_elevage: farm.type_elevage,
        photo: farm.photo,
        owner_id: farm.owner_id,
        status: farm.status,
        last_sync_at: farm.lastSyncAt?.toISOString(),
        created_at: farm.createdAt?.toISOString(),
        updated_at: farm.updatedAt?.toISOString(),
      };
    } catch (error) {
      console.error('Error getting active farm:', error);
      return null;
    }
  },

  async removeActiveFarm(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACTIVE_FARM_KEY);
      console.log('[farmStorage] Active farm ID removed');
    } catch (error) {
      console.error('Error removing active farm:', error);
      throw error;
    }
  },
};
