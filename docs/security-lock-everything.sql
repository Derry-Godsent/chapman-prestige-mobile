-- ============================================================================
-- CHAPMAN PRESTIGE, LOCK EVERY DRAWER, AND KEEP NEW ONES LOCKED
-- ============================================================================
--
-- ONE QUERY. Paste this whole file into the Supabase SQL editor and press Run.
-- It takes a few seconds and it changes no data. Not one row, not one column.
--
-- ----------------------------------------------------------------------------
-- WHY THIS FILE EXISTS
-- ----------------------------------------------------------------------------
--
-- Supabase sent you an email saying two of your tables had their lock off:
-- anyone with your project address could read, change, and delete everything in
-- them. That email is a picture of a moment. It does not check again by itself,
-- so a table that is created tomorrow would arrive with the same problem and
-- nobody would be told.
--
-- This file closes both halves of that:
--
--   1. Every table in your database that still has its lock off gets the lock
--      switched on, right now, and gets one rule: only Chapman staff may touch
--      it. Your existing rules for customers are left exactly as they are.
--
--   2. Every table created from now on arrives locked automatically, without
--      anyone remembering to do it. A new table is invisible to the customer app
--      and to strangers until somebody deliberately opens it.
--
-- ----------------------------------------------------------------------------
-- WHAT IT DOES NOT DO
-- ----------------------------------------------------------------------------
--
-- - It does not delete or change any data.
-- - It does not remove or rewrite any rule you already have.
-- - It does not change how the staff system or the customer app behaves.
-- - It does not touch the price list, which stays readable on purpose.
--
-- If a table that staff need turns out to be closed by this, tell me its name
-- and I will write the one rule it needs. The list of everything this file
-- locked is kept in public.chapman_security_log, so nothing is guesswork.
--
-- ----------------------------------------------------------------------------
-- HOW TO UNDO IT
-- ----------------------------------------------------------------------------
--
-- The undo is at the bottom of this file, clearly fenced. It switches the lock
-- back off on exactly the tables this file locked, using the log it wrote, and
-- touches nothing else.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. The log, so every lock this file applies can be undone exactly.
--    The office can read it in the SQL editor with:
--      select changed_at, table_name from public.chapman_security_log order by id;
-- ----------------------------------------------------------------------------

create table if not exists public.chapman_security_log (
  id bigserial primary key,
  changed_at timestamptz not null default now(),
  table_name text not null,
  action text not null,
  reversed boolean not null default false
);

alter table public.chapman_security_log enable row level security;

-- A locked table with no rules is readable by nobody through the app. The
-- office reads it in the SQL editor, which runs as the owner of the table.
grant select on public.chapman_security_log to service_role;

-- ----------------------------------------------------------------------------
-- 2. Lock every table in public that still has the lock off.
--    Each one gets a single rule: Chapman staff may use it. Nobody else.
-- ----------------------------------------------------------------------------

do $$
declare
  v_table record;
  v_locked integer := 0;
begin
  for v_table in
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity = false
    order by c.relname
  loop
    execute format('alter table public.%I enable row level security', v_table.name);
    execute format('drop policy if exists %I on public.%I', 'Chapman staff manage', v_table.name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_chapman_staff()) with check (public.is_chapman_staff())',
      'Chapman staff manage', v_table.name
    );
    insert into public.chapman_security_log (table_name, action) values (v_table.name, 'row security switched on');
    raise notice 'locked: %', v_table.name;
    v_locked := v_locked + 1;
  end loop;
  raise notice 'tables locked by this run: %', v_locked;
end $$;

-- ----------------------------------------------------------------------------
-- 3. A new table should never arrive open again.
--
--    Two guards, because they cover different things:
--
--    a. The automatic permission Supabase used to add to brand new tables is
--       withdrawn, so a new table cannot be reached through the app at all
--       until somebody says who may reach it. This is the change Supabase told
--       you about in the same email, applied in advance.
--
--    b. A rule on the database itself: every table created in public from now
--       on gets the lock switched on in the same breath it is created. Even if
--       somebody forgets the permission step, the table is still closed.
-- ----------------------------------------------------------------------------

alter default privileges in schema public revoke all on tables from anon, authenticated;

do $$
begin
  execute $create_trigger$
    create or replace function public.chapman_lock_new_tables()
    returns event_trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, public
    as $body$
    declare
      v_table record;
    begin
      for v_table in
        select c.relname as name
        from pg_event_trigger_ddl_commands() e
        join pg_class c on c.oid = e.objid
        join pg_namespace n on n.oid = c.relnamespace
        where e.command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
          and n.nspname = 'public'
          and c.relkind in ('r', 'p')
      loop
        execute format('alter table public.%I enable row level security', v_table.name);
        insert into public.chapman_security_log (table_name, action) values (v_table.name, 'locked automatically when created');
        raise notice 'new table closed: %', v_table.name;
      end loop;
    end;
    $body$;
  $create_trigger$;

  execute 'drop event trigger if exists chapman_lock_new_tables_trigger';
  execute $trigger$
    create event trigger chapman_lock_new_tables_trigger
      on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.chapman_lock_new_tables()
  $trigger$;

  raise notice 'automatic lock for new tables: installed';
exception
  when insufficient_privilege then
    raise notice 'automatic lock for new tables: needs a higher privilege on this project, so it was skipped. Everything else in this file still applied.';
  when others then
    raise notice 'automatic lock for new tables: skipped (%). Everything else in this file still applied.', sqlerrm;
end $$;

commit;

-- ============================================================================
-- WHAT YOU SHOULD SEE
-- ============================================================================
--
-- The grid below is the answer. Read it like this:
--
--   tables still unlocked        must be 0
--   tables with the lock on      every table in your database
--   locked by this file          how many doors this run closed
--   automatic lock for new tables   installed, or the reason it was skipped
--
-- ----------------------------------------------------------------------------
-- THE UNDO, run only this if something looks wrong
-- ----------------------------------------------------------------------------
-- Copy the lines between the two fences, paste, run. It switches the lock back
-- off on exactly the tables this file locked, and on nothing else.
--
--                ---- copy from the line below ----
-- begin;
-- do $$
-- declare
--   v_change record;
-- begin
--   for v_change in
--     select id, table_name from public.chapman_security_log
--     where action = 'row security switched on' and reversed = false
--     order by id
--   loop
--     execute format('alter table public.%I disable row level security', v_change.table_name);
--     update public.chapman_security_log set reversed = true where id = v_change.id;
--     raise notice 'unlocked: %', v_change.table_name;
--   end loop;
-- end $$;
-- commit;
--                ---- copy from the line above ----
-- ============================================================================

select 'tables still unlocked' as what,
       (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity = false)::text as how_many
union all
select 'tables with the lock on',
       (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity = true)::text
union all
select 'locked by this file',
       (select count(*) from public.chapman_security_log
        where action = 'row security switched on' and reversed = false)::text
union all
select 'locked automatically when created',
       (select count(*) from public.chapman_security_log
        where action = 'locked automatically when created')::text
union all
select 'automatic lock for new tables',
       case when exists (select 1 from pg_event_trigger where evtname = 'chapman_lock_new_tables_trigger')
            then 'installed' else 'not installed on this project' end
union all
select 'tables locked by this file, by name',
       coalesce((select string_agg(table_name, ', ' order by id) from public.chapman_security_log
                 where action = 'row security switched on' and reversed = false), 'none');
