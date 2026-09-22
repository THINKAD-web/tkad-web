-- CreateEnum
CREATE TYPE "OohContractSendMode" AS ENUM ('auto_generated', 'uploaded_esign', 'uploaded_attachment');

-- AlterEnum
ALTER TYPE "OohContractStatus" ADD VALUE 'attachment_sent';

-- AlterTable
ALTER TABLE "ooh_contracts" ADD COLUMN     "send_mode" "OohContractSendMode" NOT NULL DEFAULT 'auto_generated',
ADD COLUMN     "uploaded_pdf_url" TEXT,
ADD COLUMN     "uploaded_pdf_sha256" VARCHAR(64),
ADD COLUMN     "uploaded_pdf_file_name" VARCHAR(255);
