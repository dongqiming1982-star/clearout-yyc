-- Clearout YYC V23 migration
-- Purpose: prevent duplicate email/SMS notification records for the same lead + provider + channel.
-- Run this once in Supabase SQL Editor after the V23 schema if it was not included earlier.

do $$
begin
  alter table provider_notifications
  add constraint provider_notifications_unique_lead_provider_channel
  unique (lead_id, provider_id, channel);
exception
  when duplicate_object then null;
end $$;
