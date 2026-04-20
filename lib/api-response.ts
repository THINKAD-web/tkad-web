import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(
  code: string,
  status: number,
  opts?: { message?: string; issues?: unknown },
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message: opts?.message,
        issues: opts?.issues,
      },
    },
    { status },
  );
}

export function apiServerError(e: unknown, tag: string) {
  console.error(`[api:${tag}]`, e);
  return apiError("SERVER_ERROR", 500, {
    message: "요청을 처리하는 중 오류가 발생했습니다.",
  });
}

export function apiZodError(err: ZodError) {
  return apiError("INVALID_INPUT", 400, {
    message: "입력값을 확인해주세요.",
    issues: err.flatten(),
  });
}

export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
