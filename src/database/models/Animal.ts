import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children, relation } from '@nozbe/watermelondb/decorators';
import { Evenement } from './Evenement';
import { Transaction } from './Transaction';
import { Espece } from './Espece';

export class Animal extends Model {
  static table = 'animals';

  @field('numero_identification') numero_identification!: string;
  @field('sexe') sexe!: string;
  @field('statut') statut!: string;
  @field('date_naissance') date_naissance!: string;
  @field('poids') poids!: number;
  @field('farm_id') farm_id!: string;
  @field('espece_id') espece_id!: string;
  @field('categorie_id') categorie_id!: string;
  @field('lot_id') lot_id!: string;
  @field('mother_id') mother_id!: string;
  @field('nom') nom!: string;
  @field('race') race!: string;
  @field('photo') photo!: string;
  @field('naissance_id') naissance_id!: string;
  @field('origine') origine!: string;
  @field('etat_sante') etat_sante!: string;
  @field('farm_source_id') farm_source_id!: string;
  @field('sync_status') sync_status!: 'synced' | 'pending' | 'conflict';
  @field('version') version!: number;
  @field('last_modified_by') last_modified_by!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt!: Date;

  @children('evenements') evenements!: any;
  @children('transactions') transactions!: any;

  // Relations
  @relation('especes', 'espece_id') espece!: Espece;
}
