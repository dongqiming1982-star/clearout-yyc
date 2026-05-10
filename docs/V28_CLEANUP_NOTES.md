# V28 Cleanup Notes

This cleanup keeps the V27.2 business behavior unchanged and turns the admin quick patches into one maintainable static admin file.

## What changed

- Replaced multiple injected admin scripts in `public/admin/index.html` with one consolidated admin controller.
- Kept all verified admin functions:
  - customer request ON/OFF
  - lead dispatch ON/OFF
  - provider claiming ON/OFF
  - exclusive buyout ON/OFF
  - Email/SMS dispatch channel
  - dispatch queue overview
  - today/month/top summary stats
  - bilingual EN/中文 admin labels
  - native per-lead dispatch status display
- Fixed `api/_lib/platformSettings.ts`:
  - removed duplicate `exclusive_claims_enabled` default
  - added `exclusive_claims_enabled` to `SETTING_KEYS`, so the admin switch can update it through the settings API
- Cleaned `api/provider/claim-lead.ts` so platform settings are loaded once per request.

## What did not change

- No database table names changed.
- No RPC function names changed.
- No public customer page logic changed.
- No provider claim URL format changed.
- No Email/SMS sending logic changed.

## After deploy

Recommended default operating state before paid exclusive buyout is ready:

```text
Customer requests: ON
Lead dispatch: ON
Provider claiming: ON
Exclusive buyout: OFF
Dispatch channel: Email
```

## Required verification after deploy

1. Open `/admin?v=28` and hard refresh.
2. Confirm the top cards show total / today / month.
3. Confirm platform controls show all five controls.
4. Confirm `exclusive_claims_enabled` can remain OFF.
5. Open a provider claim link and confirm the Exclusive button is hidden.
6. Submit one test lead with channel Email and confirm `Dispatch: email` appears.
7. Do not leave channel SMS on while Twilio is still in trial mode.
