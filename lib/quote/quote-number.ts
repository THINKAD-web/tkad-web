import type { PrismaClient, Prisma } from "@prisma/client";

/** Prisma 트랜잭션 클라이언트 또는 표준 클라이언트 — advisory lock + raw SQL 둘 다 지원. */
type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * 견적 번호 생성 — `Q-YYYYMMDD-NNNN` 형식 (Q10 결정).
 *
 * 동시성 안전:
 *   PostgreSQL advisory transaction lock(per-day key) 으로 같은 날 동시 발급 시
 *   순서를 보장한다. 락은 트랜잭션 종료와 함께 자동 해제(서버 크래시 시에도 안전).
 *
 * 0001~9999 범위 — 9999 초과 시 throw(운영팀이 알람 받고 형식 확장 결정).
 */
const KEY_NAMESPACE = 0x71_75_74_65; // 'qute' as int32 — advisory lock 1차 키

function todayKstParts(): { year: number; month: number; day: number; key: string } {
  const utc = new Date();
  // KST = UTC+9. timezone-aware 처리 — 자정 경계의 한국 사용자에게 정확한 day 사용.
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const key = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  return { year, month, day, key };
}

function buildNumber(dateKey: string, seq: number): string {
  return `Q-${dateKey}-${String(seq).padStart(4, "0")}`;
}

/**
 * 트랜잭션 내부에서 호출 — 같은 트랜잭션이 OoHQuote insert 까지 가져가야 발급 번호가
 * 실제 row 와 일치한다(orphan 방지).
 */
export async function issueQuoteNumberInTx(tx: DbClient): Promise<string> {
  const { key } = todayKstParts();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const lockKey = (KEY_NAMESPACE ^ hash) | 0;

  // pg_advisory_xact_lock 은 트랜잭션 끝까지 hold. 같은 dateKey 동시 호출만 직렬화.
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`);

  const todayPrefix = `Q-${key}-`;
  const rows = (await tx.$queryRawUnsafe(
    `SELECT quote_number FROM ooh_quotes
     WHERE quote_number LIKE $1
     ORDER BY quote_number DESC
     LIMIT 1`,
    `${todayPrefix}%`,
  )) as Array<{ quote_number: string }>;

  let nextSeq = 1;
  if (rows[0]?.quote_number) {
    const m = /-(\d{4})$/.exec(rows[0].quote_number);
    if (m) nextSeq = Number.parseInt(m[1], 10) + 1;
  }
  if (nextSeq > 9999) {
    throw new Error(
      `Quote number space exhausted for ${key} (>9999). Extend format or partition by hour.`,
    );
  }
  return buildNumber(key, nextSeq);
}

/**
 * 외부 트랜잭션 없이 단독 발급. 내부에서 단일 트랜잭션을 만들어 advisory lock 보호.
 * 발급 직후 row 를 만들지 않으면 그 번호는 영원히 비게 된다(다음 호출이 +1 사용).
 */
export async function issueQuoteNumber(db: PrismaClient): Promise<string> {
  return db.$transaction((tx) => issueQuoteNumberInTx(tx));
}

/** 14일 TTL 만료 시각 계산. */
export function defaultQuoteExpiresAt(now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + 14);
  return d;
}

/** Q-20260425-0001 → { dateKey, seq } 또는 null. 어드민 검색용. */
export function parseQuoteNumber(input: string): {
  dateKey: string;
  seq: number;
} | null {
  const m = /^Q-(\d{8})-(\d{4})$/.exec(input.trim().toUpperCase());
  if (!m) return null;
  return { dateKey: m[1], seq: Number.parseInt(m[2], 10) };
}
