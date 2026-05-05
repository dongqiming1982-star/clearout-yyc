# V19 Changelog — Launch Ready

V19 converts the v18 local-trust visual version into a launch-ready beta build.

## Added

- Remote form mode controlled by `VITE_USE_REMOTE_API=true`.
- `/api/leads` for customer junk removal requests.
- `/api/provider-applications` for provider beta signups.
- Google Sheet webhook support through `GOOGLE_SHEETS_WEBHOOK_URL`.
- Optional Resend email notification support.
- `google-apps-script-clearout-webhook.js` for easy Google Sheet setup.
- `vercel.json` SPA rewrites for direct community URLs.
- Updated `.env.example` for v19 launch variables.
- Updated sitemap with `lastmod` values.

## Changed

- Removed Supabase requirement from launch-mode API.
- Customer phone confirmation is treated as a manual pre-dispatch step for beta launch.
- Customer and provider success messages no longer mention local demo / Twilio production language.
- Package metadata renamed to `clearout-yyc-launch-ready`.
- TypeScript app build excludes `/api` so Vite frontend build is cleaner.

## Preserved

- v18 local trust visual style.
- Community pages and `/request?community=slug` prefill flow.
- `/areas` grouped by Central / NW / NE / SW / SE.
- Customer-facing rule: submit free, may be shared with up to 3 providers, no provider response guarantee.
- Provider-facing public rule: beta free, no app, no monthly fee, SMS/email leads.
