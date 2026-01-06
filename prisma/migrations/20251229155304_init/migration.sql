BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Word] (
    [id] INT NOT NULL IDENTITY(1,1),
    [wordText] NVARCHAR(1000) NOT NULL,
    [translation] NVARCHAR(1000) NOT NULL,
    [level] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Word_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Word_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL CONSTRAINT [User_name_df] DEFAULT 'Guest',
    [email] NVARCHAR(1000) NOT NULL,
    [level] NVARCHAR(1000) NOT NULL,
    [learnLanguage] NVARCHAR(1000) NOT NULL CONSTRAINT [User_learnLanguage_df] DEFAULT 'en',
    [dailyGoal] INT NOT NULL CONSTRAINT [User_dailyGoal_df] DEFAULT 15,
    [interests] NVARCHAR(1000) NOT NULL,
    [isPremium] BIT NOT NULL CONSTRAINT [User_isPremium_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [devicePublicKey] NVARCHAR(max),
    [lastCounter] INT CONSTRAINT [User_lastCounter_df] DEFAULT 0,
    [refreshToken] NVARCHAR(max),
    [avatar] NVARCHAR(1000),
    [isAnsweredQuestions] BIT NOT NULL CONSTRAINT [User_isAnsweredQuestions_df] DEFAULT 0,
    [wordPracticeOffset] INT NOT NULL CONSTRAINT [User_wordPracticeOffset_df] DEFAULT 0,
    [profileSummary] NVARCHAR(max),
    [readingPracticeOffset] INT NOT NULL CONSTRAINT [User_readingPracticeOffset_df] DEFAULT 0,
    [savedWords] NVARCHAR(max),
    [language] NVARCHAR(1000) NOT NULL CONSTRAINT [User_language_df] DEFAULT 'tr',
    [timezone] NVARCHAR(1000) NOT NULL CONSTRAINT [User_timezone_df] DEFAULT 'Europe/Istanbul',
    [lastActivityAt] DATETIME2 NOT NULL CONSTRAINT [User_lastActivityAt_df] DEFAULT CURRENT_TIMESTAMP,
    [oneSignalId] NVARCHAR(1000),
    [lastNotificationLevel] NVARCHAR(1000),
    [lastNotificationSentAt] DATETIME2,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[SocialAccount] (
    [id] INT NOT NULL IDENTITY(1,1),
    [provider] NVARCHAR(1000) NOT NULL,
    [providerId] NVARCHAR(1000) NOT NULL,
    [userId] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [SocialAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [SocialAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SocialAccount_provider_providerId_key] UNIQUE NONCLUSTERED ([provider],[providerId])
);

-- AddForeignKey
ALTER TABLE [dbo].[SocialAccount] ADD CONSTRAINT [SocialAccount_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
