-- Instant booking: payment captured but fulfillment failed — ops manual refund queue
ALTER TYPE "PaymentLogStatus" ADD VALUE IF NOT EXISTS 'needs_manual_refund';
