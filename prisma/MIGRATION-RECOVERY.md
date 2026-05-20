# Prisma migration recovery (production)

## `relation "ab_events" already exists` (P3018)

이전에 `prisma db push`로 테이블이 이미 생성된 경우입니다. **기존 데이터는 삭제하지 않습니다.**

### A) 테이블 3개가 이미 모두 있는 경우 (db push 완료)

```bash
npm run db:migrate:status
# 실패한 마이그레이션만 "적용됨"으로 표시
npx prisma migrate resolve --applied 20260520120000_web_vitals_ab_testing
npm run db:migrate:status
```

### B) 실패 상태에서 마이그레이션 SQL을 다시 실행하는 경우

```bash
# 1) 실패 기록 롤백 처리
npx prisma migrate resolve --rolled-back 20260520120000_web_vitals_ab_testing

# 2) idempotent SQL로 재적용 (IF NOT EXISTS)
npm run db:migrate
```

### 테이블 존재 여부 확인 (Neon / psql)

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('ab_events', 'ab_test_configs', 'web_vitals');
```

3개 모두 있으면 **A**, 하나라도 없으면 **B**.
