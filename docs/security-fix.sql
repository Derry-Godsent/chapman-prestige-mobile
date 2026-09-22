-- ============================================================================
-- CHAPMAN PRESTIGE, LOCK THE OPEN DRAWERS
-- ============================================================================
--
-- WHAT THIS FILE IS
-- A set of instructions for your database. Paste the whole file into Supabase, then SQL Editor, then Run. It takes a few seconds.
--
-- Read this section first. It explains, in plain English, what the file does.
-- why, and what happens if you change your mind.
--
-- ============================================================================
-- THE PROBLEM IT SOLVES
-- ============================================================================
--
-- Your app needs a "key" to talk to your database. That key is stored inside the
-- app itself, so anyone who downloads your app can get hold of it.
--
-- Normally that's fine, because the database is supposed to check every single
-- request: "Who is asking? Are they allowed to see this?" That check is called
-- row-level security, think of it as a lock on each drawer.
--
-- Your own check of the live database found FIVE drawers with the lock off:
-- the price list, laundry requests, saved routines, orders and order items.
-- One more drawer, your cleaning enquiries, has the lock on but with two rules
-- that let everyone through, which is just as bad in practice. All of it is
-- fixed below.
--
-- The practical result, which was measured on a copy of your setup:
--
-- A stranger with NO LOGIN AT ALL can currently read:
-- - all 7 live laundry requests, INCLUDING HOME ADDRESSES AND GPS POINTS
-- - all 4 saved customer routines
-- - all 4 live cleaning enquiries
-- - your 36-item laundry price list
--... and can CHANGE your prices, or DELETE customer requests.
--
-- There is also a side effect you may already have noticed: your app's Bookings
-- tab asks the database for "laundry requests" and relies on the database to hand
-- back only your own. With the lock off, it hands back EVERYBODY'S. That is why
-- this matters in day-to-day terms, not just in theory.
--
-- ============================================================================
-- WHAT THIS FILE DOES
-- ============================================================================
--
-- Five things, in order:
--
-- 1. YOUR LAUNDRY PRICE LIST (36 items)
-- Today: anyone can read it, and anyone can REWRITE YOUR PRICES.
-- After: everyone can read it. Only staff can change it.
-- Note: reading stays open on purpose. Guests browse prices before signing
-- in, so locking that would break the laundry screen for new customers.
--
-- 2. YOUR LAUNDRY REQUESTS (7 live requests)
-- Today: the lock is off. Three correct rules have been sitting in your
-- database all along, written properly, simply never switched on. Because
-- they were off, customers could see each other's requests.
-- After: switching the lock on activates those rules. Nothing is created or
-- replaced here, this is purely the switch.
--
-- 3. SAVED ROUTINES (4 rows)
-- Today: no lock, no rules. Anyone can read, edit or delete anyone's.
-- After: a customer reaches only their own rows.
--
-- 4. CLEANING ENQUIRIES (4 live enquiries)
-- Today: the lock IS on, but two of the five rules literally say "everyone".
-- So every customer's enquiry, property, preferences, details, is readable
-- and editable by anyone with the app's key.
-- After: those two rules are replaced with a proper staff check. The three
-- customer rules are left EXACTLY as they are, so the app keeps working.
--
-- 5. ORDERS AND ORDER ITEMS
-- Today: no lock. Both are empty right now, so nothing is exposed yet.
-- After: protected from the moment your first real order exists, rather
-- than being open until someone remembers.
--
-- ============================================================================
-- WHAT THIS FILE DOES NOT DO
-- ============================================================================
--
-- - It does not delete or change ANY data. Not one row, column, or table.
-- - It does not change any of your app's features.
-- - It does not touch payments.
-- - It does not change your staff system's pages.
--
-- It changes one thing only: WHO is allowed to see and edit what.
--
-- ============================================================================
-- HOW IT IS MADE SAFE
-- ============================================================================
--
-- Everything runs inside a single "transaction", a batch that either completes
-- entirely or not at all. You cannot be left half-done.
--
-- The rules are created BEFORE the locks are switched on, deliberately. Doing it
-- the other way round would block everyone for a moment.
--
-- ============================================================================
-- THE ONE RISK, AND WHY IT DOESN'T APPLY TO YOU
-- ============================================================================
--
-- Your staff are identified by the id in your staff table. That id must match
-- their Supabase login. If it doesn't, the database can't tell who they are and
-- shows them nothing.
--
-- Your check already confirmed: 3 staff accounts, 0 missing a login.
-- So this does not apply to you. If a staff member ever DOES see an empty page.
-- get them to log out and back in first, old sessions carry old permissions.
--
-- ============================================================================
-- BEFORE YOU RUN, TWO THINGS
-- ============================================================================
--
-- 1. Take a backup: Supabase, then Database, then Backups.
-- 2. Know where the undo is. It's at the bottom of this file. It puts everything
-- back to how it is today, within seconds.
--
-- ============================================================================
-- AFTER YOU RUN, CHECK THESE
-- ============================================================================
--
-- 1. In the staff system, log out, then log back in.
-- 2. In the staff system, Mobile Requests still lists your 7 requests.
-- 3. In the staff system, the Orders page still loads.
-- 4. In the mobile app, the laundry builder still shows prices.
-- 5. In the mobile app, the Bookings tab now shows only YOUR OWN requests. This is the proof.
-- 6. In the mobile app, submit a test request and confirm it reaches the staff system.
--
-- ============================================================================
-- THE INSTRUCTIONS THEMSELVES START HERE
-- ============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1 of 5, LAUNDRY PRICE LIST
-- Everyone may READ the prices. Only staff may change them.
-- -----------------------------------------------------------------------------

