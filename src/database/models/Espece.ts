import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Espece extends Model {
  static table = 'especes';

  @field('api_id') api_id?: string;
  @field('nom') nom!: string;
  @field('description') description!: string;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}
