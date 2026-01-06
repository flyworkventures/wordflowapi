/*
  Warnings:

  - You are about to drop the column `category` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `translation` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `wordText` on the `Word` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[word]` on the table `Word` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Word` table without a default value. This is not possible if the table is not empty.
  - Added the required column `word` to the `Word` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Word] DROP COLUMN [category],
[translation],
[wordText];
ALTER TABLE [dbo].[Word] ADD [pronunciation_de] NVARCHAR(max),
[pronunciation_en] NVARCHAR(max),
[pronunciation_tr] NVARCHAR(max),
[sentence_de] NVARCHAR(max),
[sentence_en] NVARCHAR(max),
[sentence_tr] NVARCHAR(max),
[translate_de] NVARCHAR(max),
[translate_en] NVARCHAR(max),
[translate_tr] NVARCHAR(max),
[updatedAt] DATETIME2 NOT NULL,
[word] NVARCHAR(1000) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[Word] ADD CONSTRAINT [Word_word_key] UNIQUE NONCLUSTERED ([word]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
