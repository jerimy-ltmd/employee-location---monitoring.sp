import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  loginUser,
  authenticateJwt,
  requireAdmin,
  AuthenticatedRequest,
} from '../services/authService.ts';
import {
  processLocationUpdate,
  getLatestEmployeeLocations,
  getUserLocationHistory,
  getAllLocationHistory,
  purgeOldLocationData,
} from '../services/locationService.ts';
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  getOrCreateDirectConversation,
  createGroupConversation,
} from '../services/chatService.ts';
import {
  createUrgentPing,
  acknowledgePing,
  getActivePingsForUser,
  getAllPings,
} from '../services/pingService.ts';
import {
  generateDailyLocationReport,
  generateOutsideEventsReport,
  generateActivitySummary,
  generatePingReport,
  formatCsv,
} from '../services/reportService.ts';
import {
  getMigrationScripts,
  getTableInspections,
  exportDatabaseJson,
  exportDatabaseSql,
  importDatabaseJson,
  executeRawSql,
} from '../services/migrationService.ts';
import { getDb, queryAll, queryOne, runSql } from '../database/db.ts';

const router = Router();

// ========================
// AUTHENTICATION
// ========================
router.post('/auth/login', async (req, res) => {
  try {
    const { credential, password } = req.body;
    if (!credential || !password) {
      return res.status(400).json({ error: 'Credential and password are required' });
    }
    const result = await loginUser(credential, password, req.ip);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Login failed' });
  }
});

