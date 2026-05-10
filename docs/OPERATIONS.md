# Clearout YYC Operations

## Safe default state

Use this state before Stripe/payment and production SMS compliance are fully ready:

```text
Customer requests: ON
Lead dispatch: ON
Provider claiming: ON
Exclusive buyout: OFF
Dispatch channel: Email
```

## Admin token

`ADMIN_TOKEN` is used for `/admin` and admin API calls. If it is exposed in chat, screenshots, or logs, rotate it in Vercel immediately.

Generate a new token:

```bash
openssl rand -hex 32
```

Then update Vercel:

```text
Vercel → clearout-yyc → Settings → Environment Variables → ADMIN_TOKEN → Edit → Save
```

Force redeploy:

```bash
git commit --allow-empty -m "Redeploy after admin token rotation"
git push origin main
```

## Dispatch pending leads

The admin button `Dispatch pending leads` does two things:

1. Finds queued/published/shared-active leads that do not have provider notifications yet.
2. Creates provider notifications and then sends pending Email/SMS in batches.

If there are more pending notifications than the batch limit, not all notifications are sent in one click. They remain pending for the next click or cron run.

## Email/SMS channel

`Dispatch channel = Email` creates email notifications.

`Dispatch channel = SMS` creates SMS notifications. Do not leave SMS enabled while Twilio is still in trial mode because trial accounts can fail on unverified numbers.

## Exclusive buyout

Keep `Exclusive buyout = OFF` until paid exclusive claiming is ready. When OFF:

- provider claim pages hide the Exclusive button
- backend rejects manually forged exclusive claim requests
