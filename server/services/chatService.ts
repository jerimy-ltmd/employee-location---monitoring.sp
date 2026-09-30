import { getDb, queryAll, queryOne, runSql } from '../database/db.ts';

export async function getUserConversations(userId: number) {
  const db = await getDb();
  const sql = `
    SELECT
      c.id,
      c.type,
      c.name,
      c.created_by,
      c.created_at,
      c.updated_at,
      (
        SELECT m.message
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.id DESC LIMIT 1
      ) as last_message,
      (
        SELECT m.created_at
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.id DESC LIMIT 1
      ) as last_message_time,
      (
        SELECT u2.name
        FROM messages m2
        JOIN users u2 ON m2.sender_id = u2.id
        WHERE m2.conversation_id = c.id
        ORDER BY m2.id DESC LIMIT 1
      ) as last_sender_name,
      (
        SELECT COUNT(*)
        FROM messages m3
        WHERE m3.conversation_id = c.id
          AND m3.sender_id != ?
          AND m3.is_read = 0
      ) as unread_count
    FROM conversations c
    JOIN conversation_members cm ON c.id = cm.conversation_id
    WHERE cm.user_id = ?
    ORDER BY c.updated_at DESC
  `;

  const convos = queryAll(db, sql, [userId, userId]);

  // Enhance each conversation with member information
  for (const convo of convos) {
    const members = queryAll(
      db,
      `SELECT u.id, u.name, u.email, u.role, u.department, u.position, u.avatar
       FROM conversation_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.conversation_id = ?`,
      [convo.id]
    );
    convo.members = members;

    // For DIRECT chat, compute dynamic name & avatar of the other party
    if (convo.type === 'DIRECT') {
      const other = members.find((m: any) => m.id !== userId);
      if (other) {
        convo.displayName = other.name;
        convo.displayAvatar = other.avatar;
        convo.otherUserId = other.id;
      } else {
        convo.displayName = convo.name;
      }
    } else {
      convo.displayName = convo.name;
    }
  }

  return convos;
}

export async function getConversationMessages(conversationId: number, currentUserId: number, limit: number = 100) {
  const db = await getDb();
  // Verify current user is a member
  const isMember = queryOne(
    db,
    `SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?`,
    [conversationId, currentUserId]
  );
  if (!isMember) {
    throw new Error('Not authorized to access this conversation');
  }

  const messages = queryAll(
    db,
    `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = ?
     ORDER BY m.id ASC
     LIMIT ?`,
    [conversationId, limit]
  );

  // Mark unread messages sent by others as read
  runSql(
    db,
    `UPDATE messages SET is_read = 1
     WHERE conversation_id = ? AND sender_id != ? AND is_read = 0`,
    [conversationId, currentUserId]
  );

  return messages;
}

export async function sendMessage(conversationId: number, senderId: number, messageText: string) {
  const db = await getDb();
  const now = new Date().toISOString();

  // Verify membership
  const member = queryOne(
    db,
    `SELECT id FROM conversation_members WHERE conversation_id = ? AND user_id = ?`,
    [conversationId, senderId]
  );
  if (!member) {
    throw new Error('You are not a member of this conversation');
  }

  const res = runSql(
    db,
    `INSERT INTO messages (conversation_id, sender_id, message, is_read, created_at)
     VALUES (?, ?, ?, 0, ?)`,
    [conversationId, senderId, messageText.trim(), now]
  );

  runSql(db, `UPDATE conversations SET updated_at = ? WHERE id = ?`, [now, conversationId]);

  const inserted = queryOne(
    db,
    `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar, u.role as sender_role
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.id = ?`,
    [res.lastId]
  );

  // Get recipient user IDs for notification/websocket delivery
  const members = queryAll(
    db,
    `SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?`,
    [conversationId, senderId]
  );

  return { message: inserted, recipientIds: members.map((m: any) => m.user_id) };
}

export async function getOrCreateDirectConversation(userId1: number, userId2: number) {
  const db = await getDb();
  const now = new Date().toISOString();

  // Check if direct conversation already exists between both users
  const existing = queryOne(
    db,
    `SELECT c.id
     FROM conversations c
     JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
     JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
     WHERE c.type = 'DIRECT'
     LIMIT 1`,
    [userId1, userId2]
  );

  if (existing) {
    return existing.id;
  }

  const u2 = queryOne(db, `SELECT name FROM users WHERE id = ?`, [userId2]);
  const convoRes = runSql(
    db,
    `INSERT INTO conversations (type, name, created_by, created_at, updated_at)
     VALUES ('DIRECT', ?, ?, ?, ?)`,
    [u2 ? `Direct: ${u2.name}` : 'Direct Conversation', userId1, now, now]
  );

  runSql(db, `INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`, [convoRes.lastId, userId1, now]);
  runSql(db, `INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`, [convoRes.lastId, userId2, now]);

  return convoRes.lastId;
}

export async function createGroupConversation(creatorId: number, groupName: string, memberIds: number[]) {
  const db = await getDb();
  const now = new Date().toISOString();

  const convoRes = runSql(
    db,
    `INSERT INTO conversations (type, name, created_by, created_at, updated_at)
     VALUES ('GROUP', ?, ?, ?, ?)`,
    [groupName.trim(), creatorId, now, now]
  );

  const convoId = convoRes.lastId;

  // Add creator
  runSql(db, `INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`, [convoId, creatorId, now]);

  // Add other members
  for (const mid of memberIds) {
    if (mid !== creatorId) {
      runSql(db, `INSERT INTO conversation_members (conversation_id, user_id, joined_at) VALUES (?, ?, ?)`, [convoId, mid, now]);
    }
  }

  return convoId;
}
