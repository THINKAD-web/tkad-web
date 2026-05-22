import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const OPERATOR_MANUAL_STATE_KEY = "operator_manual_pdf";

export type OperatorManualAsset = {
  pdfUrl: string;
  pdfPublicId: string;
  generatedAt: string;
};

type StoredJson = {
  pdfUrl?: string;
  pdfPublicId?: string;
  generatedAt?: string;
};

export async function getOperatorManualAsset(): Promise<OperatorManualAsset | null> {
  if (!isDatabaseConfigured()) return null;

  const db = getPrisma();
  const row = await db.opsAutomationState.findUnique({
    where: { key: OPERATOR_MANUAL_STATE_KEY },
    select: { jsonValue: true },
  });
  const json = row?.jsonValue as StoredJson | null;
  if (!json?.pdfUrl || !json.pdfPublicId) return null;

  return {
    pdfUrl: json.pdfUrl,
    pdfPublicId: json.pdfPublicId,
    generatedAt: json.generatedAt ?? new Date().toISOString(),
  };
}

export async function saveOperatorManualAsset(opts: {
  pdfUrl: string;
  pdfPublicId: string;
}): Promise<OperatorManualAsset> {
  const generatedAt = new Date().toISOString();
  const db = getPrisma();
  await db.opsAutomationState.upsert({
    where: { key: OPERATOR_MANUAL_STATE_KEY },
    create: {
      key: OPERATOR_MANUAL_STATE_KEY,
      jsonValue: {
        pdfUrl: opts.pdfUrl,
        pdfPublicId: opts.pdfPublicId,
        generatedAt,
      },
    },
    update: {
      jsonValue: {
        pdfUrl: opts.pdfUrl,
        pdfPublicId: opts.pdfPublicId,
        generatedAt,
      },
    },
  });

  return {
    pdfUrl: opts.pdfUrl,
    pdfPublicId: opts.pdfPublicId,
    generatedAt,
  };
}
