import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Notification extends Model {
  static table = 'notifications';

  @field('farm_id') farm_id!: string;
  @field('animal_id') animal_id!: string;
  @field('titre') titre!: string;
  @field('message') message!: string;
  @readonly @date('sent_at') sentAt!: Date;
  @field('evenement_id') evenement_id!: string;
  @field('type') type!: string;
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
