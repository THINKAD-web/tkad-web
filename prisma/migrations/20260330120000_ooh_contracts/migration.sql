-- CreateEnum
CREATE TYPE "OohContractStatus" AS ENUM ('pending', 'signed', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "ooh_contracts" (
    "id" TEXT NOT NULL,
    "ooh_quote_id" TEXT NOT NULL,
    "signed_pdf_base64" TEXT,
    "contract_pdf_url" TEXT NOT NULL DEFAULT '',
    "signed_at" TIMESTAMP(3),
    "signer_name" TEXT,
    "signer_email" TEXT,
    "signer_ip" TEXT,
    "signer_agent" TEXT,
    "signature_image" TEXT,
    "agreement_accepted_at" TIMESTAMP(3),
    "document_sha256" TEXT,
    "special_terms" TEXT,
    "status" "OohContractStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ooh_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ooh_contracts_ooh_quote_id_key" ON "ooh_contracts"("ooh_quote_id");

-- CreateIndex
CREATE INDEX "ooh_contracts_status_idx" ON "ooh_contracts"("status");

-- AddForeignKey
ALTER TABLE "ooh_contracts" ADD CONSTRAINT "ooh_contracts_ooh_quote_id_fkey" FOREIGN KEY ("ooh_quote_id") REFERENCES "ooh_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
