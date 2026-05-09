alter table providers
add column if not exists email_resubscribed_at timestamptz,
add column if not exists email_resubscribe_source text,
add column if not exists email_preference_link_requested_at timestamptz;
