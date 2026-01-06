/*
  Warnings:

  - The primary key for the `Word` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
BEGIN TRY

BEGIN TRAN;

-- RedefineTables
BEGIN TRANSACTION;
ALTER TABLE [dbo].[Word] DROP CONSTRAINT [Word_word_key];
DECLARE @SQL NVARCHAR(MAX) = N''
SELECT @SQL += N'ALTER TABLE '
    + QUOTENAME(OBJECT_SCHEMA_NAME(PARENT_OBJECT_ID))
    + '.'
    + QUOTENAME(OBJECT_NAME(PARENT_OBJECT_ID))
    + ' DROP CONSTRAINT '
    + OBJECT_NAME(OBJECT_ID) + ';'
FROM SYS.OBJECTS
WHERE TYPE_DESC LIKE '%CONSTRAINT'
    AND OBJECT_NAME(PARENT_OBJECT_ID) = 'Word'
    AND SCHEMA_NAME(SCHEMA_ID) = 'dbo'
EXEC sp_executesql @SQL
;
CREATE TABLE [dbo].[_prisma_new_Word] (
    [id] NVARCHAR(1000) NOT NULL,
    [word] NVARCHAR(1000) NOT NULL,
    [level] NVARCHAR(1000) NOT NULL,
    [translate_en] NVARCHAR(max),
    [translate_tr] NVARCHAR(max),
    [translate_de] NVARCHAR(max),
    [pronunciation_en] NVARCHAR(max),
    [pronunciation_tr] NVARCHAR(max),
    [pronunciation_de] NVARCHAR(max),
    [sentence_en] NVARCHAR(max),
    [sentence_tr] NVARCHAR(max),
    [sentence_de] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Word_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Word_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Word_word_key] UNIQUE NONCLUSTERED ([word])
);
IF EXISTS(SELECT * FROM [dbo].[Word])
    EXEC('INSERT INTO [dbo].[_prisma_new_Word] ([createdAt],[id],[level],[pronunciation_de],[pronunciation_en],[pronunciation_tr],[sentence_de],[sentence_en],[sentence_tr],[translate_de],[translate_en],[translate_tr],[updatedAt],[word]) SELECT [createdAt],[id],[level],[pronunciation_de],[pronunciation_en],[pronunciation_tr],[sentence_de],[sentence_en],[sentence_tr],[translate_de],[translate_en],[translate_tr],[updatedAt],[word] FROM [dbo].[Word] WITH (holdlock tablockx)');
DROP TABLE [dbo].[Word];
EXEC SP_RENAME N'dbo._prisma_new_Word', N'Word';
COMMIT;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
