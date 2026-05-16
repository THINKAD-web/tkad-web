-- P3-04: OOH Academy articles
CREATE TYPE "AcademyArticleCategory" AS ENUM (
  'BASICS',
  'MEDIA_GUIDE',
  'BUDGET',
  'EXECUTION'
);

CREATE TABLE IF NOT EXISTS academy_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  category "AcademyArticleCategory" NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  thumbnail TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS academy_articles_published_category_idx
  ON academy_articles (published, category, published_at DESC);
