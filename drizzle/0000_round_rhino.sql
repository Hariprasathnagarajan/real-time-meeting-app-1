CREATE TABLE `brand_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`company_name` text NOT NULL,
	`logo_url` text,
	`primary_color` text NOT NULL,
	`secondary_color` text NOT NULL,
	`custom_domain` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `calendar_integrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meeting_analytics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`total_participants` integer NOT NULL,
	`peak_concurrent_participants` integer NOT NULL,
	`average_duration_minutes` integer NOT NULL,
	`total_messages` integer NOT NULL,
	`total_reactions` integer NOT NULL,
	`engagement_score` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meeting_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`uploaded_by_user_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_url` text NOT NULL,
	`file_size_mb` real NOT NULL,
	`file_type` text NOT NULL,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meeting_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'participant' NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`is_audio_muted` integer DEFAULT false,
	`is_video_off` integer DEFAULT false,
	`is_screen_sharing` integer DEFAULT false,
	`is_hand_raised` integer DEFAULT false,
	`joined_at` text,
	`left_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meeting_recordings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`file_url` text NOT NULL,
	`file_size_mb` real NOT NULL,
	`duration_minutes` integer NOT NULL,
	`transcription_text` text,
	`recording_type` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meeting_reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`reminder_type` text NOT NULL,
	`scheduled_for` text NOT NULL,
	`sent_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`host_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`meeting_code` text NOT NULL,
	`password` text,
	`scheduled_start_time` text NOT NULL,
	`scheduled_end_time` text,
	`actual_start_time` text,
	`actual_end_time` text,
	`is_recording_enabled` integer DEFAULT false,
	`is_waiting_room_enabled` integer DEFAULT true,
	`is_password_protected` integer DEFAULT false,
	`max_participants` integer DEFAULT 100,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`host_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meetings_meeting_code_unique` ON `meetings` (`meeting_code`);--> statement-breakpoint
CREATE TABLE `poll_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`poll_id` integer NOT NULL,
	`user_id` text,
	`response` text NOT NULL,
	`responded_at` text NOT NULL,
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`created_by_user_id` text NOT NULL,
	`question` text NOT NULL,
	`poll_type` text NOT NULL,
	`options` text NOT NULL,
	`is_anonymous` integer DEFAULT true,
	`is_active` integer DEFAULT true,
	`ends_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`reaction_type` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`email_verified` integer DEFAULT false,
	`image` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `whiteboard_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` integer NOT NULL,
	`whiteboard_data` text NOT NULL,
	`last_updated_by_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_updated_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
