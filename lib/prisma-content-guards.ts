import { Prisma } from "@prisma/client";

/**
 * 콘텐츠 테이블/컬럼이 누락된 환경(마이그레이션 미실행)에서도 빌드·SSR 이 통과하도록.
 * Prisma P2021 (table), P2022 (column), pg adapter TableDoesNotExist 등.
 */
export function isMissingContentTableError(e: unknown): boolean {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === "P2021" || e.code === "P2022")
  ) {
    return true;
  }
  if (e instanceof Error) {
    const msg = e.message || "";
    if (/table .* does not exist/i.test(msg)) return true;
    if (/column .* does not exist/i.test(msg)) return true;
    if (/TableDoesNotExist|ColumnNotFound|UndefinedColumn/i.test(msg)) return true;
  }
  return false;
}

export function isDatabaseAuthError(e: unknown): boolean {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P1000"
  ) {
    return true;
  }
  if (e instanceof Error) {
    const msg = e.message || "";
    if (/Authentication failed against the database server/i.test(msg)) return true;
    if (/password authentication failed/i.test(msg)) return true;
    if (/AuthenticationFailed/i.test(msg)) return true;
  }
  return false;
}

/** 빌드·SSR 중 DB 연결 불가 (Vercel parallel prerender, Neon cold start 등) */
export function isDatabaseUnreachableError(e: unknown): boolean {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === "P1001" || e.code === "P1017")
  ) {
    return true;
  }
  if (e instanceof Error) {
    const msg = e.message || "";
    if (/Can't reach database server/i.test(msg)) return true;
    if (/DatabaseNotReachable/i.test(msg)) return true;
    if (/Connection terminated unexpectedly/i.test(msg)) return true;
  }
  return false;
}
