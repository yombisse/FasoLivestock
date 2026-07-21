import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

// ============================================================================
// MODELS
// ============================================================================

/**
 * MODELES DE REFERENCE (READ-ONLY)
 * Ces modèles sont synchronisés depuis le serveur uniquement.
 * Les modifications locales ne sont pas pushées vers le serveur.
 * 
 * Tables de référence :
 * - Espece : Espèces d'animaux (bovin, ovin, caprin, etc.)
 * - Categorie : Catégories financières (revenus/dépenses)
 * - TypeEvenement : Types d'événements (vente, achat, décès, etc.)
 * - Farm : Fermes (données de structure)
 * - FarmUser : Relations utilisateurs-fermes
 * - Lot : Lots d'animaux
 * - Notification : Notifications système
 * 
 * Pour les catégories système, utiliser CategorieSystemeIds constants.
 * Pour les types d'événements système, utiliser TypeEvenementIds constants.
 */

export class Animal extends Model {
  static table = 'animals';

  @field('numero_identification') numero_identification?: string;
  @field('sexe') sexe?: string;
  @field('statut') statut!: string;
  @field('date_naissance') date_naissance?: string;
  @field('poids') poids?: number;
  @field('farm_id') farm_id!: string;
  @field('espece_id') espece_id!: string;
  @field('lot_id') lot_id?: string;
  @field('mother_id') mother_id?: string;
  @field('nom') nom?: string;
  @field('race') race?: string;
  @field('photo') photo?: string;
  @field('naissance_id') naissance_id?: string;
  @field('origine') origine?: string;
  @field('farm_source_id') farm_source_id?: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class Evenement extends Model {
  static table = 'evenements';

  @field('date_evenement') date_evenement!: string;
  @field('categorie') categorie?: string;
  @field('farm_id') farm_id!: string;
  @field('animal_id') animal_id!: string;
  @field('type_evenement_id') type_evenement_id!: string;
  @field('description') description?: string;
  @field('metadonnees') metadonnees?: string;
  @field('cout') cout?: number;
  @field('farm_destination_id') farm_destination_id?: string;
  @field('statut_avant') statut_avant?: string;
  @field('statut_apres') statut_apres?: string;
  @field('transaction_id') transaction_id?: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class Transaction extends Model {
  static table = 'transactions';

  @field('numero_transaction') numero_transaction?: string;
  @field('type_transaction') type_transaction!: string;
  @field('montant') montant!: number;
  @field('date_transaction') date_transaction!: string;
  @field('description') description?: string;
  @field('farm_id') farm_id!: string;
  @field('animal_id') animal_id?: string;
  @field('evenement_id') evenement_id?: string;
  @field('categorie_id') categorie_id?: string;
  @field('user_id') user_id!: string;
  @field('tiers') tiers?: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class Espece extends Model {
  static table = 'especes';

  @field('nom') nom!: string;
  @field('description') description?: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class Categorie extends Model {
  static table = 'categories';

  @field('nom_categorie') nom_categorie!: string;
  @field('type') type?: string;
  @field('description') description?: string;
  @field('is_system') is_system?: number | boolean;
  @field('farm_id') farm_id?: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class TypeEvenement extends Model {
  static table = 'type_evenements';

  @field('nom_type') nom_type!: string;
  @field('description') description?: string;
  @field('categorie') categorie!: string;
  @field('is_system') is_system?: number | boolean;
  @field('farm_id') farm_id?: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class Lot extends Model {
  static table = 'lots';

  @field('farm_id') farm_id!: string;
  @field('nom_lot') nom_lot!: string;
  @field('nombre') nombre!: number;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class Farm extends Model {
  static table = 'farms';

  @field('name') name!: string;
  @field('location') location?: string;
  @field('description') description?: string;
  @field('type_elevage') type_elevage?: string;
  @field('owner_id') owner_id!: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class Naissance extends Model {
  static table = 'naissances';

  @field('farm_id') farm_id!: string;
  @field('mother_id') mother_id!: string;
  @field('date_naissance') date_naissance!: string;
  @field('nombre_petits') nombre_petits!: number;
  @field('poids_naissance') poids_naissance?: number;
  @field('observation') observation?: string;
  @field('evenement_id') evenement_id?: string;
  @field('date_saillie') date_saillie?: string;
  @field('pere_id') pere_id?: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class Notification extends Model {
  static table = 'notifications';

  @field('farm_id') farm_id?: string;
  @field('animal_id') animal_id?: string;
  @field('titre') titre?: string;
  @field('message') message!: string;
  @readonly @date('sent_at') sentAt?: Date;
  @field('evenement_id') evenement_id?: string;
  @field('type') type!: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}

export class FarmUser extends Model {
  static table = 'farm_user';

  @field('farm_id') farm_id!: string;
  @field('user_id') user_id!: string;
  @field('role') role!: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
