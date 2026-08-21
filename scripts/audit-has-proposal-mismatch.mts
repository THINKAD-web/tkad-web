#!/usr/bin/env npx tsx
/**
 * hasProposal vs 실제 제안서 자산 정합성. 읽기 전용, 값 수정 없음.
 *
 *   npx tsx scripts/audit-has-proposal-mismatch.mts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { csvEscape } from "../lib/phase-b-catalog-audit.ts";
import { PHASE_B_ABC_FLAG_IDS } from "../lib/media-review-status.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

const D_CSV = resolve(root, "reports/phase-b-audit-report-d-final.csv");

function resolveDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim();
  if (!raw) return undefined;
  if (/@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i.test(raw)) {
    return undefined;
  }
  return raw;
}

function loadD116Ids(): Set<string> {
  const raw = readFileSync(D_CSV, "utf8");
  return new Set(
    [...raw.matchAll(/^cm[a-z0-9]{20,}/gim)].map((m) => m[0]),
  );
}

function phaseBLabel(id: string, d116: Set<string>): string {
  if (PHASE_B_ABC_FLAG_IDS.includes(id)) return "6건";
  if (d116.has(id)) return "116건";
  return "해당없음";
}

function decodeUrl(raw: string): string {
  try {
    return decodeURIComponent(raw).normalize("NFC");
  } catch {
    return raw.normalize("NFC");
  }
}

/** 운영자 업로드 PDF 또는 갤러리에 섞인 매체사 제안서 슬라이드/PDF */
function isProposalAssetUrl(raw: string): boolean {
  const u = decodeUrl(raw).toLowerCase();
  if (!u.trim()) return false;
  if (/\/tkad\/proposals\//.test(u)) return true;
  if (/\.pdf(\?|#|$)/.test(u)) return true;
  if (/제안서|매체제안서/.test(u)) return true;
  if (/proposal/.test(u) && /\.(jpe?g|png|webp|gif|pdf)(\?|#|$)/.test(u)) {
    return true;
  }
  return false;
}

function uniqueNonEmpty(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const t = u?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

async function main() {
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL missing");
  const d116 = loadD116Ids();

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await db.$executeRawUnsafe("SET default_transaction_read_only = on");
    const medias = await db.media.findMany({
      select: {
        id: true,
        name: true,
        hasProposal: true,
        proposalUrl: true,
        proposalFileName: true,
        image: true,
        extractedImages: true,
      },
      orderBy: { id: "asc" },
    });

    type Row = {
      mediaId: string;
      mediaName: string;
      hasProposal: boolean;
      fileExists: boolean;
      fileCount: number;
      phaseB: string;
      canonicalUrl: boolean;
      galleryTotal: number;
      galleryHits: string[];
      proposalUrl: string | null;
      proposalFileName: string | null;
    };

    const analyzed: Row[] = medias.map((m) => {
      const gallery = uniqueNonEmpty([m.image, ...(m.extractedImages ?? [])]);
      const galleryHits = gallery.filter(isProposalAssetUrl);
      const canonical =
        Boolean(m.proposalUrl?.trim()) || Boolean(m.proposalFileName?.trim());
      const allHits = uniqueNonEmpty([m.proposalUrl, ...galleryHits]);
      const fileExists = canonical || galleryHits.length > 0;
      return {
        mediaId: m.id,
        mediaName: m.name,
        hasProposal: m.hasProposal,
        fileExists,
        fileCount: allHits.length,
        phaseB: phaseBLabel(m.id, d116),
        canonicalUrl: Boolean(m.proposalUrl?.trim()),
        galleryTotal: gallery.length,
        galleryHits,
        proposalUrl: m.proposalUrl,
        proposalFileName: m.proposalFileName,
      };
    });

    const falseWithFiles = analyzed.filter((r) => !r.hasProposal && r.fileExists);
    const trueWithoutFiles = analyzed.filter((r) => r.hasProposal && !r.fileExists);
    const trueWithUrl = analyzed.filter((r) => r.hasProposal && r.canonicalUrl);
    const trueNoUrlGallery = analyzed.filter(
      (r) => r.hasProposal && !r.canonicalUrl && r.galleryHits.length > 0,
    );
    const rank = (p: string) => (p === "6건" ? 0 : p === "116건" ? 1 : 2);
    const mismatches = [...falseWithFiles, ...trueWithoutFiles].sort(
      (a, b) =>
        rank(a.phaseB) - rank(b.phaseB) ||
        a.mediaName.localeCompare(b.mediaName, "ko"),
    );

    const csvLines = [
      "mediaId,mediaName,hasProposal(DB값),실제 파일 존재 여부,파일 개수,Phase B 관련 여부(6건/116건/해당없음)",
      ...mismatches.map((r) =>
        [
          csvEscape(r.mediaId),
          csvEscape(r.mediaName),
          r.hasProposal ? "true" : "false",
          r.fileExists ? "있음" : "없음",
          String(r.fileCount),
          r.phaseB,
        ].join(","),
      ),
    ];

    mkdirSync(resolve(root, "reports"), { recursive: true });
    const outPath = resolve(root, "reports/has-proposal-mismatch.csv");
    writeFileSync(outPath, csvLines.join("\n") + "\n", "utf8");

    const abc6 = analyzed.filter((r) => r.phaseB === "6건");
    const abc6Detail = abc6.map((r) => ({
      mediaId: r.mediaId,
      mediaName: r.mediaName,
      hasProposal: r.hasProposal,
      fileExists: r.fileExists,
      fileCount: r.fileCount,
      mismatch: r.hasProposal !== r.fileExists,
      proposalUrl: r.proposalUrl,
      proposalFileName: r.proposalFileName,
      galleryTotal: r.galleryTotal,
      galleryHits: r.galleryHits,
    }));

    console.log(
      JSON.stringify(
        {
          catalogCount: medias.length,
          hasProposalTrue: analyzed.filter((r) => r.hasProposal).length,
          hasProposalFalse: analyzed.filter((r) => !r.hasProposal).length,
          mismatchTotal: mismatches.length,
          falseWithFiles: falseWithFiles.length,
          trueWithoutFiles: trueWithoutFiles.length,
          trueWithCanonicalUrl: trueWithUrl.length,
          trueNoUrlButGallery: trueNoUrlGallery.length,
          d116Loaded: d116.size,
          csvPath: outPath,
          abc6: abc6Detail,
          falseWithFilesPhaseB6: falseWithFiles.filter((r) => r.phaseB === "6건"),
          falseWithFilesPhaseB116: falseWithFiles.filter((r) => r.phaseB === "116건")
            .length,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
