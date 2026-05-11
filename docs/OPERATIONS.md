# Clearout YYC Operations

This document is the production recovery and safety checklist for Clearout YYC.

## 1. Safe default state

Recommended production-safe state before paid Stripe/exclusive buyout and production SMS are fully ready:

```text
Customer requests: ON
Lead dispatch: ON
Provider claiming: ON
Exclusive buyout: OFF
Dispatch channel: Email
```

If service provider supply is not ready, temporarily set:

```text
Customer requests: OFF
Lead dispatch: ON
Provider claiming: ON
Exclusive buyout: OFF
Dispatch channel: Email
```

Do not enable SMS as the default dispatch channel until production SMS opt-in/compliance is fully verified.

---

## 2. Admin URLs

Old admin:

```text
https://clearout.aurorasitesolutions.com/admin/
```

React admin2:

```text
https://clearout.aurorasitesolutions.com/admin2
```

Both admin areas must require `ADMIN_TOKEN`.

Admin pages and admin API must remain:

```text
X-Robots-Tag: noindex, nofollow, noarchive
Cache-Control: no-store
```

Check admin2 headers:

```bash
curl -I https://clearout.aurorasitesolutions.com/admin2 | grep -i "x-robots-tag\|cache-control"
```

---

## 3. ADMIN_TOKEN rotation

`ADMIN_TOKEN` protects `/admin`, `/admin2`, and `/api/admin`.

If it is exposed in chat, screenshots, logs, or terminal output, rotate it immediately.

Generate a new token:

```bash
openssl rand -hex 32
```

Update it in Vercel:

```text
Vercel → clearout-yyc → Settings → Environment Variables → ADMIN_TOKEN → Edit → Save
```

Force redeploy:

```bash
git commit --allow-empty -m "Redeploy after admin token rotation"
git push origin main
```

Set token in local terminal only for the current session:

```bash
read -s "CLEAROUT_ADMIN_TOKEN?Paste ADMIN_TOKEN: "
echo
export CLEAROUT_ADMIN_TOKEN
echo ${#CLEAROUT_ADMIN_TOKEN}
```

Never commit:

```text
.env
.env.local
.env.*
.vercel
```

`.env.example` may stay in the repo as a template.

---

## 4. Read-only production API checks

Summary:

```bash
curl -s \
  -H "x-admin-token: $CLEAROUT_ADMIN_TOKEN" \
  "https://clearout.aurorasitesolutions.com/api/admin?resource=summary" | python3 -m json.tool
```

Platform settings:

```bash
curl -s \
  -H "x-admin-token: $CLEAROUT_ADMIN_TOKEN" \
  "https://clearout.aurorasitesolutions.com/api/admin?resource=settings" | python3 -m json.tool
```

Dispatch overview:

```bash
curl -s \
  -H "x-admin-token: $CLEAROUT_ADMIN_TOKEN" \
  "https://clearout.aurorasitesolutions.com/api/admin?resource=dispatch-overview" | python3 -m json.tool
```

Providers:

```bash
curl -s \
  -H "x-admin-token: $CLEAROUT_ADMIN_TOKEN" \
  "https://clearout.aurorasitesolutions.com/api/admin?resource=providers" | python3 -m json.tool
```

Leads:

```bash
curl -s \
  -H "x-admin-token: $CLEAROUT_ADMIN_TOKEN" \
  "https://clearout.aurorasitesolutions.com/api/admin?resource=leads" | python3 -m json.tool
```

Claims:

```bash
curl -s \
  -H "x-admin-token: $CLEAROUT_ADMIN_TOKEN" \
  "https://clearout.aurorasitesolutions.com/api/admin?resource=claims" | python3 -m json.tool
```

---

## 5. Platform switches

Use `/admin2` for normal operations.

Important switches:

```text
Customer requests:
- ON: real customers can submit requests.
- OFF: customer request API is blocked.

Lead dispatch:
- ON: published leads can create provider notifications.
- OFF: new leads stay queued.

Provider claiming:
- ON: providers can claim leads.
- OFF: claim API is blocked.

Exclusive buyout:
- Keep OFF until paid exclusive claiming is ready.

Dispatch channel:
- Use Email for production.
- Do not use SMS until production SMS compliance and opt-in rules are fully checked.
```

Do not casually click or enable:

```text
Dispatch pending leads
Enable SMS
Enable exclusive buyout
```

---

## 6. Dispatch pending leads

The admin button `Dispatch pending leads` does two things:

1. Finds queued/published/shared-active leads that do not have provider notifications yet.
2. Creates provider notifications and then sends pending Email/SMS in batches.

If there are more pending notifications than the batch limit, not all notifications are sent in one click. Remaining notifications stay pending for the next cron run or intentional admin action.

Before clicking it, check:

```bash
curl -s \
  -H "x-admin-token: $CLEAROUT_ADMIN_TOKEN" \
  "https://clearout.aurorasitesolutions.com/api/admin?resource=dispatch-overview" | python3 -m json.tool
```

---

## 7. Cron

Production cron path:

