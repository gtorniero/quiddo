# SEO audit and implementation

Audit date: 2026-11-01 (America/Sao_Paulo). Base: origin/main 6aa57bc.

## Production observations

Direct HTTP requests to https://quiddo.com.br showed an empty header and main in the initial HTML, a generic title/description, and no canonical, OG or structured data. `/guias` also returned the SPA shell. `/robots.txt` and `/sitemap.xml` returned HTML rather than crawler files. A deliberately nonexistent URL returned HTTP 200.

## Changes

- Build-time prerender of the existing home, guide directory and all 20 published guides. Shared renderers keep the interactive client and static content aligned; no browser sniffing or alternate crawler content.
- Unique titles/descriptions, production canonicals without tracking parameters, OG/Twitter metadata and a local 1200×630 social image. JSON-LD describes Organization, WebSite, CollectionPage, Article and article breadcrumbs. No fabricated ratings, prices, authorship or publication dates.
- Generated sitemap includes only the 22 public pages; robots allows crawling, blocks API URLs and declares the sitemap. Game/editor routes remain crawlable so crawlers can see their noindex directive.
- Worker handles all document requests through the explicit ASSETS binding. HTML auto-redirects and SPA fallback are disabled. Clean public paths map to prerenders, recognized application routes to a noindex shell, and unknown documents to a real 404. HTML aliases/trailing slashes redirect. Private application documents use no-store; API JSON uses noindex.
- Metadata updates on client-side navigation, including removing article schemas/canonicals when entering the editor or a nonexistent page.
- Related guide links supplement the existing home → category guide and directory → all guides links.
- Route-based JavaScript splitting keeps editor, payment and game screens out of the public entry bundle. Two secondary font families use existing CSS fallbacks and are removed from the global font request; below-fold home sections defer rendering on mobile and respect reduced motion.

## Content review

Existing articles already cover question writing, timing, presenting, technical setup, parties, couples, companies and schools. Kept the 20 articles instead of adding overlapping content. Verified described features against room rules, host keyboard controls and existing UI. Corrected “4 letters” to “4 characters” because room codes include digits; removed absolute claims of compatibility with every phone. No new product capabilities or commercial claims were introduced. Existing prices, free-player limit and checkout are unchanged.

## Validation and limits

Passed: `npm test` (106 tests), `npm run typecheck`, `npm run build` and `npm run check:seo`. The SEO tests cover all public paths, metadata uniqueness, one h1, private noindex, aliases, HEAD and 404 handling. Prerender output is checked additionally through the local production Worker and a mobile browser.

This PR does not deploy. Search Console ownership, sitemap submission, live indexing, real-user Core Web Vitals and post-deployment Google rendering require the reviewed change to be published later. No claims about ranking improvements or field performance are made.

Cloudflare configuration references: [asset binding](https://developers.cloudflare.com/workers/static-assets/binding/) and [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/).

Local production Worker + Chromium mobile validation passed for all 22 pages, HTTP statuses, crawler files, social image, no horizontal overflow at a 390px viewport, demo interaction and SPA metadata transitions.
