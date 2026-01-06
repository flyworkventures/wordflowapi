/*
  Warnings:

  - The primary key for the `Word` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `pronunciation_de` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `pronunciation_en` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `pronunciation_tr` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `sentence_de` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `sentence_en` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `sentence_tr` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `translate_de` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `translate_en` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `translate_tr` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `word` on the `Word` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Word` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `category` to the `Word` table without a default value. This is not possible if the table is not empty.
  - Added the required column `translation` to the `Word` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wordText` to the `Word` table without a default value. This is not possible if the table is not empty.

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
    [id] INT NOT NULL IDENTITY(1,1),
    [wordText] NVARCHAR(1000) NOT NULL,
    [translation] NVARCHAR(1000) NOT NULL,
    [level] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Word_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Word_pkey] PRIMARY KEY CLUSTERED ([id])
);
SET IDENTITY_INSERT [dbo].[_prisma_new_Word] ON;
IF EXISTS(SELECT * FROM [dbo].[Word])
    EXEC('INSERT INTO [dbo].[_prisma_new_Word] ([createdAt],[id],[level]) SELECT [createdAt],[id],[level] FROM [dbo].[Word] WITH (holdlock tablockx)');
SET IDENTITY_INSERT [dbo].[_prisma_new_Word] OFF;
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
