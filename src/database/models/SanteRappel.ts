import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { Animal } from './Animal';
import { Farm } from './Farm';

export class SanteRappel extends Model {
  static table = 'sante_rappels';

  @field('farm_id') farm_id!: string;
  @field('animal_id') animal_id!: string;
  @field('type_rappel') type_rappel!: string;
  @field('date_prevue') date_prevue!: string;
  @field('date_realisee') date_realisee!: string;
  @field('statut') statut!: string;
  @field('note') note!: string;
  @field('evenement_id') evenement_id!: string;
  @field('sync_status') sync_status!: string;
  @field('last_modified_by') last_modified_by!: string;
  @field('version') version!: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @readonly @date('deleted_at') deletedAt!: Date;

  @relation('animals', 'animal_id') animal!: any;
  @relation('farms', 'farm_id') farm!: any;
}
