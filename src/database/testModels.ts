import database from './watermelonIndex';
import { Animal } from './models/Animal';
import { Evenement } from './models/Evenement';
import { Transaction } from './models/Transaction';
import { Espece } from './models/Espece';
import { Categorie } from './models/Categorie';
import { TypeEvenement } from './models/TypeEvenement';
import { Lot } from './models/Lot';
import { Farm } from './models/Farm';
import { Naissance } from './models/Naissance';
import { Notification } from './models/Notification';

export async function testWatermelonModels() {
  console.log('[WatermelonDB Test] Starting model tests...');

  try {
    await database.write(async () => {
      // Test Farm
      const farm = await database.get('farms').create((farm: any) => {
        farm.name = 'Test Farm';
        farm.location = 'Test Location';
        farm.description = 'Test Description';
        farm.type_elevage = 'bovin';
        farm.owner_id = 'user_123';
        farm.status = 'active';
        farm.createdAt = new Date();
        farm.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Farm created:', farm.id);

      // Test Espece
      const espece = await database.get('especes').create((espece: any) => {
        espece.nom = 'Bovin';
        espece.description = 'Espèce bovine';
        espece.createdAt = new Date();
        espece.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Espece created:', espece.id);

      // Test Categorie
      const categorie = await database.get('categories').create((cat: any) => {
        cat.nom_categorie = 'Alimentation';
        cat.type = 'DEPENSE';
        cat.description = 'Catégorie alimentation';
        cat.farm_id = farm.id;
        cat.createdAt = new Date();
        cat.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Categorie created:', categorie.id);

      // Test TypeEvenement
      const typeEvenement = await database.get('type_evenements').create((type: any) => {
        type.nom_type = 'Achat';
        type.description = 'Type événement achat';
        type.categorie = 'MOUVEMENT';
        type.farm_id = farm.id;
        type.is_system = 0;
        type.createdAt = new Date();
        type.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] TypeEvenement created:', typeEvenement.id);

      // Test Lot
      const lot = await database.get('lots').create((lot: any) => {
        lot.farm_id = farm.id;
        lot.nom_lot = 'Lot Test';
        lot.nombre = 10;
        lot.description = 'Lot de test';
        lot.espece_id = espece.id;
        lot.createdAt = new Date();
        lot.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Lot created:', lot.id);

      // Test Animal
      const animal = await database.get('animals').create((anim: any) => {
        anim.numero_identification = 'TEST001';
        anim.sexe = 'MALE';
        anim.statut = 'SAIN';
        anim.date_naissance = '2020-01-01';
        anim.poids = 250;
        anim.farm_id = farm.id;
        anim.espece_id = espece.id;
        anim.lot_id = lot.id;
        anim.nom = 'Test Animal';
        anim.race = 'Zébu';
        anim.etat_sante = 'SAIN';
        anim.createdAt = new Date();
        anim.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Animal created:', animal.id);

      // Test Evenement
      const evenement = await database.get('evenements').create((evt: any) => {
        evt.date_evenement = '2024-01-01';
        evt.categorie = 'MOUVEMENT';
        evt.farm_id = farm.id;
        evt.animal_id = animal.id;
        evt.type_evenement_id = typeEvenement.id;
        evt.statut_avant = 'SAIN';
        evt.statut_apres = 'SAIN';
        evt.createdAt = new Date();
        evt.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Evenement created:', evenement.id);

      // Test Transaction
      const transaction = await database.get('transactions').create((trx: any) => {
        trx.type_transaction = 'ENTREE';
        trx.montant = 5000;
        trx.date_transaction = '2024-01-01';
        trx.description = 'Test transaction';
        trx.farm_id = farm.id;
        trx.animal_id = animal.id;
        trx.evenement_id = evenement.id;
        trx.categorie_id = categorie.id;
        trx.createdAt = new Date();
        trx.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Transaction created:', transaction.id);

      // Test Naissance
      const naissance = await database.get('naissances').create((nais: any) => {
        nais.farm_id = farm.id;
        nais.mother_id = animal.id;
        nais.date_naissance = '2024-01-01';
        nais.nombre_petits = 1;
        nais.poids_naissance = 25;
        nais.observation = 'Naissance test';
        nais.createdAt = new Date();
        nais.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Naissance created:', naissance.id);

      // Test Notification
      const notification = await database.get('notifications').create((notif: any) => {
        notif.farm_id = farm.id;
        notif.animal_id = animal.id;
        notif.titre = 'Test Notification';
        notif.message = 'Message de test';
        notif.type = 'INFO';
        notif.createdAt = new Date();
        notif.updatedAt = new Date();
      });
      console.log('[WatermelonDB Test] Notification created:', notification.id);

      // Test relations
      console.log('[WatermelonDB Test] Testing relations...');
      const animalWithRelations = await database.get('animals').find(animal.id);
      const evenements = await animalWithRelations.evenements.fetch();
      const transactions = await animalWithRelations.transactions.fetch();
      
      console.log('[WatermelonDB Test] Animal evenements count:', evenements.length);
      console.log('[WatermelonDB Test] Animal transactions count:', transactions.length);

      // Clean up test data
      await database.get('notifications').find(notification.id).then(n => n.destroyPermanently());
      await database.get('naissances').find(naissance.id).then(n => n.destroyPermanently());
      await database.get('transactions').find(transaction.id).then(t => t.destroyPermanently());
      await database.get('evenements').find(evenement.id).then(e => e.destroyPermanently());
      await database.get('animals').find(animal.id).then(a => a.destroyPermanently());
      await database.get('lots').find(lot.id).then(l => l.destroyPermanently());
      await database.get('type_evenements').find(typeEvenement.id).then(t => t.destroyPermanently());
      await database.get('categories').find(categorie.id).then(c => c.destroyPermanently());
      await database.get('especes').find(espece.id).then(e => e.destroyPermanently());
      await database.get('farms').find(farm.id).then(f => f.destroyPermanently());

      console.log('[WatermelonDB Test] All tests passed!');
    });
  } catch (error) {
    console.error('[WatermelonDB Test] Error:', error);
    throw error;
  }
}