```text
/api/cron/process-due-leads
```

Vercel Hobby schedule:

```text
0 15 * * *
```

Cron behavior:

```text
1. Processes due/published leads.
2. Creates provider notifications through create_provider_notifications_for_lead.
3. Sends pending email notifications.
4. Sends pending SMS notifications only if SMS channel/notifications exist.
5. Runs lead photo cleanup.
```

Check `vercel.json` before changing cron:

```bash
cat vercel.json
```

---

## 8. Email and SMS

Email dispatch uses Resend.

Required Vercel variables:

```text
RESEND_API_KEY
LEAD_NOTIFY_FROM
```

Current safe production channel:

```text
lead_dispatch_channel = email
```

SMS dispatch uses Twilio.

Do not enable SMS as default dispatch channel until all are confirmed:

```text
TWILIO_ACCOUNT_SID configured
TWILIO_AUTH_TOKEN configured
TWILIO_FROM_NUMBER configured
Provider notify_by_sms = true
Provider sms_opt_in_at is present
Provider sms_opt_out_at is null
STOP / START webhook tested
```

Current database SMS filter checks:

```text
notify_by_sms = true
sms_opt_out_at is null
```

Before production SMS dispatch, strengthen SQL to also require:

```text
sms_opt_in_at is not null
```

---

## 9. Provider notification eligibility

Provider notifications should only be created for providers who are:

```text
approved = true
active = true
provider_token is not empty
```

Email additionally requires:

```text
notify_by_email = true
email_unsubscribed_at is null
```

SMS additionally requires:

```text
notify_by_sms = true
sms_opt_out_at is null
```

Production SQL currently uses:

```text
create_provider_notifications_for_lead
```

Duplicate notification protection:

```text
provider_notifications unique (lead_id, provider_id, channel)
on conflict (lead_id, provider_id, channel) do nothing
```

---

## 10. Claim link safety

Claim API:

```text
/api/provider/claim-lead
```

Claim RPC:

```text
public.claim_lead_free_beta
```

Required protections:

```text
provider_token must be valid
provider must be approved
provider must be active
lead row must be locked with FOR UPDATE
same provider cannot claim same lead twice
shared claim cannot exceed shared_limit
exclusive claim must not be allowed after shared_claim_count > 0
customer contact is returned only after successful claim
```

V30.5 hardening added:

```text
exclusive claim is blocked when shared_claim_count > 0
```

The SQL backup is stored in:

```text
supabase-v30-5-claim-lead-exclusive-hardening.sql
```

---

## 11. Emergency shutdown

If spam, fake requests, or operational risk occurs:

1. Open `/admin2`.
2. Set switches based on the issue.

If fake customer submissions are the issue:

```text
Customer requests: OFF
```

If provider notifications are the issue:

```text
Lead dispatch: OFF
```

If claim links are the issue:

```text
Provider claiming: OFF
```

Always keep this unless intentionally changing it:

```text
Exclusive buyout: OFF
Dispatch channel: Email
```

Do not delete production data unless there is a clear reason.

---

## 12. Restore to stable tag

List tags:

```bash
git tag --list | sort | tail -40
```

Inspect current version:

```bash
git status
git log --oneline --decorate -10
```

Create a safety backup branch and tag before rollback:

```bash
BACKUP_NAME=backup-before-rollback-$(date +%Y%m%d-%H%M%S)
git branch "$BACKUP_NAME"
git tag "$BACKUP_NAME"
```

Rollback main to a stable tag:

```bash
git switch main
git pull origin main
git reset --hard <stable-tag>
npm run build
git push --force-with-lease origin main
```

Use force push only when intentionally rolling back production.

---

## 13. Key stable tags

Important stable tags:

```text
v24-admin-stable
v25-provider-email-stable
v25-1-provider-unsubscribe-stable
v25-2-provider-email-preferences-stable
v30-2-admin2-login-gated-stable
v30-3-admin2-actions-tested-stable
v30-3-1-admin2-translation-cleanup-stable
v30-4-admin2-dispatch-diagnostics-stable
v30-5-admin2-route-hardening-stable
v30-5-claim-link-hardening-stable
```

Before relying on a tag, confirm it exists locally/remotely:

```bash
git tag --list | grep "v30-5"
git ls-remote --tags origin | grep "v30-5"
```

---

## 14. Standard deploy check

Before pushing:

```bash
git status
npm run build
```

After pushing:

```bash
git log --oneline --decorate -5
```

Check production:

```text
https://clearout.aurorasitesolutions.com/
https://clearout.aurorasitesolutions.com/admin2
https://clearout.aurorasitesolutions.com/admin/
```

Check admin2 headers:

```bash
curl -I https://clearout.aurorasitesolutions.com/admin2 | grep -i "x-robots-tag\|cache-control"
```

---

## 15. What not to do casually

Do not casually:

```text
Enable SMS
Enable exclusive buyout
Click Dispatch pending leads
Force push main
Delete Supabase records
Rotate ADMIN_TOKEN without redeploying
Edit production RPCs without saving SQL backup in repo
```
