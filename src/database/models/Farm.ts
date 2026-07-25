import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Farm extends Model {
  static table = 'farms';

  @field('name') name!: string;
  @field('location') location!: string;
  @field('description') description!: string;
  @field('type_elevage') type_elevage!: string;
  @field('photo') photo!: string;
  @field('owner_id') owner_id!: string;
  @field('status') status!: string;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('last_sync_at') lastSyncAt!: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}
