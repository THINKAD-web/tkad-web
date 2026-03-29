-- CreateEnum
CREATE TYPE "OoHQuoteStatus" AS ENUM (
  'draft',
  'sent',
  'booking_requested',
  'booking_pending',
  'booking_confirmed',
  'invoice_sent',
  'payment_pending',
  'payment_confirmed',
  'contract_confirmed',
  'in_progress',
  'completed',
  'cancelled'
);

-- CreateTable
CREATE TABLE "ooh_quotes" (
    "id" TEXT NOT NULL,
    "status" "OoHQuoteStatus" NOT NULL DEFAULT 'draft',
    "client_name" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "client_phone" TEXT,
    "client_company" TEXT,
    "media_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_amount" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "period_key" TEXT,
    "budget_min" INTEGER,
    "budget_max" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "booking_requested_at" TIMESTAMP(3),
    "booking_confirmed_at" TIMESTAMP(3),
    "invoice_sent_at" TIMESTAMP(3),
    "payment_amount" INTEGER,
    "payment_confirmed_at" TIMESTAMP(3),
    "contract_confirmed_at" TIMESTAMP(3),
    "admin_note" TEXT,
    "cancel_reason" TEXT,
    "pdf_template" TEXT NOT NULL DEFAULT 'default',
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "quote_pdf_sent_at" TIMESTAMP(3),
    "contract_doc_url" TEXT,
    "invoice_doc_url" TEXT,
    "campaign_id" TEXT,
    "quote_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ooh_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ooh_quotes_campaign_id_key" ON "ooh_quotes"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "ooh_quotes_quote_request_id_key" ON "ooh_quotes"("quote_request_id");

-- CreateIndex
CREATE INDEX "ooh_quotes_status_idx" ON "ooh_quotes"("status");

-- CreateIndex
CREATE INDEX "ooh_quotes_created_at_idx" ON "ooh_quotes"("created_at");

-- AddForeignKey
ALTER TABLE "ooh_quotes" ADD CONSTRAINT "ooh_quotes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ooh_quotes" ADD CONSTRAINT "ooh_quotes_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
