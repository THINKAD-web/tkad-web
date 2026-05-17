/** Prisma / pg / env 오류를 API·UI용 한국어 메시지로 정규화 */

const WEBKIT_JSON_PARSE_RE =
  /did not match the expected pattern|JSON Parse error|Unexpected token/i;

export type DbApiErrorCode =
  | "db_not_configured"
  | "db_url_invalid"
  | "db_unreachable"
  | "db_schema_missing"
  | "db_error";

export function stripDatabaseUrlQuotes(raw: string): string {
  const t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

export function isValidPostgresDatabaseUrl(url: string): boolean {
  const u = stripDatabaseUrlQuotes(url);
  if (!u) return false;
  return /^postgres(ql)?:\/\//i.test(u);
}

export function formatDbApiError(error: unknown): {
  error: string;
  code: DbApiErrorCode;
} {
  if (!process.env.DATABASE_URL?.trim()) {
    return {
      code: "db_not_configured",
      error:
        "DATABASE_URL이 설정되지 않았습니다. .env 또는 Vercel 환경 변수에 Neon 연결 문자열을 추가한 뒤 npm run db:push 를 실행하세요.",
    };
  }

  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Database error";

  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  if (code === "P1013" || /database string is invalid|scheme is not recognized/i.test(msg)) {
    return {
      code: "db_url_invalid",
      error:
        "DATABASE_URL 형식이 올바르지 않습니다. Neon 대시보드에서 복사한 postgresql://… 문자열인지, 비밀번호 특수문자는 URL 인코딩했는지 확인하세요.",
    };
  }

  if (
    code === "P1001" ||
    code === "ECONNREFUSED" ||
    /Can't reach database|Connection terminated|ECONNRESET/i.test(msg)
  ) {
    return {
      code: "db_unreachable",
      error:
        "데이터베이스에 연결할 수 없습니다. DATABASE_URL·Neon 프로젝트 상태·네트워크를 확인하세요.",
    };
  }

  if (
    code === "P2021" ||
    /does not exist|relation .* does not exist/i.test(msg)
  ) {
    return {
      code: "db_schema_missing",
      error:
        "DB 테이블이 없습니다. 로컬에서 DATABASE_URL 설정 후 npm run db:push 를 실행하세요.",
    };
  }

  if (WEBKIT_JSON_PARSE_RE.test(msg)) {
    return {
      code: "db_error",
      error:
        "서버 응답을 처리하지 못했습니다. DATABASE_URL 설정과 npm run db:push 후 다시 시도하세요.",
    };
  }

  return {
    code: "db_error",
    error: msg.length > 240 ? `${msg.slice(0, 240)}…` : msg,
  };
}
