import { getDatabase } from '../connection';

export interface DashboardStats {
  total_animaux: number;
  animaux_actifs: number;
  total_evenements: number;
  animaux_males: number;
  animaux_femelles: number;
}

export async function getDashboardStats(farmId: string): Promise<DashboardStats> {
  const db = await getDatabase();
  
  // Get total animals count
  const totalAnimalsResult = await db.execute(
    `SELECT COUNT(*) as count FROM animals WHERE farm_id = ? AND deleted_at IS NULL`,
    [farmId]
  );
  const totalAnimals = totalAnimalsResult?.rows?.[0]?.count || 0;
  
  // Get active animals count
  const activeAnimalsResult = await db.execute(
    `SELECT COUNT(*) as count FROM animals WHERE farm_id = ? AND statut = 'ACTIF' AND deleted_at IS NULL`,
    [farmId]
  );
  const activeAnimals = activeAnimalsResult?.rows?.[0]?.count || 0;
  
  // Get events count
  const eventsResult = await db.execute(
    `SELECT COUNT(*) as count FROM evenements WHERE farm_id = ? AND deleted_at IS NULL`,
    [farmId]
  );
  const totalEvents = eventsResult?.rows?.[0]?.count || 0;
  
  // Get gender breakdown
  const malesResult = await db.execute(
    `SELECT COUNT(*) as count FROM animals WHERE farm_id = ? AND sexe = 'male' AND deleted_at IS NULL`,
    [farmId]
  );
  const malesCount = malesResult?.rows?.[0]?.count || 0;
  
  const femalesResult = await db.execute(
    `SELECT COUNT(*) as count FROM animals WHERE farm_id = ? AND sexe = 'femelle' AND deleted_at IS NULL`,
    [farmId]
  );
  const femalesCount = femalesResult?.rows?.[0]?.count || 0;
  
  return {
    total_animaux: totalAnimals,
    animaux_actifs: activeAnimals,
    total_evenements: totalEvents,
    animaux_males: malesCount,
    animaux_femelles: femalesCount,
  };
}
