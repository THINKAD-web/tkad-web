import { NextRequest, NextResponse } from "next/server";
import {
  OoHQuoteStatus,
  OohContractSendMode,
  OohContractStatus,
} from "@prisma/client";
import {
  isAttachmentOnlyContract,
  mapUploadPdfFetchErrorToHttpStatus,
  normalizeContractSendMode,
} from "@/lib/contract-send-mode";
import { fetchUploadedContractPdfVerified } from "@/lib/ooh-contract-upload-pdf";
import { buildSignedUploadContractPdf } from "@/lib/upload-contract-sign-pdf";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import {
  loadOoHQuoteForContract,
  ooHQuoteToContractPdfVars,
  resolveMediaNamesForQuote,
} from "@/lib/ooh-contract-context";
import { buildSignedOohContractPdf } from "@/lib/ooh-contract-pdf";
import { sendContractSignedEvidenceEmails } from "@/lib/contract-sign-notify";
import {
  formatSignedAtKst,
  hashContractSignImages,
  hashUnsignedContractDocument,
  sha256Hex,
} from "@/lib/signature-audit";
import { getCurrentUser } from "@/lib/user-session";
import { postInternalAlert } from "@/lib/internal-webhook";
import {
  isCloudinaryConfigured,
  uploadOohContractPdf,
} from "@/lib/cloudinary-upload-contract";
import { promoteHoldsToConfirmed } from "@/lib/ooh-quote-booking-hold";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 6, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;
const MAX_SIG = 1_400_000;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(request);
  if (!limiter.check(ip))
    return json({ error: "Too many requests" }, { status: 429 });

  const { id } = await ctx.params;
  if (!id || !CUID_RE.test(id))
    return json({ error: "Not found" }, { status: 404 });
  if (!isDatabaseConfigured())
    return json({ error: "Unavailable" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.website) return json({ success: true }, { status: 201 });

  const agree = body.agree === true || body.agreeEsignLaw === true;
  if (!agree) {
    return json(
      { error: "Must accept electronic signature under the Electronic Signature Act" },
      { status: 400 },
    );
  }

  const signatureRaw = String(body.signaturePngBase64 ?? "").trim();
  const stampRaw = String(body.stampPngBase64 ?? "").trim();
  const hasSignature = signatureRaw.length >= 80;
  const hasStamp = stampRaw.length >= 80;
  if (!hasSignature && !hasStamp) {
    return json(
      { error: "Signature or company stamp image required" },
      { status: 400 },
    );
  }
  if (signatureRaw.length > MAX_SIG || stampRaw.length > MAX_SIG) {
    return json({ error: "Signature image too large" }, { status: 400 });
  }

  const signerName = String(body.signerName ?? "").trim();
  const signerEmail = String(body.signerEmail ?? "").trim();
  if (!signerName || !signerEmail) {
    return json(
      { error: "signerName and signerEmail required" },
      { status: 400 },
    );
  }

  const ua = request.headers.get("user-agent") ?? "unknown";

  const db = getPrisma();
  let row = await loadOoHQuoteForContract(db, id);
  if (!row) return json({ error: "Not found" }, { status: 404 });

  if (row.status !== OoHQuoteStatus.booking_confirmed) {
    return json(
      { error: "Signing only after booking is confirmed" },
      { status: 403 },
    );
  }

  await ensureOohContractExists(db, id, row.status);
  row = (await loadOoHQuoteForContract(db, id))!;
  const contract = row.oohContract;
  if (!contract) {
    return json({ error: "Contract record missing" }, { status: 404 });
  }
  if (isAttachmentOnlyContract(contract)) {
    return json(
      { error: "This contract was sent as an attachment; signing is not required" },
      { status: 403 },
    );
  }
  if (contract.status !== OohContractStatus.pending) {
    return json({ error: "Already signed or closed" }, { status: 409 });
  }

  const signedAt = new Date();
  const signedAtIso = signedAt.toISOString();
  const signedAtKst = formatSignedAtKst(signedAt);
  const isKo = row.locale !== "en";
  const sendMode = normalizeContractSendMode(contract.sendMode);

  function validatePngField(raw: string, label: string): string | null {
    if (!raw) return null;
    const b64 = raw.includes(",") ? raw.split(",")[1]! : raw;
    try {
      const buf = Buffer.from(b64, "base64");
      if (buf.length < 40) {
        throw new Error("too_small");
      }
    } catch {
      throw new Error(label);
    }
    return b64;
  }

  let sigB64: string | null = null;
  let stampB64: string | null = null;
  try {
    if (hasSignature) sigB64 = validatePngField(signatureRaw, "signature");
    if (hasStamp) stampB64 = validatePngField(stampRaw, "stamp");
  } catch (e) {
    const label = e instanceof Error ? e.message : "image";
    return json(
      {
        error:
          label === "stamp"
            ? "Invalid stamp image"
            : "Invalid signature image",
      },
      { status: 400 },
    );
  }

  const signatureImageHash = hashContractSignImages({
    signaturePngBase64: hasSignature ? signatureRaw : null,
    stampPngBase64: hasStamp ? stampRaw : null,
  });
  const clientStampDataUrl = stampRaw
    ? stampRaw.startsWith("data:")
      ? stampRaw
      : `data:image/png;base64,${stampB64}`
    : null;
  const sessionUser = await getCurrentUser();

  let documentHash: string;
  let pdfBase64: string;
  let sha256: string;

  try {
    if (sendMode === OohContractSendMode.uploaded_esign) {
      if (!contract.uploadedPdfUrl) {
        return json({ error: "Upload contract PDF missing" }, { status: 503 });
      }
      const sourcePdf = await fetchUploadedContractPdfVerified(
        contract.uploadedPdfUrl,
        contract.uploadedPdfSha256,
      );
      documentHash =
        contract.uploadedPdfSha256?.trim() ||
        contract.documentSha256?.trim() ||
        sha256Hex(sourcePdf);
      const signed = await buildSignedUploadContractPdf(
        sourcePdf,
        {
          signaturePngBase64: hasSignature ? signatureRaw : null,
          stampPngBase64: hasStamp ? stampRaw : null,
        },
        {
          signerName,
          signerEmail,
          signedAtKst,
          documentContentSha256: documentHash,
          signatureImageSha256: signatureImageHash,
        },
      );
      pdfBase64 = signed.pdfBase64;
      sha256 = signed.sha256;
    } else {
      const mediaNames = await resolveMediaNamesForQuote(db, row.mediaIds, isKo);
      const vars = ooHQuoteToContractPdfVars(row, mediaNames, contract.id);
      documentHash = await hashUnsignedContractDocument(vars);
      const built = await buildSignedOohContractPdf(
        vars,
        {
          signaturePngBase64: hasSignature ? signatureRaw : null,
          clientStampDataUrl,
        },
        {
          documentNumber: contract.id,
          signerName,
          signerEmail,
          signedAtIso,
          signedAtKst,
          signerIp: ip,
          signerAgent: ua,
          documentContentSha256: documentHash,
          signatureImageSha256: signatureImageHash,
        },
      );
      pdfBase64 = built.pdfBase64;
      sha256 = built.sha256;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sign_pdf_failed";
    console.error("[contract sign] pdf build", { quoteId: id, err: e });
    return json(
      { error: "Could not prepare contract PDF for signing" },
      { status: mapUploadPdfFetchErrorToHttpStatus(msg) },
    );
  }

  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  let contractPdfUrl = "inline:signed";
  let signedPdfBase64: string | null = pdfBase64;

  if (isCloudinaryConfigured()) {
    try {
      contractPdfUrl = await uploadOohContractPdf(pdfBuffer, contract.id);
      signedPdfBase64 = null;
    } catch (e) {
      console.error(
        "[contract sign] Cloudinary upload failed, storing PDF in DB:",
        e,
      );
    }
  }

  const auditLog = await db.signatureAuditLog.create({
    data: {
      contractId: contract.id,
      signerUserId: sessionUser?.id ?? null,
      signerEmail,
      signerIp: ip,
      signerUserAgent: ua,
      signedAt,
      documentHash,
      signatureImageHash,
    },
  });

  await db.oohContract.update({
    where: { id: contract.id },
    data: {
      status: OohContractStatus.signed,
      signedAt,
      signerName,
      signerEmail,
      signerIp: ip,
      signerAgent: ua,
      signatureImage: (hasSignature ? signatureRaw : stampRaw).slice(0, 500_000),
      agreementAcceptedAt: signedAt,
      signedPdfBase64,
      documentSha256: sha256,
      contractPdfUrl,
    },
  });

  // 전자서명 완료 시 가용 캘린더 홀드를 confirmed 로 승격 (SSOT)
  try {
    await promoteHoldsToConfirmed(db, id);
  } catch (e) {
    console.error("[contract sign] promote holds", e);
  }

  void postInternalAlert({
    type: "ooh_contract_signed",
    title: "전자계약 서명 완료",
    body: `${signerName} · ${row.clientCompany || ""} · 견적 ${id.slice(0, 8)}…`,
    meta: {
      ooHQuoteId: id,
      contractId: contract.id,
      documentHash,
      signatureImageHash,
      signedPdfSha256: sha256,
      auditLogId: auditLog.id,
    },
  }).catch(() => {});

  void sendContractSignedEvidenceEmails({
    isKo,
    signerEmail,
    signerName,
    auditLog,
    signedPdfSha256: sha256,
    pdfBase64,
  }).catch((e) => console.error("[contract sign] evidence email", e));

  return json(
    {
      success: true,
      documentSha256: sha256,
      documentHash,
      signatureImageHash,
      auditLogId: auditLog.id,
    },
    { status: 201 },
  );
}
