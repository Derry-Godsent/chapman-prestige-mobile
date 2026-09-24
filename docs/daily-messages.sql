-- Chapman daily messages
--
-- What this adds: one small table where the Chapman office writes the messages
-- customers receive in the app: care tips, service news, holiday notices,
-- announcements, and thank-you notes.
--
-- How it works: the app reads every message that is due today or earlier, then
-- books the next mornings on the customer's own phone. That is why the message
-- arrives at 9:00 even when the app is closed and even with no internet. The app
-- tops the week up each time it is opened, so new messages written here reach
-- customers without anything else being done.
--
-- What it does not change: no existing table, column, row, or rule is touched.
-- This only adds a new table and its two access rules.
--
-- Safe to run twice: every statement checks first.

-- 1. The table itself. One row is one message.
create table if not exists public.chapman_daily_messages (
  id uuid primary key default gen_random_uuid(),
  -- tip, news, holiday, announcement, or thanks. Used to label the message.
  kind text not null default 'news',
  title text not null,
  body text not null,
  -- The day the message becomes visible to customers. Later dates wait quietly.
  publish_on date not null default current_date,
  created_at timestamptz not null default now()
);

-- 2. Let the app and the office reach the table at all. What each may actually
--    read or change is decided by the rules in step 3 below.
grant usage on schema public to anon, authenticated;
grant select on public.chapman_daily_messages to anon, authenticated;
grant insert, update, delete on public.chapman_daily_messages to authenticated;
-- The Supabase service role is the office's own key, used by the staff web app
-- and by server-side work. It is never put in the mobile app.
grant select, insert, update, delete on public.chapman_daily_messages to service_role;

-- 3. Lock the table, then open only the two doors that are wanted.
alter table public.chapman_daily_messages enable row level security;

drop policy if exists "Customers read messages that are due" on public.chapman_daily_messages;
create policy "Customers read messages that are due"
  on public.chapman_daily_messages for select
  using (publish_on <= current_date);

drop policy if exists "Chapman staff manage daily messages" on public.chapman_daily_messages;
create policy "Chapman staff manage daily messages"
  on public.chapman_daily_messages for all to authenticated
  using (public.is_chapman_staff())
  with check (public.is_chapman_staff());

-- 4. One real message, so there is something to show straight away.
--    The where clause keeps this from adding a second copy if you run the file
--    again later.
insert into public.chapman_daily_messages (kind, title, body, publish_on)
select
  'news',
  'Chapman daily update',
  'Welcome to your daily Chapman message. Care tips, service news, and holiday notices will arrive here each morning at 9:00.',
  current_date
where not exists (select 1 from public.chapman_daily_messages);

-- 5. Check it landed, in one small grid.
select
  (select count(*) from public.chapman_daily_messages) as messages,
  (select count(*) from public.chapman_daily_messages where publish_on <= current_date) as due_today,
  (select count(*) from pg_policies where tablename = 'chapman_daily_messages') as rules;
