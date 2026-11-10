-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'Unknown',
    `phone` VARCHAR(32) NOT NULL,
    `email` VARCHAR(255) NULL,
    `company` VARCHAR(255) NULL,
    `source` VARCHAR(32) NOT NULL DEFAULT 'whatsapp',
    `status` ENUM('NEW', 'QUALIFYING', 'QUALIFIED', 'UNQUALIFIED', 'MEETING_BOOKED') NOT NULL DEFAULT 'NEW',
    `score` INTEGER NOT NULL DEFAULT 0,
    `need` TEXT NULL,
    `budget` VARCHAR(255) NULL,
    `timeline` VARCHAR(255) NULL,
    `authority` VARCHAR(255) NULL,
    `summary` TEXT NULL,
    `proposedSlots` JSON NULL,
    `followUpDueAt` DATETIME(3) NULL,
    `followUpSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lead_phone_key`(`phone`),
    INDEX `Lead_status_idx`(`status`),
    INDEX `Lead_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `direction` ENUM('INBOUND', 'OUTBOUND') NOT NULL,
    `body` TEXT NOT NULL,
    `externalId` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Message_externalId_key`(`externalId`),
    INDEX `Message_leadId_createdAt_idx`(`leadId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Meeting` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `status` ENUM('BOOKED', 'CANCELLED') NOT NULL DEFAULT 'BOOKED',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Meeting_leadId_idx`(`leadId`),
    INDEX `Meeting_startsAt_idx`(`startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
