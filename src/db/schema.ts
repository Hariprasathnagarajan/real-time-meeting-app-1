import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// User table (Better Auth compatibility)
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const meetings = sqliteTable('meetings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hostUserId: text('host_user_id').notNull().references(() => user.id),
  title: text('title').notNull(),
  description: text('description'),
  meetingCode: text('meeting_code').notNull().unique(),
  passwordHash: text('password_hash'),
  scheduledStartTime: text('scheduled_start_time').notNull(),
  scheduledEndTime: text('scheduled_end_time'),
  actualStartTime: text('actual_start_time'),
  actualEndTime: text('actual_end_time'),
  isRecordingEnabled: integer('is_recording_enabled', { mode: 'boolean' }).default(false),
  isWaitingRoomEnabled: integer('is_waiting_room_enabled', { mode: 'boolean' }).default(true),
  isPasswordProtected: integer('is_password_protected', { mode: 'boolean' }).default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).default(false),
  allowScreenShare: integer('allow_screen_share', { mode: 'boolean' }).default(true),
  allowChat: integer('allow_chat', { mode: 'boolean' }).default(true),
  allowUnmute: integer('allow_unmute', { mode: 'boolean' }).default(true),
  allowVideo: integer('allow_video', { mode: 'boolean' }).default(true),
  allowRename: integer('allow_rename', { mode: 'boolean' }).default(true),
  maxParticipants: integer('max_participants').default(100),
  status: text('status').notNull().default('scheduled'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const meetingParticipants = sqliteTable('meeting_participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  userId: text('user_id').references(() => user.id),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('participant'),
  status: text('status').notNull().default('waiting'),
  isAudioMuted: integer('is_audio_muted', { mode: 'boolean' }).default(false),
  isVideoOff: integer('is_video_off', { mode: 'boolean' }).default(false),
  isScreenSharing: integer('is_screen_sharing', { mode: 'boolean' }).default(false),
  isHandRaised: integer('is_hand_raised', { mode: 'boolean' }).default(false),
  joinedAt: text('joined_at'),
  leftAt: text('left_at'),
  createdAt: text('created_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  userId: text('user_id').references(() => user.id),
  senderName: text('sender_name').notNull(),
  recipientUserId: text('recipient_user_id'),
  recipientName: text('recipient_name'),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
});

export const meetingRecordings = sqliteTable('meeting_recordings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  fileUrl: text('file_url').notNull(),
  fileSizeMb: real('file_size_mb').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  transcriptionText: text('transcription_text'),
  recordingType: text('recording_type').notNull(),
  status: text('status').notNull().default('processing'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
});

export const polls = sqliteTable('polls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  createdByUserId: text('created_by_user_id').notNull().references(() => user.id),
  question: text('question').notNull(),
  pollType: text('poll_type').notNull(),
  options: text('options', { mode: 'json' }).notNull(),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).default(true),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  endsAt: text('ends_at'),
  createdAt: text('created_at').notNull(),
});

export const pollResponses = sqliteTable('poll_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pollId: integer('poll_id').notNull().references(() => polls.id),
  userId: text('user_id').references(() => user.id),
  response: text('response', { mode: 'json' }).notNull(),
  respondedAt: text('responded_at').notNull(),
});

export const reactions = sqliteTable('reactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  userId: text('user_id').notNull().references(() => user.id),
  reactionType: text('reaction_type').notNull(),
  createdAt: text('created_at').notNull(),
});

export const meetingFiles = sqliteTable('meeting_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  uploadedByUserId: text('uploaded_by_user_id').notNull().references(() => user.id),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSizeMb: real('file_size_mb').notNull(),
  fileType: text('file_type').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
});

export const whiteboardSessions = sqliteTable('whiteboard_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  whiteboardData: text('whiteboard_data', { mode: 'json' }).notNull(),
  lastUpdatedByUserId: text('last_updated_by_user_id').references(() => user.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const breakoutRooms = sqliteTable('breakout_rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  name: text('name').notNull(),
  assignedParticipantIds: text('assigned_participant_ids', { mode: 'json' }).notNull(),
  status: text('status').notNull().default('closed'),
  createdAt: text('created_at').notNull(),
});

export const signalingMessages = sqliteTable('signaling_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingCode: text('meeting_code').notNull(),
  senderId: text('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  targetId: text('target_id').notNull(),
  type: text('type').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull(),
});

export const meetingAnalytics = sqliteTable('meeting_analytics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  totalParticipants: integer('total_participants').notNull(),
  peakConcurrentParticipants: integer('peak_concurrent_participants').notNull(),
  averageDurationMinutes: integer('average_duration_minutes').notNull(),
  totalMessages: integer('total_messages').notNull(),
  totalReactions: integer('total_reactions').notNull(),
  engagementScore: real('engagement_score'),
  createdAt: text('created_at').notNull(),
});

export const calendarIntegrations = sqliteTable('calendar_integrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id),
  provider: text('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const meetingReminders = sqliteTable('meeting_reminders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  userId: text('user_id').notNull().references(() => user.id),
  reminderType: text('reminder_type').notNull(),
  scheduledFor: text('scheduled_for').notNull(),
  sentAt: text('sent_at'),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at').notNull(),
});

export const brandSettings = sqliteTable('brand_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id),
  companyName: text('company_name').notNull(),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').notNull(),
  secondaryColor: text('secondary_color').notNull(),
  customDomain: text('custom_domain'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
