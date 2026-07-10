import assert from "node:assert/strict";
import test from "node:test";
import {
  loadQuoteStampDataUrl,
  resolveQuoteStampDataUrl,
} from "@/lib/quote-pdf-assets";
import { buildOohContractPdf } from "@/lib/ooh-contract-pdf";
import { OOH_CONTRACT_TEMPLATE_SAMPLE_VARS } from "@/lib/ooh-contract-template-ko";

const KO_VARS = {
  isKo: true,
  contractId: "STAMP-TEST",
  ...OOH_CONTRACT_TEMPLATE_SAMPLE_VARS,
} as const;

test("resolveQuoteStampDataUrl loads remote stamp when local file missing", async () => {
  const local = loadQuoteStampDataUrl();
  if (local) {
    assert.match(local, /^data:image\//);
    return;
  }
  const remote = await resolveQuoteStampDataUrl();
  assert.ok(remote, "expected CDN/env stamp when local PNG absent");
  assert.match(remote!, /^data:image\//);
});

test("contract PDF embeds stamp image when resolveQuoteStampDataUrl succeeds", async () => {
  const stamp = await resolveQuoteStampDataUrl();
  if (!stamp) {
    console.warn("[skip] stamp unavailable in test env");
    return;
  }
  const { pdfBase64 } = await buildOohContractPdf(KO_VARS);
  const latin = Buffer.from(pdfBase64, "base64").toString("latin1");
  assert.equal(latin.includes("/Subtype /Image"), true);
});
