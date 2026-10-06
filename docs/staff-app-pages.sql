-- ============================================================================
-- Chapman Prestige: SWITCH ON THE FOUR NEW STAFF PAGES
-- ============================================================================
--
-- TWO statements. Paste them into Supabase, SQL Editor, then Run, all at once.
--
-- WHY YOU NEED IT
-- The staff system has four new pages waiting for it: Service Requests (the
-- cleaning, fumigation, detailing, polytank and contract requests sent from the
-- app), App Ideas (what customers ask for), and App Accounts (who signed in to
-- the app, and every PIN moment). The code for those pages is already written.
--
-- Two small things in the database are still missing, and without them the pages
-- cannot work:
--
--   1. The staff system decides who may open a page by reading a table called
--      role_permissions. There is no row for the new pages yet, so the menu would
--      hide them and the pages would say "access denied".
--
--   2. The app can tell a customer that Chapman cannot take a request, but there
--      is nowhere for the reason to live. One empty box fixes that.
--
-- WHAT THIS DOES, IN PLAIN ENGLISH
-- Statement one says: "Admins and managers may see and use Service Requests,
-- App Ideas, and App Accounts." That is six menu rows, three pages for two
-- roles. It adds nothing else and changes no existing row.
--
-- Statement two adds one empty box to your cleaning request records, called
-- declined reason, where your team writes one short line explaining why a
-- request cannot be taken. An empty box holds nothing, so no row is touched and
-- nothing is deleted.
--
-- Both statements are safe to run twice. The second run changes nothing. Nothing
-- is dropped, no data is rewritten, and your existing pages keep working exactly
-- as they do now.
--
-- AFTER YOU RUN IT
-- - Service Requests, App Ideas and App Accounts appear in the staff side menu.
-- - The menu shows a number beside each one whenever there is something to look at.
-- - Your team can decline a service request with a reason the customer reads.
--
-- ============================================================================

-- Statement one: let admins and managers open the new pages.
insert into public.role_permissions (role, page, can_view, can_edit)
values
  ('admin',   'service-requests', true, true),
  ('manager', 'service-requests', true, true),
  ('admin',   'app-ideas',        true, true),
  ('manager', 'app-ideas',        true, true),
  ('admin',   'app-accounts',     true, true),
  ('manager', 'app-accounts',     true, true)
on conflict (role, page) do update
set can_view = excluded.can_view,
    can_edit = excluded.can_edit;

-- Statement two: one empty box for the reason a request cannot be taken.
alter table public.quote_requests add column if not exists declined_reason text;


-- ============================================================================
-- HOW TO CHECK IT WORKED
-- ============================================================================
-- The real check is opening the staff system: three new entries in the side menu,
-- with numbers beside them. Nothing else is needed.
--
-- If you prefer to see it in the database, run this on its own afterwards and
-- you should see six rows:
--
--   select role, page, can_view, can_edit from public.role_permissions
--   where page in ('service-requests', 'app-ideas', 'app-accounts')
--   order by page, role;
--
-- ============================================================================
-- THE UNDO, run only this if you change your mind
-- ============================================================================
--
--   delete from public.role_permissions
--   where page in ('service-requests', 'app-ideas', 'app-accounts');
--
--   alter table public.quote_requests drop column if exists declined_reason;
--
-- That hides the new pages from the menu and removes the reason box with anything
-- written in it. Everything else stays exactly as it is.
-- ============================================================================
--
-- A NOTE ON THE OTHER FILE, and this one matters
-- ---------------------------------------------------------------------------
-- Service Requests reads the cleaning enquiries in quote_requests. Staff are
-- allowed to read those only because of two rules written in
-- docs/security-fix.sql, section 4 ("staff reads all quote requests" and
-- "staff updates all quote requests"). If those two rules have not been run in
-- this project yet, the page will open and show an empty list even though the
-- requests exist. The page says so on screen when that happens. Running
-- docs/security-fix.sql once is what fixes it.
-- ============================================================================
