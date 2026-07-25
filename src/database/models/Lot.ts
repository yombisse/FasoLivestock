import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Lot extends Model {
  static table = 'lots';

  @field('farm_id') farm_id!: string;
  @field('nom_lot') nom_lot!: string;
  @field('nombre') nombre!: number;
  @field('description') description?: string;
  @field('espece_id') espece_id?: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}
