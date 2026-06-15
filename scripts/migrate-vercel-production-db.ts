/**
 * Vercel 프로덕션 DB에 마이그레이션 적용
 *
 * Usage (프로젝트 루트에서):
 *   vercel env pull .env.vercel.production --environment=production
 *   npm run db:migrate:vercel-prod
 */
import { config as loadEnv } from "dotenv";
import { execSync } from "node:child_process";
import { resolve } from "path";

const root = process.cwd();
loadEnv({ path: resolve(root, ".env.vercel.production") });

const url =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!url) {
  console.error(
    "DATABASE_URL 없음.\n  vercel env pull .env.vercel.production --environment=production",
  );
  process.exit(1);
}

const host = url.match(/@([^/?]+)/)?.[1] ?? "(unknown)";
const usingUnpooled = Boolean(process.env.DATABASE_URL_UNPOOLED?.trim());
console.log("DB host:", host, usingUnpooled ? "(direct/unpooled)" : "(pooled)");

const env = { ...process.env, DATABASE_URL: url };

function run(cmd: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(cmd, {
      encoding: "utf8",
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, stderr: "", code: 0 };
  } catch (e) {
    const err = e as {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      status?: number;
    };
    return {
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? ""),
      code: err.status ?? 1,
    };
  }
}

function printOutput(stdout: string, stderr: string): void {
  if (stdout.trim()) process.stdout.write(stdout);
  if (stderr.trim()) process.stderr.write(stderr);
}

console.log("\n--- migrate status ---");
const status = run("npx prisma migrate status");
printOutput(status.stdout, status.stderr);

const combined = `${status.stdout}\n${status.stderr}`;
const upToDate =
  combined.includes("Database schema is up to date") ||
  combined.includes("No pending migrations");

if (upToDate) {
  console.log("\n✅ DB 스키마가 이미 최신입니다. migrate deploy 생략.");
  console.log("   (deploy 시 P1002 advisory lock 은 동시 migrate·풀러 때문일 수 있음)");
  process.exit(0);
}

console.log("\n--- migrate deploy ---");
const deploy = run("npx prisma migrate deploy");
printOutput(deploy.stdout, deploy.stderr);

if (deploy.code === 0) {
  console.log("\n✅ migrate deploy 완료");
  process.exit(0);
}

const deployOut = `${deploy.stdout}\n${deploy.stderr}`;
if (deployOut.includes("P1002") || deployOut.includes("advisory lock")) {
  console.log(
    "\nℹ️  P1002 advisory lock — Vercel 빌드가 동시에 migrate 중이거나 풀러 제한일 수 있습니다.",
  );
  console.log("   잠시 후 다시 시도하세요.");
  process.exit(1);
}

console.error("\n❌ migrate deploy 실패");
process.exit(1);
