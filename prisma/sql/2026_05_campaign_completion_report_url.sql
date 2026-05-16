-- P3-02: 캠페인 완료 PDF 리포트 CDN URL 저장
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS completion_report_url TEXT,
  ADD COLUMN IF NOT EXISTS completion_report_generated_at TIMESTAMPTZ;
