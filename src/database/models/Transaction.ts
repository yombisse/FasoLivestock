import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { Animal } from './Animal';

export class Transaction extends Model {
  static table = 'transactions';

  @field('type_transaction') type_transaction!: string;
  @field('montant') montant!: number;
  @field('date_transaction') date_transaction!: string;
  @field('description') description!: string;
  @field('farm_id') farm_id!: string;
  @field('animal_id') animal_id!: string;
  @field('evenement_id') evenement_id!: string;
  @field('categorie_id') categorie_id!: string;
  @field('user_id') user_id!: string;
  @field('tiers') tiers!: string;
  @field('numero_transaction') numero_transaction!: string;
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
