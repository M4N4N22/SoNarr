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

## Environment Variables

Create a local `.env` file with:

```bash
SOSOVALUE_API_KEY=your_sosovalue_key
GEMINI_API_KEY=your_gemini_key
```

Do not use `NEXT_PUBLIC_GEMINI_API_KEY`. Gemini calls run server-side only so the key is never exposed to the browser.

## AI Layer

SoNarr uses SoSoValue as the source of market evidence for narrative detection. The Gemini AI layer is used only for narrative synthesis: it turns existing SoSoValue-powered evidence, scores, assets, weights, and risk notes into a finance-ready brief.

AI does not invent prices, scores, assets, or evidence. It does not place trades, connect wallets, custody assets, or provide financial advice. If Gemini is unavailable or `GEMINI_API_KEY` is missing, SoNarr returns a deterministic fallback brief generated from the existing narrative data.

## AI Caching

Gemini calls are server-side only. AI narrative briefs are cached in memory for 30 minutes to reduce rate-limit risk during demos. Fallback briefs may be cached briefly when Gemini is unavailable. The in-memory cache resets on server restart; a future production version can move this cache to Redis or Vercel KV.

## Live Data Mode

SoNarr is live-data-only in the main product flow. Radar cards, narrative pages, and signal-stack layers are built from successful SoSoValue endpoint responses only; the app does not use fake fallback narratives, mock market scores, or generated demo cards when SoSoValue data is missing.

If a SoSoValue endpoint fails, rate-limits, returns unauthorized/not found, or returns an incompatible response shape, the UI shows endpoint diagnostics instead of fabricated data. In development, safe logs include endpoint name, path, URL without secrets, HTTP status, duration, item count, response shape summary, error type, and short message. API keys and authorization headers are never logged or exposed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
