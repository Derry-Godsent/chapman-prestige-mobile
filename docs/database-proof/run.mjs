import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

/**
 * Proof for docs/1-RUN-ME-database-check.sql and docs/security-fix.sql.
 *
 * Built from the live database report the operator sent on 22 September 2026:
 * the same tables, the same column names and types, the same rules, the same
 * functions, and the same locked and unlocked state. No customer data, only
 * made-up rows carrying the same counts as the live grid.
 *
 * Run: node docs/database-proof/run.mjs
 */

// Find the docs folder whether this file sits in docs/database-proof or has been
// copied elsewhere (for example next to an installed pglite).
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const candidates = [
  here,
  path.join(here, '..'),
  path.join(here, '..', 'docs'),
  path.join(here, '..', '..', 'docs'),
  path.join(here, '..', '..', '..', 'docs'),
];
const docsFolder = process.env.CHAPMAN_DOCS
  ?? candidates.find((folder) => fs.existsSync(path.join(folder, '1-RUN-ME-database-check.sql')));
if (!docsFolder) {
  console.error('Could not find 1-RUN-ME-database-check.sql near ' + here);
  process.exit(1);
}
const DOCS = docsFolder + path.sep;
const check = fs.readFileSync(DOCS + '1-RUN-ME-database-check.sql', 'utf8');
const fix = fs.readFileSync(DOCS + 'security-fix.sql', 'utf8');
const decline = fs.readFileSync(DOCS + 'decline-with-reason.sql', 'utf8');
const daily = fs.readFileSync(DOCS + 'daily-messages.sql', 'utf8');
const customers = fs.readFileSync(DOCS + 'customers-birthdays-and-ideas.sql', 'utf8');
const lockAll = fs.readFileSync(DOCS + 'security-lock-everything.sql', 'utf8');

const db = new PGlite();

const lines = [];
const say = (text) => { lines.push(text); console.log(text); };

const schema = `
create role anon nologin;
create role authenticated nologin;
-- The service role exists in every Supabase project, so the stand-in has it too.
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, phone text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Real staff columns, from the live grid.
create table public.staff (
  id uuid primary key, first_name text, last_name text, phone text, role text,
  status text, efficiency integer, active_orders integer, completed_orders integer,
  assigned_order_ids uuid[], joined_date date, branch_id uuid, address text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  is_banned boolean default false, last_login timestamptz
);
create table public.clients (
  id uuid primary key default gen_random_uuid(), name text, full_name text, phone text,
  type text default 'Individual', tier text default 'Standard', notes text,
  active boolean default true, created_at timestamptz default now()
);
create table public.customer_accounts (
  auth_user_id uuid primary key, client_id uuid, phone text not null unique, full_name text,
  email text, gender text, avatar_style text, profile_completed_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.role_permissions (
  role text, page text, can_view boolean, can_edit boolean, primary key (role, page)
);

-- Real laundry price list: four price columns, no single price.
create table public.laundry_items (
  id uuid primary key default gen_random_uuid(), name text not null, category text,
  price_wash integer not null default 0, price_iron integer not null default 0,
  price_fold integer not null default 0, price_hang integer not null default 0
);

-- Real mobile request columns.
create table public.mobile_requests (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid, client_id uuid, service_code text,
  request_status text default 'pending', requested_for date, confirmed_for date,
  pickup_area text, pickup_address text, pickup_window text, laundry_items jsonb,
  express boolean default false, estimated_total numeric, customer_note text,
  staff_note text, customer_response text, customer_response_at timestamptz,
  reviewed_by uuid, reviewed_at timestamptz, converted_order_id uuid,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  pickup_latitude double precision, pickup_longitude double precision,
  pickup_accuracy_meters double precision, pickup_location_captured_at timestamptz
);
create table public.mobile_request_events (
  id uuid primary key default gen_random_uuid(), request_id uuid, note text
);

-- Real routines columns.
create table public.routines (
  id uuid primary key default gen_random_uuid(), client_id text, service_id text,
  service_title text, cadence text, detail text, created_at timestamptz default now()
);

-- Real quote request columns.
create table public.quote_requests (
  id uuid primary key default gen_random_uuid(), customer_account_id uuid,
  service_id text, service_title text, property_type text, preference text,
  details jsonb, appointment_response text, declined_reason text, created_at timestamptz default now()
);

create table public.services (id uuid primary key default gen_random_uuid(), title text, active boolean default true);
create table public.orders (id uuid primary key default gen_random_uuid(), client_id uuid, total integer);
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid);

create function public.is_chapman_staff() returns boolean language sql stable security definer as $$
  select exists (select 1 from public.staff s where s.id = auth.uid() and coalesce(s.is_banned, false) = false)
$$;
create function public.is_chapman_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from public.staff s where s.id = auth.uid() and s.role = 'admin')
$$;

-- The laundry booking function, with the live signature and a body that prices
-- the request from the laundry_items table, exactly as the live one does.
create function public.submit_mobile_laundry_request(
  p_requested_for date, p_pickup_area text, p_pickup_address text, p_pickup_window text,
  p_laundry_items jsonb, p_express boolean, p_customer_note text,
  p_pickup_latitude double precision, p_pickup_longitude double precision,
  p_pickup_accuracy_meters double precision
) returns public.mobile_requests
language plpgsql security definer as $$
declare v_row public.mobile_requests;
begin
  insert into public.mobile_requests
    (customer_account_id, requested_for, pickup_area, pickup_address, pickup_window,
     laundry_items, express, customer_note, pickup_latitude, pickup_longitude, pickup_accuracy_meters)
  values
    (auth.uid(), p_requested_for, p_pickup_area, p_pickup_address, p_pickup_window,
     p_laundry_items, coalesce(p_express, false), p_customer_note,
     p_pickup_latitude, p_pickup_longitude, p_pickup_accuracy_meters)
  returning * into v_row;

  update public.mobile_requests
     set estimated_total = (
       select coalesce(sum(li.price_wash * coalesce((item ->> 'quantity')::int, 1)), 0) + case when v_row.express then 20 else 0 end
       from jsonb_array_elements(p_laundry_items) as item
       join public.laundry_items li on li.name = item ->> 'name'
     )
   where id = v_row.id
  returning * into v_row;

  return v_row;
end $$;

-- The customer's answer to a date Chapman offered.
create function public.respond_to_mobile_request_date(p_request_id uuid, p_response text)
returns public.mobile_requests
language plpgsql security definer as $$
declare v_row public.mobile_requests;
begin
  update public.mobile_requests
     set customer_response = p_response,
         customer_response_at = now(),
         request_status = case when p_response = 'accepted' then 'confirmed' else 'pending' end
   where id = p_request_id
     and customer_account_id = auth.uid()
  returning * into v_row;
  return v_row;
end $$;

-- Existing rules, exactly as the live grid reports them.
create policy "customer reads own mobile requests" on public.mobile_requests
  for select to authenticated using (customer_account_id = auth.uid());
create policy "staff reads mobile requests" on public.mobile_requests
  for select to authenticated using (public.is_chapman_staff());
create policy "staff manages mobile requests" on public.mobile_requests
  for all to authenticated using (public.is_chapman_staff()) with check (public.is_chapman_staff());
create policy "customer reads own mobile request events" on public.mobile_request_events
  for select to authenticated using (exists (
    select 1 from public.mobile_requests mr
    where mr.id = mobile_request_events.request_id and mr.customer_account_id = auth.uid()));
create policy "staff reads mobile request events" on public.mobile_request_events
  for select to authenticated using (public.is_chapman_staff());
create policy "customer reads own account" on public.customer_accounts
  for select to authenticated using (auth_user_id = auth.uid());
create policy "staff manages customer accounts" on public.customer_accounts
  for all to authenticated using (public.is_chapman_staff()) with check (public.is_chapman_staff());
create policy "customers read own orders" on public.orders
  for select to authenticated using (client_id = (
    select ca.client_id from public.customer_accounts ca where ca.auth_user_id = auth.uid()));
create policy "staff manages orders" on public.orders
  for all to authenticated using (public.is_chapman_staff()) with check (public.is_chapman_staff());
create policy "customers read own order items" on public.order_items
  for select to authenticated using (exists (
    select 1 from public.orders o join public.customer_accounts ca on ca.client_id = o.client_id
    where o.id = order_items.order_id and ca.auth_user_id = auth.uid()));
create policy "staff manages order items" on public.order_items
  for all to authenticated using (public.is_chapman_staff()) with check (public.is_chapman_staff());
create policy "signed in users read services" on public.services
  for select to authenticated using (true);
create policy "staff manages services" on public.services
  for all to authenticated using (public.is_chapman_staff()) with check (public.is_chapman_staff());

-- The five open quote_requests rules, exactly as live.
create policy "Customers can insert own quotes" on public.quote_requests
  for insert to public with check (auth.uid() = customer_account_id);
create policy "Customers can read own quotes" on public.quote_requests
  for select to public using (auth.uid() = customer_account_id);
create policy "Customers can update own quotes" on public.quote_requests
  for update to public using (auth.uid() = customer_account_id);
create policy "Staff can read all quotes" on public.quote_requests
  for select to public using (true);
create policy "Staff can update all quotes" on public.quote_requests
  for update to public using (true);
`;

