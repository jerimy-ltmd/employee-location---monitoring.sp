export type UserRole = 'ADMINISTRATOR' | 'EMPLOYEE';

export type LocationStatus =
  | 'INSIDE'
  | 'OUTSIDE'
  | 'LOCATION_UNAVAILABLE'
  | 'LOCATION_UNCERTAIN';

export interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  position: string;
  avatar: string | null;
  is_active: number;
  created_at?: string;
  location_status?: LocationStatus;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  last_location_update?: string | null;
}

export interface Building {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  accuracy_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface LocationRecord {
  id: number;
  user_id: number;
  name?: string;
  employee_id?: string;
  department?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  status: LocationStatus;
  recorded_at: string;
}

export interface LocationEvent {
  id: number;
  user_id: number;
  event_type: 'WENT_OUTSIDE' | 'RETURNED_INSIDE' | 'LOCATION_ENABLED' | 'LOCATION_DISABLED';
  latitude: number | null;
  longitude: number | null;
  recorded_at: string;
}

export interface Conversation {
  id: number;
  type: 'DIRECT' | 'GROUP';
  name: string;
  displayName?: string;
  displayAvatar?: string | null;
  otherUserId?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_time?: string;
  last_sender_name?: string;
  unread_count?: number;
  members?: User[];
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  sender_avatar?: string | null;
  sender_role?: UserRole;
  message: string;
  is_read: number;
  created_at: string;
}

export interface Ping {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name?: string;
  sender_avatar?: string;
  recipient_name?: string;
  recipient_employee_id?: string;
  recipient_department?: string;
  message: string;
  sent_at: string;
  acknowledged_at: string | null;
  status: 'PENDING' | 'ACKNOWLEDGED';
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name?: string;
  employee_id?: string;
  role?: string;
  action: string;
  metadata: string | null;
  created_at: string;
}

export interface SystemSettings {
  retention_days?: string;
  tracking_interval_seconds?: string;
  min_movement_meters?: string;
  org_name?: string;
}
