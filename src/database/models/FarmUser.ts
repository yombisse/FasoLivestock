import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class FarmUser extends Model {
  static table = 'farm_user';

  @field('farm_id') farm_id!: string;
  @field('user_id') user_id!: string;
  @field('role') role!: string;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
