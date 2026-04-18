CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`last_login` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`user_email` text NOT NULL,
	`vehicle_id` text NOT NULL,
	`vehicle_name` text NOT NULL,
	`vehicle_license_plate` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`pickup_location` text NOT NULL,
	`return_location` text NOT NULL,
	`total_amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notification_triggers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`event` text NOT NULL,
	`channel` text NOT NULL,
	`template` text NOT NULL,
	`subject` text,
	`active` integer DEFAULT true NOT NULL,
	`send_timing` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pricing_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`value_type` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`valid_from` integer NOT NULL,
	`valid_to` integer NOT NULL,
	`priority` integer DEFAULT 10 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `security_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`action` text NOT NULL,
	`user_id` text NOT NULL,
	`ip_address` text NOT NULL,
	`user_agent` text NOT NULL,
	`details` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`name` text NOT NULL,
	`year` integer NOT NULL,
	`license_plate` text NOT NULL,
	`vin` text NOT NULL,
	`color` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`daily_rate` real NOT NULL,
	`mileage` integer NOT NULL,
	`seats` integer DEFAULT 5 NOT NULL,
	`transmission` text DEFAULT 'Automatic' NOT NULL,
	`image` text NOT NULL,
	`last_maintenance` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_license_plate_unique` ON `vehicles` (`license_plate`);--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_vin_unique` ON `vehicles` (`vin`);