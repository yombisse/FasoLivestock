import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Naissance extends Model {
  static table = 'naissances';

  @field('farm_id') farm_id!: string;
  @field('mother_id') mother_id!: string;
  @field('date_naissance') date_naissance!: string;
  @field('nombre_petits') nombre_petits!: number;
  @field('poids_naissance') poids_naissance!: number;
  @field('observation') observation!: string;
  @field('evenement_id') evenement_id!: string;
  @field('date_saillie') date_saillie!: string;
  @field('date_mise_bas_prevue') date_mise_bas_prevue?: string;
  @field('pere_id') pere_id!: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict' | 'failed';
  @field('sync_error') sync_error?: string;
  @field('last_push_attempt_at') last_push_attempt_at?: number;
  @field('server_confirmed_at') server_confirmed_at?: number;
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}
