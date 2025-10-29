-- CreateEnum
CREATE TYPE "AdditionalCostUnit" AS ENUM ('HOUR', 'DAY');

-- CreateTable
CREATE TABLE "WorkerAdditionalCost" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "unit" "AdditionalCostUnit" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerAdditionalCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkerAdditionalCost_workerId_idx" ON "WorkerAdditionalCost"("workerId");

-- AddForeignKey
ALTER TABLE "WorkerAdditionalCost" ADD CONSTRAINT "WorkerAdditionalCost_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
