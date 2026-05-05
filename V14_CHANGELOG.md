# V14 Changelog

## Public customer-facing cleanup
- Removed lead-grade pricing and shared/exclusive price references from the customer request sidebar.
- Replaced backend language such as "system classification" with customer-facing "what happens after you submit" language.
- Customer request page now focuses on: free request, phone verification, max 3 providers, no blasting, Clearout YYC is not the service provider.

## Public provider page cleanup
- Removed exact shared/exclusive example prices from the public provider landing page.
- Public provider page now states only the principle: free beta, no app, no monthly fee, future paid contact access terms shown before access.
- Exact shared/exclusive prices remain reserved for future provider-only lead access / payment pages and database logic.

## Future database preserved
- Lead pricing fields, access mode, sold count, shared/exclusive access, Stripe/Twilio fields remain in the schema and App data model for future backend implementation.
