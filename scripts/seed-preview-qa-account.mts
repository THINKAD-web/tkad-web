#!/usr/bin/env npx tsx
/**
 * Preview 전용 QA 테스트 계정 시드 — LITE 권한 (플래너 PDF·결과 QA).
 *
 * 가드 (전부 필수):
 *   1. ALLOW_QA_SEED=1
 *   2. VERCEL_ENV=preview
 *   3. DATABASE_URL 호스트 ≠ QA_PRODUCTION_DATABASE_HOST
 *   4. QA_SEED_PASSWORD — 코드에 비밀번호 없음
 *
 * Usage (Preview DB URL + env pull 후):
 *   ALLOW_QA_SEED=1 \
 *   VERCEL_ENV=preview \
 *   QA_PRODUCTION_DATABASE_HOST=ep-holy-cloud-....neon.tech \
 *   QA_SEED_EMAIL=qa-preview@example.com \
 *   QA_SEED_PASSWORD='...' \
 *   npx tsx scripts/seed-preview-qa-account.mts
 *
 * Vercel Preview 환경변수에 동일 키를 등록해 두고, 필요 시 Preview 빌드 hook 또는
 * 수동으로 Preview DB에 대해 실행한다.
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../lib/password.ts";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.preview.local"), override: true });

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function postgresHost(url: string): string {
  try {
    return new URL(normalizePgDatabaseUrl(url)).hostname;
  } catch {
    return "";
  }
}

function guard(): { databaseUrl: string; email: string; password: string } {
  if (process.env.ALLOW_QA_SEED !== "1") {
    fail("ALLOW_QA_SEED=1 required. Refusing to seed without explicit opt-in.");
  }

  if (process.env.VERCEL_ENV !== "preview") {
    fail(
      "VERCEL_ENV must be 'preview'. Refusing to run outside Preview context.",
    );
  }

  const productionHost = process.env.QA_PRODUCTION_DATABASE_HOST?.trim();
  if (!productionHost) {
    fail(
      "QA_PRODUCTION_DATABASE_HOST is required (production Neon host only, no secrets).",
    );
  }

  const databaseUrl = normalizePgDatabaseUrl(
    process.env.DATABASE_URL?.trim() ?? "",
  );
  if (!databaseUrl) {
    fail("DATABASE_URL is required.");
  }

  const currentHost = postgresHost(databaseUrl);
  if (!currentHost) {
    fail("Could not parse DATABASE_URL host.");
  }
  if (currentHost === productionHost) {
    fail(
      `DATABASE_URL host (${currentHost}) matches QA_PRODUCTION_DATABASE_HOST. Refusing production DB.`,
    );
  }

  const email = process.env.QA_SEED_EMAIL?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail("QA_SEED_EMAIL must be a valid email.");
  }

  const password = process.env.QA_SEED_PASSWORD ?? "";
  if (password.length < 8) {
    fail("QA_SEED_PASSWORD must be at least 8 characters (set via env only).");
  }

  return { databaseUrl, email, password };
}

async function main() {
  const { databaseUrl, email, password } = guard();
  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const passwordHash = await hashPassword(password);
    const now = new Date();

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        name: "Preview QA",
        locale: "ko",
        plan: "LITE",
        emailVerifiedAt: now,
      },
      update: {
        passwordHash,
        plan: "LITE",
        emailVerifiedAt: now,
        deletedAt: null,
        trialEndsAt: null,
        proTrialEndsAt: null,
        trialStartedAt: null,
      },
      select: { id: true, email: true, plan: true },
    });

    await prisma.subscription.updateMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "TRIALING"] } },
      data: { status: "CANCELLED", endDate: now },
    });

    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "LITE",
        status: "ACTIVE",
        startDate: now,
        amountKrw: 0,
      },
    });

    console.log("OK: Preview QA account ready");
    console.log(
      JSON.stringify(
        {
          email: user.email,
          plan: user.plan,
          databaseHost: postgresHost(databaseUrl),
          features: ["planner_result", "planner_pdf"],
          loginPath: "/ko/login",
          plannerPath: "/ko/planner",
        },
        null,
        2,
      ),
    );
    console.log(
      "\nPassword is only in QA_SEED_PASSWORD env — not printed. Use Vercel Preview env to share with QA.",
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