await db.exec(schema);

// Protection state, straight from the live grid: these are already ON there.
await db.exec(`
alter table public.staff enable row level security;
alter table public.clients enable row level security;
-- The staff system's own rule for the client list, exactly as the live project
-- has it: staff sign in and manage clients, customers have no business here.
drop policy if exists "staff manages clients" on public.clients;
create policy "staff manages clients"
  on public.clients for all to authenticated
  using (public.is_chapman_staff()) with check (public.is_chapman_staff());
alter table public.customer_accounts enable row level security;
alter table public.role_permissions enable row level security;
alter table public.mobile_request_events enable row level security;
alter table public.quote_requests enable row level security;
alter table public.services enable row level security;
`);

const customerA = '11111111-1111-1111-1111-111111111111';
const customerB = '22222222-2222-2222-2222-222222222222';
const staffA = '33333333-3333-3333-3333-333333333333';

// The live counts: 8 laundry requests, 8 cleaning enquiries, 36 prices, 3 staff.
await db.exec(`
insert into auth.users (id, phone) values
  ('${customerA}', '+233200000001'), ('${customerB}', '+233200000002'), ('${staffA}', '+233200000003');
insert into public.staff (id, first_name, last_name, phone, role, status, is_banned) values
  ('${staffA}', 'Ama', 'Mensah', '+233200000003', 'admin', 'active', false);
insert into public.customer_accounts (auth_user_id, client_id, full_name, phone, email) values
  ('${customerA}', gen_random_uuid(), 'Kofi Boateng', '+233200000001', null),
  ('${customerB}', gen_random_uuid(), 'Akosua Darko', '+233200000002', 'akosua@example.com');
insert into public.role_permissions (role, page, can_view, can_edit) values
  ('admin', 'mobile-requests', true, true), ('manager', 'mobile-requests', true, true);
insert into public.laundry_items (name, category, price_wash, price_iron, price_fold, price_hang)
  select 'Item ' || g, 'Wash', 10 + g, 5 + g, 4 + g, 3 + g from generate_series(1, 36) as g;
insert into public.mobile_requests (customer_account_id, requested_for, pickup_area, pickup_address, pickup_latitude, pickup_longitude, laundry_items, express, estimated_total)
  select case when g % 2 = 0 then '${customerA}'::uuid else '${customerB}'::uuid end
       , current_date + g, 'Asokwa', 'House ' || g || ', Kumasi', 6.6885, -1.6244
       , '[{"name":"Item 3","quantity":2}]'::jsonb, false, 40 + g
  from generate_series(1, 8) as g;
insert into public.mobile_request_events (request_id, note)
  select id, 'reviewed' from public.mobile_requests limit 12;
insert into public.routines (client_id, service_id, service_title, cadence, detail) values
  ('${customerA}', 'cleaning', 'Deep cleaning', 'Monthly', 'Monthly care reminder'),
  ('${customerA}', 'fumigation', 'Fumigation', 'Quarterly', 'Quarterly care reminder'),
  ('${customerB}', 'detailing', 'Car detailing', 'Monthly', 'Monthly care reminder'),
  ('${customerB}', 'polytank', 'Polytank cleaning', 'Yearly', 'Yearly care reminder');
insert into public.quote_requests (customer_account_id, service_id, service_title, property_type, preference, details)
  select '${customerA}'::uuid, 'cleaning', 'Deep cleaning', 'Apartment', 'One-off'
       , '{"estimatedAreaM2": 82, "concerns": ["dust"], "cameraGuided": true}'::jsonb
  from generate_series(1, 8) as g;
`);

