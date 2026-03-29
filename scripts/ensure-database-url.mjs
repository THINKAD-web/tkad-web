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

if (!process.env.DATABASE_URL?.trim()) {
  console.error(`
[tkad-web] DATABASE_URL이 설정되어 있지 않습니다.

다음 중 하나를 하세요:
  1) 프로젝트 루트에 .env 또는 .env.local 파일을 만들고
     DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
     형식으로 넣으세요. (Neon 대시보드에서 연결 문자열 복사 가능)
  2) 참고용: cp .env.production.example .env 후 값 수정

그 다음:
  npm run db:push
`);
  process.exit(1);
}
