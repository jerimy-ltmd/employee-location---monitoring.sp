import { getDb, queryAll, queryOne, runSql } from '../database/db.ts';

// Haversine formula for distance in meters between two lat/lng points
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export interface LocationUpdateResult {
  recordId: number;
  status: 'INSIDE' | 'OUTSIDE' | 'LOCATION_UNCERTAIN' | 'LOCATION_UNAVAILABLE';
  distanceMeters: number;
  accuracy: number;
  eventCreated: string | null;
  buildingName: string;
}

export async function processLocationUpdate(
  userId: number,
  latitude: number,
  longitude: number,
  accuracy: number,
  isExplicitUnavailable: boolean = false
): Promise<LocationUpdateResult> {
  const db = await getDb();
  const now = new Date().toISOString();

  // Get current active building geofence
  const building = queryOne(db, `SELECT * FROM buildings ORDER BY id ASC LIMIT 1`);
  if (!building) {
    throw new Error('No active building geofence configured in system');
  }

  let status: 'INSIDE' | 'OUTSIDE' | 'LOCATION_UNCERTAIN' | 'LOCATION_UNAVAILABLE';
  let distance = 0;

  if (isExplicitUnavailable) {
    status = 'LOCATION_UNAVAILABLE';
  } else {
    distance = calculateHaversineDistance(latitude, longitude, building.latitude, building.longitude);

    // If accuracy is too poor according to threshold, mark uncertain
    if (accuracy > building.accuracy_threshold) {
      status = 'LOCATION_UNCERTAIN';
    } else if (distance <= building.radius_meters) {
      status = 'INSIDE';
    } else {
      status = 'OUTSIDE';
    }
  }

  // Get last recorded status for this user to evaluate transition (hysteresis)
  const lastRecord = queryOne(
    db,
    `SELECT status, recorded_at FROM location_records WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
    [userId]
  );

  let eventCreated: string | null = null;

  if (lastRecord && lastRecord.status !== status) {
    if (lastRecord.status === 'INSIDE' && status === 'OUTSIDE') {
      eventCreated = 'WENT_OUTSIDE';
      runSql(
        db,
        `INSERT INTO location_events (user_id, event_type, latitude, longitude, recorded_at) VALUES (?, ?, ?, ?, ?)`,
        [userId, 'WENT_OUTSIDE', latitude, longitude, now]
      );
      // Audit log
      const user = queryOne(db, `SELECT name FROM users WHERE id = ?`, [userId]);
      runSql(
        db,
        `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, ?, ?, ?)`,
        [userId, 'EVENT_WENT_OUTSIDE', `${user?.name || 'Employee'} went outside building perimeter (${Math.round(distance)}m away)`, now]
      );
    } else if (lastRecord.status === 'OUTSIDE' && status === 'INSIDE') {
      eventCreated = 'RETURNED_INSIDE';
      runSql(
        db,
        `INSERT INTO location_events (user_id, event_type, latitude, longitude, recorded_at) VALUES (?, ?, ?, ?, ?)`,
        [userId, 'RETURNED_INSIDE', latitude, longitude, now]
      );
      const user = queryOne(db, `SELECT name FROM users WHERE id = ?`, [userId]);
      runSql(
        db,
        `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, ?, ?, ?)`,
        [userId, 'EVENT_RETURNED_INSIDE', `${user?.name || 'Employee'} returned inside designated building perimeter`, now]
      );
    }
  }

  // Insert location record
  const insertRes = runSql(
    db,
    `INSERT INTO location_records (user_id, latitude, longitude, accuracy, status, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, latitude, longitude, accuracy, status, now]
  );

  return {
    recordId: insertRes.lastId,
    status,
    distanceMeters: Math.round(distance),
    accuracy: Math.round(accuracy),
    eventCreated,
    buildingName: building.name,
  };
}

export async function getLatestEmployeeLocations() {
  const db = await getDb();
  // Get all active users with their latest location record if any
  const sql = `
    SELECT
      u.id,
      u.employee_id,
      u.name,
      u.email,
      u.role,
      u.department,
      u.position,
      u.avatar,
      u.is_active,
      lr.latitude,
      lr.longitude,
      lr.accuracy,
      COALESCE(lr.status, 'LOCATION_UNAVAILABLE') as status,
      lr.recorded_at as last_updated
    FROM users u
    LEFT JOIN (
      SELECT lr1.*
      FROM location_records lr1
      INNER JOIN (
        SELECT user_id, MAX(id) as max_id
        FROM location_records
        GROUP BY user_id
      ) lr2 ON lr1.id = lr2.max_id
    ) lr ON u.id = lr.user_id
    WHERE u.is_active = 1
    ORDER BY u.name ASC
  `;

  return queryAll(db, sql);
}

export async function getUserLocationHistory(userId: number, limit: number = 100) {
  const db = await getDb();
  return queryAll(
    db,
    `SELECT lr.*, u.name, u.employee_id, u.department
     FROM location_records lr
     JOIN users u ON lr.user_id = u.id
     WHERE lr.user_id = ?
     ORDER BY lr.recorded_at DESC
     LIMIT ?`,
    [userId, limit]
  );
}

export async function getAllLocationHistory(filters: {
  userId?: number;
  department?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const db = await getDb();
  let sql = `
    SELECT lr.*, u.name, u.employee_id, u.department, u.position
    FROM location_records lr
    JOIN users u ON lr.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.userId) {
    sql += ` AND lr.user_id = ?`;
    params.push(filters.userId);
  }
  if (filters.department && filters.department !== 'ALL') {
    sql += ` AND u.department = ?`;
    params.push(filters.department);
  }
  if (filters.status && filters.status !== 'ALL') {
    sql += ` AND lr.status = ?`;
    params.push(filters.status);
  }
  if (filters.startDate) {
    sql += ` AND lr.recorded_at >= ?`;
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ` AND lr.recorded_at <= ?`;
    params.push(filters.endDate);
  }

  sql += ` ORDER BY lr.recorded_at DESC LIMIT ?`;
  params.push(filters.limit || 200);

  return queryAll(db, sql, params);
}

export async function purgeOldLocationData(): Promise<number> {
  const db = await getDb();
  const setting = queryOne(db, `SELECT value FROM system_settings WHERE key = 'retention_days'`);
  const days = setting ? parseInt(setting.value, 10) : 90;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = runSql(db, `DELETE FROM location_records WHERE recorded_at < ?`, [cutoff]);

  if (result.changes > 0) {
    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (1, 'DATA_RETENTION_PURGE', ?, ?)`,
      [`Purged ${result.changes} location records older than ${days} days (cutoff: ${cutoff})`, new Date().toISOString()]
    );
  }

  return result.changes;
}
