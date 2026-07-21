import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { Animal } from './Animal';

export class Evenement extends Model {
  static table = 'evenements';

  @field('date_evenement') date_evenement!: string;
  @field('statut') statut!: string;
  @field('date_fin') date_fin!: string;
  @field('categorie') categorie!: string;
  @field('farm_id') farm_id!: string;
  @field('animal_id') animal_id!: string;
  @field('type_evenement_id') type_evenement_id!: string;
  @field('description') description!: string;
  @field('cout') cout!: number;
  @field('farm_destination_id') farm_destination_id!: string;
  @field('statut_avant') statut_avant!: string;
  @field('statut_apres') statut_apres!: string;
  @field('transaction_id') transaction_id!: string;
  @field('metadonnees') metadonnees!: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict' | 'failed';
  @field('sync_error') sync_error?: string;
  @field('last_push_attempt_at') last_push_attempt_at?: number;
  @field('server_confirmed_at') server_confirmed_at?: number;
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;

  @relation('animals', 'animal_id') animal!: any;
}
