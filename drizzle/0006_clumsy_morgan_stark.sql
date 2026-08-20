CREATE TABLE `userArtifactFragments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`artifactId` varchar(64) NOT NULL,
	`discoveredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userArtifactFragments_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_artifact_fragment_unique` UNIQUE(`userId`,`artifactId`)
);
--> statement-breakpoint
ALTER TABLE `vaultHistory` MODIFY COLUMN `eventType` enum('entry','discovery','fragment','visit','note','conversation','unlock','setting') NOT NULL;