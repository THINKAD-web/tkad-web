import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkAiRateLimit,
  checkChatbotRuleAbuseLimit,
  enforceChatbotRuleAbuseLimit,
} from "@/lib/ai-rate-limit";
import { AI_CHATBOT_HOURLY_ABUSE_LIMIT } from "@/lib/entitlements/constants";

function mockReq(ua: string, ip = "203.0.113.42"): Request {
  return new Request("http://test/api/chat", {
    headers: {
      "user-agent": ua,
      "x-forwarded-for": ip,
    },
  });
}

test("checkChatbotRuleAbuseLimit: browser UA — no daily cap, many calls allowed", async () => {
  const ua =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
  const ip = `chatbot-free-${Date.now()}`;

  for (let i = 0; i < 5; i++) {
    const out = await checkChatbotRuleAbuseLimit({
      ipOnlyHash: ip,
      ua,
    });
    assert.equal(out.allowed, true, `call ${i + 1} should pass`);
  }
});

test("checkChatbotRuleAbuseLimit: bot UA blocked", async () => {
  const out = await checkChatbotRuleAbuseLimit({
    ipOnlyHash: "bot-test-ip",
    ua: "curl/8.0",
  });
  assert.equal(out.allowed, false);
  assert.equal(out.reason, "abuse");
});

test("checkChatbotRuleAbuseLimit: hourly abuse after limit", async () => {
  const ua = "Mozilla/5.0 (Windows NT 10.0) Chrome/121.0.0.0 Safari/537.36";
  const ip = `chatbot-abuse-${Date.now()}`;

  for (let i = 0; i < AI_CHATBOT_HOURLY_ABUSE_LIMIT; i++) {
    const ok = await checkChatbotRuleAbuseLimit({ ipOnlyHash: ip, ua });
    assert.equal(ok.allowed, true, `pre-limit call ${i + 1}`);
  }

  const blocked = await checkChatbotRuleAbuseLimit({ ipOnlyHash: ip, ua });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "abuse");
});

test("checkAiRateLimit: guest daily cap still applies (Claude / token AI path)", async () => {
  const id = `guest-daily-${Date.now()}`;
  const ua = "Mozilla/5.0 (Macintosh) Chrome/120.0.0.0 Safari/537.36";

  const first = await checkAiRateLimit({
    identifier: `g:${id}`,
    ipOnlyHash: id,
    ua,
    isLoggedIn: false,
    isPro: false,
  });
  assert.equal(first.allowed, true);

  const second = await checkAiRateLimit({
    identifier: `g:${id}`,
    ipOnlyHash: id,
    ua,
    isLoggedIn: false,
    isPro: false,
  });
  assert.equal(second.allowed, false);
  assert.equal(second.reason, "guest_limit");
});

test("enforceChatbotRuleAbuseLimit: Request wrapper", async () => {
  const req = mockReq(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
    `enforce-wrap-${Date.now()}`,
  );
  const out = await enforceChatbotRuleAbuseLimit(req);
  assert.equal(out.allowed, true);
});
