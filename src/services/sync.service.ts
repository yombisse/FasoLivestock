import api from './api';
import database from '../database/watermelonIndex';

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
      
      // Stocker les données dans WatermelonDB
      await database.write(async () => {
        // Nettoyer les anciennes données
        await database.get('farms').query().destroyAllPermanently();
        await database.get('farm_user').query().destroyAllPermanently();
        await database.get('especes').query().destroyAllPermanently();
        await database.get('categories').query().destroyAllPermanently();
        await database.get('type_evenements').query().destroyAllPermanently();

        console.log('[SyncService] Inserting farms:', farms.length);
        for (const farm of farms) {
          console.log('[SyncService] Inserting farm:', farm.id, farm.name);
          const createdFarm = await database.get('farms').create((f: any) => {
            f.api_id = farm.id; // Store API ID in api_id field
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
          console.log('[SyncService] Created farm with WatermelonDB ID:', createdFarm.id, 'API ID:', farm.id);
        }
        
        // Verify farms were inserted
        const insertedFarms = await database.get('farms').query().fetch();
        console.log('[SyncService] Farms after insertion:', insertedFarms.length);
        insertedFarms.forEach((f: any) => {
          console.log('[SyncService] Farm in DB after insertion - WatermelonDB ID:', f.id, 'API ID:', f.api_id, 'Name:', f.name);
        });

        console.log('[SyncService] Inserting farm_user:', farm_user.length);
        for (const membership of farm_user) {
          const createdFarmUser = await database.get('farm_user').create((f: any) => {
            f.api_id = membership.id; // Store API ID in api_id field
            f.farm_id = membership.farm_id;
            f.user_id = membership.user_id;
            f.role = membership.role;
            f.last_modified_by = membership.last_modified_by || '';
            // createdAt, updatedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created farm_user with WatermelonDB ID:', createdFarmUser.id, 'API ID:', membership.id);
        }

        console.log('[SyncService] Inserting especes:', especes.length);
        for (const espece of especes) {
          console.log('[SyncService] Inserting espece:', espece.id, espece.nom);
          const createdEspece = await database.get('especes').create((e: any) => {
            e.api_id = espece.id; // Store API ID in api_id field
            e.nom = espece.nom;
            e.description = espece.description;
            e.last_modified_by = espece.last_modified_by || '';
            // createdAt, updatedAt, deletedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created espece with WatermelonDB ID:', createdEspece.id, 'API ID:', espece.id);
        }
        
        // Verify especes were inserted
        const insertedEspeces = await database.get('especes').query().fetch();
        console.log('[SyncService] Especes after insertion:', insertedEspeces.length);
        insertedEspeces.forEach((e: any) => {
          console.log('[SyncService] Espece in DB after insertion - WatermelonDB ID:', e.id, 'API ID:', e.api_id, 'Name:', e.nom);
        });

        console.log('[SyncService] Inserting categories:', categories.length);
        for (const categorie of categories) {
          const createdCategorie = await database.get('categories').create((c: any) => {
            c.api_id = categorie.id; // Store API ID in api_id field
            c.nom_categorie = categorie.nom_categorie;
            c.type = categorie.type;
            c.description = categorie.description;
            c.farm_id = categorie.farm_id || '';
            c.last_modified_by = categorie.last_modified_by || '';
            // createdAt, updatedAt, deletedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created categorie with WatermelonDB ID:', createdCategorie.id, 'API ID:', categorie.id);
        }
        
        // Verify categories were inserted
        const insertedCategories = await database.get('categories').query().fetch();
        console.log('[SyncService] Categories after insertion:', insertedCategories.length);
        insertedCategories.forEach((c: any) => {
          console.log('[SyncService] Categorie in DB after insertion - WatermelonDB ID:', c.id, 'API ID:', c.api_id, 'Name:', c.nom_categorie);
        });

        console.log('[SyncService] Inserting type_evenements:', type_evenements.length);
        for (const typeEvenement of type_evenements) {
          const createdTypeEvenement = await database.get('type_evenements').create((t: any) => {
            t.api_id = typeEvenement.id; // Store API ID in api_id field
            t.nom_type = typeEvenement.nom_type;
            t.description = typeEvenement.description || '';
            t.categorie = typeEvenement.categorie;
            t.farm_id = typeEvenement.farm_id || '';
            t.is_system = typeEvenement.is_system ? 1 : 0;
            t.last_modified_by = typeEvenement.last_modified_by || '';
            // createdAt, updatedAt, deletedAt are @readonly and managed by WatermelonDB
          });
          console.log('[SyncService] Created type_evenement with WatermelonDB ID:', createdTypeEvenement.id, 'API ID:', typeEvenement.id);
        }
        
        // Verify type_evenements were inserted
        const insertedTypeEvenements = await database.get('type_evenements').query().fetch();
        console.log('[SyncService] Type_evenements after insertion:', insertedTypeEvenements.length);
        insertedTypeEvenements.forEach((t: any) => {
          console.log('[SyncService] Type_evenement in DB after insertion - WatermelonDB ID:', t.id, 'API ID:', t.api_id, 'Name:', t.nom_type);
        });
      });

      console.log('[SyncService] Initial sync completed successfully');
      return response.data;
    } catch (error: any) {
      console.error('[SyncService] Initial sync failed:', error);
      
      // Check if it's a SQLite migration error (missing api_id column)
      if (error.message && error.message.includes('no column named api_id')) {
        console.error('[SyncService] Schema migration error detected - api_id column missing');
        // Re-throw with identifiable message for AppNavigator to handle
        throw new Error('SCHEMA_MIGRATION_REQUIRED: ' + error.message);
      }
      
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
