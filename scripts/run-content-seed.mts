import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env") });

import { runAcademySeedBatch } from "../lib/content-auto/seed-academy-batch";
import { runCaseSeedBatch } from "../lib/content-auto/seed-cases-batch";
import { runReportSeedBatch } from "../lib/content-auto/seed-reports-batch";

async function main() {
  const which = process.argv[2] ?? "all";

  if (which === "all" || which === "reports") {
    console.log("=== Reports ===");
    console.log(JSON.stringify(await runReportSeedBatch(), null, 2));
  }
  if (which === "all" || which === "cases") {
    console.log("=== Cases ===");
    console.log(JSON.stringify(await runCaseSeedBatch(), null, 2));
  }
  if (which === "all" || which === "academy") {
    console.log("=== Academy ===");
    console.log(JSON.stringify(await runAcademySeedBatch(), null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
