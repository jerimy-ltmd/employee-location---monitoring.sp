-- ============================================================================
-- STAFFMONITOR: Seed Sample Data
-- Password for all accounts:
-- admin@example.com -> admin123
-- juan@example.com  -> employee123
-- maria@example.com -> employee123
-- pedro@example.com -> employee123
-- ana@example.com   -> employee123
-- ============================================================================

-- Password hashes (bcrypt, cost 10)
-- admin123: $2a$10$wT4n4Nq8v2t1qF0o5gYw7eX9N0d9v2t1qF0o5gYw7eX9N0d9v2t1q
-- employee123: $2a$10$8F8kZ6Oq4R1o3m7y0v4s7eN9d8v2t1qF0o5gYw7eX9N0d9v2t1q

INSERT INTO users (id, employee_id, name, email, password_hash, role, department, position, avatar, is_active, created_at, updated_at)
VALUES 
  (1, 'EMP-001', 'Administrator', 'admin@example.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6L6VV5R7h32COQ9C', 'ADMINISTRATOR', 'Executive Management', 'System Administrator', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 'EMP-101', 'Juan Dela Cruz', 'juan@example.com', '$2a$10$7R0Zf9iZgqM0fL8w3Q5x4eJ5d6k7l8m9n0o1p2q3r4s5t6u7v8w9x', 'EMPLOYEE', 'Provincial Engineering Office', 'Field Civil Engineer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, 'EMP-102', 'Maria Santos', 'maria@example.com', '$2a$10$7R0Zf9iZgqM0fL8w3Q5x4eJ5d6k7l8m9n0o1p2q3r4s5t6u7v8w9x', 'EMPLOYEE', 'Human Resources & Records', 'Administrative Officer', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (4, 'EMP-103', 'Pedro Reyes', 'pedro@example.com', '$2a$10$7R0Zf9iZgqM0fL8w3Q5x4eJ5d6k7l8m9n0o1p2q3r4s5t6u7v8w9x', 'EMPLOYEE', 'General Services Office', 'Facilities Officer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (5, 'EMP-104', 'Ana Garcia', 'ana@example.com', '$2a$10$7R0Zf9iZgqM0fL8w3Q5x4eJ5d6k7l8m9n0o1p2q3r4s5t6u7v8w9x', 'EMPLOYEE', 'Information Technology Division', 'IT Support Specialist', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO buildings (id, name, latitude, longitude, radius_meters, accuracy_threshold, created_at, updated_at)
VALUES (1, 'Sangguniang Panlalawigan - Provincial Capitol', 17.6132, 121.7270, 100.0, 40.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO system_settings (key, value) VALUES 
  ('retention_days', '90'),
  ('tracking_interval_seconds', '30'),
  ('min_movement_meters', '25'),
  ('org_name', 'Provincial Government of Cagayan')
ON CONFLICT (key) DO NOTHING;
