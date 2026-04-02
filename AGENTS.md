<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Media catalog data source

- **Keep `fetchPublicMediaCatalog` (DB-backed) as the source of truth** for public media listing and detail flows. Do not swap it for mock data, static samples, or JSON-only catalogs in production paths.
- 목업·샘플 데이터로 교체하지 말 것 — 공개 매체 목록/상세는 DB 경로(`fetchPublicMediaCatalog`)를 유지할 것.
