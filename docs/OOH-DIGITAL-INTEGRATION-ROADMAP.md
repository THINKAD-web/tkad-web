# OOH ↔ Digital Integration Roadmap (§11 Stage 6)

Cross-brand integrated planner: live Digital catalog pricing on OOH (`/planner/integrated`), then unified mix generation.

**Repos:** `tkad-web` (OOH BFF) · `dmpilot` (Digital internal APIs)  
**Auth v1:** `INTEGRATION_SERVICE_SECRET` Bearer + `X-Tkad-Caller: tkad-web-bff` (Preview ≠ Production secret values)

---

## Stage overview

| Stage | Scope | Status |
|-------|--------|--------|
| **6a** | Live catalog bridge — 7 platform chips, live CPC/CPM, empty-bucket log + Slack | **✅ Complete** (2026-07-28) |
| **6b** | Mix generate — `POST /api/internal/mix/generate` (Digital) + `POST /api/integrated/mix` (OOH BFF) | Pending |
| **6c** | Client wiring — integrated planner UI calls BFF mix, budget split UX | Pending |

---

## 6a — Live catalog pricing bridge ✅

**Approved & merged:**

| PR | Repo | Merge commit |
|----|------|--------------|
| [#6](https://github.com/THINKAD-web/dmpilot/pull/6) | dmpilot | `0246132` |
| [#360](https://github.com/THINKAD-web/tkad-web/pull/360) | tkad-web | `8917a53` |
| [#7](https://github.com/THINKAD-web/dmpilot/pull/7) | dmpilot (7-4 hamburger polish, parallel) | `d034d7c` |

**Delivered:**

- `GET /api/internal/catalog` (dmpilot) + service auth + rate limit
- SSR catalog bridge (tkad-web) → `data-catalog-source="live"` on integrated planner
- Empty platform bucket → `console.error` + Slack warning (1h cooldown); not silent static fallback
- Preview protection bypass for server-to-server (`x-vercel-protection-bypass` + `DIGITAL_ORIGIN_PROTECTION_BYPASS`)

**Preview verification (2026-07-28):**

- Catalog API: HTTP 200, 24 items
- [tkad main Preview `/ko/planner/integrated`](https://tkad-web-git-main-mannote-6701s-projects.vercel.app/ko/planner/integrated) → `digitalCatalogMeta.source = live`

### 6a post-merge env checklist (Preview) ✅

Do **immediately after merge** — branch-alias `DIGITAL_ORIGIN` breaks silently when the feature branch is deleted.

- [x] `INTEGRATION_SERVICE_SECRET` — same value on tkad-web + dmpilot Preview
- [x] `DIGITAL_ORIGIN` — **restored** from `dmpilot-git-feat-6a-internal-catalog-…` → `https://dmpilot-git-main-mannote-6701s-projects.vercel.app`
- [x] `DIGITAL_ORIGIN_PROTECTION_BYPASS` — set for Preview → Preview calls
- [x] Branch alias no longer referenced in env (feat branch deleted on merge)
- [ ] `SLACK_WEBHOOK_URL` — **not set**; bucket-gap Slack alerts skip until configured

---

## 6b — Mix generate (next)

- Digital: `POST /api/internal/mix/generate` (catalog-backed, same auth as catalog)
- OOH: `POST /api/integrated/mix` BFF — owns OOH↔Digital budget %; engines keep intra-channel allocation
- Reuse `INTEGRATION_SERVICE_SECRET`, `DIGITAL_ORIGIN`, protection bypass on Preview

---

## 6c — Client wiring (after 6b)

- Wire integrated planner client to BFF mix endpoint
- Preserve user slider over default split table

---

## Production cutover checklist (defer until 6b + 6c done and prod deploy planned)

Do **once** when shipping integrated mix to production — not during Preview-only 6a–6c work.

- [ ] `DIGITAL_ORIGIN` → `https://digital.tkad.co.kr` (or production alias)
- [ ] `INTEGRATION_SERVICE_SECRET` — Production-only values on both projects (≠ Preview)
- [ ] `DIGITAL_ORIGIN_PROTECTION_BYPASS` — remove if production Digital has no Deployment Protection
- [ ] `SLACK_WEBHOOK_URL` (+ optional `SLACK_WEBHOOK_URL_WARNINGS`) on tkad-web Production + Preview
- [ ] Re-verify `data-catalog-source="live"` on production `/planner/integrated`

---

## Related docs

- Design baseline: §11 Stage 6 design (conversation 2026-07-28) — BFF on OOH, auth v1, 6a scope
- dmpilot README — `## OOH ↔ Digital integration (6a+)`
- tkad-web `.env.production.example` — `INTEGRATION_SERVICE_SECRET`, `DIGITAL_ORIGIN`, `DIGITAL_ORIGIN_PROTECTION_BYPASS`
