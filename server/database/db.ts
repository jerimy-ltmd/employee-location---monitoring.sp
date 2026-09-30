import initSqlJs, { Database as SqlDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'staffmonitor.sqlite');

let dbInstance: SqlDatabase | null = null;

export async function getDb(): Promise<SqlDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Failed to load existing database file, creating a new one:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  seedInitialData(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database to disk:', err);
  }
}

function initTables(db: SqlDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'EMPLOYEE',
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      avatar TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius_meters REAL NOT NULL DEFAULT 100.0,
      accuracy_threshold REAL NOT NULL DEFAULT 40.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS location_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL NOT NULL,
      status TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS location_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      acknowledged_at TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function seedInitialData(db: SqlDatabase): void {
  const userCountRes = db.exec('SELECT COUNT(*) as count FROM users');
  const count = userCountRes[0]?.values[0]?.[0] as number;

  if (count === 0) {
    console.log('Seeding initial database with sample accounts and building...');
    const now = new Date().toISOString();
    const adminHash = bcrypt.hashSync('admin123', 10);
    const empHash = bcrypt.hashSync('employee123', 10);

    // Seed Sample Accounts
    const usersToSeed = [
      {
        empId: 'EMP-001',
        name: 'Administrator',
        email: 'admin@example.com',
        pass: adminHash,
        role: 'ADMINISTRATOR',
        dept: 'Executive Management',
        pos: 'System Administrator',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      {
        empId: 'EMP-101',
        name: 'Juan Dela Cruz',
        email: 'juan@example.com',
        pass: empHash,
        role: 'EMPLOYEE',
        dept: 'Provincial Engineering Office',
        pos: 'Field Civil Engineer',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      {
        empId: 'EMP-102',
        name: 'Maria Santos',
        email: 'maria@example.com',
        pass: empHash,
        role: 'EMPLOYEE',
        dept: 'Human Resources & Records',
        pos: 'Administrative Officer',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      },
      {
        empId: 'EMP-103',
        name: 'Pedro Reyes',
        email: 'pedro@example.com',
        pass: empHash,
        role: 'EMPLOYEE',
        dept: 'General Services Office',
        pos: 'Facilities Officer',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      },
      {
        empId: 'EMP-104',
        name: 'Ana Garcia',
        email: 'ana@example.com',
        pass: empHash,
        role: 'EMPLOYEE',
        dept: 'Information Technology Division',
        pos: 'IT Support Specialist',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
      },
    ];

    for (const u of usersToSeed) {
      db.run(
        `INSERT INTO users (employee_id, name, email, password_hash, role, department, position, avatar, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [u.empId, u.name, u.email, u.pass, u.role, u.dept, u.pos, u.avatar, now, now]
      );
    }

    // Seed Designated Building (Sangguniang Panlalawigan / Provincial Capitol)
    // Coordinates: Lat 17.6132, Long 121.7270 (Cagayan Provincial Capitol, Philippines)
    db.run(
      `INSERT INTO buildings (name, latitude, longitude, radius_meters, accuracy_threshold, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['Sangguniang Panlalawigan - Provincial Capitol', 17.6132, 121.7270, 100.0, 40.0, now, now]
    );

    // Default system settings
    db.run(`INSERT INTO system_settings (key, value) VALUES (?, ?)`, ['retention_days', '90']);
    db.run(`INSERT INTO system_settings (key, value) VALUES (?, ?)`, ['tracking_interval_seconds', '30']);
    db.run(`INSERT INTO system_settings (key, value) VALUES (?, ?)`, ['min_movement_meters', '25']);
    db.run(`INSERT INTO system_settings (key, value) VALUES (?, ?)`, ['org_name', 'Provincial Government of Cagayan']);

    // Seed initial general broadcast conversation
    db.run(
      `INSERT INTO conversations (type, name, created_by, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)`,
      ['GROUP', 'All Staff & Emergency Broadcast', now, now]
    );

    for (let uid = 1; uid <= 5; uid++) {
      db.run(
        `INSERT INTO conversation_members (conversation_id, user_id, joined_at)
         VALUES (1, ?, ?)`,
        [uid, now]
      );
    }

    db.run(
      `INSERT INTO messages (conversation_id, sender_id, message, is_read, created_at)
       VALUES (1, 1, 'Welcome to the Employee Location and Communication System. Please ensure your location sharing is enabled during office hours.', 1, ?)`,
      [now]
    );

    // Seed 1-to-1 conversation between Admin and Juan
    db.run(
      `INSERT INTO conversations (type, name, created_by, created_at, updated_at)
       VALUES ('DIRECT', 'Juan Dela Cruz & Admin', 1, ?, ?)`,
      [now, now]
    );
    db.run(`INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (2, 1, ?)`, [now]);
    db.run(`INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (2, 2, ?)`, [now]);
    db.run(
      `INSERT INTO messages (conversation_id, sender_id, message, is_read, created_at)
       VALUES (2, 1, 'Engr. Juan, please confirm when you arrive at the Capitol inspection site.', 1, ?)`,
      [now]
    );
    db.run(
      `INSERT INTO messages (conversation_id, sender_id, message, is_read, created_at)
       VALUES (2, 2, 'Yes sir, I am already at the Provincial Capitol compound.', 1, ?)`,
      [now]
    );

    // Initial simulated location records for realism
    // Juan inside Capitol
    db.run(
      `INSERT INTO location_records (user_id, latitude, longitude, accuracy, status, recorded_at)
       VALUES (2, 17.6133, 121.7271, 8.5, 'INSIDE', ?)`,
      [now]
    );
    db.run(
      `INSERT INTO location_events (user_id, event_type, latitude, longitude, recorded_at)
       VALUES (2, 'RETURNED_INSIDE', 17.6133, 121.7271, ?)`,
      [now]
    );

    // Maria inside Capitol
    db.run(
      `INSERT INTO location_records (user_id, latitude, longitude, accuracy, status, recorded_at)
       VALUES (3, 17.6131, 121.7269, 12.0, 'INSIDE', ?)`,
      [now]
    );
    db.run(
      `INSERT INTO location_events (user_id, event_type, latitude, longitude, recorded_at)
       VALUES (3, 'RETURNED_INSIDE', 17.6131, 121.7269, ?)`,
      [now]
    );

    // Pedro outside Capitol (approx 250m away)
    db.run(
      `INSERT INTO location_records (user_id, latitude, longitude, accuracy, status, recorded_at)
       VALUES (4, 17.6155, 121.7285, 15.0, 'OUTSIDE', ?)`,
      [now]
    );
    db.run(
      `INSERT INTO location_events (user_id, event_type, latitude, longitude, recorded_at)
       VALUES (4, 'WENT_OUTSIDE', 17.6155, 121.7285, ?)`,
      [now]
    );

    // Seed audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, metadata, created_at)
       VALUES (1, 'SYSTEM_INITIALIZED', 'Default database initialized with sample government accounts and geofence', ?)`,
      [now]
    );
  }
}

/**
 * Helper to execute SELECT queries and return clean array of objects
 */
export function queryAll<T = any>(db: SqlDatabase, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

/**
 * Helper to execute SELECT query returning a single object or null
 */
export function queryOne<T = any>(db: SqlDatabase, sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to run INSERT/UPDATE/DELETE and return lastInsertId & changes
 */
export function runSql(db: SqlDatabase, sql: string, params: any[] = []): { lastId: number; changes: number } {
  db.run(sql, params);
  const idRes = db.exec('SELECT last_insert_rowid() as id, changes() as changes');
  const lastId = (idRes[0]?.values[0]?.[0] as number) || 0;
  const changes = (idRes[0]?.values[0]?.[1] as number) || 0;
  saveDb();
  return { lastId, changes };
}
