#!/usr/bin/env npx tsx
/**
 * Seed SEO FAQ (30) + guide articles (5) into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-seo-content.ts
 *   npx tsx scripts/seed-seo-content.ts --faq-only
 *   npx tsx scripts/seed-seo-content.ts --guides-only
 *   npx tsx scripts/seed-seo-content.ts --no-claude   # FAQ uses catalog fallback answers
 */
import { runFaqSeedPipeline } from "@/lib/seo-content/seed-faq-pipeline";
import { runSeoGuideSeedPipeline } from "@/lib/seo-content/seed-seo-guides";

const args = new Set(process.argv.slice(2));
const faqOnly = args.has("--faq-only");
const guidesOnly = args.has("--guides-only");
const useClaude = !args.has("--no-claude");

async function main() {
  if (!guidesOnly) {
    console.log("=== FAQ seed ===");
    const faq = await runFaqSeedPipeline({ useClaude });
    console.log(JSON.stringify(faq, null, 2));
  }

  if (!faqOnly) {
    console.log("=== SEO guides seed ===");
    const guides = await runSeoGuideSeedPipeline({ publish: true });
    console.log(JSON.stringify(guides, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
