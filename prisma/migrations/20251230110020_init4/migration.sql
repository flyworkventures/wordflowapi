BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[User] ADD [dailyTestProgress] FLOAT(53) NOT NULL CONSTRAINT [User_dailyTestProgress_df] DEFAULT 0,
[quickReviewProgress] FLOAT(53) NOT NULL CONSTRAINT [User_quickReviewProgress_df] DEFAULT 0,
[readingTestProgress] FLOAT(53) NOT NULL CONSTRAINT [User_readingTestProgress_df] DEFAULT 0,
[totalProgress] FLOAT(53) NOT NULL CONSTRAINT [User_totalProgress_df] DEFAULT 0;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