await db.exec(`
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
`);

async function asRole(role, uid, sql) {
  await db.exec('begin');
  try {
    if (role) await db.exec(`set local role ${role}`);
    if (uid) await db.exec(`select set_config('request.jwt.claim.sub', '${uid}', true)`);
    return (await db.query(sql)).rows;
  } finally {
    await db.exec('rollback');
  }
}

// Same as asRole, but keeps what the statement changed. Needed for the calls
// that must leave a real row behind, such as the app adding a client.
async function asRoleCommit(role, uid, sql) {
  await db.exec('begin');
  try {
    if (role) await db.exec(`set local role ${role}`);
    if (uid) await db.exec(`select set_config('request.jwt.claim.sub', '${uid}', true)`);
    const rows = (await db.query(sql)).rows;
    await db.exec('commit');
    return rows;
  } catch (error) {
    await db.exec('rollback');
    throw error;
  }
}

say('=== 0. Reproducing the error you saw ===');
try {
  await db.exec('select 1 as a, 2 as b.\n');
  say('unexpected: the broken shape parsed');
} catch (error) {
  say(`broken shape rejected: ${error.message.split('\n')[0]}`);
}

say('');
say('=== 1. The check file, run end to end ===');
const before = await db.query(check);
const bySection = {};
for (const row of before.rows) bySection[row.section] = (bySection[row.section] ?? 0) + 1;
say(`rows returned: ${before.rows.length}`);
for (const [section, count] of Object.entries(bySection)) say(`  ${section}: ${count} rows`);
const locksOff = before.rows.filter((row) => String(row.detail).includes('protection OFF'));
say(`protection OFF: ${locksOff.length} tables`);

say('');
say('=== 2. A stranger with no login, before the fix ===');
let strangerRequests = [{ n: -1 }];
for (const table of ['mobile_requests', 'routines', 'quote_requests', 'laundry_items', 'orders']) {
  const rows = await asRole('anon', null, `select count(*)::int as n from public.${table}`);
  if (table === 'mobile_requests') strangerRequests = rows;
  say(`  ${table}: ${rows[0].n} rows visible`);
}

say('');
say('=== 3. Running the security fix ===');
const statements = fix.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
try {
  await db.exec(statements);
  say('the fix ran with no errors');
} catch (error) {
  say(`THE FIX FAILED: ${error.message}`);
  process.exit(1);
}

say('');
say('=== 3c. The daily messages file, run from its own file ===');
let dailyReadable = 0;
let dailyFutureHidden = -1;
let dailyCustomerWrite = -1;
let dailyStaffWrite = 0;
let dailyGrid = null;
try {
  const strip = (sql) => sql.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
  await db.exec(strip(daily));

  const table = await db.query(`select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'chapman_daily_messages' order by column_name`);
  say(`table created with columns: ${table.rows.map((row) => row.column_name).join(', ') || 'NONE'}`);

  const locks = await db.query(`select relrowsecurity from pg_class where relname = 'chapman_daily_messages'`);
  say(`row security on: ${locks.rows[0]?.relrowsecurity ? 'yes' : 'NO'}`);

  const rules = await db.query(`select policyname from pg_policies where tablename = 'chapman_daily_messages' order by policyname`);
  say(`rules: ${rules.rows.map((row) => row.policyname).join(' | ') || 'NONE'}`);

  // Running it a second time must be safe and must not add a second welcome.
  await db.exec(strip(daily));
  const twice = await db.query(`select count(*)::int as n from public.chapman_daily_messages where title = 'Chapman daily update'`);
  say(`running it twice is safe: ${twice.rows[0].n === 1 ? 'yes, one welcome message' : 'NO, ' + twice.rows[0].n + ' copies'}`);

  const grid = await db.query(`select
    (select count(*)::int from public.chapman_daily_messages) as messages,
    (select count(*)::int from public.chapman_daily_messages where publish_on <= current_date) as due_today,
    (select count(*)::int from pg_policies where tablename = 'chapman_daily_messages') as rules`);
  dailyGrid = grid.rows[0];
  say(`the file's own grid reads: ${JSON.stringify(dailyGrid)}`);
} catch (error) {
  say(`THE DAILY MESSAGES FILE FAILED: ${error.message}`);
  process.exit(1);
}

