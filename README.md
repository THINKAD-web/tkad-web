This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment variables

Copy [`.env.production.example`](./.env.production.example) as a checklist for local `.env` and Vercel **Project → Settings → Environment Variables**. Variable names in that file match what the code reads.

**Toss Payments (instant DOOH booking)** — set these exact names in Vercel (manual entry; redeploy after save):

| Variable | Scope |
|----------|--------|
| `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` | Client (Payment Widget); include Preview if you test bookings on preview URLs |
| `TOSS_PAYMENTS_SECRET_KEY` | Server only (payment confirm API); never expose in `NEXT_PUBLIC_*` |

Legacy names such as `TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` are not used by the app.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details. For tkad-web-specific keys (DB, Resend, Cloudinary, Toss, cron), see `.env.production.example`.
