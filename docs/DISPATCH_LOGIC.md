# Dispatch Logic

## Platform settings

Settings are stored in `platform_settings` and loaded through `api/_lib/platformSettings.ts`.

Current settings:

```text
customer_requests_enabled
lead_dispatch_enabled
provider_claims_enabled
exclusive_claims_enabled
lead_dispatch_channel
```

## Lead flow

1. Customer submits a request.
2. If customer requests are disabled, the API rejects submission.
3. If lead dispatch is enabled, provider notifications are created according to `lead_dispatch_channel`.
4. If lead dispatch is disabled, the lead can enter admin without being sent to providers.
5. Pending leads can later be dispatched from admin.

## Notification flow

Notifications are stored in `provider_notifications`.

Important fields:

```text
lead_id
provider_id
channel = email | sms
status = pending | sent | failed | skipped
error_message
claim_url
```

The admin Leads table uses `dispatch_status` returned from `api/admin.ts?resource=leads`, not the lead status alone.

## Claim flow

Provider claim links include:

```text
/provider/claim?lead=lead_xxx&token=provider_token
```

Shared claims are allowed when provider claiming is ON and shared slots are available.

Exclusive claims require both:

```text
provider_claims_enabled = true
exclusive_claims_enabled = true
```

When `exclusive_claims_enabled = false`, the backend returns `exclusive_claims_disabled` even if someone manually posts an exclusive request.