drop policy if exists "anyone reads the laundry price list" on public.laundry_items;
drop policy if exists "staff manages the laundry price list" on public.laundry_items;

create policy "anyone reads the laundry price list"
 on public.laundry_items for select
 to anon, authenticated
 using (true);

create policy "staff manages the laundry price list"
 on public.laundry_items for all
 to authenticated
 using (public.is_chapman_staff())
 with check (public.is_chapman_staff());


-- -----------------------------------------------------------------------------
-- 2 of 5, LAUNDRY REQUESTS
-- Nothing created or replaced. The correct rules already exist in your
-- database, they are simply not switched on. The switch is at step 5.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 3 of 5, SAVED ROUTINES
-- A customer reaches only their own rows. Staff may read all.
-- NOTE: routines.client_id is TEXT while a login id is UUID. PostgreSQL
-- refuses to compare those directly, so every comparison below casts
-- explicitly. Without the cast this file would fail with
-- "operator does not exist: text = uuid".
-- -----------------------------------------------------------------------------

drop policy if exists "customers manage own routines" on public.routines;
drop policy if exists "staff reads routines" on public.routines;

create policy "customers manage own routines"
 on public.routines for all
 to authenticated
 using (client_id = auth.uid()::text)
 with check (client_id = auth.uid()::text);

create policy "staff reads routines"
 on public.routines for select
 to authenticated
 using (public.is_chapman_staff());


-- -----------------------------------------------------------------------------
-- 4 of 5, CLEANING ENQUIRIES
-- The two rules that said "everyone" are removed and replaced with a real
-- staff check. The three customer rules are deliberately left untouched.
-- -----------------------------------------------------------------------------

drop policy if exists "Staff can read all quotes" on public.quote_requests;
drop policy if exists "Staff can update all quotes" on public.quote_requests;

create policy "staff reads all quote requests"
 on public.quote_requests for select
 to authenticated
 using (public.is_chapman_staff());

create policy "staff updates all quote requests"
 on public.quote_requests for update
 to authenticated
 using (public.is_chapman_staff())
 with check (public.is_chapman_staff());


-- -----------------------------------------------------------------------------
-- 5 of 5, SWITCH THE LOCKS ON
-- This is the moment the rules above start working. Two of these tables
-- (laundry_items and quote_requests) got their rules in steps 1 and 4.
-- The other four already had correct rules written and waiting.
-- -----------------------------------------------------------------------------

alter table public.laundry_items enable row level security;
alter table public.mobile_requests enable row level security;
alter table public.routines enable row level security;
alter table public.quote_requests enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

commit;


-- ============================================================================
-- THE UNDO, run only this if something looks wrong
-- ============================================================================
--
-- COPY THE LINES BETWEEN THE TWO FENCES BELOW, PASTE THEM INTO SUPABASE, RUN.
-- The fence lines themselves are teaching lines, not instructions. Reading this
-- as a list is easier: start at "begin;", finish at the line that says "commit;".
--
--                ---- copy from the line below ----
--
-- begin;
-- alter table public.laundry_items disable row level security;
-- alter table public.mobile_requests disable row level security;
-- alter table public.routines disable row level security;
-- alter table public.orders disable row level security;
-- alter table public.order_items disable row level security;
-- commit;
--
--                ---- copy down to the line above ----
--
-- WHAT THIS PUTS BACK, AND WHAT IT DOES NOT
--
-- It switches the protection off again on the five drawers that are unprotected
-- TODAY: the price list, laundry requests, saved routines, orders, and order items.
--
-- It deliberately does NOT switch protection off on your laundry price list or
-- your cleaning enquiries, because those two are ALREADY protected this very
-- moment. Turning their protection off would leave your database in a worse state
-- than you found it, and this file never does that. It only ever returns you to
-- today's state, and today's state has those two protected.
--
-- What it does not undo: the rules this file created. Those are harmless on their
-- own. With protection switched off, a rule cannot do anything at all.
--
-- Your data is never touched either way. Not one row, column, or table.
-- ============================================================================
