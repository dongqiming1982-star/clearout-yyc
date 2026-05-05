# Clearout YYC — v19 Launch Ready

Clearout YYC is a Calgary junk removal / clearout lead platform operated under Aurora Site Solutions.

Production structure:

- `www.aurorasitesolutions.com` = Aurora Site Solutions operator / parent-brand page
- `clearout.aurorasitesolutions.com` = Clearout YYC junk removal request subsite

Business boundaries:

- Clearout YYC is not a junk removal company.
- Clearout YYC does not do moving jobs.
- Clearout YYC does not handle valuable-item moving or hazardous waste dispatch.
- Customers submit requests for free.
- Eligible requests may be shared with up to 3 local providers after confirmation.
- Provider response is not guaranteed.
- Final price, timing, payment, disposal, and service are confirmed directly between customer and provider.
- Provider public page shows only beta/free/no-app/no-monthly-fee positioning.
- Future shared/exclusive paid access rules belong only on provider-only lead access/payment pages.

## What changed in v19

v19 is not a visual redesign. It turns v18 into a launch-ready test version:

- Customer request form can POST to `/api/leads`.
- Provider beta signup form can POST to `/api/provider-applications`.
- API can append rows to a Google Sheet via Google Apps Script webhook.
- API can optionally send email notifications through Resend.
- Local demo mode still works with browser localStorage.
- `vercel.json` added so direct URLs such as `/areas` and `/junk-removal-beltline` work after deployment.
- `sitemap.xml`, `robots.txt`, page titles, and meta descriptions are ready for the Clearout subdomain.
- No Supabase, Twilio, Stripe, or database is required for the first launch test.

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Default mode is local demo:

```env
VITE_USE_REMOTE_API=false
```

## Launch mode

Set this in Vercel environment variables:

```env
VITE_USE_REMOTE_API=true
VITE_API_BASE_URL=
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/xxxxx/exec
GOOGLE_SHEETS_WEBHOOK_SECRET=choose-a-long-secret
```

Optional email notifications through Resend:

```env
RESEND_API_KEY=re_xxxxx
LEAD_NOTIFY_TO=your@email.com
LEAD_NOTIFY_FROM=Clearout YYC <leads@yourdomain.com>
```

Optional anti-spam:

```env
TURNSTILE_SECRET_KEY=xxxxx
VITE_TURNSTILE_SITE_KEY=xxxxx
```

If `TURNSTILE_SECRET_KEY` is empty, the API accepts forms without Turnstile. That is acceptable for the first private beta, but add Turnstile before pushing real traffic.

## Google Sheet setup

1. Create a Google Sheet named something like `Clearout YYC Leads`.
2. Open `Extensions → Apps Script`.
3. Paste `google-apps-script-clearout-webhook.js`.
4. In Apps Script, open Project Settings → Script Properties.
5. Add:

```text
WEBHOOK_SECRET = same value as GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel
NOTIFY_EMAIL = your@email.com  optional
```

6. Deploy → New deployment → Web app.
7. Use:

```text
Execute as: Me
Who has access: Anyone
```

8. Copy the Web App URL into Vercel as `GOOGLE_SHEETS_WEBHOOK_URL`.
9. Submit one test customer request and one test provider signup.
10. Confirm two tabs are created:

```text
Customer Leads
Provider Applications
```

## Vercel deployment

1. Push the project to GitHub.
2. Import the repo into Vercel.
3. Framework Preset: Vite.
4. Build command:

```bash
npm run build
```

5. Output directory:

```text
dist
```

6. Add the environment variables above.
7. Deploy.
8. In Vercel Domains, add:

```text
clearout.aurorasitesolutions.com
www.aurorasitesolutions.com
aurorasitesolutions.com
```

Recommended DNS:

```text
clearout CNAME cname.vercel-dns.com
www      CNAME cname.vercel-dns.com
@        A     76.76.21.21
```

Use the exact DNS values Vercel shows for your project if they differ.

## Google Search Console submission

After the Clearout subdomain resolves:

1. Add property:

```text
https://clearout.aurorasitesolutions.com/
```

2. Verify with DNS or HTML file.
3. Submit sitemap:

```text
https://clearout.aurorasitesolutions.com/sitemap.xml
```

4. Use URL Inspection for:

```text
https://clearout.aurorasitesolutions.com/
https://clearout.aurorasitesolutions.com/areas
https://clearout.aurorasitesolutions.com/junk-removal-beltline
https://clearout.aurorasitesolutions.com/junk-removal-panorama-hills
```

5. Request indexing for the homepage and 2–4 community pages first. Do not mass-submit every page manually.

## First provider test plan

Start with 5–8 Calgary providers. Do not pitch it like a finished marketplace.

Suggested message:

```text
Hi, I’m testing Clearout YYC, a Calgary junk removal request platform.

Customers submit a junk removal request once. After phone confirmation, I may send the request by SMS/email to up to 3 local providers.

The beta is free:
- no app
- no monthly fee
- no commitment
- reply only when the job fits your area and truck/crew capacity

Would you like to be included in the free beta list for Calgary junk removal leads?
```

Target provider types:

- small junk removal operators
- pickup/trailer operators
- handyman businesses that already haul junk
- moving companies only if they also separately accept junk removal, but Clearout YYC itself should not market moving jobs
- property cleanout / move-out cleaning contacts that know junk haulers

## Important launch warning

v19 is enough to collect real beta leads, but it is not yet a fully automated dispatch marketplace.

For first launch, operate it manually:

1. Customer submits request.
2. Row appears in Google Sheet / email.
3. You call or text customer to confirm.
4. You manually forward clean leads to 1–3 opt-in providers.
5. You track provider response and customer outcome.
6. After 20–50 real requests, decide whether to build SMS automation and provider-only paid access.
