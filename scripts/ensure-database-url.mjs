#!/usr/bin/env node
/**
 * prisma db push / migrate 전에 .env · .env.local에서 DATABASE_URL 로드 후 존재 여부 확인.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

let databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
if (
  (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) ||
  (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))
) {
  databaseUrl = databaseUrl.slice(1, -1).trim();
  process.env.DATABASE_URL = databaseUrl;
}

if (!databaseUrl) {
  console.error(`
[tkad-web] DATABASE_URL이 설정되어 있지 않습니다.

다음 중 하나를 하세요:
  1) 프로젝트 루트에 .env 또는 .env.local 파일을 만들고
     DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=verify-full"
     형식으로 넣으세요. (Neon 대시보드에서 연결 문자열 복사 가능)
  2) 참고용: cp .env.production.example .env 후 값 수정

그 다음:
  npm run db:push
`);
  process.exit(1);
}

if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  console.error(`
[tkad-web] DATABASE_URL이 postgresql:// 로 시작하지 않습니다.

Neon 연결 문자열 전체를 복사했는지, 따옴표·공백·줄바꿈이 섞이지 않았는지 확인하세요.
`);
  process.exit(1);
}
