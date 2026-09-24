-- Chapman Prestige: app customers in the client list, birthdays, and app ideas.
--
-- One file. Paste the whole thing into the Supabase SQL editor and run it once.
-- Safe to run again: every step looks before it changes anything.
--
-- What it does, in plain words:
--   1. Makes sure the customer tables and the Chapman client list are there.
--   2. Adds an optional birthday to a customer, day and month only, no year.
--   3. Signing up in the app now finds or creates that person in the Chapman
--      client list, with their name, number, email, gender and birthday.
--   4. Adds a table for ideas customers send from the app, so the office can
--      read them and mark them.
--
-- Nothing here deletes a customer, a client, or an order.

begin;

-- 1. The Chapman client list. Left exactly as it is if it already exists.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text,
  full_name text,
  phone text,
  email text,
  type text default 'Individual',
  tier text default 'Standard',
  notes text,
  active boolean default true,
  created_at timestamptz not null default now()
);

-- Phone numbers are compared in one shape, so 024 123 4567 and +233241234567
-- are the same person.
create or replace function public.normalize_ghana_phone(p_phone text)
returns text
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  with phone_value as (
    select regexp_replace(coalesce(p_phone, ''), '[^0-9]+', '', 'g') as digits
  )
  select case
    when digits ~ '^0[0-9]{9}$' then '+233' || substring(digits from 2)
    when digits ~ '^233[0-9]{9}$' then '+' || digits
    when digits ~ '^[25][0-9]{8}$' then '+233' || digits
    else null
  end
  from phone_value;
$$;

create index if not exists clients_normalized_ghana_phone_idx
  on public.clients (public.normalize_ghana_phone(phone))
  where public.normalize_ghana_phone(phone) is not null;

-- 2. The customer's own record, and their birthday.
create table if not exists public.customer_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid,
  phone text not null unique,
  full_name text,
  email text,
  gender text check (gender in ('female', 'male', 'prefer_not_to_say')),
  avatar_style text check (avatar_style in ('female', 'male', 'neutral')),
  profile_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Day and month only. There is no year column, by design: the year is never
-- asked for and never stored.
alter table public.customer_accounts add column if not exists birth_day smallint;
alter table public.customer_accounts add column if not exists birth_month smallint;

alter table public.customer_accounts enable row level security;

drop policy if exists "customer reads own account" on public.customer_accounts;
create policy "customer reads own account"
  on public.customer_accounts for select to authenticated
  using (auth_user_id = auth.uid());

grant select on public.customer_accounts to authenticated;

-- 3. Signing up keeps the customer's own record, and now the birthday too.
--    The three argument version is removed first so there is only one function
--    with this name and no call can land on the wrong one.
drop function if exists public.complete_customer_onboarding(text, text, text);

create or replace function public.complete_customer_onboarding(
  p_full_name text,
  p_gender text default 'prefer_not_to_say',
  p_email text default null,
  p_birth_day integer default null,
  p_birth_month integer default null
)
returns public.customer_accounts
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_phone text;
  v_client_id uuid;
  v_account public.customer_accounts;
