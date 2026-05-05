# V10 UX + Dispatch-Ready Fields

This version keeps the future database/admin/dispatch fields intact while improving the user-facing flow.

## Customer homepage
- Repositioned value around: skip calls, no phone spam, compare up to 3 local quotes, choose who to contact.
- Added a comparison block: calling companies yourself vs using Clearout YYC.
- Kept Calgary price guide, use cases, and provider CTA.

## Customer quote form
- Keeps a simple main flow for rough estimate.
- Detailed item fields remain in optional details.
- Lead model still stores structured future fields: load band, vehicle requirement, crew requirement, service tags, special warnings, detailed item lines, access factors, and photo metadata.

## Provider signup
- Changed provider onboarding into a two-stage experience:
  1. Quick provider signup: contact, service areas, vehicle/crew, services, insurance status.
  2. Verification for automatic dispatch: BN, business ID, proof uploads, insurance details, WCB, availability, legal confirmations.
- Submission does not mean automatic approval.
- Provider records still store complete future dispatch/admin fields.

## Dispatch readiness
Automatic dispatch can later filter by:
- approval status
- insurance review and expiry
- service area
- service type
- vehicle level
- crew capacity
- special item capability
- condo capability
- available days/time windows
- same-day acceptance
- daily lead limit
- last_assigned_at round-robin

## Storage note
File uploads are still local demo metadata only. Production should upload to Supabase Storage / S3 / Cloudflare R2 and store file URLs/paths in the database.
