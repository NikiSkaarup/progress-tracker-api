CREATE TABLE `bookmark` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`href` text NOT NULL,
	`finished` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookmark_tag` (
	`bookmark_id` integer,
	`tag_id` integer,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`bookmark_id`, `tag_id`),
	FOREIGN KEY (`bookmark_id`) REFERENCES `bookmark`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`variant` text DEFAULT 'default' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bookmarkFinishedIndex` ON `bookmark` (`finished`) WHERE finished = 1;