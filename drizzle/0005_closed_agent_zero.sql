ALTER TABLE `artifacts` ADD `fragmentTitle` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `artifacts` ADD `fragmentEra` varchar(96) NOT NULL;--> statement-breakpoint
ALTER TABLE `artifacts` ADD `fragmentBody` text NOT NULL;--> statement-breakpoint
ALTER TABLE `vaultSettings` ADD `handsetGuideStage` enum('attention','retain','north','complete','dismissed') DEFAULT 'attention' NOT NULL;--> statement-breakpoint
ALTER TABLE `vaultSettings` ADD `observatoryEra` enum('founding','returning') DEFAULT 'founding' NOT NULL;