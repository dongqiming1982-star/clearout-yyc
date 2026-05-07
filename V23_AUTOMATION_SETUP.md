# Clearout YYC V23 Automation Setup

This version connects the public request form and provider claim links to Supabase/Postgres.

## What V23 does

- Customer `/request` form submits to Supabase through `/api/leads`.
- Valid junk/clearout requests become `published` during Calgary provider alert hours: 8:00 AM - 8:00 PM.
- After-hours requests become `queued` and are released by `/api/cron/process-due-leads`.
- Approved providers receive a private claim link: `/provider/lead?lead=lead_xxx&token=provider_token`.
- Providers can claim `shared` or `exclusive` during free beta.
- Shared access is limited to 3 providers.
- Exclusive access closes the lead.
- Customer contact details are shown only after claim succeeds.

## 中文说明

这版不是展示网站，而是自动化接单地基：

- 客户提交 `/request` 后进入 Supabase 的 `leads` 表。
- Calgary 时间早 8 点到晚 8 点内提交，自动发布。
- 晚 8 点以后提交，进入 `queued`，第二天早 8 点发布。
- 服务商收到链接后进入 `/provider/lead` 页面。
- 抢单成功后才显示客户电话、邮箱、备注。
- Shared 最多 3 个服务商。
- Exclusive 成功后关闭该 lead。

## Supabase environment variables in Vercel

Add these in Vercel Project → Settings → Environment Variables:

```env
VITE_USE_REMOTE_API=true
VITE_API_BASE_URL=
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For provider email alerts, also add:

```env
RESEND_API_KEY=your-resend-api-key
LEAD_NOTIFY_FROM=Clearout YYC <your-verified-sender@yourdomain.com>
```

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in frontend code. It must stay in Vercel server environment variables only.

## Database migration

You already ran the V23 schema. Now also run:

```sql
-- file: supabase-v23-notification-unique-migration.sql
```

This adds a unique constraint so the same lead/provider/channel notification is not duplicated.

## Provider onboarding during beta

Provider applications now enter the `providers` table as:

```text
approved = false
active = false
```

Before a provider can claim leads, manually approve them in Supabase:

```sql
update providers
set approved = true,
    active = true
where email = 'provider@example.com';
```

Then copy their `provider_token`. Their claim link will be included in email notifications once leads are published.

## Testing a claim link manually

If you have a published lead and an approved provider, open:

```text
https://clearout.aurorasitesolutions.com/provider/lead?lead=lead_xxx&token=provider_token_here
```

The page should show lead summary first. Customer contact details only appear after Shared or Exclusive claim succeeds.

## Cron / queued leads

The endpoint below publishes due queued leads and sends pending provider email notifications:

```text
/api/cron/process-due-leads
```

Vercel can call this on a schedule. This package includes a Vercel cron entry every 10 minutes.

## Important operational rule

Do not publish provider tokens publicly. A provider token is effectively that provider's claim key.
