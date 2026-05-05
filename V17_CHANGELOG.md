# V17 Changelog — Community pages as real local entry points

## Positioning updates

- Homepage avoids named competitor comparisons.
- The comparison section now frames the user flow as "Calling around vs submit once".
- Customer-facing pages do not show provider pricing or lead access fees.
- Provider public page only explains beta/no app/no monthly fee/future paid-access principles, without a public price table.

## Community page updates

- Community pages now work as local request entry points, not thin SEO pages.
- Each community page explains that requests from that page are tagged with the community and Calgary area.
- CTA now uses the community name, for example: "Submit a Panorama Hills Request".
- Each community page includes:
  - H1: Junk Removal in [Community]
  - Phone verification / max 3 providers explanation
  - Community auto-tagging explanation
  - Good-for list
  - Not-for list
  - Local note based on likely real community context such as apartments, parking, suburban homes, garages, move-outs, or dense inner-city access.

## Areas page updates

- `/areas` is grouped by:
  - Central / Downtown
  - NW Calgary
  - NE Calgary
  - SW Calgary
  - SE Calgary
- Each area section links to its community pages.

## FAQ updates

- Added clear answers for:
  - Clearout YYC is not a junk removal company
  - Provider response is not guaranteed
  - Final price is confirmed directly with providers
  - Each request may be sent to up to 3 providers only

## Data model retained

- Lead data still saves:
  - `community_slug`
  - `community_or_postal`
  - `area`
  - `phone_verified`
  - `lead_grade`
  - `dispatch_eligible`
  - future shared/exclusive pricing fields for backend use only

## Build

`npm run build` has been tested successfully.
