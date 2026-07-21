import database from '../watermelonIndex';
import { Q } from '@nozbe/watermelondb';

export interface Notification {
  id: string;
  farm_id?: string;
  animal_id?: string;
  titre?: string;
  message: string;
  sent_at?: number;
  evenement_id?: string;
  type: string;
  last_modified_by?: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function getLocalNotifications(farmId: string, animalId?: string): Promise<Notification[]> {
  if (animalId) {
    const notifications = await database.get('notifications')
      .query(Q.where('farm_id', farmId), Q.where('animal_id', animalId))
      .fetch();
    return notifications as unknown as Notification[];
  } else {
    const notifications = await database.get('notifications')
      .query(Q.where('farm_id', farmId))
      .fetch();
    return notifications as unknown as Notification[];
  }
}

export async function getLocalNotificationById(id: string): Promise<Notification | null> {
  try {
    const notifications = await database.get('notifications')
      .query(Q.where('id', id))
      .fetch();
    
    if (notifications.length > 0) {
      return notifications[0] as unknown as Notification;
    }
    return null;
  } catch (error) {
    console.error('[NotificationRepository] Error getting notification by ID:', error);
    return null;
  }
}
