import { getDb, queryAll, queryOne, runSql } from '../database/db.ts';

export async function createUrgentPing(senderId: number, recipientId: number, message: string = 'Urgent Ping: Immediate attention required') {
  const db = await getDb();
  const now = new Date().toISOString();

  // Insert ping record
  const res = runSql(
    db,
    `INSERT INTO pings (sender_id, recipient_id, message, sent_at, status)
     VALUES (?, ?, ?, ?, 'PENDING')`,
    [senderId, recipientId, message.trim(), now]
  );

  const pingId = res.lastId;

  // Insert notification for recipient
  runSql(
    db,
    `INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
     VALUES (?, 'PING', 'URGENT PING RECEIVED', ?, 0, ?)`,
    [recipientId, message.trim(), now]
  );

  // Audit log
  const sender = queryOne(db, `SELECT name FROM users WHERE id = ?`, [senderId]);
  const recipient = queryOne(db, `SELECT name FROM users WHERE id = ?`, [recipientId]);
  runSql(
    db,
    `INSERT INTO audit_logs (user_id, action, metadata, created_at)
     VALUES (?, 'URGENT_PING_SENT', ?, ?)`,
    [senderId, `${sender?.name || 'Admin'} sent urgent ping to ${recipient?.name || 'Employee'}`, now]
  );

  const fullPing = queryOne(
    db,
    `SELECT p.*, s.name as sender_name, r.name as recipient_name
     FROM pings p
     JOIN users s ON p.sender_id = s.id
     JOIN users r ON p.recipient_id = r.id
     WHERE p.id = ?`,
    [pingId]
  );

  return fullPing;
}

export async function acknowledgePing(pingId: number, userId: number) {
  const db = await getDb();
  const now = new Date().toISOString();

  // Verify recipient
  const ping = queryOne(db, `SELECT * FROM pings WHERE id = ? AND recipient_id = ?`, [pingId, userId]);
  if (!ping) {
    throw new Error('Ping not found or unauthorized');
  }

  runSql(
    db,
    `UPDATE pings SET status = 'ACKNOWLEDGED', acknowledged_at = ? WHERE id = ?`,
    [now, pingId]
  );

  // Mark related notifications as read
  runSql(
    db,
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND type = 'PING'`,
    [userId]
  );

  // Audit log
  const recipient = queryOne(db, `SELECT name FROM users WHERE id = ?`, [userId]);
  runSql(
    db,
    `INSERT INTO audit_logs (user_id, action, metadata, created_at)
     VALUES (?, 'URGENT_PING_ACKNOWLEDGED', ?, ?)`,
    [userId, `${recipient?.name || 'Employee'} acknowledged urgent ping (ID: ${pingId})`, now]
  );

  return queryOne(
    db,
    `SELECT p.*, s.name as sender_name, r.name as recipient_name
     FROM pings p
     JOIN users s ON p.sender_id = s.id
     JOIN users r ON p.recipient_id = r.id
     WHERE p.id = ?`,
    [pingId]
  );
}

export async function getActivePingsForUser(userId: number) {
  const db = await getDb();
  return queryAll(
    db,
    `SELECT p.*, s.name as sender_name, s.avatar as sender_avatar
     FROM pings p
     JOIN users s ON p.sender_id = s.id
     WHERE p.recipient_id = ? AND p.status = 'PENDING'
     ORDER BY p.sent_at DESC`,
    [userId]
  );
}

export async function getAllPings(limit: number = 100) {
  const db = await getDb();
  return queryAll(
    db,
    `SELECT p.*, s.name as sender_name, r.name as recipient_name, r.department as recipient_dept
     FROM pings p
     JOIN users s ON p.sender_id = s.id
     JOIN users r ON p.recipient_id = r.id
     ORDER BY p.sent_at DESC
     LIMIT ?`,
    [limit]
  );
}
