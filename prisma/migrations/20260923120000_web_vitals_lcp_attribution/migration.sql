-- LCP attribution fields (optional, LCP rows only)
ALTER TABLE "web_vitals" ADD COLUMN IF NOT EXISTS "lcp_element" TEXT;
ALTER TABLE "web_vitals" ADD COLUMN IF NOT EXISTS "lcp_url" TEXT;
ALTER TABLE "web_vitals" ADD COLUMN IF NOT EXISTS "lcp_ttfb_ms" DOUBLE PRECISION;
ALTER TABLE "web_vitals" ADD COLUMN IF NOT EXISTS "lcp_resource_load_delay_ms" DOUBLE PRECISION;
