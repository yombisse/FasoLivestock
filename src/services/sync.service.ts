import api from './api';
import database from '../database/watermelonIndex';
import { farmStorage } from '../storage/farmStorage';

interface InitialSyncResponse {
  success: boolean;
  message: string;
  data: {
    data: {
      farms: any[];
      farm_user: any[];
      especes: any[];
      categories: any[];
      type_evenements: any[];
    };
    synced_at: string;
  };
}

class SyncService {
  /**
   * Appeler l'endpoint /sync/initial pour la synchronisation initiale
   * Utilisé lors du premier lancement, réinitialisation, ou erreur 403/404
   */
  async initialSync(): Promise<InitialSyncResponse> {
    try {
      console.log('[SyncService] Calling /sync/initial');
      const response = await api.post<InitialSyncResponse>('/sync/initial');
      console.log('[SyncService] Initial sync response:', response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Initial sync failed');
      }

      const { farms, farm_user, especes, categories, type_evenements } = response.data.data.data;
      
      // Deduplicate farms by ID to prevent UNIQUE constraint violations
      const uniqueFarms = farms.filter((farm, index, self) =>
        index === self.findIndex(f => f.id === farm.id)
      );
      if (uniqueFarms.length !== farms.length) {
        console.warn(`[SyncService] Deduplicated farms: ${farms.length} -> ${uniqueFarms.length} (removed ${farms.length - uniqueFarms.length} duplicates)`);
      }
      
      // Stocker les données dans WatermelonDB
      await database.write(async () => {
        // Nettoyer les anciennes données avec suppression manuelle robuste
        const tablesToClean = ['farms', 'farm_user', 'especes', 'categories', 'type_evenements'];
        for (const tableName of tablesToClean) {
          const records = await database.get(tableName).query().fetch();
          for (const record of records) {
            await record.destroyPermanently();
          }
          console.log(`[SyncService] Cleaned ${records.length} records from ${tableName}`);
        }

        console.log('[SyncService] Inserting farms:', uniqueFarms.length);
        for (const farm of uniqueFarms) {
          console.log('[SyncService] Inserting farm:', farm.id, farm.name);
          const createdFarm = await database.get('farms').create((f: any) => {
            f._raw.id = farm.id; // id serveur = id local, aucune distinction
            f.name = farm.name;
            f.location = farm.location;
            f.description = farm.description;
            f.type_elevage = farm.type_elevage;
            f.photo = farm.photo;
            f.owner_id = farm.owner_id;
            f.status = farm.status;
            f.last_modified_by = farm.last_modified_by || '';
            // createdAt, updatedAt, deletedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created farm with ID:', createdFarm.id, '(server ID)');
          console.log('[SyncService] Expected ID:', farm.id, 'Actual ID:', createdFarm.id, 'Match:', createdFarm.id === farm.id);
          
          // Verify the ID was correctly set by fetching again
          const fetchedFarm = await database.get('farms').find(createdFarm.id);
          console.log('[SyncService] Fetched farm ID after creation:', fetchedFarm.id);
        }
        
        // Verify farms were inserted
        const insertedFarms = await database.get('farms').query().fetch();
        console.log('[SyncService] Farms after insertion:', insertedFarms.length);
        insertedFarms.forEach((f: any) => {
          console.log('[SyncService] Farm in DB after insertion - ID:', f.id, 'Name:', f.name);
        });

        console.log('[SyncService] Inserting farm_user:', farm_user.length);
        for (const membership of farm_user) {
          const createdFarmUser = await database.get('farm_user').create((f: any) => {
            f._raw.id = membership.id; // id serveur = id local, aucune distinction
            f.farm_id = membership.farm_id;
            f.user_id = membership.user_id;
            f.role = membership.role;
            f.last_modified_by = membership.last_modified_by || '';
            // createdAt, updatedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created farm_user with ID:', createdFarmUser.id, '(server ID)');
        }

        console.log('[SyncService] Inserting especes:', especes.length);
        for (const espece of especes) {
          console.log('[SyncService] Inserting espece:', espece.id, espece.nom);
          const createdEspece = await database.get('especes').create((e: any) => {
            e._raw.id = espece.id; // id serveur = id local, aucune distinction
            e.nom = espece.nom;
            e.description = espece.description;
            e.last_modified_by = espece.last_modified_by || '';
            // createdAt, updatedAt, deletedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created espece with ID:', createdEspece.id, '(server ID)');
        }
        
        // Verify especes were inserted
        const insertedEspeces = await database.get('especes').query().fetch();
        console.log('[SyncService] Especes after insertion:', insertedEspeces.length);
        insertedEspeces.forEach((e: any) => {
          console.log('[SyncService] Espece in DB after insertion - ID:', e.id, 'Name:', e.nom);
        });

        console.log('[SyncService] Inserting categories:', categories.length);
        for (const categorie of categories) {
          const createdCategorie = await database.get('categories').create((c: any) => {
            c._raw.id = categorie.id; // id serveur = id local, aucune distinction
            c.nom_categorie = categorie.nom_categorie;
            c.type = categorie.type;
            c.description = categorie.description;
            c.farm_id = categorie.farm_id || '';
            c.last_modified_by = categorie.last_modified_by || '';
            // createdAt, updatedAt, deletedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created categorie with ID:', createdCategorie.id, '(server ID)');
        }
        
        // Verify categories were inserted
        const insertedCategories = await database.get('categories').query().fetch();
        console.log('[SyncService] Categories after insertion:', insertedCategories.length);
        insertedCategories.forEach((c: any) => {
          console.log('[SyncService] Categorie in DB after insertion - ID:', c.id, 'Name:', c.nom_categorie);
        });

        console.log('[SyncService] Inserting type_evenements:', type_evenements.length);
        for (const typeEvenement of type_evenements) {
          const createdTypeEvenement = await database.get('type_evenements').create((t: any) => {
            t._raw.id = typeEvenement.id; // id serveur = id local, aucune distinction
            t.nom_type = typeEvenement.nom_type;
            t.description = typeEvenement.description || '';
            t.categorie = typeEvenement.categorie;
            t.farm_id = typeEvenement.farm_id || '';
            t.is_system = typeEvenement.is_system ? 1 : 0;
            t.last_modified_by = typeEvenement.last_modified_by || '';
            // createdAt, updatedAt, deletedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created type_evenement with ID:', createdTypeEvenement.id, '(server ID)');
        }
        
        // Verify type_evenements were inserted
        const insertedTypeEvenements = await database.get('type_evenements').query().fetch();
        console.log('[SyncService] Type_evenements after insertion:', insertedTypeEvenements.length);
        insertedTypeEvenements.forEach((t: any) => {
          console.log('[SyncService] Type_evenement in DB after insertion - ID:', t.id, 'Name:', t.nom_type);
        });
      });

      // Resynchronize AsyncStorage with newly inserted farms to prevent stale farm_id
      console.log('[SyncService] Resynchronizing AsyncStorage with fresh farm data');
      const activeFarm = await farmStorage.getActiveFarm();
      if (activeFarm) {
        const farmExistsInNewData = uniqueFarms.some(f => f.id === activeFarm.id);
        if (farmExistsInNewData) {
          console.log('[SyncService] Active farm ID still valid, no change needed');
        } else {
          console.log('[SyncService] Active farm ID no longer valid, updating AsyncStorage');
          if (uniqueFarms.length === 1) {
            console.log('[SyncService] Only one farm available, setting it as active');
            await farmStorage.setActiveFarm(uniqueFarms[0]);
          } else if (uniqueFarms.length > 1) {
            console.log('[SyncService] Multiple farms available, clearing active farm to force selection');
            await farmStorage.removeActiveFarm();
          } else {
            console.warn('[SyncService] No farms available after sync');
          }
        }
      } else {
        console.log('[SyncService] No active farm in AsyncStorage, nothing to resynchronize');
      }

      console.log('[SyncService] Initial sync completed successfully');
      return response.data;
    } catch (error: any) {
      console.error('[SyncService] Initial sync failed:', error);
      throw error;
    }
  }

  /**
   * Valider si un ID de ferme existe dans la base locale ou via l'API
   */
  async validateFarmId(farmId: string): Promise<boolean> {
    try {
      // Vérifier si la ferme existe localement
      const localFarm = await database.get('farms').query().fetch();
      const existsLocally = localFarm.some(f => f.id === farmId);
      
      if (existsLocally) {
        return true;
      }

      // Si pas trouvée localement, vérifier via initial sync
      console.log('[SyncService] Farm not found locally, triggering initial sync');
      await this.initialSync();
      
      // Vérifier à nouveau après le sync
      const updatedFarms = await database.get('farms').query().fetch();
      return updatedFarms.some(f => f.id === farmId);
    } catch (error) {
      console.error('[SyncService] Error validating farm ID:', error);
      return false;
    }
  }
}

export default new SyncService();
