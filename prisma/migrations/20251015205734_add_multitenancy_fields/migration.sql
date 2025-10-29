/*
  Warnings:

  - Added the required column `accountId` to the `ClientProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountId` to the `Worker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN "accountId" INTEGER;
UPDATE "ClientProfile" SET "accountId" = 1 WHERE "accountId" IS NULL;
ALTER TABLE "ClientProfile" ALTER COLUMN "accountId" SET NOT NULL;

-- AlterTable
CREATE SEQUENCE companysettings_id_seq;
ALTER TABLE "CompanySettings" ALTER COLUMN "id" SET DEFAULT nextval('companysettings_id_seq');
ALTER SEQUENCE companysettings_id_seq OWNED BY "CompanySettings"."id";
SELECT setval('companysettings_id_seq', COALESCE((SELECT MAX("id") FROM "CompanySettings"), 1));

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "accountId" INTEGER;
UPDATE "Project" SET "accountId" = 1 WHERE "accountId" IS NULL;
ALTER TABLE "Project" ALTER COLUMN "accountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "accountId" INTEGER;
UPDATE "Team" SET "accountId" = 1 WHERE "accountId" IS NULL;
ALTER TABLE "Team" ALTER COLUMN "accountId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN "accountId" INTEGER;
UPDATE "Worker" SET "accountId" = 1 WHERE "accountId" IS NULL;
ALTER TABLE "Worker" ALTER COLUMN "accountId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ClientProfile_accountId_idx" ON "ClientProfile"("accountId");

-- CreateIndex
CREATE INDEX "Project_accountId_idx" ON "Project"("accountId");

-- CreateIndex
CREATE INDEX "Team_accountId_idx" ON "Team"("accountId");

-- CreateIndex
CREATE INDEX "Worker_accountId_idx" ON "Worker"("accountId");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