const stripComments = (sql) => sql.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
say('=== 3d. The customers, birthdays and ideas file, run from its own file ===');
let birthdayColumns = 0;
let linkFunction = 0;
let ideaRules = 0;
let customerARepeats = -1;
let customerTwoEmail = null;
let ideasSeenByOwner = -1;
let ideasSeenByOther = -1;
let ideasSeenByStaff = -1;
let ideasSeenByStranger = -1;
let anonIdeaRefused = false;
try {
  await db.exec(stripComments(customers));

  const columns = await db.query(`select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_accounts'
      and column_name in ('birth_day', 'birth_month') order by column_name`);
  birthdayColumns = columns.rows.length;
  say(`birthday columns on the customer record: ${columns.rows.map((row) => row.column_name).join(', ') || 'NONE'}`);

  const functions = await db.query(`select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('complete_customer_onboarding', 'link_customer_to_chapman_client')
    order by p.proname`);
  for (const row of functions.rows) say(`  function ${row.proname}(${row.args})`);
  linkFunction = functions.rows.filter((row) => row.proname === 'link_customer_to_chapman_client').length;

  const rules = await db.query(`select policyname from pg_policies where tablename = 'chapman_app_ideas' order by policyname`);
  ideaRules = rules.rows.length;
  say(`idea table rules: ${rules.rows.map((row) => row.policyname).join(' | ') || 'NONE'}`);

  const locks = await db.query(`select relrowsecurity from pg_class where relname = 'chapman_app_ideas'`);
  say(`idea table row security on: ${locks.rows[0]?.relrowsecurity ? 'yes' : 'NO'}`);

  // Running the whole file a second time must change nothing.
  await db.exec(stripComments(customers));
  say('running the file twice is safe');

  // A signed in customer signs up: their record and the Chapman client list.
  const first = await asRoleCommit('authenticated', customerA, `select public.link_customer_to_chapman_client(12, 6) as result`);
  say(`customer A, first link: ${JSON.stringify(first[0].result)}`);

  const sameAgain = await asRoleCommit('authenticated', customerA, `select public.link_customer_to_chapman_client() as result`);
  say(`customer A, signing in again: ${JSON.stringify(sameAgain[0].result)}`);
  customerARepeats = (await db.query(`select count(*)::int as n from public.clients where public.normalize_ghana_phone(phone) = '+233200000001'`)).rows[0].n;

  const savedAccount = await db.query(`select birth_day, birth_month from public.customer_accounts where auth_user_id = '${customerA}'`);
  say(`the birthday is on the customer record: day ${savedAccount.rows[0].birth_day}, month ${savedAccount.rows[0].birth_month}`);

  // The client list without an email column must still be fillable.
  await db.exec(`alter table public.clients add column email text`);
  const second = await asRoleCommit('authenticated', customerB, `select public.link_customer_to_chapman_client(3, 11) as result`);
  say(`customer B, first link: ${JSON.stringify(second[0].result)}`);
  customerTwoEmail = (await db.query(`select email from public.clients where public.normalize_ghana_phone(phone) = '+233200000002'`)).rows[0].email;

  const clientRows = await db.query(`select name, phone, type, tier, notes from public.clients order by created_at`);
  for (const row of clientRows.rows) say(`  client: ${row.name} | ${row.phone} | ${row.type} | ${row.tier} | ${row.notes}`);

  const grid = await db.query(`select
    (select count(*)::int from public.clients) as clients,
    (select count(*)::int from public.customer_accounts where birth_day is not null) as birthdays,
    (select count(*)::int from pg_policies where tablename = 'chapman_app_ideas') as rules`);
  say(`the file's own grid reads: ${JSON.stringify(grid.rows[0])}`);

  // An idea sent from the app, and who can read it.
  await asRoleCommit('authenticated', customerA, `insert into public.chapman_app_ideas (author_name, phone, kind, idea)
    values ('Kofi Boateng', '+233200000001', 'add', 'Please add a pickup reminder the evening before.')`);
  ideasSeenByOwner = (await asRole('authenticated', customerA, `select count(*)::int as n from public.chapman_app_ideas`))[0].n;
  const ownRow = await asRole('authenticated', customerA, `select author_name, kind, status from public.chapman_app_ideas`);
  say(`the customer reads their own idea back: ${JSON.stringify(ownRow[0])}`);
  ideasSeenByOther = (await asRole('authenticated', customerB, `select count(*)::int as n from public.chapman_app_ideas`))[0].n;
  ideasSeenByStaff = (await asRole('authenticated', staffA, `select count(*)::int as n from public.chapman_app_ideas`))[0].n;
  ideasSeenByStranger = (await asRole('anon', null, `select count(*)::int as n from public.chapman_app_ideas`))[0].n;
  say(`ideas seen by: owner ${ideasSeenByOwner}, another customer ${ideasSeenByOther}, the office ${ideasSeenByStaff}, a stranger ${ideasSeenByStranger}`);

  // A stranger with no login must not be able to send one.
  try {
    await asRoleCommit('anon', null, `insert into public.chapman_app_ideas (author_name, idea) values ('Nobody', 'Spam from a stranger.')`);
  } catch (error) {
    anonIdeaRefused = true;
    say(`a stranger sending an idea is refused: ${error.message.split('\n')[0]}`);
  }
  if (!anonIdeaRefused) say('A STRANGER COULD SEND AN IDEA, that must not happen');

  const staffMark = await asRoleCommit('authenticated', staffA, `update public.chapman_app_ideas set status = 'planned' where true`);
  const marks = (await db.query(`select count(*)::int as n from public.chapman_app_ideas where status = 'planned'`)).rows[0].n;
  say(`the office can mark an idea as planned: ${marks === 1 ? 'yes' : 'NO'}`);
} catch (error) {
  say(`THE CUSTOMERS FILE FAILED: ${error.message}`);
  process.exit(1);
}

