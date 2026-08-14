CREATE TABLE `aiConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roomId` varchar(64) NOT NULL,
	`role` enum('user','aria') NOT NULL,
	`content` text NOT NULL,
	`actionType` varchar(64),
	`actionPayload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `artifacts` (
	`id` varchar(64) NOT NULL,
	`objectId` varchar(64) NOT NULL,
	`title` varchar(120) NOT NULL,
	`subtitle` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`category` varchar(48) NOT NULL,
	`accent` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `artifacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `artifacts_objectId_unique` UNIQUE(`objectId`)
);
--> statement-breakpoint
CREATE TABLE `discoveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`objectId` varchar(64) NOT NULL,
	`artifactId` varchar(64),
	`discoveredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discoveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_object_discovery_unique` UNIQUE(`userId`,`objectId`)
);
--> statement-breakpoint
CREATE TABLE `experimentNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `experimentNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` varchar(64) NOT NULL,
	`title` varchar(96) NOT NULL,
	`description` text NOT NULL,
	`visualTone` varchar(32) NOT NULL,
	`sortOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`actionType` varchar(64) NOT NULL,
	`source` varchar(64) NOT NULL,
	`targetId` varchar(64),
	`payload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userRoomStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roomId` varchar(64) NOT NULL,
	`isUnlocked` boolean NOT NULL DEFAULT false,
	`firstVisitedAt` timestamp,
	`lastVisitedAt` timestamp,
	CONSTRAINT `userRoomStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_room_unique` UNIQUE(`userId`,`roomId`)
);
--> statement-breakpoint
CREATE TABLE `vaultHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('entry','discovery','visit','note','conversation','unlock','setting') NOT NULL,
	`title` varchar(160) NOT NULL,
	`detail` text NOT NULL,
	`targetId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vaultHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vaultObjects` (
	`id` varchar(64) NOT NULL,
	`roomId` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`objectType` enum('artifact','door','entity','terminal','unknown') NOT NULL,
	`description` text NOT NULL,
	`interactionHint` varchar(180) NOT NULL,
	`unlocksRoomId` varchar(64),
	`accessibleLabel` varchar(180) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vaultObjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vaultPermissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`permission` enum('save_note','aria_context','aria_navigation') NOT NULL,
	`allowed` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vaultPermissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_permission_unique` UNIQUE(`userId`,`permission`)
);
--> statement-breakpoint
CREATE TABLE `vaultSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`soundEnabled` boolean NOT NULL DEFAULT false,
	`reducedMotion` boolean NOT NULL DEFAULT false,
	`highContrast` boolean NOT NULL DEFAULT false,
	`preferFallback` boolean NOT NULL DEFAULT false,
	`introSeen` boolean NOT NULL DEFAULT false,
	`lastRoomId` varchar(64) NOT NULL DEFAULT 'central-chamber',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vaultSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `vaultSettings_userId_unique` UNIQUE(`userId`)
);
