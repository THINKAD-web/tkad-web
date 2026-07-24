/**
 * Preview smoke: register → checkout LITE/AGENCY → mock confirm → assert User.plan
 * Requires TOSS_PAYMENTS_MOCK=1 on the target deployment.
 *
 * Usage:
 *   PREVIEW_BASE=https://....vercel.app npx tsx scripts/smoke-pricing-tiers-checkout.ts
 */
import { randomBytes } from "node:crypto";

const BASE = (process.env.PREVIEW_BASE ?? "http://127.0.0.1:3010").replace(
  /\/$/,
  "",
);

type CheckoutPlan = "LITE" | "AGENCY";

function jarFromSetCookie(headers: Headers): string {
  const raw = headers.getSetCookie?.() ?? [];
  if (raw.length === 0) {
    const single = headers.get("set-cookie");
    if (!single) return "";
    return single.split(";")[0];
  }
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function register(): Promise<{ cookie: string; email: string }> {
  const suffix = randomBytes(3).toString("hex");
  const email = `smoke.tiers.${suffix}@example.com`;
  const password = `Smoke-${suffix}-9aA!`;
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: `Smoke ${suffix}`,
      locale: "ko",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: { message?: string };
  };
  if (!res.ok || json.ok === false) {
    throw new Error(
      `register failed ${res.status}: ${json.error?.message ?? res.statusText}`,
    );
  }
  const cookie = jarFromSetCookie(res.headers);
  if (!cookie.includes("tkad_user_session")) {
    throw new Error("register: missing session cookie");
  }
  return { cookie, email };
}

async function checkout(cookie: string, plan: CheckoutPlan) {
  const res = await fetch(`${BASE}/api/subscriptions/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ plan }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: { orderId: string; amount: number; plan: string };
    error?: { message?: string; code?: string };
  };
  if (!res.ok || !json.data?.orderId) {
    throw new Error(
      `checkout ${plan} failed ${res.status}: ${json.error?.code ?? ""} ${json.error?.message ?? JSON.stringify(json)}`,
    );
  }
  return json.data;
}

async function confirm(
  cookie: string,
  orderId: string,
  amount: number,
  plan: CheckoutPlan,
) {
  const res = await fetch(`${BASE}/api/subscriptions/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      paymentKey: `mock_${plan.toLowerCase()}_${randomBytes(4).toString("hex")}`,
      orderId,
      amount,
    }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    error?: { message?: string; code?: string };
  };
  if (!res.ok || json.ok === false) {
    throw new Error(
      `confirm ${plan} failed ${res.status}: ${json.error?.code ?? ""} ${json.error?.message ?? JSON.stringify(json)}`,
    );
  }
}

async function mePlan(cookie: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookie },
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: { plan?: string } | null;
  };
  const plan = json.data?.plan;
  if (!plan) {
    throw new Error(`me plan missing: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return plan;
}

async function runOne(plan: CheckoutPlan) {
  const { cookie, email } = await register();
  console.log(`[${plan}] registered ${email}`);
  const co = await checkout(cookie, plan);
  console.log(`[${plan}] checkout order=${co.orderId} amount=${co.amount}`);
  await confirm(cookie, co.orderId, co.amount, plan);
  const after = await mePlan(cookie);
  console.log(`[${plan}] user.plan=${after}`);
  if (after !== plan) {
    throw new Error(`expected plan ${plan}, got ${after}`);
  }
  return { email, plan: after, amount: co.amount };
}

async function main() {
  console.log(`BASE=${BASE}`);
  const lite = await runOne("LITE");
  const agency = await runOne("AGENCY");
  console.log(
    JSON.stringify(
      { ok: true, lite, agency, note: "mock confirm; Preview Toss test keys" },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
