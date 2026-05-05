# V16 Changelog

## What changed

### 1. Clearout YYC remains the sub-brand
- Recommended deployment: `https://clearout.aurorasitesolutions.com`
- Customer-facing brand: **Clearout YYC**
- Operator: **Aurora Site Solutions**
- Footer keeps: `Clearout YYC is operated by Aurora Site Solutions.`

### 2. Aurora Site Solutions operator page is now included
The same project can display a simple operator/parent-brand page when hosted on:

- `https://www.aurorasitesolutions.com`
- `https://aurorasitesolutions.com`

That page is intentionally simple and explains Aurora as the operator of lightweight local lead systems, with Clearout YYC as the current project.

### 3. Community pages now connect to the customer request form
Community pages now send users to:

`/request?community=<community-slug>`

The request form pre-fills the exact community and matching area/quadrant.

### 4. Customer form now stores both community and area
Lead data now supports:

- `community_slug`
- `community_or_postal`
- `area`

This supports future dispatch logic:

1. exact community match
2. area/quadrant fallback
3. nearby provider fallback

### 5. Database schema updated
`supabase-schema.sql` now includes `community_slug` and indexes for community/area matching.

## Still intentionally not included
- Real Twilio OTP
- Real Twilio SMS dispatch
- Real Stripe payment
- Real Supabase integration

The fields and schema are prepared, but local demo mode remains the default.