begin
  if v_auth_user_id is null then
    raise exception 'An authenticated customer session is required';
  end if;

  select u.phone into v_phone
  from auth.users u
  where u.id = v_auth_user_id;

  v_phone := public.normalize_ghana_phone(v_phone);

  if v_phone is null then
    raise exception 'A verified phone number is required';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Full name is required';
  end if;

  if p_gender not in ('female', 'male', 'prefer_not_to_say') then
    raise exception 'Invalid gender value';
  end if;

  -- A birthday is optional, but a wrong one is refused so the wish lands on the
  -- right day.
  if p_birth_day is not null and (p_birth_day < 1 or p_birth_day > 31) then
    raise exception 'The birthday day must be between 1 and 31';
  end if;

  if p_birth_month is not null and (p_birth_month < 1 or p_birth_month > 12) then
    raise exception 'The birthday month must be between 1 and 12';
  end if;

  if (p_birth_day is null) <> (p_birth_month is null) then
    raise exception 'Please give both the birthday day and the month, or neither';
  end if;

  select c.id into v_client_id
  from public.clients c
  where public.normalize_ghana_phone(c.phone) = v_phone
  order by c.created_at asc nulls last
  limit 1;

  if v_client_id is null then
    insert into public.clients (name, full_name, phone, type, tier, active)
    values (trim(p_full_name), trim(p_full_name), v_phone, 'Individual', 'Standard', true)
    returning id into v_client_id;
  end if;

  insert into public.customer_accounts (
    auth_user_id, client_id, phone, full_name, email, gender, avatar_style,
    profile_completed_at, birth_day, birth_month, updated_at
  )
  values (
    v_auth_user_id, v_client_id, v_phone, trim(p_full_name),
    nullif(trim(p_email), ''), p_gender,
    case when p_gender = 'female' then 'female' when p_gender = 'male' then 'male' else 'neutral' end,
    now(), p_birth_day, p_birth_month, now()
  )
  on conflict (auth_user_id) do update
  set client_id = coalesce(customer_accounts.client_id, excluded.client_id),
      phone = coalesce(customer_accounts.phone, excluded.phone),
      full_name = excluded.full_name,
      email = coalesce(excluded.email, customer_accounts.email),
      gender = excluded.gender,
      avatar_style = excluded.avatar_style,
      profile_completed_at = coalesce(customer_accounts.profile_completed_at, now()),
      birth_day = coalesce(excluded.birth_day, customer_accounts.birth_day),
      birth_month = coalesce(excluded.birth_month, customer_accounts.birth_month),
      updated_at = now()
  returning * into v_account;

  return v_account;
end;
$$;

revoke all on function public.complete_customer_onboarding(text, text, text, integer, integer) from public;
grant execute on function public.complete_customer_onboarding(text, text, text, integer, integer) to authenticated;

