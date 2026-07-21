import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import {
  ADMIN_SESSION_COOKIE,
  type AdminSessionVerifyCode,
  verifyAdminSessionDetails,
} from "@/lib/admin-session";
import {
  getBunnyStorageConfigStatus,
  isBunnyStorageConfigured,
  uploadToBunnyStorage,
} from "@/lib/bunny-storage";
import { buildAdminBunnyImageUploadPath } from "@/lib/bunny-upload-path";

export const dynamic = "force-dynamic";

function authFailureMeta(code: AdminSessionVerifyCode): {
  error: string;
  code: string;
  details?: string;
} {
  switch (code) {
    case "expired":
      return {
        error: "Admin session expired. Please sign in again.",
        code: "ADMIN_SESSION_EXPIRED",
      };
    case "missing_secret":
      return {
        error: "Admin login is not configured on this runtime.",
        code: "ADMIN_AUTH_NOT_CONFIGURED",
      };
    default:
      return {
        error: "Admin session missing or invalid. Please sign in again.",
        code: "ADMIN_SESSION_INVALID",
      };
  }
}

function uploadFailureMeta(message: string, diagnosticId: string): {
  status: number;
  error: string;
  code: string;
  details?: string;
  diagnosticId: string;
} {
  if (message === "BUNNY_STORAGE_NOT_CONFIGURED") {
    const config = getBunnyStorageConfigStatus();
    return {
      status: 503,
      error: "Bunny storage runtime is not configured.",
      code: "BUNNY_NOT_CONFIGURED",
      details:
        config.missingEnvVars.length > 0
          ? `Missing env: ${config.missingEnvVars.join(", ")}`
          : undefined,
      diagnosticId,
    };
  }

  const match = message.match(/^BUNNY_UPLOAD_FAILED:(\d+):([\s\S]*)$/);
  if (match) {
    const upstreamStatus = Number(match[1]);
    const upstreamBody = match[2]?.trim();
    return {
      status: 502,
      error: "Bunny storage upload failed.",
      code: "BUNNY_UPLOAD_FAILED",
      details: upstreamBody
        ? `Upstream status ${upstreamStatus}: ${upstreamBody}`
        : `Upstream status ${upstreamStatus}`,
      diagnosticId,
    };
  }

  return {
    status: 502,
    error: "Upload failed.",
    code: "UPLOAD_FAILED",
    details: message,
    diagnosticId,
  };
}

export async function POST(request: NextRequest) {
  const diagnosticId = crypto.randomUUID().slice(0, 8);
  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE);
  const auth = verifyAdminSessionDetails(sessionCookie?.value);
  if (!auth.ok) {
    const meta = authFailureMeta(auth.code);
    console.warn("[admin upload bunny] auth denied", {
      diagnosticId,
      reason: auth.code,
      path: request.nextUrl.pathname,
      method: request.method,
      cookieHeaderPresent: request.headers.has("cookie"),
      sessionCookiePresent: Boolean(sessionCookie),
    });
    return json(
      {
        error: meta.error,
        code: meta.code,
        details: meta.details,
        diagnosticId,
      },
      401,
    );
  }

  if (!isBunnyStorageConfigured()) {
    const config = getBunnyStorageConfigStatus();
    console.error("[admin upload bunny] missing runtime config", {
      diagnosticId,
      missingEnvVars: config.missingEnvVars,
      path: request.nextUrl.pathname,
      method: request.method,
    });
    return json(
      {
        error: "Bunny storage runtime is not configured.",
        code: "BUNNY_NOT_CONFIGURED",
        details:
          config.missingEnvVars.length > 0
            ? `Missing env: ${config.missingEnvVars.join(", ")}`
            : undefined,
        diagnosticId,
      },
      503,
    );
  }

  try {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, 400);
    }

    const bytes = await file.arrayBuffer();
    // 원본 한글 파일명은 무시 — UUID + ASCII ext만 키로 사용
    const path = buildAdminBunnyImageUploadPath(
      file.type || "application/octet-stream",
      file.name,
    );

    const out = await uploadToBunnyStorage({
      path,
      bytes,
      contentType: file.type || "application/octet-stream",
    });

    return json({ url: out.publicUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    const failure = uploadFailureMeta(msg, diagnosticId);
    console.error("[admin upload bunny] failed", {
      diagnosticId,
      code: failure.code,
      details: failure.details,
      rawMessage: msg,
      path: request.nextUrl.pathname,
      method: request.method,
    });
    return json(
      {
        error: failure.error,
        code: failure.code,
        details: failure.details,
        diagnosticId: failure.diagnosticId,
      },
      failure.status,
    );
  }
}

