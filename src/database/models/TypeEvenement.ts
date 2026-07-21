import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class TypeEvenement extends Model {
  static table = 'type_evenements';

  @field('api_id') api_id?: string;
  @field('nom_type') nom_type!: string;
  @field('description') description!: string;
  @field('categorie') categorie!: string;
  @field('farm_id') farm_id?: string;
  @field('is_system') is_system?: number | boolean;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}
