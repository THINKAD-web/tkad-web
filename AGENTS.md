<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Media catalog data source

- **Keep `fetchPublicMediaCatalog` (DB-backed) as the source of truth** for public media listing and detail flows. Do not swap it for mock data, static samples, or JSON-only catalogs in production paths.
- 목업·샘플 데이터로 교체하지 말 것 — 공개 매체 목록/상세는 DB 경로(`fetchPublicMediaCatalog`)를 유지할 것.

## Project overview

- **Repo**: `THINKAD-web/tkad-web`
- **Live site**: https://tkad-web.vercel.app (Vercel, auto-deploys from `main`)
- **Stack**: Next.js 16.2.3 (App Router + Turbopack), TypeScript, Tailwind CSS, next-intl (ko/en), Prisma + PostgreSQL, Resend (email), Cloudflare Turnstile (bot protection)
- **UI language**: Korean-first, English secondary. All user-facing error messages and toasts should be Korean.

## Development & deployment workflow

1. **Branch**: Create a branch named `claude/<topic>-<shortId>` off `main`. Never commit directly to `main`.
2. **Build check**: Always run `npx next build` before committing to verify TypeScript and build errors.
3. **Commit**: Use conventional prefixes (`fix:`, `feat:`, `refactor:`, `chore:`, etc.).
4. **Push & PR**: `git push -u origin <branch>`, then create a PR targeting `main`.
5. **Merge**: Squash-merge into `main`. Vercel automatically deploys within 1–2 minutes.

## Vercel environment variables (already configured in production)

- `DATABASE_URL` — Postgres connection string (Prisma)
- `RESEND_API_KEY`, `RESEND_FROM` — outbound email via Resend
- `CONTACT_ALERT_EMAIL` — admin address that receives contact-form submissions (e.g. `mannote@tkad.co.kr`)
- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile keys
- If any of these are missing, the related feature degrades silently (contact form works but sends no email, etc.).

## Code style & conventions

- **i18n**: Client components use `useTranslations()` from `next-intl`. Server components must call `setRequestLocale()` before `getTranslations()`. Translation keys live in `messages/ko.json` and `messages/en.json`.
- **Contact page (`app/[locale]/contact/`)**: Must stay as a client component with `export const dynamic = "force-dynamic"` on the server wrapper. Do NOT convert to Server Actions — they create orphaned Suspense boundaries that prevent the form from rendering. Do NOT use shadcn/ui components here; use plain HTML + Tailwind classes (shadcn's Radix imports trigger SSR Suspense issues on this page specifically).
- **Toast API**: `toast(type, message)` — two separate positional args, NOT an object. Types: `"success" | "error" | "warning" | "info"`.
- **Force-dynamic on auth/data pages**: The locale layout sets `revalidate = 3600`, which can serve stale pages after deploys. Pages that must always render fresh (contact, quote, etc.) should export `dynamic = "force-dynamic"`.

## Things NOT to do

- Don't replace DB-backed media catalog with mock data (see above).
- Don't touch unrelated pages/components when fixing a specific page — keep diffs surgical.
- Don't skip pre-commit hooks (`--no-verify`) or commit signing flags.
- Don't push directly to `main`.
- Don't add features, refactors, or docs that weren't explicitly requested.