-- 4. The app calls this after signing up and on every later sign in. It finds
--    the person in the Chapman client list by phone number, creates them if
--    they are new, and refreshes their details. Running it twice changes
--    nothing except the details, and never creates a second client.
create or replace function public.link_customer_to_chapman_client(
  p_birth_day integer default null,
  p_birth_month integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_full_name text;
  v_phone text;
  v_email text;
  v_gender text;
  v_birth_day smallint;
  v_birth_month smallint;
  v_client_id uuid;
  v_created boolean := false;
  v_note_line text;
begin
  if v_auth_user_id is null then
    raise exception 'An authenticated customer session is required';
  end if;

  if p_birth_day is not null and (p_birth_day < 1 or p_birth_day > 31) then
    raise exception 'The birthday day must be between 1 and 31';
  end if;

  if p_birth_month is not null and (p_birth_month < 1 or p_birth_month > 12) then
    raise exception 'The birthday month must be between 1 and 12';
  end if;

  select coalesce(nullif(trim(a.full_name), ''), nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')),
         coalesce(a.phone, public.normalize_ghana_phone(u.phone)),
         coalesce(nullif(trim(a.email), ''), nullif(trim(u.raw_user_meta_data ->> 'email'), '')),
         coalesce(a.gender, nullif(u.raw_user_meta_data ->> 'gender', '')),
         coalesce(p_birth_day, a.birth_day),
         coalesce(p_birth_month, a.birth_month)
    into v_full_name, v_phone, v_email, v_gender, v_birth_day, v_birth_month
  from auth.users u
  left join public.customer_accounts a on a.auth_user_id = u.id
  where u.id = v_auth_user_id;

  v_phone := public.normalize_ghana_phone(v_phone);

  if v_phone is null then
    raise exception 'A verified phone number is required';
  end if;

  select c.id into v_client_id
  from public.clients c
  where public.normalize_ghana_phone(c.phone) = v_phone
  order by c.created_at asc nulls last
  limit 1;

  v_note_line := 'Added from the Chapman app.';
  if v_gender in ('female', 'male') then
    v_note_line := v_note_line || ' Gender: ' || v_gender || '.';
  end if;
  if v_birth_day is not null and v_birth_month is not null then
    v_note_line := v_note_line || ' Birthday: ' || v_birth_day || '/' || v_birth_month || '.';
  end if;
  if v_email is not null then
    v_note_line := v_note_line || ' Email: ' || v_email || '.';
  end if;

  if v_client_id is null then
    insert into public.clients (name, full_name, phone, type, tier, active, notes)
    values (coalesce(v_full_name, 'Chapman app customer'), v_full_name, v_phone, 'Individual', 'Standard', true, v_note_line)
    returning id into v_client_id;
    v_created := true;
  else
    update public.clients
    set name = coalesce(nullif(trim(name), ''), v_full_name),
        full_name = coalesce(nullif(trim(full_name), ''), v_full_name),
        phone = coalesce(nullif(trim(phone), ''), v_phone),
        notes = case when nullif(trim(coalesce(notes, '')), '') is null then v_note_line else notes end
    where id = v_client_id;
  end if;

  -- The client list in the staff app asks for an email when the column is
  -- there. It is filled only when it exists, so this cannot fail on a client
  -- list built without it.
  if v_email is not null and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'email'
  ) then
    execute 'update public.clients set email = coalesce(nullif(trim(email), ''''), $1) where id = $2'
      using v_email, v_client_id;
  end if;

  update public.customer_accounts
  set client_id = v_client_id,
      birth_day = coalesce(v_birth_day, birth_day),
      birth_month = coalesce(v_birth_month, birth_month),
      updated_at = now()
  where auth_user_id = v_auth_user_id;

  return jsonb_build_object(
    'linked', true,
    'created', v_created,
    'client_id', v_client_id,
    'birthday_saved', v_birth_day is not null and v_birth_month is not null
  );
end;
$$;

revoke all on function public.link_customer_to_chapman_client(integer, integer) from public;
grant execute on function public.link_customer_to_chapman_client(integer, integer) to authenticated;

-- 5. Ideas customers send from the team and ideas screen in the app.
create table if not exists public.chapman_app_ideas (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null default auth.uid(),
  author_name text,
  phone text,
  kind text not null default 'add' check (kind in ('add', 'remove', 'change')),
  idea text not null check (char_length(trim(idea)) between 4 and 2000),
  status text not null default 'new' check (status in ('new', 'reading', 'planned', 'done', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists chapman_app_ideas_created_at_idx
  on public.chapman_app_ideas (created_at desc);

alter table public.chapman_app_ideas enable row level security;

drop policy if exists "customer sends own idea" on public.chapman_app_ideas;
create policy "customer sends own idea"
  on public.chapman_app_ideas for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "customer reads own ideas" on public.chapman_app_ideas;
create policy "customer reads own ideas"
  on public.chapman_app_ideas for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "staff reads all ideas" on public.chapman_app_ideas;
create policy "staff reads all ideas"
  on public.chapman_app_ideas for select to authenticated
  using (public.is_chapman_staff());

drop policy if exists "staff marks ideas" on public.chapman_app_ideas;
create policy "staff marks ideas"
  on public.chapman_app_ideas for update to authenticated
  using (public.is_chapman_staff())
  with check (public.is_chapman_staff());

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.chapman_app_ideas to authenticated;
grant select on public.chapman_app_ideas to anon;

commit;

-- What you should see after running it:
--   birth_day and birth_month on customer_accounts
--   link_customer_to_chapman_client in the function list
--   chapman_app_ideas with four rules
select 'birthday columns' as what, count(*)::text as how_many
from information_schema.columns
where table_schema = 'public' and table_name = 'customer_accounts'
  and column_name in ('birth_day', 'birth_month')
union all
select 'client link function', count(*)::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'link_customer_to_chapman_client'
union all
select 'idea rules', count(*)::text
from pg_policies where tablename = 'chapman_app_ideas';
