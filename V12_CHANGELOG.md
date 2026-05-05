# V12 Change Log — Junk-Only Free Beta Lead Platform

## Strategic shift

V12 pivots from a quote-matching / estimator platform into a simpler **junk removal lead marketplace**.

The platform no longer tries to calculate final prices or manage provider quotes. It collects customer junk removal requests, classifies them, and prepares them for automatic distribution to opt-in local providers.

## Homepage

- Rewritten around customer pain:
  - Skip calling multiple companies.
  - Submit once.
  - Up to 3 local providers may contact you.
  - No phone spam.
  - No moving jobs.
  - No app / no account.
- Adds clear accepted vs non-auto-dispatched item categories.
- Reinforces that Clearout YYC is not a junk removal company.

## Customer request form

- Uses large mobile-friendly cards, not dropdown-heavy form fields.
- Step 1: request categories, multi-select.
- Step 2: rough amount, radio cards.
- Step 3: item location, radio cards.
- Step 4: special items split into:
  - regular special items that may require provider confirmation;
  - blocked/hazardous items that are not auto-dispatched.
- Step 5: contact, timing, optional photos, explicit consent.
- Hazardous/restricted selections trigger non-dispatch classification.

## Lead classification

The front end now creates structured fields for future backend dispatch:

- lead_grade
- dispatch_eligible
- rejection_reason
- service_tags
- risk_flags
- required_vehicle_level
- required_crew_size
- future_lead_access_fee
- max_sold_count
- contact_release_mode
- payment/refund placeholders

## Provider page

- Simplified to free beta opt-in.
- No app, no monthly fee.
- Provider must opt in to SMS/email lead alerts.
- Provider must confirm legal operation, no illegal dumping, and platform boundary terms.
- Provider fields remain structured for future dispatch: area, services, vehicle capacity, crew size, availability, daily limit.

## Admin demo

- Shows local demo leads, providers, and dispatches.
- Includes demo provider seeding for local testing.
