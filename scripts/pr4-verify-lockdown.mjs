/**
 * PR4 lockdown API verification.
 * Usage:
 *   ADMIN_PASSWORD=... node scripts/pr4-verify-lockdown.mjs
 *   node scripts/pr4-verify-lockdown.mjs --url https://preview.example.com --media-id {id}
 */
import { config } from "dotenv";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (
  process.argv.includes("--url")
    ? process.argv[process.argv.indexOf("--url") + 1]
    : process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000"
).replace(/\/$/, "");

const MEDIA_ID =
  (process.argv.includes("--media-id")
    ? process.argv[process.argv.indexOf("--media-id") + 1]
    : process.env.PR4_TEST_MEDIA_ID) ?? "";

const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (
  process.env.ADMIN_PASSWORD ||
  process.env.SEED_ADMIN_PASSWORD ||
  "thinkad2024"
)
  .trim()
  .replace(/\\n$/, "");

const LOCKED_FIELDS = [
  "dailyFootfall",
  "weekdayFootfall",
  "impressions",
  "reach",
  "frequency",
  "cpm",
  "engagementRate",
  "visibilityScore",
];

const CONTROL_FIELDS = ["name", "latitude"];

async function login(cookieJar) {
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`login failed: ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    cookieJar.push(c.split(";")[0]);
  }
}

async function apiPatch(mediaId, body, cookieJar) {
  const res = await fetch(`${BASE}/api/admin/medias/${mediaId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieJar.join("; "),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { res, data };
}

async function getMedia(mediaId, cookieJar) {
  const res = await fetch(`${BASE}/api/admin/medias/${mediaId}`, {
    headers: { Cookie: cookieJar.join("; ") },
  });
  const data = await res.json();
  return data.media ?? data;
}

async function resolveTestMediaId(cookieJar) {
  if (MEDIA_ID) return MEDIA_ID;
  const res = await fetch(`${BASE}/api/admin/medias?take=1`, {
    headers: { Cookie: cookieJar.join("; ") },
  });
  const data = await res.json();
  const first = data.medias?.[0];
  if (!first?.id) throw new Error("No media found for test");
  return first.id;
}

async function main() {
  const cookieJar = [];
  await login(cookieJar);
  const mediaId = await resolveTestMediaId(cookieJar);
  const baseline = await getMedia(mediaId, cookieJar);

  const rows = [];

  for (const field of LOCKED_FIELDS) {
    const tamperValue =
      field === "visibilityScore"
        ? 99
        : field === "reach" || field === "frequency" || field === "engagementRate"
          ? 99.9
          : 99999999;
    const before = baseline[field];
    const { res } = await apiPatch(mediaId, { [field]: tamperValue }, cookieJar);
    const afterMedia = await getMedia(mediaId, cookieJar);
    const after = afterMedia[field];
    const stripped = res.headers.get("X-Locked-Fields-Stripped");
    const unchanged = JSON.stringify(before) === JSON.stringify(after);
    rows.push({
      field,
      status: res.status,
      strippedHeader: stripped ?? "(없음)",
      dbChanged: unchanged ? "유지" : "변경됨",
      pass: res.status === 200 && stripped?.includes(field) && unchanged,
    });
  }

  const controlName = `${baseline.name ?? "test"} PR4`;
  const { res: nameRes } = await apiPatch(
    mediaId,
    { name: controlName },
    cookieJar,
  );
  const afterName = await getMedia(mediaId, cookieJar);
  rows.push({
    field: "name (control)",
    status: nameRes.status,
    strippedHeader: nameRes.headers.get("X-Locked-Fields-Stripped") ?? "(없음)",
    dbChanged: afterName.name === controlName ? "변경됨" : "유지",
    pass:
      nameRes.status === 200 &&
      !nameRes.headers.get("X-Locked-Fields-Stripped") &&
      afterName.name === controlName,
  });

  await apiPatch(mediaId, { name: baseline.name }, cookieJar);

  const controlLat = baseline.latitude != null ? baseline.latitude + 0.00001 : 37.5;
  const { res: latRes } = await apiPatch(
    mediaId,
    { latitude: controlLat },
    cookieJar,
  );
  const afterLat = await getMedia(mediaId, cookieJar);
  rows.push({
    field: "latitude (control)",
    status: latRes.status,
    strippedHeader: latRes.headers.get("X-Locked-Fields-Stripped") ?? "(없음)",
    dbChanged:
      afterLat.latitude != null &&
      Math.abs(afterLat.latitude - controlLat) < 0.0001
        ? "변경됨"
        : "유지",
    pass:
      latRes.status === 200 &&
      !latRes.headers.get("X-Locked-Fields-Stripped") &&
      afterLat.latitude != null &&
      Math.abs(afterLat.latitude - controlLat) < 0.0001,
  });

  await apiPatch(mediaId, { latitude: baseline.latitude }, cookieJar);

  const ts = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 13);
  const passCount = rows.filter((r) => r.pass).length;
  const md = [
    "# PR4 lockdown verification",
    "",
    `**Base URL**: ${BASE}`,
    `**Media ID**: ${mediaId}`,
    `**Timestamp**: ${ts}`,
    "",
    "## API 잠금 테스트 결과",
    "",
    "| 필드 | Status | Stripped Header | DB 변경 | 판정 |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.field} | ${r.status} | ${r.strippedHeader} | ${r.dbChanged} | ${r.pass ? "PASS" : "FAIL"} |`,
    ),
    "",
    `**Summary**: ${passCount}/${rows.length} PASS`,
    "",
  ].join("\n");

  await mkdir(path.join(process.cwd(), "reports"), { recursive: true });
  const outPath = path.join(
    process.cwd(),
    `reports/pr4-lockdown-preview-verify-${ts}.md`,
  );
  await writeFile(outPath, md);
  console.log(md);
  console.log(`\nWrote ${outPath}`);

  if (passCount !== rows.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
