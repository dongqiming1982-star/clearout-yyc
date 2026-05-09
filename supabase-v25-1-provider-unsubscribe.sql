alter table providers
add column if not exists email_unsubscribed_at timestamptz,
add column if not exists email_unsubscribe_reason text;
