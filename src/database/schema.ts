export const SCHEMA_STATEMENTS: string[] = [
  // Tables Business

  // animals
  `CREATE TABLE IF NOT EXISTS animals (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    nom TEXT,
    race TEXT,
    sexe TEXT CHECK(sexe IN ('male', 'femelle')),
    date_naissance TEXT,
    poids REAL,
    statut TEXT CHECK(statut IN ('ACTIF', 'VENDU', 'MORT', 'PERDU')) DEFAULT 'ACTIF',
    espece_id TEXT NOT NULL,
    lot_id TEXT,
    mother_id TEXT,
    numero_identification TEXT,
    photo TEXT,
    naissance_id TEXT,
    origine TEXT,
    etat_sante TEXT CHECK(etat_sante IN ('SAIN', 'MALADE', 'QUARANTAINE')) DEFAULT 'SAIN',
    farm_source_id TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // transactions
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    type_transaction TEXT CHECK(type_transaction IN ('ENTREE', 'SORTIE', 'TRANSFERT', 'AJUSTEMENT')) DEFAULT 'ENTREE',
    montant REAL NOT NULL,
    date_transaction TEXT NOT NULL,
    user_id TEXT,
    animal_id TEXT,
    categorie_id TEXT,
    description TEXT,
    evenement_id TEXT,
    tiers TEXT,
    numero_transaction TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // evenements
  `CREATE TABLE IF NOT EXISTS evenements (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    type_evenement_id TEXT NOT NULL,
    animal_id TEXT NOT NULL,
    date_evenement TEXT NOT NULL,
    description TEXT,
    cout REAL,
    farm_destination_id TEXT,
    statut_avant TEXT CHECK(statut_avant IN ('ACTIF', 'VENDU', 'MORT', 'PERDU')),
    statut_apres TEXT CHECK(statut_apres IN ('ACTIF', 'VENDU', 'MORT', 'PERDU')),
    categorie TEXT CHECK(categorie IN ('MOUVEMENT', 'REPRODUCTION', 'SANITAIRE', 'AUTRE')),
    transaction_id TEXT,
    statut TEXT,
    date_fin TEXT,
    metadonnees TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // lots
  `CREATE TABLE IF NOT EXISTS lots (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    nom_lot TEXT NOT NULL,
    nombre INTEGER DEFAULT 0,
    description TEXT,
    espece_id TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    farm_id TEXT,
    animal_id TEXT,
    titre TEXT,
    message TEXT NOT NULL,
    sent_at TEXT,
    evenement_id TEXT,
    type TEXT CHECK(type IN ('VACCINATION', 'TRAITEMENT', 'NAISSANCE', 'MOUVEMENT', 'ALERTE', 'INFO')) DEFAULT 'INFO',
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // naissances
  `CREATE TABLE IF NOT EXISTS naissances (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    mother_id TEXT NOT NULL,
    date_naissance TEXT NOT NULL,
    nombre_petits INTEGER DEFAULT 0,
    poids_naissance REAL,
    observation TEXT,
    evenement_id TEXT,
    date_saillie TEXT,
    pere_id TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // sante_rappels
  `CREATE TABLE IF NOT EXISTS sante_rappels (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    animal_id TEXT NOT NULL,
    type_rappel TEXT NOT NULL,
    date_prevue TEXT NOT NULL,
    date_realisee TEXT,
    statut TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    note TEXT,
    evenement_id TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // farms
  `CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    type_elevage TEXT,
    photo TEXT,
    owner_id TEXT,
    status TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    last_sync_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  )`,

  // farm_user (pivot table for many-to-many relationship)
  `CREATE TABLE IF NOT EXISTS farm_user (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // Tables Reference

  // especes
  `CREATE TABLE IF NOT EXISTS especes (
    id TEXT PRIMARY KEY,
    nom TEXT UNIQUE NOT NULL,
    description TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // categories
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    nom_categorie TEXT UNIQUE NOT NULL,
    type TEXT CHECK(type IN ('REVENU', 'DEPENSE')),
    description TEXT,
    farm_id TEXT,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // type_evenements
  `CREATE TABLE IF NOT EXISTS type_evenements (
    id TEXT PRIMARY KEY,
    nom_type TEXT UNIQUE NOT NULL,
    description TEXT,
    categorie TEXT CHECK(categorie IN ('MOUVEMENT', 'REPRODUCTION', 'SANITAIRE')),
    farm_id TEXT,
    is_system INTEGER DEFAULT 0,
    sync_status TEXT CHECK(sync_status IN ('pending', 'synced', 'conflict')) DEFAULT 'synced',
    last_modified_by TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  )`,

  // Tables de synchronisation

  // sync_queue
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT CHECK(action IN ('create', 'update', 'delete')) NOT NULL,
    data TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'synced', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    synced_at TEXT
  )`,

  // sync_metadata
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY,
    last_sync_at TEXT,
    last_push_at TEXT,
    last_pull_at TEXT,
    farm_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    sync_token TEXT
  )`,

  // Indexes for animals
  `CREATE INDEX IF NOT EXISTS idx_animals_farm_id ON animals(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_espece_id ON animals(espece_id)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_lot_id ON animals(lot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_mother_id ON animals(mother_id)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_statut ON animals(statut)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_sync_status ON animals(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_animals_version ON animals(version)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_animals_farm_identification ON animals(farm_id, numero_identification)`,

  // Indexes for transactions
  `CREATE INDEX IF NOT EXISTS idx_transactions_farm_id ON transactions(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_animal_id ON transactions(animal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_categorie_id ON transactions(categorie_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date_transaction ON transactions(date_transaction)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date_transaction)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_sync_status ON transactions(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_version ON transactions(version)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_evenement_id ON transactions(evenement_id)`,

  // Indexes for evenements
  `CREATE INDEX IF NOT EXISTS idx_evenements_farm_id ON evenements(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evenements_type_evenement_id ON evenements(type_evenement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evenements_animal_id ON evenements(animal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evenements_date_evenement ON evenements(date_evenement)`,
  `CREATE INDEX IF NOT EXISTS idx_evenements_sync_status ON evenements(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_evenements_farm_destination_id ON evenements(farm_destination_id)`,
  `CREATE INDEX IF NOT EXISTS idx_evenements_version ON evenements(version)`,

  // Indexes for lots
  `CREATE INDEX IF NOT EXISTS idx_lots_farm_id ON lots(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lots_sync_status ON lots(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_lots_version ON lots(version)`,

  // Indexes for notifications
  `CREATE INDEX IF NOT EXISTS idx_notifications_farm_id ON notifications(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_animal_id ON notifications(animal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_sync_status ON notifications(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_evenement_id ON notifications(evenement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_version ON notifications(version)`,

  // Indexes for naissances
  `CREATE INDEX IF NOT EXISTS idx_naissances_farm_id ON naissances(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_naissances_mother_id ON naissances(mother_id)`,
  `CREATE INDEX IF NOT EXISTS idx_naissances_evenement_id ON naissances(evenement_id)`,
  `CREATE INDEX IF NOT EXISTS idx_naissances_date_naissance ON naissances(date_naissance)`,
  `CREATE INDEX IF NOT EXISTS idx_naissances_sync_status ON naissances(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_naissances_version ON naissances(version)`,

  // Indexes for sante_rappels
  `CREATE INDEX IF NOT EXISTS idx_sante_rappels_farm_id ON sante_rappels(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sante_rappels_animal_id ON sante_rappels(animal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sante_rappels_statut ON sante_rappels(statut)`,
  `CREATE INDEX IF NOT EXISTS idx_sante_rappels_date_prevue ON sante_rappels(date_prevue)`,
  `CREATE INDEX IF NOT EXISTS idx_sante_rappels_sync_status ON sante_rappels(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_sante_rappels_version ON sante_rappels(version)`,
  `CREATE INDEX IF NOT EXISTS idx_sante_rappels_type_rappel ON sante_rappels(type_rappel)`,

  // Indexes for farms
  `CREATE INDEX IF NOT EXISTS idx_farms_owner_id ON farms(owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_farms_sync_status ON farms(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_farms_version ON farms(version)`,
  `CREATE INDEX IF NOT EXISTS idx_farms_last_sync_at ON farms(last_sync_at)`,

  // Indexes for farm_user
  `CREATE INDEX IF NOT EXISTS idx_farm_user_farm_id ON farm_user(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_farm_user_user_id ON farm_user(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_farm_user_sync_status ON farm_user(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_farm_user_version ON farm_user(version)`,

  // Indexes for especes
  `CREATE INDEX IF NOT EXISTS idx_especes_sync_status ON especes(sync_status)`,

  // Indexes for categories
  `CREATE INDEX IF NOT EXISTS idx_categories_sync_status ON categories(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_farm_id ON categories(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_version ON categories(version)`,

  // Indexes for type_evenements
  `CREATE INDEX IF NOT EXISTS idx_type_evenements_sync_status ON type_evenements(sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_type_evenements_farm_id ON type_evenements(farm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_type_evenements_version ON type_evenements(version)`,

  // Indexes for sync_queue
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name)`,

  // API cache table for offline-first read-only endpoints
  `CREATE TABLE IF NOT EXISTS api_cache (
    cache_key TEXT PRIMARY KEY,
    farm_id TEXT,
    payload TEXT NOT NULL,
    cached_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_api_cache_farm_id ON api_cache(farm_id)`,

  // Schema migrations tracking table
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`,
];
