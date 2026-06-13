-- 이탈 시점 1클릭 마이크로 설문
CREATE TABLE "exit_survey_responses" (
  "id" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "path" TEXT,
  "session_id" TEXT,
  "user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "exit_survey_responses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "exit_survey_responses_surface_created_at_idx" ON "exit_survey_responses"("surface", "created_at");
CREATE INDEX "exit_survey_responses_answer_idx" ON "exit_survey_responses"("answer");
