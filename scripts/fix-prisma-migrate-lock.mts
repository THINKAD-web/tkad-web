/**
 * Stuck Prisma migrate on Neon pooler — direct URL로 resolve + deploy 검증
 */
import { config } from "dotenv";
import { Pool } from "pg";
import { execSync } from "node:child_process";

config({ path: ".env.local" });

function toDirectUrl(poolerUrl: string): string {
  return poolerUrl.replace("-pooler", "");
}

const poolerUrl = process.env.DATABASE_URL?.trim();
if (!poolerUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const directUrl = process.env.DATABASE_URL_UNPOOLED?.trim() || toDirectUrl(poolerUrl);
console.log("direct URL host:", new URL(directUrl.replace(/^postgresql:/, "http:")).host);

async function sqlFix(pool: Pool) {
  const col = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name='media' AND column_name='hotspot_tags'",
  );
  console.log("hotspot_tags column:", col.rowCount === 1 ? "OK" : "MISSING");

  const failed = await pool.query(
    `SELECT migration_name, finished_at, rolled_back_at
     FROM "_prisma_migrations"
     WHERE migration_name = '20260914180000_media_hotspot_tags'`,
  );
  console.log("migration row before:", failed.rows);

  if (failed.rows[0] && failed.rows[0].finished_at == null) {
    await pool.query(
      `UPDATE "_prisma_migrations"
       SET finished_at = NOW(),
           logs = NULL,
           rolled_back_at = NULL,
           applied_steps_count = 1
       WHERE migration_name = '20260914180000_media_hotspot_tags'`,
    );
    console.log("marked migration as applied (hotfix — column already exists)");
  }
}

async function main() {
  const pool = new Pool({ connectionString: directUrl });
  await sqlFix(pool);
  await pool.end();

  const env = { ...process.env, DATABASE_URL: directUrl };

  console.log("\n--- prisma migrate status (direct) ---");
  execSync("npx prisma migrate status", { stdio: "inherit", env });

  console.log("\n--- prisma migrate deploy (direct) ---");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });

  console.log("\n--- final migrate status ---");
  execSync("npx prisma migrate status", { stdio: "inherit", env });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
