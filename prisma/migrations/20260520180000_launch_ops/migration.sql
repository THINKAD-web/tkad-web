-- Launch ops: daily backup run log
CREATE TABLE IF NOT EXISTS "ops_backup_runs" (
    "id" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "detail" VARCHAR(512),
    "snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_backup_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ops_backup_runs_created_at_idx" ON "ops_backup_runs"("created_at" DESC);
