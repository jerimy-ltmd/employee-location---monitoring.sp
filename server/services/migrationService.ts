import fs from 'fs';
import path from 'path';
import { getDb, queryAll, queryOne, runSql, saveDb } from '../database/db.ts';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');

export interface TableInspection {
  tableName: string;
  rowCount: number;
  columns: {
    name: string;
    type: string;
    notnull: boolean;
    pk: boolean;
    dflt_value: any;
  }[];
}

export async function getMigrationScripts() {
  const scripts: { id: string; name: string; dialect: string; filename: string; content: string }[] = [];

  const files = [
    { id: 'postgres-init', name: 'PostgreSQL Initial Schema', dialect: 'PostgreSQL', file: '001_create_tables_postgresql.sql' },
    { id: 'mariadb-init', name: 'MariaDB & MySQL Initial Schema', dialect: 'MariaDB / MySQL', file: '001_create_tables_mariadb.sql' },
    { id: 'sqlite-init', name: 'SQLite Initial Schema', dialect: 'SQLite', file: '001_create_tables_sqlite.sql' },
    { id: 'seed-data', name: 'Sample Accounts & Seed Data', dialect: 'Universal SQL', file: '002_seed_initial_data.sql' },
  ];

  for (const item of files) {
    const fullPath = path.join(MIGRATIONS_DIR, item.file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      scripts.push({
        id: item.id,
        name: item.name,
        dialect: item.dialect,
        filename: item.file,
        content,
      });
    }
  }

  return scripts;
}

export async function getTableInspections(): Promise<TableInspection[]> {
  const db = await getDb();
  const tables = [
    'users',
    'buildings',
    'location_records',
    'location_events',
    'conversations',
    'conversation_members',
    'messages',
    'notifications',
    'pings',
    'audit_logs',
    'system_settings',
  ];

  const results: TableInspection[] = [];

  for (const t of tables) {
    const countRes = queryOne(db, `SELECT COUNT(*) as count FROM ${t}`);
    const rowCount = countRes ? countRes.count : 0;

    const pragmaRows = queryAll(db, `PRAGMA table_info(${t})`);
    const columns = pragmaRows.map((r: any) => ({
      name: r.name,
      type: r.type,
      notnull: Boolean(r.notnull),
      pk: Boolean(r.pk),
      dflt_value: r.dflt_value,
    }));

    results.push({
      tableName: t,
      rowCount,
      columns,
    });
  }

  return results;
}

export async function exportDatabaseJson() {
  const db = await getDb();
  const tables = [
    'users',
    'buildings',
    'location_records',
    'location_events',
    'conversations',
    'conversation_members',
    'messages',
    'notifications',
    'pings',
    'audit_logs',
    'system_settings',
  ];

  const exportData: Record<string, any[]> = {};

  for (const t of tables) {
    exportData[t] = queryAll(db, `SELECT * FROM ${t}`);
  }

  return {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    database: 'StaffMonitor',
    data: exportData,
  };
}

export async function exportDatabaseSql(dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'): Promise<string> {
  const db = await getDb();
  const json = await exportDatabaseJson();
  const lines: string[] = [];

  lines.push(`-- StaffMonitor Database Export`);
  lines.push(`-- Generated At: ${new Date().toISOString()}`);
  lines.push(`-- Target Dialect: ${dialect.toUpperCase()}`);
  lines.push(``);

  if (dialect === 'postgres') {
    lines.push(`BEGIN;`);
  } else if (dialect === 'mysql') {
    lines.push(`SET FOREIGN_KEY_CHECKS = 0;`);
  }

  const escapeVal = (v: any) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    const escaped = String(v).replace(/'/g, "''");
    return `'${escaped}'`;
  };

  for (const [table, rows] of Object.entries(json.data)) {
    if (rows.length === 0) continue;
    lines.push(`-- Data for table ${table}`);
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = Object.values(row).map(escapeVal);
      if (dialect === 'mysql') {
        const backtickCols = cols.map((c) => `\`${c}\``).join(', ');
        lines.push(`INSERT INTO \`${table}\` (${backtickCols}) VALUES (${vals.join(', ')});`);
      } else {
        lines.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
      }
    }
    lines.push(``);
  }

  if (dialect === 'postgres') {
    lines.push(`COMMIT;`);
  } else if (dialect === 'mysql') {
    lines.push(`SET FOREIGN_KEY_CHECKS = 1;`);
  }

  return lines.join('\n');
}

export async function importDatabaseJson(backupData: any): Promise<{ importedTables: string[]; totalRecords: number }> {
  const db = await getDb();
  if (!backupData || !backupData.data) {
    throw new Error('Invalid backup file structure: missing data key');
  }

  let totalRecords = 0;
  const importedTables: string[] = [];

  const tablesOrder = [
    'system_settings',
    'buildings',
    'users',
    'location_records',
    'location_events',
    'conversations',
    'conversation_members',
    'messages',
    'notifications',
    'pings',
    'audit_logs',
  ];

  for (const t of tablesOrder) {
    const rows = backupData.data[t];
    if (Array.isArray(rows) && rows.length > 0) {
      // Clear current table
      db.run(`DELETE FROM ${t}`);

      for (const row of rows) {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const values = Object.values(row) as any[];

        db.run(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`, values);
        totalRecords++;
      }
      importedTables.push(t);
    }
  }

  saveDb();
  return { importedTables, totalRecords };
}

export async function executeRawSql(sqlStatement: string): Promise<{ result: any; changes: number }> {
  const db = await getDb();
  const trimmed = sqlStatement.trim();
  if (!trimmed) throw new Error('SQL statement cannot be empty');

  // If SELECT, return results
  if (trimmed.toUpperCase().startsWith('SELECT') || trimmed.toUpperCase().startsWith('PRAGMA')) {
    const rows = queryAll(db, trimmed);
    return { result: rows, changes: 0 };
  }

  db.run(trimmed);
  saveDb();
  return { result: 'Query executed successfully', changes: 1 };
}
