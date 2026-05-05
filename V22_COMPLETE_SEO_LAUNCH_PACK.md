# Clearout YYC v22 — Complete SEO Launch Pack

This version completes the SEO launch pack after v21 community pages.

## Added in v22

### 6 service-type SEO pages

- `/furniture-removal-calgary`
- `/garage-cleanout-calgary`
- `/move-out-cleanout-calgary`
- `/estate-cleanout-calgary`
- `/appliance-removal-calgary`
- `/renovation-debris-removal-calgary`

Each page includes:

- Unique H1
- Unique title/meta description
- Local Calgary-focused body copy
- Common request examples
- Good-fit / not-for boundaries
- FAQ content
- CTA to `/request?service=slug`
- Related community links

### SEO metadata and structured data

The React app now updates:

- `document.title`
- meta description
- canonical URL
- Open Graph title/description/url
- JSON-LD `Organization`
- JSON-LD `WebSite`
- JSON-LD `BreadcrumbList`
- JSON-LD `FAQPage` on FAQ, service, and community pages

Important: the site intentionally avoids `LocalBusiness`, `MovingCompany`, or junk-hauling business schema because Clearout YYC is a request platform, not a direct junk removal company.

### Sitemap update

`public/sitemap.xml` now includes:

- Core pages
- 6 service-type pages
- 20 community pages

### Request form prefill

Service page CTAs now send users to:

`/request?service=slug`

The request form pre-selects the matching service category when a service page passes the `service` query parameter.

## Build check

This package was tested with:

```bash
npm install --no-audit --no-fund --silent
npm run build
```

Build passed.

## Next operational step

Deploy to Vercel, bind `clearout.aurorasitesolutions.com`, then submit:

`https://clearout.aurorasitesolutions.com/sitemap.xml`

inside Google Search Console.
