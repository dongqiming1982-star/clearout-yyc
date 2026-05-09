alter table providers
add column if not exists application_email_sent_at timestamptz,
add column if not exists approval_email_sent_at timestamptz;