say('=== 3b. The decline statement, run from its own file ===');
try {
  await db.exec(decline.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n'));
  const column = await db.query(`select column_name, data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'quote_requests' and column_name = 'declined_reason'`);
  say(`column added: ${column.rows.length === 1 ? column.rows[0].column_name + ' (' + column.rows[0].data_type + ')' : 'MISSING'}`);
  await db.exec(decline.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n'));
  const twice = await db.query(`select count(*)::int as n from information_schema.columns
    where table_schema = 'public' and table_name = 'quote_requests' and column_name = 'declined_reason'`);
  say(`running it twice is safe: ${twice.rows[0].n === 1 ? 'yes, still one column' : 'NO, ' + twice.rows[0].n + ' columns'}`);
} catch (error) {
  say(`THE DECLINE STATEMENT FAILED: ${error.message}`);
  process.exit(1);
}

say('');
say('=== 4. The check file again, after the fix ===');
const after = await db.query(check);
const stillOff = after.rows.filter((row) => String(row.detail).includes('protection OFF'));
say(`protection OFF: ${stillOff.length} tables`);
for (const row of after.rows.filter((r) => r.section === '2. STAFF LINK')) say(`  ${row.item}: ${row.detail}`);
say(`  laundry function: ${after.rows.find((r) => r.section === '6. LAUNDRY BOOKING FUNCTION').detail}`);
const openRules = after.rows.filter((row) => row.section === '4. RULES'
  && String(row.item).startsWith('quote_requests::')
  && String(row.detail).includes('using: true'));
say(`  cleaning enquiry rules that still let everyone through: ${openRules.length}`);
const servicesRule = after.rows.find((row) => String(row.item).startsWith('services::'));
say(`  services rule left alone on purpose: ${servicesRule ? servicesRule.detail.split('|')[0].trim() : 'not found'}`);

say('');
say('=== 5. What each person sees after the fix ===');
const strangerAfter = (await asRole('anon', null, 'select count(*)::int as n from public.mobile_requests'))[0].n;
for (const table of ['mobile_requests', 'routines', 'quote_requests']) {
  const stranger = (await asRole('anon', null, `select count(*)::int as n from public.${table}`))[0].n;
  const own = await asRole('authenticated', customerA, `select count(*)::int as n from public.${table}`);
  const staff = await asRole('authenticated', staffA, `select count(*)::int as n from public.${table}`);
  say(`  ${table}: stranger ${stranger}, customer ${own[0].n}, staff ${staff[0].n}`);
}
const prices = await asRole('anon', null, 'select count(*)::int as n from public.laundry_items');
say(`  prices readable by a guest (must stay open): ${prices[0].n}`);
const banned = await asRole('authenticated', '44444444-4444-4444-4444-444444444444',
  'select public.is_chapman_staff() as staff');
say(`  a signed in person who is not staff: ${banned[0].staff}`);

say('');
say('=== 6. The app still works, inside one transaction ===');
let submitted = null;
let ownRows = 0;
let savedQuoteId = null;
let staffOffered = 0;
let customerAccepted = 0;
let otherCustomerBlocked = 0;
let priceWrite = 0;
let staffReads = 0;
let routineSaved = 0;
let routineVisibleToOther = -1;
let routineDeleted = 0;
let laundryResponded = null;
let staffReviewBlocked = 0;
let declinedRows = 0;
let declinedReasonRead = null;
let declinedSeenByOther = -1;
await db.exec('begin');
try {
  const claim = (uid) => db.exec(`select set_config('request.jwt.claim.sub', '${uid}', true)`);
  await db.exec('set local role authenticated');

  // A customer books laundry, exactly as the app does.
  await claim(customerA);
  submitted = (await db.query(`select (public.submit_mobile_laundry_request(
      current_date + 3, 'Asokwa', 'House 14, Kumasi', 'Morning', '[{"name":"Item 3","quantity":2}]'::jsonb,
      true, 'Payment: Cash', 6.6885, -1.6244, 12.5)).id as id`)).rows[0].id;
  ownRows = (await db.query('select count(*)::int as n from public.mobile_requests')).rows[0].n;

  // The customer saves a routine.
  routineSaved = (await db.query(`insert into public.routines (client_id, service_id, service_title, cadence, detail)
      values ('${customerA}', 'cleaning', 'Deep cleaning', 'Weekly', 'Weekly care reminder') returning id`)).rows.length;
  routineVisibleToOther = 0;

  // The customer asks for a cleaning visit, then staff offers a date.
  savedQuoteId = (await db.query(
    `insert into public.quote_requests (customer_account_id, service_id, service_title, details)
     values ('${customerA}', 'fumigation', 'Fumigation', '{"estimatedAreaM2": 60}'::jsonb) returning id`)).rows[0].id;

  await claim(staffA);
  staffReads = (await db.query('select count(*)::int as n from public.quote_requests')).rows[0].n;
  staffOffered = (await db.query(
    `update public.quote_requests
        set appointment_response = 'awaiting-customer', details = '{"estimatedAreaM2": 60, "proposedDate": "2026-10-05"}'::jsonb
      where id = '${savedQuoteId}' returning id`)).rows.length;

  /* Chapman's daily messages: a customer reads what is due, cannot publish, and
     a future message stays hidden until its day. */
  await claim(customerA);
  dailyReadable = (await db.query(`select count(*)::int as n from public.chapman_daily_messages where publish_on <= current_date`)).rows[0].n;
  dailyFutureHidden = 0;
  // A refused insert ends the whole transaction unless it is fenced off, so it
  // is wrapped in a savepoint that is rolled back either way.
  let customerPublishBlocked = false;
  await db.exec('savepoint daily_write');
  try {
    await db.query(`insert into public.chapman_daily_messages (kind, title, body, publish_on)
      values ('news', 'Not allowed', 'A customer should not be able to publish this.', current_date)`);
  } catch {
    customerPublishBlocked = true;
  }
  await db.exec('rollback to savepoint daily_write');
  dailyCustomerWrite = customerPublishBlocked ? 0 : 1;

  await claim(staffA);
  const staffPublished = (await db.query(`insert into public.chapman_daily_messages (kind, title, body, publish_on)
    values ('thanks', 'Thank you', 'Thank you for choosing Chapman this month.', current_date + 1) returning id`)).rows.length;
  dailyStaffWrite = staffPublished;
  // A message written today for a future morning must stay hidden until its day.
  await claim(customerA);
  dailyFutureHidden = (await db.query(`select count(*)::int as n from public.chapman_daily_messages where title = 'Thank you'`)).rows[0].n;
  await claim(staffA);
  say(`  a customer reads ${dailyReadable} due message(s) and ${dailyFutureHidden} future one(s)`);
  say(`  a customer publishing a message: ${dailyCustomerWrite} rows, must be 0`);
  say(`  the office publishing a message: ${dailyStaffWrite} row, must be 1`);

  // Another customer tries to change that request, then to read this one's routines.
  await claim(customerB);
  otherCustomerBlocked = (await db.query(
    `update public.quote_requests set appointment_response = 'accepted' where id = '${savedQuoteId}' returning id`)).rows.length;
  routineVisibleToOther = (await db.query(
    `select count(*)::int as n from public.routines where client_id = '${customerA}'`)).rows[0].n;
  const ownRoutinesToOther = (await db.query('select count(*)::int as n from public.routines')).rows[0].n;

  // The customer accepts the offered date, and answers the laundry date they were offered.
  await claim(customerA);
  customerAccepted = (await db.query(
    `update public.quote_requests set appointment_response = 'accepted' where id = '${savedQuoteId}' returning id`)).rows.length;
  laundryResponded = (await db.query(
    `select public.respond_to_mobile_request_date('${submitted}', 'accepted') as id`)).rows[0].id;
  routineDeleted = (await db.query(
    `delete from public.routines where client_id = '${customerA}' and cadence = 'Weekly' returning id`)).rows.length;
  priceWrite = (await db.query('update public.laundry_items set price_wash = 1 returning id')).rows.length;
  staffReviewBlocked = (await db.query(
    `select public.is_chapman_staff() as staff`)).rows[0].staff === true ? -1 : 0;

  say(`  customer books laundry: ${submitted ? 'saved' : 'FAILED'}`);
  say(`  customer sees ${ownRows} requests, only their own`);
  say(`  customer saves a routine: ${routineSaved} row`);
  say(`  another customer sees of the first customer routines: ${routineVisibleToOther}, must be 0`);
  say(`  and sees their own routines as normal: ${ownRoutinesToOther}`);
  say(`  customer deletes their own routine: ${routineDeleted} row`);
  say(`  customer asks for fumigation: ${savedQuoteId ? 'saved' : 'FAILED'}`);
  say(`  staff read every request: ${staffReads}`);
  say(`  staff offers a date: ${staffOffered} row updated`);
  say(`  the customer accepts it: ${customerAccepted} row updated`);
  say(`  the customer answers a laundry date offer: ${laundryResponded ? 'saved' : 'FAILED'}`);
  say(`  another customer changing that request: ${otherCustomerBlocked} rows, must be 0`);
  say(`  a customer changing your prices: ${priceWrite} rows, must be 0`);
  say(`  a customer clearing the staff flag for themselves: ${staffReviewBlocked} rows, must be 0`);

  // The office declines a request with a reason, exactly as the staff page does.
  await claim(staffA);
  const declineReason = "Fully booked on your preferred dates";
  declinedRows = (await db.query(
    `update public.quote_requests set appointment_response = 'declined', declined_reason = '${declineReason}'
      where id = '${savedQuoteId}' returning id`)).rows.length;

  // The customer opens that request and reads the reason.
  await claim(customerA);
  const asCustomer = (await db.query(
    `select appointment_response, declined_reason from public.quote_requests where id = '${savedQuoteId}'`)).rows[0];

  // Another customer must not see it at all.
  await claim(customerB);
  const otherSees = (await db.query(
    `select count(*)::int as n from public.quote_requests where id = '${savedQuoteId}'`)).rows[0].n;

  say(`  office declines with a reason: ${declinedRows} row updated`);
  say(`  the customer reads: "${asCustomer?.declined_reason}" with the answer "${asCustomer?.appointment_response}"`);
  say(`  another customer can see that reason: ${otherSees}, must be 0`);
  declinedReasonRead = asCustomer?.declined_reason ?? null;
  declinedSeenByOther = otherSees;
} finally {
  await db.exec('rollback');
}

say('');
say('=== 7. The undo, read straight out of the file ===');
let undoneOffCount = -1;
const undoStart = fix.indexOf('-- begin;');
const undoEnd = fix.indexOf('-- commit;') + '-- commit;'.length;
const undoStatements = fix.slice(undoStart, undoEnd)
  .split('\n')
  .map((line) => line.replace(/^\s*--\s?/, ''))
  .join('\n');
try {
  await db.exec(undoStatements);
  const undone = await db.query(check);
  const off = undone.rows.filter((row) => String(row.detail).includes('protection OFF'));
  undoneOffCount = off.length;
  say(`undo ran cleanly, protection OFF on: ${off.length} tables`);
  say(`  ${off.map((row) => row.item).sort().join(', ')}`);
} catch (error) {
  say(`UNDO FAILED: ${error.message}`);
}

say('');
say('=== 7b. Locking every drawer, and keeping new ones locked ===');
let lockedByFile = -1;
let openAfterLock = -1;
let strangerSeesAfterLock = [];
let customerStillWorks = null;
let staffStillWorks = null;
let newTableLocked = null;
let ideasAfterLock = -1;
let undoRestored = -1;
try {
  await db.exec(stripComments(lockAll));

  const openNow = await db.query(`select count(*)::int as n from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity = false`);
  openAfterLock = openNow.rows[0].n;
  say(`tables still unlocked after the file: ${openAfterLock}`);

  lockedByFile = (await db.query(`select count(*)::int as n from public.chapman_security_log
    where action = 'row security switched on' and reversed = false`)).rows[0].n;
  const names = await db.query(`select table_name from public.chapman_security_log
    where action = 'row security switched on' and reversed = false order by id`);
  say(`locked by this file: ${lockedByFile} (${names.rows.map((row) => row.table_name).join(', ')})`);

  // The check file must now agree that nothing is left open.
  const afterLockCheck = await db.query(check);
  const stillOpenRows = afterLockCheck.rows.filter((row) => String(row.detail).includes('protection OFF'));
  say(`the check file now reports ${stillOpenRows.length} tables without protection`);

  // A stranger must see nothing except the price list. A table that refuses the
  // request outright counts as nothing seen, which is the strongest answer.
  for (const table of ['mobile_requests', 'routines', 'quote_requests', 'orders', 'order_items', 'clients', 'customer_accounts', 'chapman_app_ideas', 'mobile_request_events', 'chapman_security_log']) {
    let rows = 0;
    try {
      rows = (await asRole('anon', null, `select count(*)::int as n from public.${table}`))[0].n;
    } catch {
      strangerSeesAfterLock.push(`${table} refused`);
      continue;
    }
    strangerSeesAfterLock.push(`${table} ${rows}`);
  }
  say(`a stranger now sees: ${strangerSeesAfterLock.join(', ')}`);
  const pricesStillOpen = (await asRole('anon', null, 'select count(*)::int as n from public.laundry_items'))[0].n;
  say(`the price list stays readable for guests: ${pricesStillOpen}`);

  // The app must still work for the customer and for the office.
  const ownRequests = (await asRole('authenticated', customerA, 'select count(*)::int as n from public.mobile_requests'))[0].n;
  const ownRoutines = (await asRole('authenticated', customerA, 'select count(*)::int as n from public.routines'))[0].n;
  const ownQuotes = (await asRole('authenticated', customerA, 'select count(*)::int as n from public.quote_requests'))[0].n;
  const ownIdeas = (await asRole('authenticated', customerA, 'select count(*)::int as n from public.chapman_app_ideas'))[0].n;
  customerStillWorks = { ownRequests, ownRoutines, ownQuotes, ownIdeas };
  say(`the customer still sees: ${ownRequests} requests, ${ownRoutines} routines, ${ownQuotes} enquiries, ${ownIdeas} own idea`);

  // The only table the app writes that is brand new: sending an idea must still
  // work now that Supabase's automatic permission is withdrawn.
  await asRoleCommit('authenticated', customerA, `insert into public.chapman_app_ideas (author_name, idea)
    values ('Kofi Boateng', 'An idea sent after the locks went on.')`);
  ideasAfterLock = (await asRole('authenticated', customerA, `select count(*)::int as n from public.chapman_app_ideas`))[0].n;
  say(`a customer can still send an idea after locking: ${ideasAfterLock} own idea(s)`);

  const allRequests = (await asRole('authenticated', staffA, 'select count(*)::int as n from public.mobile_requests'))[0].n;
  const allClients = (await asRole('authenticated', staffA, 'select count(*)::int as n from public.clients'))[0].n;
  staffStillWorks = { allRequests, allClients };
  say(`the office still sees: ${allRequests} requests, ${allClients} clients`);

  // A table created from now on must arrive closed.
  await db.exec('create table public.chapman_probe_table (id uuid primary key default gen_random_uuid(), note text)');
  newTableLocked = (await db.query(`select relrowsecurity from pg_class where relname = 'chapman_probe_table'`)).rows[0].relrowsecurity;
  say(`a brand new table arrives locked: ${newTableLocked ? 'yes' : 'NO'}`);
  let probeSeen = 'refused';
  try {
    probeSeen = (await asRole('anon', null, 'select count(*)::int as n from public.chapman_probe_table'))[0].n;
  } catch {
    // Refused outright is the answer we want: it is the permission rule and the
    // row rule both holding.
  }
  say(`a stranger reading the brand new table: ${probeSeen}`);
  await db.exec('drop table public.chapman_probe_table');

  // Running the whole file a second time must not lock anything again.
  await db.exec(stripComments(lockAll));
  const again = (await db.query(`select count(*)::int as n from public.chapman_security_log where action = 'row security switched on' and reversed = false`)).rows[0].n;
  say(`running it twice is safe: locks recorded stay at ${again}`);

  // And the undo, exactly as written at the bottom of the file, puts it back.
  const undoStart = lockAll.indexOf('-- begin;');
  const undoEnd = lockAll.indexOf('-- commit;') + '-- commit;'.length;
  const undoText = lockAll.slice(undoStart, undoEnd).split('\n').map((line) => line.replace(/^-- ?/, '')).join('\n');
  await db.exec(undoText);
  undoRestored = (await db.query(`select count(*)::int as n from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity = false`)).rows[0].n;
  say(`the undo switches the lock back off on ${undoRestored} tables`);

  // Leave the database in the state the file asks for.
  await db.exec(stripComments(lockAll));
  const finalOpen = (await db.query(`select count(*)::int as n from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity = false`)).rows[0].n;
  say(`after running it once more, tables still unlocked: ${finalOpen}`);
} catch (error) {
  say(`THE LOCK EVERYTHING FILE FAILED: ${error.message}`);
  process.exit(1);
}

say('');
say('=== 8. Shape rules for both files ===');
for (const [name, text] of [['the check file', check], ['the security fix', fix]]) {
  const nonAscii = [...text].filter((character) => character.codePointAt(0) > 126);
  const commaLines = text.split('\n').filter((line) => line.trimEnd().endsWith(','));
  const body = text.replace(/^\s*--.*$/gm, '');
  say(`  ${name}: non-ASCII ${nonAscii.length}, lines ending in a comma ${commaLines.length}, statements ${(body.match(/;/g) ?? []).length}`);
}

const failed = [];
if (locksOff.length !== 5) failed.push(`expected 5 unprotected tables before the fix, saw ${locksOff.length}`);
for (const name of ['laundry_items', 'mobile_requests', 'orders', 'order_items', 'routines']) {
  if (!locksOff.some((row) => row.item === name)) failed.push(`${name} should be unprotected today but is not`);
}
if (stillOff.length !== 0) failed.push(`${stillOff.length} tables still unprotected after the fix`);
if (openRules.length !== 0) failed.push(`${openRules.length} rules still let everyone through after the fix`);
if (strangerRequests[0].n !== 8) failed.push(`before the fix a stranger should see the 8 live requests, saw ${strangerRequests[0].n}`);
if (strangerAfter !== 0) failed.push(`a stranger can still see ${strangerAfter} customer requests after the fix`);
if (prices[0].n !== 36) failed.push('a guest can no longer browse your prices');
if (!submitted) failed.push('a customer could not book laundry');
if (routineSaved !== 1) failed.push('a customer could not save a routine');
if (routineVisibleToOther !== 0) failed.push('a customer can read another customer routines');
if (routineDeleted !== 1) failed.push('a customer could not delete their own routine');
if (staffOffered !== 1) failed.push('staff could not offer a date');
if (customerAccepted !== 1) failed.push('the customer could not accept their own date');
if (!laundryResponded) failed.push('the customer could not answer a laundry date offer');
if (otherCustomerBlocked !== 0) failed.push('one customer could change another customer request');
if (priceWrite !== 0) failed.push('a customer could change prices');
if (undoneOffCount !== 5) failed.push(`the undo should leave 5 tables unprotected, it left ${undoneOffCount}`);
if (declinedRows !== 1) failed.push('the office could not decline a request');
if (declinedReasonRead !== 'Fully booked on your preferred dates') failed.push(`the customer did not read the reason, got: ${declinedReasonRead}`);
if (declinedSeenByOther !== 0) failed.push('another customer could read the decline reason');
if (dailyReadable !== 1) failed.push(`a customer should read 1 due message, read ${dailyReadable}`);
if (dailyFutureHidden !== 0) failed.push(`a customer could read ${dailyFutureHidden} message(s) dated in the future, must be 0`);
if (dailyCustomerWrite !== 0) failed.push('a customer could publish a daily message');
if (dailyStaffWrite !== 1) failed.push('the office could not publish a daily message');
if (!dailyGrid) failed.push('the daily messages grid did not run');
if (birthdayColumns !== 2) failed.push(`the birthday columns should be 2, saw ${birthdayColumns}`);
if (linkFunction !== 1) failed.push('the client link function is missing');
if (ideaRules !== 4) failed.push(`the idea table should have 4 rules, saw ${ideaRules}`);
if (customerARepeats !== 1) failed.push(`signing in twice created ${customerARepeats} clients, must be 1`);
if (customerTwoEmail !== 'akosua@example.com') failed.push(`the email was not written to the client list, got ${customerTwoEmail}`);
if (ideasSeenByOwner !== 1) failed.push(`the customer should read their own idea, read ${ideasSeenByOwner}`);
if (ideasSeenByOther !== 0) failed.push(`another customer could read the idea, saw ${ideasSeenByOther}`);
if (ideasSeenByStaff !== 1) failed.push(`the office should read the idea, read ${ideasSeenByStaff}`);
if (ideasSeenByStranger !== 0) failed.push(`a stranger could read ideas, saw ${ideasSeenByStranger}`);
if (!anonIdeaRefused) failed.push('a stranger could send an idea');
if (openAfterLock !== 0) failed.push(`${openAfterLock} tables are still unlocked after the lock everything file`);
if (lockedByFile < 5) failed.push(`the lock everything file only locked ${lockedByFile} tables`);
const strangerLeaks = strangerSeesAfterLock.filter((line) => !line.endsWith(' 0') && !line.endsWith(' refused'));
if (strangerLeaks.length) failed.push(`a stranger can still read: ${strangerLeaks.join(', ')}`);
if (customerStillWorks && (customerStillWorks.ownRequests < 1 || customerStillWorks.ownRoutines < 1 || customerStillWorks.ownQuotes < 1)) failed.push('the customer lost access to their own records after locking');
if (!staffStillWorks || staffStillWorks.allRequests < 8) failed.push(`the office lost sight of the requests after locking, saw ${staffStillWorks?.allRequests}`);
if (!staffStillWorks || staffStillWorks.allClients < 2) failed.push(`the office lost sight of the client list after locking, saw ${staffStillWorks?.allClients}`);
if (typeof ideasAfterLock !== 'number' || ideasAfterLock < 2) failed.push(`sending an idea stopped working after locking, the customer sees ${ideasAfterLock}`);
if (newTableLocked !== true) failed.push('a brand new table did not arrive locked');
if (undoRestored !== 5) failed.push(`the undo should leave 5 tables unlocked, it left ${undoRestored}`);

say('');
say(failed.length === 0 ? 'RESULT: every check passed' : `RESULT: FAILED -> ${failed.join('; ')}`);
if (failed.length) process.exit(1);
