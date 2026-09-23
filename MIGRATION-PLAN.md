# NaijaToday: Vite SPA → Next.js Migration Plan

## Current stack
- React/TypeScript Vite SPA on Netlify, with Supabase + Cloudinary
- Deploy pipeline: StackBlitz → GitHub → Netlify
- Manual prerendering setup for Googlebot
- `og.cjs` Netlify Function for bot-detection + OG tag serving
- `sitemap.cjs` Netlify Function generating a dynamic sitemap
- Meta Pixel (`4525219914426774`) with hand-rolled SPA-aware PageView tracking
- Category-based article URLs: `/article/[category]/[slug]`
- Database-driven features: `fuel_prices`, `data_plans` tables + admin tabs
- Monetag ads (after Adsterra caused SPA crashes)

## Why this migration is worth it
Several things currently built as custom infrastructure become native
Next.js features:

| Custom piece today | Next.js native replacement |
|---|---|
| Manual prerendering hack | Built-in SSR/SSG |
| `og.cjs` bot whitelist + OG serving | `generateMetadata()` per route |
| `sitemap.cjs` function | `app/sitemap.ts` |
| SPA-aware Pixel PageView tracking | Real route-change events via `usePathname` |

## Recommended approach: parallel rebuild, cut over when ready
Avoid a big-bang rewrite on a live, revenue-generating site. Instead:

1. Scaffold a new Next.js (App Router) project alongside the existing repo.
2. Point it at the **same Supabase project** — no data migration required,
   just move data-fetching from client `useEffect` to server components /
   route handlers.
3. Rebuild routes to match the current URL structure **exactly**
   (`/article/[category]/[slug]`) to preserve SEO equity.
4. Port Cloudinary calls to run server-side instead of client-side.
5. Rebuild the admin panel last — it's internal-only, so there's no
   SEO/prerendering pressure; it can stay on the old stack temporarily.
6. Deploy to a Netlify preview URL, test thoroughly, then cut over DNS.

## Migration checklist by piece

- [ ] Supabase client + types (`lib/supabase.ts`)
- [ ] Cloudinary helper reproducing the watermark overlay (`lib/cloudinary.ts`)
- [ ] Article page with `generateMetadata` + ISR
      (`app/article/[category]/[slug]/page.tsx`)
- [ ] `app/sitemap.ts`
- [ ] Meta Pixel base script + route-change tracker
      (`app/layout.tsx`, `components/MetaPixelTracker.tsx`)
- [ ] Category listing pages
- [ ] Homepage
- [ ] `fuel_prices` / `data_plans` pages + admin tabs
- [ ] Bulk Excel upload (Jobs, Scholarships) in admin
- [ ] User roles (admin/moderator/user) — reuse existing Supabase
      `profiles` table and auth logic
- [ ] Monetag ad integration (watch for the same class of SPA-crash
      issue seen with Adsterra; use `next/script` with an appropriate
      `strategy`)
- [ ] Canvas-based social card generator + Playwright batch script —
      these run outside the web app and are unaffected by the migration

## Hosting
Netlify supports Next.js via `@netlify/plugin-nextjs`, so the existing
GitHub → Netlify pipeline can stay as-is. Vercel has a few more native
conveniences (ISR, edge functions) but isn't required — only worth
switching if Netlify's Next.js support causes friction.

## Biggest risk: SEO
Any change to URL structure or a slow/incomplete rollout of redirects
will cost search rankings. Since article URLs are already
category-based and crawlable, the main job is to preserve them exactly
and make sure `generateMetadata()` output matches or improves on what
the current `og.cjs` function serves.

## Starter files included in this package
- `lib/supabase.ts` — Supabase client + `Article` type
- `lib/cloudinary.ts` — Cloudinary URL helper with watermark overlay
- `components/MetaPixelTracker.tsx` — route-change PageView tracking
- `app/layout.tsx.example` — wiring for the Pixel base script + tracker
- `app/article/[category]/[slug]/page.tsx` — article page with
  `generateMetadata` and ISR
- `app/sitemap.ts` — dynamic sitemap

Adjust table/column names in `lib/supabase.ts` and the watermark
`public_id` in `lib/cloudinary.ts` to match your actual Supabase schema
and Cloudinary asset.
