BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Quiz] (
    [id] NVARCHAR(1000) NOT NULL,
    [word] NVARCHAR(1000) NOT NULL,
    [correct_answer] NVARCHAR(max) NOT NULL,
    [question_en] NVARCHAR(max) NOT NULL,
    [options_en] NVARCHAR(max) NOT NULL,
    [question_tr] NVARCHAR(max) NOT NULL,
    [options_tr] NVARCHAR(max) NOT NULL,
    [question_de] NVARCHAR(max) NOT NULL,
    [options_de] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Quiz_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Quiz_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Quiz_word_idx] ON [dbo].[Quiz]([word]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
