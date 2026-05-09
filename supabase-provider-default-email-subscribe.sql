alter table providers
alter column notify_by_email set default true;

update providers
set notify_by_email = true
where notify_by_email = false
  and email_unsubscribed_at is null
  and email_unsubscribe_reason is null;
