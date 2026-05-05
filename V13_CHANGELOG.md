# V13 Change Log

## Main update

V13 aligns the site with the lean junk-removal lead marketplace model:

- Customers submit a free junk removal request.
- Customer phone must be verified before dispatch.
- A lead is sent only to opt-in providers.
- No app, no monthly fee, no hidden lead pricing.
- Future paid mode supports shared and exclusive contact access.

## Homepage

- Added stronger customer pain-point messaging: skip calling around, no phone blasting, junk-only scope.
- Added phone-verified lead language.
- Updated competitor comparison cards with clear contrast colors: red for the old painful process, green for Clearout YYC.

## Customer request form

- Added local demo phone verification button.
- Production note: replace demo verification with Twilio SMS OTP.
- Submission requires phone verification, real-request confirmation, and contact-sharing consent.
- Lead model now includes OTP and consent fields for future database/API use.

## Provider page

- Added explicit provider rules.
- Added phone-verified lead promise.
- Added beta rules: free during testing.
- Added future paid rules:
  - Shared lead: max 3 providers.
  - Example standard shared pricing: 1st $12, 2nd $8, 3rd $5.
  - Exclusive lead: only available before any access is sold; example from $30.
  - If exclusive is purchased, the lead closes.
- Added bad-number refund/credit boundaries.

## Database readiness

Updated `supabase-schema.sql` with:

- `phone_verified`, `phone_verified_at`, `otp_sent_at`, `otp_attempts`, `verification_method`
- `customer_consent_at`
- `access_mode`
- `shared_access_prices`
- `exclusive_access_fee`
- `current_shared_access_fee`
- purchase-level fields: `access_type`, `sold_position`, `phone_verified_at_purchase`
- notes for Stripe webhook race-condition handling.

