# Clearout YYC v19 Launch Checklist

## Code

- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Confirm homepage loads
- [ ] Confirm `/request` loads
- [ ] Confirm `/providers` loads
- [ ] Confirm `/areas` loads
- [ ] Confirm at least one community page loads, e.g. `/junk-removal-beltline`
- [ ] Confirm `/request?community=beltline` pre-fills Beltline

## Google Sheet

- [ ] Create Google Sheet
- [ ] Paste `google-apps-script-clearout-webhook.js`
- [ ] Set Apps Script property `WEBHOOK_SECRET`
- [ ] Optional: set `NOTIFY_EMAIL`
- [ ] Deploy Apps Script as Web App
- [ ] Copy Web App URL

## Vercel env

- [ ] `VITE_USE_REMOTE_API=true`
- [ ] `VITE_API_BASE_URL=` blank for same-origin API
- [ ] `GOOGLE_SHEETS_WEBHOOK_URL=` Apps Script Web App URL
- [ ] `GOOGLE_SHEETS_WEBHOOK_SECRET=` same as Apps Script
- [ ] Optional `RESEND_API_KEY`
- [ ] Optional `LEAD_NOTIFY_TO`
- [ ] Optional `LEAD_NOTIFY_FROM`

## Vercel domain

- [ ] Add `clearout.aurorasitesolutions.com`
- [ ] Add `www.aurorasitesolutions.com`
- [ ] Add `aurorasitesolutions.com` if using apex
- [ ] Update DNS using Vercel-provided records
- [ ] Confirm HTTPS active

## Live form test

- [ ] Submit one customer request from `/request`
- [ ] Confirm row appears in `Customer Leads`
- [ ] Submit one provider beta signup from `/providers`
- [ ] Confirm row appears in `Provider Applications`
- [ ] Confirm email notification if enabled

## SEO

- [ ] Check `https://clearout.aurorasitesolutions.com/robots.txt`
- [ ] Check `https://clearout.aurorasitesolutions.com/sitemap.xml`
- [ ] Add Search Console property
- [ ] Submit sitemap
- [ ] Inspect homepage URL
- [ ] Inspect `/areas`
- [ ] Inspect 2–4 community pages

## Provider beta

- [ ] Make list of 20 Calgary junk/removal/hauling operators
- [ ] Contact first 5–8 manually
- [ ] Ask for service areas, vehicle capacity, and SMS/email preference
- [ ] Do not discuss future paid rules unless asked
- [ ] Track response speed and accepted job types in the sheet
