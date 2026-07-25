import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Categorie extends Model {
  static table = 'categories';

  @field('nom_categorie') nom_categorie!: string;
  @field('type') type!: string;
  @field('description') description!: string;
  @field('farm_id') farm_id?: string;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;
}
