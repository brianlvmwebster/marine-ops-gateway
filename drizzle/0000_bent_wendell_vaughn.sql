CREATE TABLE `gateway` (
	`id` text PRIMARY KEY NOT NULL,
	`contents` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
