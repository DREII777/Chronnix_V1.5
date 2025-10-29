-- AlterEnum
ALTER TYPE "DocumentKind" ADD VALUE 'OTHER';

-- DropIndex
DROP INDEX "public"."Document_workerId_kind_key";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "label" TEXT;

-- CreateIndex
CREATE INDEX "Document_workerId_kind_idx" ON "Document"("workerId", "kind");
