# V29.2 Taxonomy and Smart Dispatch Foundation

V29.2 separates customer-facing labels from dispatch matching rules.

## Customer location

Customers can enter a community name, a postal code, or a short location note. The system normalizes this into a Calgary dispatch area:

- `central`
- `nw`
- `ne`
- `sw`
- `se`
- `unknown`

Community pages and known community choices set the area directly. Free text and postal codes are used as fallback signals. Dispatch never uses hard community matching.

## Provider service areas

Providers choose:

- `all_calgary`
- `central`
- `nw`
- `ne`
- `sw`
- `se`

`all_calgary` providers are eligible as local matches for every Calgary dispatch area.

## Job type taxonomy

Customer choices are more natural. Provider capabilities are standardized:

- `mattress_bed`
- `furniture_household`
- `moveout_garage_cleanout`
- `appliances_electronics`
- `yard_waste`
- `renovation_debris`

Customer choices map into these standard job types before storage and dispatch.

## Provider application simplification

Provider application no longer asks for:

- notification preference
- available days
- available windows

Lead notification channel is controlled by platform admin settings. Job timing is arranged directly between provider and customer after claim.

## Dispatch tiers

The database function `create_provider_notifications_for_lead` now ranks providers by tiers:

1. `all_calgary` or same dispatch area + exact job type
2. any Calgary area + exact job type
3. compatible general junk types for ordinary jobs only

Special job types do not use the general compatibility fallback:

- appliances / electronics
- yard waste
- renovation debris

Daily lead limit is enforced before a provider is selected.
