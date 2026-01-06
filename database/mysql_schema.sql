-- =====================================================
-- Wordflow Backend - MySQL/MariaDB Database Schema
-- phpMyAdmin için hazırlanmış SQL script
-- =====================================================
-- 
-- KULLANIM:
-- 1. phpMyAdmin'de veritabanınızı seçin (veya oluşturun)
-- 2. SQL sekmesine gidin
-- 3. Bu script'i yapıştırın ve çalıştırın
-- 
-- NOT: phpMyAdmin'de veritabanı zaten seçili olduğu için
--      CREATE DATABASE ve USE komutları gerekmez
-- =====================================================

-- =====================================================
-- 1. Word Tablosu
-- =====================================================
CREATE TABLE IF NOT EXISTS `Word` (
    `id` VARCHAR(36) NOT NULL,
    `word` VARCHAR(255) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `translate_en` TEXT NULL,
    `translate_tr` TEXT NULL,
    `translate_de` TEXT NULL,
    `pronunciation_en` TEXT NULL,
    `pronunciation_tr` TEXT NULL,
    `pronunciation_de` TEXT NULL,
    `sentence_en` TEXT NULL,
    `sentence_tr` TEXT NULL,
    `sentence_de` TEXT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `Word_word_key` (`word`),
    KEY `Word_level_idx` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. User Tablosu
-- =====================================================
CREATE TABLE IF NOT EXISTS `User` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL DEFAULT 'Guest',
    `email` VARCHAR(255) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `learnLanguage` VARCHAR(10) NOT NULL DEFAULT 'en',
    `dailyGoal` INT NOT NULL DEFAULT 15,
    `interests` TEXT NULL,
    `isPremium` TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `devicePublicKey` TEXT NULL,
    `lastCounter` INT NULL DEFAULT 0,
    `refreshToken` TEXT NULL,
    `avatar` VARCHAR(500) NULL,
    `wordPracticeProgress` FLOAT NOT NULL DEFAULT 0.0,
    `isAnsweredQuestions` TINYINT(1) NOT NULL DEFAULT 0,
    `wordPracticeOffset` INT NOT NULL DEFAULT 0,
    `profileSummary` TEXT NULL,
    `readingPracticeOffset` INT NOT NULL DEFAULT 0,
    `savedWords` TEXT NULL,
    `language` VARCHAR(10) NOT NULL DEFAULT 'tr',
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Europe/Istanbul',
    `lastActivityAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `oneSignalId` VARCHAR(255) NULL,
    `lastNotificationLevel` VARCHAR(50) NULL,
    `lastNotificationSentAt` DATETIME NULL,
    `quickReviewProgress` FLOAT NOT NULL DEFAULT 0,
    `readingTestProgress` FLOAT NOT NULL DEFAULT 0,
    `dailyTestProgress` FLOAT NOT NULL DEFAULT 0,
    `totalProgress` FLOAT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `User_email_key` (`email`),
    KEY `User_level_idx` (`level`),
    KEY `User_lastActivityAt_idx` (`lastActivityAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. SocialAccount Tablosu
-- =====================================================
CREATE TABLE IF NOT EXISTS `SocialAccount` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(50) NOT NULL,
    `providerId` VARCHAR(255) NOT NULL,
    `userId` INT NOT NULL,
    `refreshToken` TEXT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `SocialAccount_provider_providerId_key` (`provider`, `providerId`),
    KEY `SocialAccount_userId_idx` (`userId`),
    CONSTRAINT `SocialAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. Notification Tablosu
-- =====================================================
CREATE TABLE IF NOT EXISTS `Notification` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `isRead` TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `userId` INT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `Notification_userId_idx` (`userId`),
    KEY `Notification_isRead_idx` (`isRead`),
    KEY `Notification_createdAt_idx` (`createdAt`),
    CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. Quiz Tablosu
-- =====================================================
CREATE TABLE IF NOT EXISTS `Quiz` (
    `id` VARCHAR(36) NOT NULL,
    `word` VARCHAR(255) NOT NULL,
    `correct_answer` TEXT NOT NULL,
    `question_en` TEXT NOT NULL,
    `options_en` TEXT NOT NULL,
    `question_tr` TEXT NOT NULL,
    `options_tr` TEXT NOT NULL,
    `question_de` TEXT NOT NULL,
    `options_de` TEXT NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `Quiz_word_idx` (`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Index'ler ve Optimizasyonlar
-- =====================================================

-- Word tablosu için ek index'ler
CREATE INDEX IF NOT EXISTS `Word_createdAt_idx` ON `Word` (`createdAt`);

-- User tablosu için ek index'ler
CREATE INDEX IF NOT EXISTS `User_isPremium_idx` ON `User` (`isPremium`);
CREATE INDEX IF NOT EXISTS `User_createdAt_idx` ON `User` (`createdAt`);

-- =====================================================
-- Tamamlandı
-- =====================================================

