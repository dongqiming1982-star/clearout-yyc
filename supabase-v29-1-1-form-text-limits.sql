alter table public.providers
add column if not exists business_description text;

alter table public.providers
drop constraint if exists providers_business_description_length;

alter table public.providers
add constraint providers_business_description_length
check (
  business_description is null
  or char_length(business_description) <= 300
);
