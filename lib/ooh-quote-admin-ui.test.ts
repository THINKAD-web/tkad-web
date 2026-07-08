import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canShowAwaitingSignature,
  canShowBookingConfirm,
  canShowContractConfirm,
  canShowPaymentConfirm,
  canShowSendInvoice,
  canShowSendQuote,
} from "@/lib/ooh-quote-admin-ui";

test("send-invoice only after contract signed at booking_confirmed", () => {
  assert.equal(
    canShowSendInvoice({ status: "booking_confirmed", contractSigned: false }),
    false,
  );
  assert.equal(
    canShowSendInvoice({ status: "booking_confirmed", contractSigned: true }),
    true,
  );
  assert.equal(
    canShowAwaitingSignature({ status: "booking_confirmed", contractSigned: false }),
    true,
  );
});

test("pipeline button stages do not overlap incorrectly", () => {
  assert.equal(canShowSendQuote({ status: "draft", contractSigned: false }), true);
  assert.equal(
    canShowBookingConfirm({ status: "booking_requested", contractSigned: false }),
    true,
  );
  assert.equal(
    canShowPaymentConfirm({ status: "invoice_sent", contractSigned: true }),
    true,
  );
  assert.equal(
    canShowContractConfirm({ status: "payment_confirmed", contractSigned: true }),
    true,
  );
  assert.equal(
    canShowSendInvoice({ status: "payment_confirmed", contractSigned: true }),
    false,
  );
});
