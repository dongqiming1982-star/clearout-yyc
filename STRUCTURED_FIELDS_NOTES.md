# V12 Structured Fields Notes

V12 keeps the MVP simple for users while preserving structured fields for future production.

## Lead table intent

A lead should store:

- customer identity and consent
- community / area
- selected request categories
- rough amount
- item location
- timing
- request description
- photo metadata
- regular special item flags
- blocked/hazardous item flags
- service tags
- risk flags
- lead grade
- dispatch eligibility
- required vehicle level
- required crew size
- future lead access fee
- sold count / max sold count
- payment and refund placeholders

## Provider table intent

A provider should store:

- opt-in contact info
- service areas
- services accepted
- vehicle capability
- crew capacity
- SMS/email opt-in
- availability days/time windows
- daily lead limit
- future verification fields (BN, Business ID, insurance docs, WCB, etc.)
- legal operation confirmation
- no illegal dumping confirmation
- independent provider/platform boundary confirmation

## Dispatch rules intent

Production dispatch should require:

- lead.dispatch_eligible = true
- customer contact-share consent = true
- provider active/beta_opt_in or approved status depending phase
- provider SMS/email opt-in = true
- area match
- service tag match
- vehicle capacity >= required vehicle level
- crew capacity >= required crew size
- daily lead limit not exceeded
- max 3 provider dispatches per lead

## Future paid access

During beta:

- lead_access_fee = 0
- contact_release_mode = free_beta
- payment_status = free_beta

Future paid mode:

- small leads: $5
- standard leads: $8
- large / urgent / special confirmation leads: $12-$15+
- payment success releases contact details
- invalid-number requests can issue refund or lead credit
