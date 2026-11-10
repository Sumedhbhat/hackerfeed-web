CREATE TABLE `palettes` (
	`id` text PRIMARY KEY NOT NULL,
	`appUserId` text NOT NULL,
	`name` text NOT NULL,
	`baseRole` text NOT NULL,
	`baseColor` text NOT NULL,
	`accentColor` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "palettes_base_role_check" CHECK("palettes"."baseRole" in ('background', 'text')),
	CONSTRAINT "palettes_base_color_check" CHECK("palettes"."baseColor" glob '#[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]'),
	CONSTRAINT "palettes_accent_color_check" CHECK("palettes"."accentColor" glob '#[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]')
);
--> statement-breakpoint
CREATE INDEX `palettes_app_user_id_created_at_id_idx` ON `palettes` (`appUserId`,`createdAt`,`id`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`appUserId` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`paletteId` text,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`appUserId`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_preferences_mode_check" CHECK("user_preferences"."mode" in ('light', 'dark', 'auto'))
);
