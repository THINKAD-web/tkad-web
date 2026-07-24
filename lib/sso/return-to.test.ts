import assert from "node:assert/strict";
import { test } from "node:test";
import {
  sanitizeSsoReturnTo,
  sanitizeSsoState,
} from "@/lib/sso/return-to";
import { ssoSecretsEqual } from "@/lib/sso/shared-secret";

test("sanitizeSsoReturnTo: relative paths only", () => {
  assert.equal(sanitizeSsoReturnTo("/checkout/basic"), "/checkout/basic");
  assert.equal(sanitizeSsoReturnTo("/contact?tier=pro"), "/contact?tier=pro");
  assert.equal(sanitizeSsoReturnTo("https://evil.com/"), "/");
  assert.equal(sanitizeSsoReturnTo("//evil.com"), "/");
  assert.equal(sanitizeSsoReturnTo("/\\evil"), "/");
  assert.equal(sanitizeSsoReturnTo(null), "/");
});

test("sanitizeSsoState: charset and length", () => {
  assert.equal(sanitizeSsoState("abcdefgh"), "abcdefgh");
  assert.equal(sanitizeSsoState("short"), null);
  assert.equal(sanitizeSsoState("bad state!"), null);
  assert.equal(sanitizeSsoState(null), null);
});

test("ssoSecretsEqual: timing-safe match", () => {
  assert.equal(ssoSecretsEqual("secret-value", "secret-value"), true);
  assert.equal(ssoSecretsEqual("secret-value", "other-value!!"), false);
  assert.equal(ssoSecretsEqual(null, "secret-value"), false);
});
