/** Prisma / pg 어댑터 오류에서 메시지 추출 */
function extractErrorMessage(e: unknown): string {
  if (!e || typeof e !== "object") return "";
  const pe = e as {
    code?: string;
    message?: string;
    meta?: Record<string, unknown>;
  };

  const meta = pe.meta;
  const driver = meta?.driverAdapterError as
    | { cause?: { originalMessage?: string; kind?: string } }
    | undefined;
  if (driver?.cause?.originalMessage) {
    return driver.cause.originalMessage;
  }

  return typeof pe.message === "string" ? pe.message : "";
}

/** Prisma 오류 → 관리자용 짧은 한글 메시지 */
export function prismaErrorDetail(e: unknown): string | null {
  if (!e || typeof e !== "object") return null;
  const pe = e as {
    code?: string;
    meta?: Record<string, unknown>;
    message?: string;
  };

  const msg = extractErrorMessage(e);

  // Prisma client validation (Invalid `prisma....create()` invocation)
  const argInvalid = msg.match(
    /Argument `(\w+)`: Invalid value provided\./,
  );
  if (argInvalid?.[1]) {
    const field = argInvalid[1];
    if (field === "pricePackage") {
      return "pricePackage는 숫자(만원)만 가능합니다. 패키지명은 priceNote에 넣으세요.";
    }
    return `필드 '${field}' 값이 올바르지 않습니다. JSON 형식·가격 단위를 확인하세요.`;
  }
  const expectedType = msg.match(
    /Argument `(\w+)`:.*?Expected ([^.]+)\./,
  );
  if (expectedType?.[1] && expectedType[2]) {
    return `필드 '${expectedType[1]}': ${expectedType[2]} 형식이 필요합니다.`;
  }
  if (/Invalid `prisma\./i.test(msg) || /Invalid `db\./i.test(msg)) {
    const line = msg
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("Argument ") || l.includes("Expected"));
    if (line) return line;
  }

  if (pe.code === "P2022") {
    const col = pe.meta?.column_name ?? pe.meta?.column;
    if (typeof col === "string") {
      return `DB 컬럼이 없습니다: ${col}. 이 DB에 npm run db:migrate:prod 실행이 필요합니다.`;
    }
    return "DB 컬럼이 없습니다. npm run db:migrate:prod 실행이 필요합니다.";
  }

  if (pe.code === "P2021") {
    const table = pe.meta?.table ?? pe.meta?.modelName;
    if (typeof table === "string") {
      return `DB 테이블이 없습니다: ${table}. npm run db:migrate:prod 실행이 필요합니다.`;
    }
    return "DB 테이블이 없습니다. npm run db:migrate:prod 실행이 필요합니다.";
  }

  if (pe.code === "P2002") {
    return "이미 같은 값이 존재합니다 (중복).";
  }

  if (pe.code === "P1001" || pe.code === "P1000" || pe.code === "P2010") {
    if (/password authentication failed/i.test(msg)) {
      return "DB 비밀번호 인증 실패. Vercel DATABASE_URL 과 Neon 비밀번호가 일치하는지 확인하세요.";
    }
    if (/does not exist/i.test(msg)) {
      return `DB 연결 실패: ${msg.slice(0, 120)}`;
    }
    return "DB 연결/인증 실패. DATABASE_URL 을 확인하세요.";
  }

  const missingCol = msg.match(/column [`"]?(\w+)[`"]? (?:of relation .* )?does not exist/i);
  if (missingCol?.[1]) {
    return `DB 컬럼 없음: ${missingCol[1]}. npm run db:migrate:prod 필요.`;
  }
  const missingTable = msg.match(/relation [`"]?(\w+)[`"]? does not exist/i);
  if (missingTable?.[1]) {
    return `DB 테이블 없음: ${missingTable[1]}. npm run db:migrate:prod 필요.`;
  }

  if (/password authentication failed/i.test(msg)) {
    return "DB 비밀번호 인증 실패. Vercel·Neon DATABASE_URL 을 동기화하세요.";
  }

  if (msg.trim()) {
    const short = msg.split("\n").find((l) => l.trim().length > 0) ?? msg;
    return short.length > 180 ? `${short.slice(0, 180)}…` : short;
  }

  return null;
}
