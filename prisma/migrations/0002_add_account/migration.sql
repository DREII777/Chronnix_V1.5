-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primaryEmail" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "locale" TEXT DEFAULT 'fr-BE',
    "timezone" TEXT DEFAULT 'Europe/Brussels',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_slug_key" ON "Account"("slug");

-- Insert default account for existing single-tenant data
INSERT INTO "Account" (
    "id",
    "name",
    "slug",
    "primaryEmail",
    "phone",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "city",
    "country",
    "locale",
    "timezone",
    "createdAt",
    "updatedAt"
) VALUES (
    1,
    'Chronnix Entreprise',
    'chronnix',
    'contact@chronnix.local',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'fr-BE',
    'Europe/Brussels',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "accountId" INTEGER;

UPDATE "CompanySettings" SET "accountId" = 1 WHERE "accountId" IS NULL;

ALTER TABLE "CompanySettings"
    ALTER COLUMN "accountId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_accountId_key" ON "CompanySettings"("accountId");

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
