"use client";

import type { RfpGroupMatchResult } from "@/lib/rfp-proposal/match-rfp-brief";
import type { RfpProposalBrief } from "@/lib/rfp-proposal/types";
import {
  rfpProposalFileBase,
  type RfpProposalExportPayload,
} from "@/lib/rfp-proposal-export/types";

async function downloadPdfBlob(res: Response, fallbackName: string) {
  if (!res.ok) {
    let message = "";
    try {
      const j = (await res.json()) as { error?: string };
      message = j.error?.trim() || "";
    } catch {
      /* ignore */
    }
    throw new Error(message || `RFP PDF export failed (${res.status})`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/pdf")) {
    throw new Error("Invalid PDF response from server.");
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const utf8 = cd.match(/filename\*=UTF-8''([^;]+)/i);
  const plain = cd.match(/filename="([^"]+)"/i);
  const name =
    (utf8?.[1] ? decodeURIComponent(utf8[1]) : null) ||
    plain?.[1] ||
    fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 서버에 RFP 제안서 payload 를 보내 PDF 를 다운로드한다.
 */
export async function downloadRfpProposalPdf(
  payload: RfpProposalExportPayload,
): Promise<void> {
  const res = await fetch("/api/studio/rfp/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ payload }),
  });
  await downloadPdfBlob(res, `${rfpProposalFileBase(payload)}.pdf`);
}

/** brief + 매칭 결과로 서버에서 payload 조립 후 PDF 다운로드 */
export async function downloadRfpProposalFromMatch(args: {
  brief: RfpProposalBrief;
  matchGroups: RfpGroupMatchResult[];
  excludedByGroup?: Record<string, string[]>;
  locale?: string;
  recommendComment?: string | null;
}): Promise<void> {
  const res = await fetch("/api/studio/rfp/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      brief: args.brief,
      matchGroups: args.matchGroups,
      excludedByGroup: args.excludedByGroup,
      locale: args.locale ?? "ko",
      recommendComment: args.recommendComment ?? null,
    }),
  });
  const brand = args.brief.campaign?.brandName ?? "RFP";
  await downloadPdfBlob(res, `THINKAD_RFP_${brand}.pdf`);
}