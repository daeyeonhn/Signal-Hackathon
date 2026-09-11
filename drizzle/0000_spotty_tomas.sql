CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`answers_json` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`submitted_at` text,
	`decision_at` text,
	`decision_note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "application_type" CHECK("applications"."type" IN ('hacker','mentor')),
	CONSTRAINT "application_status" CHECK("applications"."status" IN ('draft','submitted','in_review','accepted','waitlisted','rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_owner` ON `applications` (`owner_id`);--> statement-breakpoint
CREATE INDEX `applications_workspace_status` ON `applications` (`workspace_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `demo_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_application` ON `events` (`application_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "profile_role" CHECK("profiles"."role" IN ('unassigned','hacker','mentor','organizer'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_workspace_identity` ON `profiles` (`workspace_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`curiosity` integer NOT NULL,
	`craft` integer NOT NULL,
	`collaboration` integer NOT NULL,
	`notes` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "curiosity_range" CHECK("reviews"."curiosity" BETWEEN 1 AND 5),
	CONSTRAINT "craft_range" CHECK("reviews"."craft" BETWEEN 1 AND 5),
	CONSTRAINT "collaboration_range" CHECK("reviews"."collaboration" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_application_reviewer` ON `reviews` (`application_id`,`reviewer_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`expires_at` integer,
	CONSTRAINT "workspace_kind" CHECK("workspaces"."kind" IN ('live','demo'))
);
