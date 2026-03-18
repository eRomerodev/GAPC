import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Initialize the SQLite database and create tables.
 * Call this once when the app starts.
 */
export async function initDB() {
  db = await SQLite.openDatabaseAsync('gapc.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS Grupos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_audio TEXT,
      ubicacion_lat REAL DEFAULT 0,
      ubicacion_lng REAL DEFAULT 0,
      rating REAL DEFAULT 5.0,
      miembros INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Socias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_audio TEXT,
      grupo_id INTEGER,
      avatar_color TEXT DEFAULT '#66bb6a',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (grupo_id) REFERENCES Grupos(id)
    );

    CREATE TABLE IF NOT EXISTS Ahorros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      socia_id INTEGER,
      grupo_id INTEGER,
      monto INTEGER DEFAULT 0,
      tipo TEXT CHECK(tipo IN ('ahorro','prestamo','pago')) DEFAULT 'ahorro',
      nota_voz TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (socia_id) REFERENCES Socias(id),
      FOREIGN KEY (grupo_id) REFERENCES Grupos(id)
    );

    CREATE TABLE IF NOT EXISTS Provenance_Log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tabla TEXT NOT NULL,
      registro_id INTEGER,
      accion TEXT NOT NULL,
      datos_json TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0
    );
  `);

  // Seed initial demo data if tables are empty
  const count = await db.getFirstAsync('SELECT COUNT(*) as c FROM Grupos');
  if (count.c === 0) {
    await seedDemoData();
  }

  // Migration: add foto_uri column to Socias if it doesn't exist
  try {
    await db.runAsync('ALTER TABLE Socias ADD COLUMN foto_uri TEXT');
    console.log('[GAPC] Added foto_uri column to Socias');
  } catch (e) {
    // Column already exists, ignore
  }

  console.log('[GAPC] Database initialized successfully');
  return db;
}

/**
 * Get the database instance. Must call initDB() first.
 */
export function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

// ─── AHORROS (SAVINGS) ──────────────────────────────────────────

export async function addAhorro(sociaId, grupoId, monto, tipo = 'ahorro', notaVoz = null) {
  const result = await db.runAsync(
    'INSERT INTO Ahorros (socia_id, grupo_id, monto, tipo, nota_voz) VALUES (?, ?, ?, ?, ?)',
    [sociaId, grupoId, monto, tipo, notaVoz]
  );

  await addProvenanceLog('Ahorros', result.lastInsertRowId, 'INSERT', {
    socia_id: sociaId,
    grupo_id: grupoId,
    monto,
    tipo,
  });

  return result.lastInsertRowId;
}

export async function getAhorrosBySocia(sociaId) {
  return await db.getAllAsync(
    'SELECT * FROM Ahorros WHERE socia_id = ? ORDER BY created_at DESC',
    [sociaId]
  );
}

export async function getTotalAhorro(grupoId = null) {
  let query = `
    SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'ahorro' THEN monto ELSE 0 END), 0) as total_ahorro,
      COALESCE(SUM(CASE WHEN tipo = 'prestamo' THEN monto ELSE 0 END), 0) as total_prestamo,
      COALESCE(SUM(CASE WHEN tipo = 'pago' THEN monto ELSE 0 END), 0) as total_pago
    FROM Ahorros
  `;
  const params = [];
  if (grupoId) {
    query += ' WHERE grupo_id = ?';
    params.push(grupoId);
  }
  return await db.getFirstAsync(query, params);
}

// ─── SOCIAS (MEMBERS) ───────────────────────────────────────────

export async function addSocia(nombreAudio, grupoId, avatarColor = '#66bb6a', fotoUri = null) {
  const result = await db.runAsync(
    'INSERT INTO Socias (nombre_audio, grupo_id, avatar_color, foto_uri) VALUES (?, ?, ?, ?)',
    [nombreAudio, grupoId, avatarColor, fotoUri]
  );

  // Update member count in Grupos
  await updateGrupoMiembros(grupoId);

  await addProvenanceLog('Socias', result.lastInsertRowId, 'INSERT', {
    nombre_audio: nombreAudio,
    grupo_id: grupoId,
  });

  return result.lastInsertRowId;
}

export async function getSociasByGrupo(grupoId) {
  return await db.getAllAsync(
    'SELECT * FROM Socias WHERE grupo_id = ? ORDER BY created_at',
    [grupoId]
  );
}

export async function getAllSocias() {
  return await db.getAllAsync('SELECT * FROM Socias ORDER BY created_at');
}

export async function getSociaById(sociaId) {
  return await db.getFirstAsync('SELECT * FROM Socias WHERE id = ?', [sociaId]);
}

export async function updateSociaFoto(sociaId, fotoUri) {
  await db.runAsync('UPDATE Socias SET foto_uri = ? WHERE id = ?', [fotoUri, sociaId]);
  await addProvenanceLog('Socias', sociaId, 'UPDATE', { foto_uri: fotoUri });
}

// ─── GRUPOS (GROUPS) ────────────────────────────────────────────

export async function addGrupo(nombreAudio, lat = 0, lng = 0) {
  const result = await db.runAsync(
    'INSERT INTO Grupos (nombre_audio, ubicacion_lat, ubicacion_lng) VALUES (?, ?, ?)',
    [nombreAudio, lat, lng]
  );

  await addProvenanceLog('Grupos', result.lastInsertRowId, 'INSERT', {
    nombre_audio: nombreAudio,
    ubicacion_lat: lat,
    ubicacion_lng: lng,
  });

  return result.lastInsertRowId;
}

export async function getAllGrupos() {
  return await db.getAllAsync('SELECT * FROM Grupos ORDER BY created_at');
}

export async function updateGrupoRating(grupoId, rating) {
  await db.runAsync('UPDATE Grupos SET rating = ? WHERE id = ?', [rating, grupoId]);
  await addProvenanceLog('Grupos', grupoId, 'UPDATE', { rating });
}

export async function updateGrupoMiembros(grupoId) {
  const result = await db.getFirstAsync(
    'SELECT COUNT(*) as c FROM Socias WHERE grupo_id = ?',
    [grupoId]
  );
  await db.runAsync('UPDATE Grupos SET miembros = ? WHERE id = ?', [result.c, grupoId]);
}

// ─── PROVENANCE LOG (AUDIT) ────────────────────────────────────

export async function addProvenanceLog(tabla, registroId, accion, datos) {
  await db.runAsync(
    'INSERT INTO Provenance_Log (tabla, registro_id, accion, datos_json) VALUES (?, ?, ?, ?)',
    [tabla, registroId, accion, JSON.stringify(datos)]
  );
}

export async function getUnsyncedLogs() {
  return await db.getAllAsync(
    'SELECT * FROM Provenance_Log WHERE synced = 0 ORDER BY timestamp'
  );
}

export async function markLogsSynced(ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE Provenance_Log SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
}

export async function getAllLogs() {
  return await db.getAllAsync(
    'SELECT * FROM Provenance_Log ORDER BY timestamp DESC LIMIT 50'
  );
}

// ─── SEED DATA ──────────────────────────────────────────────────

async function seedDemoData() {
  // Create demo groups
  await db.runAsync(
    `INSERT INTO Grupos (nombre_audio, ubicacion_lat, ubicacion_lng, rating, miembros) VALUES 
     ('Grupo Las Flores', 13.6929, -89.2182, 4.5, 8),
     ('Grupo Esperanza', 13.7034, -89.2245, 5.0, 12),
     ('Grupo Nuevo Amanecer', 13.6856, -89.2098, 3.5, 6)`
  );

  // Create demo members
  await db.runAsync(
    `INSERT INTO Socias (nombre_audio, grupo_id, avatar_color) VALUES 
     ('María', 1, '#66bb6a'),
     ('Rosa', 1, '#42a5f5'),
     ('Carmen', 2, '#ab47bc'),
     ('Luisa', 2, '#ff7043'),
     ('Ana', 3, '#ffa726')`
  );

  // Create demo savings
  await db.runAsync(
    `INSERT INTO Ahorros (socia_id, grupo_id, monto, tipo) VALUES 
     (1, 1, 5, 'ahorro'),
     (1, 1, 3, 'ahorro'),
     (2, 1, 7, 'ahorro'),
     (3, 2, 10, 'ahorro'),
     (3, 2, 2, 'prestamo'),
     (4, 2, 8, 'ahorro'),
     (5, 3, 4, 'ahorro')`
  );

  console.log('[GAPC] Demo data seeded');
}
