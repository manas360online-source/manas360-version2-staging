-- CreateEnum
CREATE TYPE "FinancialRefundStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "financial_refunds" (
	"id" TEXT NOT NULL,
	"paymentId" TEXT,
	"merchantRefundId" TEXT NOT NULL,
	"originalMerchantOrderId" TEXT NOT NULL,
	"phonePeRefundId" TEXT,
	"status" "FinancialRefundStatus" NOT NULL DEFAULT 'PENDING',
	"amountMinor" BIGINT NOT NULL,
	"currency" TEXT NOT NULL DEFAULT 'INR',
	"reason" TEXT,
	"responseData" JSONB,
	"retrievedAt" TIMESTAMP(3),
	"completedAt" TIMESTAMP(3),
	"failedAt" TIMESTAMP(3),
	"failureReason" TEXT,
	"retryCount" INTEGER NOT NULL DEFAULT 0,
	"nextRetryAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "financial_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_refunds_merchantRefundId_key" ON "financial_refunds"("merchantRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_refunds_phonePeRefundId_key" ON "financial_refunds"("phonePeRefundId");

-- CreateIndex
CREATE INDEX "financial_refunds_paymentId_status_idx" ON "financial_refunds"("paymentId", "status");

-- CreateIndex
CREATE INDEX "financial_refunds_status_nextRetryAt_idx" ON "financial_refunds"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "financial_refunds_merchantRefundId_idx" ON "financial_refunds"("merchantRefundId");

-- CreateIndex
CREATE INDEX "financial_refunds_originalMerchantOrderId_idx" ON "financial_refunds"("originalMerchantOrderId");

-- CreateIndex
CREATE INDEX "financial_refunds_createdAt_idx" ON "financial_refunds"("createdAt");

-- AddForeignKey
ALTER TABLE "financial_refunds" ADD CONSTRAINT "financial_refunds_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "financial_payments"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
