import { getDb, queryAll, queryOne } from '../database/db.ts';

export async function generateDailyLocationReport(dateStr?: string) {
  const db = await getDb();
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const sql = `
    SELECT
      u.employee_id,
      u.name,
      u.department,
      u.position,
      COUNT(lr.id) as total_readings,
      SUM(CASE WHEN lr.status = 'INSIDE' THEN 1 ELSE 0 END) as inside_count,
      SUM(CASE WHEN lr.status = 'OUTSIDE' THEN 1 ELSE 0 END) as outside_count,
      SUM(CASE WHEN lr.status = 'LOCATION_UNCERTAIN' THEN 1 ELSE 0 END) as uncertain_count,
      MAX(lr.recorded_at) as latest_reading_time,
      (
        SELECT lr_sub.status
        FROM location_records lr_sub
        WHERE lr_sub.user_id = u.id AND lr_sub.recorded_at LIKE ? || '%'
        ORDER BY lr_sub.id DESC LIMIT 1
      ) as final_status
    FROM users u
    LEFT JOIN location_records lr ON u.id = lr.user_id AND lr.recorded_at LIKE ? || '%'
    WHERE u.role = 'EMPLOYEE' AND u.is_active = 1
    GROUP BY u.id
    ORDER BY u.name ASC
  `;

  const rows = queryAll(db, sql, [targetDate, targetDate]);
  return { date: targetDate, rows };
}

export async function generateOutsideEventsReport(limit: number = 200) {
  const db = await getDb();
  const sql = `
    SELECT
      le.id,
      le.recorded_at,
      le.event_type,
      le.latitude,
      le.longitude,
      u.employee_id,
      u.name,
      u.department,
      u.position
    FROM location_events le
    JOIN users u ON le.user_id = u.id
    WHERE le.event_type = 'WENT_OUTSIDE'
    ORDER BY le.recorded_at DESC
    LIMIT ?
  `;
  return queryAll(db, sql, [limit]);
}

export async function generateActivitySummary() {
  const db = await getDb();
  return queryAll(
    db,
    `SELECT
      al.id,
      al.action,
      al.metadata,
      al.created_at,
      u.name as user_name,
      u.employee_id,
      u.role
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC
     LIMIT 150`
  );
}

export async function generatePingReport() {
  const db = await getDb();
  return queryAll(
    db,
    `SELECT
      p.id,
      p.sent_at,
      p.acknowledged_at,
      p.status,
      p.message,
      s.name as sender_name,
      r.name as recipient_name,
      r.employee_id as recipient_employee_id,
      r.department as recipient_department
     FROM pings p
     JOIN users s ON p.sender_id = s.id
     JOIN users r ON p.recipient_id = r.id
     ORDER BY p.sent_at DESC
     LIMIT 150`
  );
}

export function formatCsv(headers: string[], rows: any[][]): string {
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map((row) => row.map(escapeCell).join(','));
  return [headerRow, ...dataRows].join('\n');
}
