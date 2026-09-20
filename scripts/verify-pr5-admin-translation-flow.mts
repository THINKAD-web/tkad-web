#!/usr/bin/env node
/**
 * LOCAL-ONLY verification helper (not CI). Mutates real DATABASE_URL rows for
 * fixed test media IDs — do not run against production without understanding impact.
 *
 * PR5 manual verification — same API path as admin UI:
 * ai-translate (no DB) → PATCH translations (reviewed) → empty PATCH (delete rows).
 *
 * Usage: npx tsx scripts/verify-pr5-admin-translation-flow.mts
 * Requires: DATABASE_URL, ANTHROPIC_API_KEY, dev server on BASE_URL (default http://localhost:3000)
 */
import { config } from "dotenv";
config();
config({ path: ".env.local" });

import { getPrisma } from "../lib/prisma.ts";

const BASE = process.env.PR5_VERIFY_BASE_URL?.trim() || "http://localhost:3000";
const MEDIA_S1 = "cmst5ofuc000q04jsn0m0y8o0";
const MEDIA_S2 = "c006c4fbdb7b05a2bc83fe51b";

type TxRow = {
  locale: string;
  source: string;
  name: string | null;
  location: string | null;
  description: string | null;
};

async function readTx(mediaId: string): Promise<TxRow[]> {
  const db = getPrisma();
  const rows = await db.mediaTranslation.findMany({
    where: { mediaId },
    orderBy: { locale: "asc" },
    select: {
      locale: true,
      source: true,
      name: true,
      location: true,
      description: true,
    },
  });
  return rows;
}

function printRows(label: string, rows: TxRow[]) {
  console.log(`\n--- ${label} (${rows.length} row(s)) ---`);
  if (rows.length === 0) {
    console.log("(none)");
    return;
  }
  for (const r of rows) {
    console.log(
      JSON.stringify({
        locale: r.locale,
        source: r.source,
        name: r.name?.slice(0, 60) ?? null,
        location: r.location?.slice(0, 40) ?? null,
        description: r.description?.slice(0, 50) ?? null,
      }),
    );
  }
}

async function adminLogin(): Promise<string> {
  const user = process.env.ADMIN_USERNAME?.trim() || "admin";
  const pass = process.env.ADMIN_PASSWORD?.trim() || "thinkad2024";
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass }),
  });
  if (!res.ok) {
    throw new Error(`login failed ${res.status}: ${await res.text()}`);
  }
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("login: no set-cookie");
  const match = setCookie.match(/tkad_admin_session=[^;]+/);
  if (!match) throw new Error("login: session cookie missing");
  return match[0];
}

async function aiTranslate(
  cookie: string,
  body: { name: string; location: string; description?: string; country: string },
) {
  const res = await fetch(`${BASE}/api/admin/medias/ai-translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`ai-translate ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function patchTranslations(
  cookie: string,
  mediaId: string,
  patch: Record<string, unknown>,
) {
  const res = await fetch(`${BASE}/api/admin/medias/${mediaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(patch),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`PATCH ${mediaId} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const db = getPrisma();
  const media1 = await db.media.findUnique({ where: { id: MEDIA_S1 } });
  const media2 = await db.media.findUnique({ where: { id: MEDIA_S2 } });
  if (!media1 || !media2) throw new Error("test media rows not found");

  console.log("PR5 verify — base URL:", BASE);
  console.log("Scenario 1+3 media:", MEDIA_S1, media1.name);
  console.log("Scenario 2 media:", MEDIA_S2, media2.name);

  const cookie = await adminLogin();
  console.log("Admin login OK");

  printRows("S1 baseline (Studio before)", await readTx(MEDIA_S1));

  const ai = await aiTranslate(cookie, {
    name: media1.name,
    location: media1.location,
    description: media1.description ?? undefined,
    country: media1.country,
  });
  printRows("S1 after AI translate API (expect unchanged — no save yet)", await readTx(MEDIA_S1));

  const ja = ai.ja as { name?: string; location?: string | null; description?: string | null };
  const zh = ai.zh as { name?: string; location?: string | null; description?: string | null };
  const jaNameEdited = `${String(ja.name ?? "").trim()} [PR5검수]`;

  await patchTranslations(cookie, MEDIA_S1, {
    nameEn: ai.nameEn,
    locationEn: ai.locationEn,
    descriptionEn: ai.descriptionEn,
    translations: {
      ja: {
        name: jaNameEdited,
        location: ja.location ?? null,
        description: ja.description ?? null,
      },
      zh: {
        name: zh.name ?? null,
        location: zh.location ?? null,
        description: zh.description ?? null,
      },
    },
  });
  printRows("S1 after SAVE (expect ja/zh reviewed, ja name edited)", await readTx(MEDIA_S1));

  printRows("S2 baseline (expect source ai)", await readTx(MEDIA_S2));
  const s2Before = await readTx(MEDIA_S2);
  await patchTranslations(cookie, MEDIA_S2, {
    translations: {
      ja: {
        name: s2Before.find((r) => r.locale === "ja")?.name ?? null,
        location: s2Before.find((r) => r.locale === "ja")?.location ?? null,
        description: s2Before.find((r) => r.locale === "ja")?.description ?? null,
      },
      zh: {
        name: s2Before.find((r) => r.locale === "zh")?.name ?? null,
        location: s2Before.find((r) => r.locale === "zh")?.location ?? null,
        description: s2Before.find((r) => r.locale === "zh")?.description ?? null,
      },
    },
  });
  printRows("S2 after SAVE unchanged text (expect both reviewed)", await readTx(MEDIA_S2));

  await patchTranslations(cookie, MEDIA_S1, {
    translations: {
      ja: { name: null, location: null, description: null },
      zh: { name: null, location: null, description: null },
    },
  });
  printRows("S3 after SAVE empty ja/zh (expect 0 rows)", await readTx(MEDIA_S1));

  console.log("\n✅ PR5 verify script finished — compare output with Studio MediaTranslation filters.");
}

main()
  .catch((e) => {
    console.error("\n❌", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
