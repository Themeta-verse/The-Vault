CREATE TABLE `objectRelationships` (
	`id` varchar(80) NOT NULL,
	`sourceObjectId` varchar(64) NOT NULL,
	`targetObjectId` varchar(64) NOT NULL,
	`relationshipType` enum('reveals','resonates_with','unlocks','interprets','created_from') NOT NULL,
	`label` varchar(160) NOT NULL,
	`requiredSourceState` enum('unknown','observed','interacted','discovered','understood','unlocked','mastered') NOT NULL DEFAULT 'discovered',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `objectRelationships_id` PRIMARY KEY(`id`),
	CONSTRAINT `object_relationship_unique` UNIQUE(`sourceObjectId`,`targetObjectId`,`relationshipType`)
);
--> statement-breakpoint
CREATE TABLE `userCreations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceNoteId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`status` enum('result','artifact') NOT NULL DEFAULT 'result',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userCreations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_creation_source_note_unique` UNIQUE(`userId`,`sourceNoteId`)
);
--> statement-breakpoint
CREATE TABLE `userObjectStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`objectId` varchar(64) NOT NULL,
	`state` enum('unknown','observed','interacted','discovered','understood','unlocked','mastered') NOT NULL DEFAULT 'unknown',
	`observedAt` timestamp,
	`interactedAt` timestamp,
	`discoveredAt` timestamp,
	`understoodAt` timestamp,
	`masteredAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userObjectStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_object_state_unique` UNIQUE(`userId`,`objectId`)
);
