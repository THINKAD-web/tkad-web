import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertInquiryAutoProposalTestRecipient,
  extractEmailsFromText,
} from "./test-send-allowlist";

test("tkad.co.kr is allowed as a test domain", () => {
  const d = assertInquiryAutoProposalTestRecipient("ops@tkad.co.kr");
  assert.equal(d.ok, true);
  if (d.ok) assert.equal(d.normalized, "ops@tkad.co.kr");
});

test("customer domains are rejected", () => {
  const d = assertInquiryAutoProposalTestRecipient("doris@agency.com");
  assert.equal(d.ok, false);
  if (!d.ok) assert.equal(d.error, "not_test_allowlist");
});

test("invalid email is rejected", () => {
  const d = assertInquiryAutoProposalTestRecipient("not-an-email");
  assert.equal(d.ok, false);
});

test("inquiry body emails are extracted but not used as allowlist", () => {
  const found = extractEmailsFromText(
    "From: Doris <doris@client.co.kr>\n견적 부탁드립니다",
  );
  assert.deepEqual(found, ["doris@client.co.kr"]);
  const d = assertInquiryAutoProposalTestRecipient(found[0]!);
  assert.equal(d.ok, false);
});