router.get('/auth/me', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const user = queryOne(
      db,
      `SELECT id, employee_id, name, email, role, department, position, avatar, is_active FROM users WHERE id = ?`,
      [req.user!.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pendingPings = await getActivePingsForUser(req.user!.id);
    const unreadCount = queryOne(
      db,
      `SELECT COUNT(*) as count FROM messages m
       JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
       WHERE cm.user_id = ? AND m.sender_id != ? AND m.is_read = 0`,
      [req.user!.id, req.user!.id]
    )?.count || 0;

    res.json({ user, pendingPings, unreadMessagesCount: unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/logout', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  const db = await getDb();
  runSql(
    db,
    `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'USER_LOGOUT', 'User logged out', ?)`,
    [req.user!.id, new Date().toISOString()]
  );
  res.json({ success: true });
});

router.post('/auth/change-password', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    const db = await getDb();
    const user = queryOne(db, `SELECT password_hash FROM users WHERE id = ?`, [req.user!.id]);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    runSql(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
      newHash,
      new Date().toISOString(),
      req.user!.id,
    ]);

    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'PASSWORD_CHANGED', 'User changed their own password', ?)`,
      [req.user!.id, new Date().toISOString()]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// EMPLOYEES MANAGEMENT
// ========================
router.get('/employees', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { search, department, role, status } = req.query;
    const db = await getDb();
    let sql = `
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
        u.created_at,
        lr.latitude,
        lr.longitude,
        lr.accuracy,
        COALESCE(lr.status, 'LOCATION_UNAVAILABLE') as location_status,
        lr.recorded_at as last_location_update
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
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.employee_id) LIKE ?)`;
      const q = `%${(search as string).toLowerCase()}%`;
      params.push(q, q, q);
    }
    if (department && department !== 'ALL') {
      sql += ` AND u.department = ?`;
      params.push(department);
    }
    if (role && role !== 'ALL') {
      sql += ` AND u.role = ?`;
      params.push(role);
    }
    if (status && status !== 'ALL') {
      sql += ` AND COALESCE(lr.status, 'LOCATION_UNAVAILABLE') = ?`;
      params.push(status);
    }

    sql += ` ORDER BY u.role DESC, u.name ASC`;

    const employees = queryAll(db, sql, params);
    res.json(employees);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/employees', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, employee_id, password, role, department, position, avatar } = req.body;
    if (!name || !email || !employee_id || !password) {
      return res.status(400).json({ error: 'Name, email, employee ID and password are required' });
    }

    const db = await getDb();
    const existing = queryOne(
      db,
      `SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(employee_id) = ?`,
      [email.toLowerCase(), employee_id.toLowerCase()]
    );
    if (existing) {
      return res.status(400).json({ error: 'An account with that email or employee ID already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const insertRes = runSql(
      db,
      `INSERT INTO users (employee_id, name, email, password_hash, role, department, position, avatar, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        employee_id.trim().toUpperCase(),
        name.trim(),
        email.trim().toLowerCase(),
        hash,
        role || 'EMPLOYEE',
        department || 'General',
        position || 'Staff',
        avatar || null,
        now,
        now,
      ]
    );

    // Auto-add new employee to general broadcast chat
    runSql(
      db,
      `INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, joined_at) VALUES (1, ?, ?)`,
      [insertRes.lastId, now]
    );

    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'EMPLOYEE_CREATED', ?, ?)`,
      [req.user!.id, `Admin created employee account: ${name} (${employee_id})`, now]
    );

    res.status(201).json({ id: insertRes.lastId, message: 'Employee account created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/employees/:id', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const { name, email, employee_id, role, department, position, avatar, is_active } = req.body;
    const db = await getDb();
    const now = new Date().toISOString();

    runSql(
      db,
      `UPDATE users
       SET name = ?, email = ?, employee_id = ?, role = ?, department = ?, position = ?, avatar = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      [
        name,
        email.toLowerCase(),
        employee_id.toUpperCase(),
        role,
        department,
        position,
        avatar,
        is_active !== undefined ? is_active : 1,
        now,
        targetId,
      ]
    );

    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'EMPLOYEE_UPDATED', ?, ?)`,
      [req.user!.id, `Updated details for user ID ${targetId} (${name})`, now]
    );

    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/employees/:id/reset-password', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const newPassword = req.body.password || 'employee123';
    const hash = bcrypt.hashSync(newPassword, 10);
    const db = await getDb();

    runSql(db, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
      hash,
      new Date().toISOString(),
      targetId,
    ]);

    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'PASSWORD_RESET_ADMIN', ?, ?)`,
      [req.user!.id, `Admin reset password for user ID ${targetId}`, new Date().toISOString()]
    );

    res.json({ success: true, message: `Password reset to: ${newPassword}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// BUILDING & GEOFENCE
// ========================
router.get('/building', authenticateJwt, async (req, res) => {
  try {
    const db = await getDb();
    const building = queryOne(db, `SELECT * FROM buildings ORDER BY id ASC LIMIT 1`);
    res.json(building);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/building', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, latitude, longitude, radius_meters, accuracy_threshold } = req.body;
    if (!name || latitude === undefined || longitude === undefined || !radius_meters) {
      return res.status(400).json({ error: 'Name, latitude, longitude and radius are required' });
    }

    const db = await getDb();
    const now = new Date().toISOString();
    runSql(
      db,
      `UPDATE buildings
       SET name = ?, latitude = ?, longitude = ?, radius_meters = ?, accuracy_threshold = ?, updated_at = ?
       WHERE id = (SELECT id FROM buildings ORDER BY id ASC LIMIT 1)`,
      [name, latitude, longitude, radius_meters, accuracy_threshold || 40.0, now]
    );

    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'GEOFENCE_UPDATED', ?, ?)`,
      [
        req.user!.id,
        `Geofence updated: ${name} (Lat: ${latitude}, Lng: ${longitude}, Radius: ${radius_meters}m)`,
        now,
      ]
    );

    const updated = queryOne(db, `SELECT * FROM buildings ORDER BY id ASC LIMIT 1`);
    res.json({ success: true, building: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// LOCATIONS & TRACKING
// ========================
router.get('/locations/live', authenticateJwt, async (req, res) => {
  try {
    const locations = await getLatestEmployeeLocations();
    res.json(locations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/locations/update', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { latitude, longitude, accuracy, isUnavailable } = req.body;
    const result = await processLocationUpdate(
      req.user!.id,
      latitude,
      longitude,
      accuracy || 10,
      Boolean(isUnavailable)
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/locations/history', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, department, status, startDate, endDate, limit } = req.query;

    // Normal employee can ONLY view their own history!
    let targetUserId = req.user!.role === 'ADMINISTRATOR' ? (userId ? parseInt(userId as string, 10) : undefined) : req.user!.id;

    const history = await getAllLocationHistory({
      userId: targetUserId,
      department: department as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string, 10) : 150,
    });
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/employees/:id/history', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    // Strict privacy rule: employees can only see their own history
    if (req.user!.role !== 'ADMINISTRATOR' && req.user!.id !== targetId) {
      return res.status(403).json({ error: 'Privacy protection: You cannot view another employee’s location history.' });
    }
    const history = await getUserLocationHistory(targetId, 100);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// CHATS & CONVERSATIONS
// ========================
router.get('/conversations', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const convos = await getUserConversations(req.user!.id);
    res.json(convos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conversations/:id/messages', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const convoId = parseInt(req.params.id, 10);
    const messages = await getConversationMessages(convoId, req.user!.id);
    res.json(messages);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

router.post('/conversations/:id/messages', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const convoId = parseInt(req.params.id, 10);
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    const result = await sendMessage(convoId, req.user!.id, message);
    res.status(201).json(result.message);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/conversations/direct', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'Valid target user ID required' });
    }
    const convoId = await getOrCreateDirectConversation(req.user!.id, parseInt(targetUserId, 10));
    res.json({ conversationId: convoId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversations/group', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !name.trim() || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Group name and at least one member required' });
    }
    const convoId = await createGroupConversation(req.user!.id, name, memberIds);
    res.status(201).json({ conversationId: convoId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// URGENT PINGS
// ========================
router.get('/pings', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user!.role === 'ADMINISTRATOR') {
      const pings = await getAllPings(100);
      return res.json(pings);
    }
    const pings = await getActivePingsForUser(req.user!.id);
    res.json(pings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pings', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { recipientId, message } = req.body;
    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }
    const ping = await createUrgentPing(req.user!.id, parseInt(recipientId, 10), message);
    res.status(201).json(ping);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pings/:id/ack', authenticateJwt, async (req: AuthenticatedRequest, res) => {
  try {
    const pingId = parseInt(req.params.id, 10);
    const updated = await acknowledgePing(pingId, req.user!.id);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ========================
// REPORTS & AUDIT LOGS
// ========================
router.get('/reports/daily', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const report = await generateDailyLocationReport(date as string);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/outside-events', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const report = await generateOutsideEventsReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/activity', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const report = await generateActivitySummary();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/pings', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const report = await generatePingReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/export-csv', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { type, date } = req.query;
    let csvData = '';
    let filename = `report-${type}-${Date.now()}.csv`;

    if (type === 'daily') {
      const data = await generateDailyLocationReport(date as string);
      const headers = ['Employee ID', 'Name', 'Department', 'Position', 'Total Readings', 'Inside Readings', 'Outside Readings', 'Final Status', 'Latest Reading'];
      const rows = data.rows.map((r: any) => [
        r.employee_id,
        r.name,
        r.department,
        r.position,
        r.total_readings,
        r.inside_count,
        r.outside_count,
        r.final_status,
        r.latest_reading_time || 'N/A',
      ]);
      csvData = formatCsv(headers, rows);
    } else if (type === 'outside') {
      const rows = await generateOutsideEventsReport();
      const headers = ['Time', 'Employee ID', 'Name', 'Department', 'Position', 'Latitude', 'Longitude'];
      const dataRows = rows.map((r: any) => [
        r.recorded_at,
        r.employee_id,
        r.name,
        r.department,
        r.position,
        r.latitude,
        r.longitude,
      ]);
      csvData = formatCsv(headers, dataRows);
    } else if (type === 'pings') {
      const rows = await generatePingReport();
      const headers = ['Sent At', 'Sender', 'Recipient', 'Recipient ID', 'Department', 'Status', 'Acknowledged At', 'Message'];
      const dataRows = rows.map((r: any) => [
        r.sent_at,
        r.sender_name,
        r.recipient_name,
        r.recipient_employee_id,
        r.recipient_department,
        r.status,
        r.acknowledged_at || 'Pending',
        r.message,
      ]);
      csvData = formatCsv(headers, dataRows);
    } else {
      const rows = await generateActivitySummary();
      const headers = ['Time', 'User', 'Employee ID', 'Action', 'Details'];
      const dataRows = rows.map((r: any) => [
        r.created_at,
        r.user_name || 'System',
        r.employee_id || 'N/A',
        r.action,
        r.metadata,
      ]);
      csvData = formatCsv(headers, dataRows);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// SETTINGS & RETENTION
// ========================
router.get('/settings', authenticateJwt, async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, `SELECT * FROM system_settings`);
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = await getDb();
    const { retention_days, tracking_interval_seconds, min_movement_meters, org_name } = req.body;

    if (retention_days) {
      runSql(db, `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('retention_days', ?)`, [String(retention_days)]);
    }
    if (tracking_interval_seconds) {
      runSql(db, `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('tracking_interval_seconds', ?)`, [String(tracking_interval_seconds)]);
    }
    if (min_movement_meters) {
      runSql(db, `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('min_movement_meters', ?)`, [String(min_movement_meters)]);
    }
    if (org_name) {
      runSql(db, `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('org_name', ?)`, [String(org_name)]);
    }

    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'SETTINGS_UPDATED', ?, ?)`,
      [req.user!.id, 'Updated system configuration parameters', new Date().toISOString()]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings/purge', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const deletedCount = await purgeOldLocationData();
    res.json({ success: true, deletedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Wizard Endpoint (Section 37)
router.post('/setup-wizard', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { orgName, buildingName, latitude, longitude, radiusMeters, accuracyThreshold, retentionDays } = req.body;
    const db = await getDb();
    const now = new Date().toISOString();

    if (orgName) {
      runSql(db, `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('org_name', ?)`, [String(orgName)]);
    }
    if (retentionDays) {
      runSql(db, `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('retention_days', ?)`, [String(retentionDays)]);
    }

    if (buildingName && latitude && longitude) {
      runSql(
        db,
        `UPDATE buildings SET name = ?, latitude = ?, longitude = ?, radius_meters = ?, accuracy_threshold = ?, updated_at = ?
         WHERE id = (SELECT id FROM buildings ORDER BY id ASC LIMIT 1)`,
        [buildingName, latitude, longitude, radiusMeters || 100, accuracyThreshold || 40, now]
      );
    }

    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'SETUP_WIZARD_COMPLETED', ?, ?)`,
      [req.user!.id, `Initial setup wizard reconfigured organization: ${orgName || 'N/A'}`, now]
    );

    res.json({ success: true, message: 'Setup completed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// DATABASE & MIGRATIONS
// ========================
router.get('/migrations/scripts', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const scripts = await getMigrationScripts();
    res.json(scripts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/migrations/tables', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const tables = await getTableInspections();
    res.json(tables);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/migrations/export-json', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const data = await exportDatabaseJson();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="staffmonitor_backup_${Date.now()}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/migrations/export-sql', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const dialect = (req.query.dialect as 'postgres' | 'mysql' | 'sqlite') || 'postgres';
    const sql = await exportDatabaseSql(dialect);
    const ext = dialect === 'mysql' ? 'mariadb.sql' : `${dialect}.sql`;
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="staffmonitor_dump_${ext}"`);
    res.send(sql);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/migrations/import-json', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const backupData = req.body;
    const result = await importDatabaseJson(backupData);
    const db = await getDb();
    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'DATABASE_RESTORED', ?, ?)`,
      [req.user!.id, `Restored ${result.totalRecords} records across ${result.importedTables.length} tables from custom backup`, new Date().toISOString()]
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/migrations/execute', authenticateJwt, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: 'SQL query required' });
    const result = await executeRawSql(sql);
    const db = await getDb();
    runSql(
      db,
      `INSERT INTO audit_logs (user_id, action, metadata, created_at) VALUES (?, 'SQL_EXECUTED', ?, ?)`,
      [req.user!.id, `Executed custom SQL: ${sql.slice(0, 100)}...`, new Date().toISOString()]
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/migrations/test-connection', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { connectionString, dbType } = req.body;
    if (!connectionString) {
      return res.status(400).json({ error: 'Connection string or URL required' });
    }
    // Validate URI format
    try {
      const parsed = new URL(connectionString);
      res.json({
        success: true,
        protocol: parsed.protocol.replace(':', ''),
        host: parsed.hostname,
        port: parsed.port || (parsed.protocol.includes('postgres') ? 5432 : 3306),
        database: parsed.pathname.replace('/', ''),
        message: `Connection parameters parsed successfully for ${dbType || 'database'}. Ready to apply migrations via pgAdmin, DBeaver, or CLI.`,
      });
    } catch {
      res.status(400).json({ error: 'Invalid connection URI format. Example: postgresql://username:password@localhost:5432/staffmonitor_db' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
