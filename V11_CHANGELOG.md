# V11 Change Log — Free Beta Lead Marketplace

This version intentionally removes the complex quote platform direction and rebuilds the site around a lighter first MVP:

- Customer submits a free junk removal request.
- Request may be sent to up to 3 local providers.
- During beta, provider contact release is free.
- Future paid mode can use $5 / $8 / $12 contact-access fees.
- The site remains a lead distribution platform, not a junk removal company or moving company.

## Customer-side changes

- Homepage rewritten around the core pain: skip calling multiple companies.
- Main customer form simplified to: name, phone, community/postal, description, category, rough size, timing, optional photos.
- Optional details are hidden by default.
- Consent required before sharing contact details with up to 3 providers.
- No phone spam commitment retained.

## Provider-side changes

- Provider beta page focused on free lead alerts.
- No app, no monthly fee, SMS/email lead alerts.
- Verification fields remain for future production dispatch: insurance, BN, Business ID, WCB, documents, availability, vehicle, crew, service areas.
- Providers are not auto-approved by default in local demo.

## Future automation fields retained

- lead_access_fee
- sold_count
- max_sold_count
- contact_release_mode
- payment_status
- refund_status
- provider approval_status
- provider daily_lead_limit
- provider available_days and time windows
- provider vehicle and crew capacity

## Production automation target

Form submission → Database → Match providers → Twilio SMS/email → Stripe payment link (future) → Contact release → refund workflow for invalid numbers.
