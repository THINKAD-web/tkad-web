import { config } from "dotenv";
config({ path: ".env.local" });

const base =
  process.argv.find((a) => a.startsWith("--base="))?.slice(7) ??
  "https://tkad-web.vercel.app";

type Row = { name: string; ok: boolean; status: number; detail?: string };

const rows: Row[] = [];

async function probe(
  name: string,
  path: string,
  init?: RequestInit,
): Promise<void> {
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    let detail = "";
    try {
      const j = JSON.parse(text) as Record<string, unknown>;
      detail = String(j.error ?? j.success ?? j.id ?? "").slice(0, 80);
    } catch {
      detail = text.slice(0, 60);
    }
    rows.push({
      name,
      ok: res.status < 500,
      status: res.status,
      detail,
    });
  } catch (e) {
    rows.push({
      name,
      ok: false,
      status: 0,
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}

await probe("health", "/api/health");
await probe("public media catalog", "/api/public/media-catalog");

await probe("contact honeypot", "/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ website: "bot", locale: "ko" }),
});

await probe("contact validation", "/api/contact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    locale: "ko",
    name: "Ops Smoke",
    email: "invalid",
    message: "test",
  }),
});

await probe("media-app honeypot", "/api/media-applications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ website: "bot" }),
});

await probe("media-app validation", "/api/media-applications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contactEmail: "bad" }),
});

await probe("content-notify validation", "/api/content-notify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "not-an-email", channel: "academy" }),
});

await probe("webinar register validation", "/api/academy/webinar-register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ webinarId: "web-q2-strategy", email: "bad" }),
});

console.log(JSON.stringify({ base, rows }, null, 2));
