-- ============================================================================
-- Chapman Prestige, DATABASE CHECK
-- ============================================================================
--
-- ONE query. ONE result grid. Run it once, screenshot the grid, send it back.
--
-- This single query replaces everything I asked you for across the last three
-- messages. If you are unsure which file to run, it is this one. Ignore the
-- others.
--
-- Read-only. It cannot change, break, or delete anything.
-- It returns no customer names, phones, addresses, or coordinates, only table
-- names, column names, rule definitions, and counts.
--
-- The grid comes back with three columns:
-- section: which group of information the row belongs to
-- item: the thing being described
-- detail: what we found
--
-- HOW THIS FILE IS WRITTEN
-- Every comma sits at the START of its line, not the end. That shape cannot be
-- damaged by an editor or a copy and paste that joins lines together. If you
-- ever edit this file yourself, keep commas at the start of lines.
-- ============================================================================

with
tables_info as (
  select '1. TABLES' as section
       , c.relname::text as item
       , (case when c.relrowsecurity then 'protection ON' else 'protection OFF' end)
         || ' | rows ~ ' || coalesce(s.n_live_tup, 0)::text as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_stat_user_tables s on s.relid = c.oid
  where n.nspname = 'public' and c.relkind in ('r', 'p')
)
, staff_counts as (
  select count(*) as total
       , count(u.id) as linked
       , count(*) filter (where u.id is null) as unlinked
  from public.staff s
  left join auth.users u on u.id::text = to_jsonb(s) ->> 'id'
)
, staff_info as (
  select '2. STAFF LINK' as section
       , 'staff accounts' as item
       , total::text as detail
  from staff_counts
  union all select '2. STAFF LINK'
       , 'with a working login'
       , linked::text
  from staff_counts
  union all select '2. STAFF LINK'
       , 'MISSING a login'
       , unlinked::text
  from staff_counts
  union all select '2. STAFF LINK'
       , 'which ones are missing'
       , coalesce((select string_agg(coalesce(to_jsonb(s) ->> 'id', '(no id column)'), ', ')
                   from public.staff s
                   left join auth.users u on u.id::text = to_jsonb(s) ->> 'id'
                   where u.id is null), 'none')
)
, columns_info as (
  select '3. COLUMNS' as section
       , c.table_name::text as item
       , string_agg(c.column_name || ' ' || c.data_type, ', ' order by c.ordinal_position) as detail
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in ('laundry_items','quote_requests','routines','mobile_requests','staff')
  group by c.table_name
)
, rules_info as (
  select '4. RULES' as section
       , (p.tablename || ':: ' || p.policyname)::text as item
       , (p.permissive || ' ' || p.cmd || ' to ' || array_to_string(p.roles, ',')
          || ' | using: ' || coalesce(p.qual, '-')
          || ' | check: ' || coalesce(p.with_check, '-')) as detail
  from pg_policies p
  where p.schemaname = 'public'
)
, functions_info as (
  select '5. FUNCTIONS' as section
       , p.proname::text as item
       , (pg_get_function_arguments(p.oid)
          || ' | returns ' || pg_get_function_result(p.oid)
          || case when p.prosecdef then ' | SECURITY DEFINER' else '' end) as detail
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
, laundry_fn_info as (
  select '6. LAUNDRY BOOKING FUNCTION' as section
       , 'submit_mobile_laundry_request' as item
       , (case
            when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = 'submit_mobile_laundry_request')
            then 'FUNCTION NOT FOUND'
            else 'reads the laundry_items table: '
              || (case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                    where n.nspname = 'public' and p.proname = 'submit_mobile_laundry_request'
                                      and pg_get_functiondef(p.oid) ~* '\m(from|join)\s+(public\.)?laundry_items\M')
                       then 'YES' else 'NO' end)
              || ' | contains a hardcoded item list: '
              || (case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                    where n.nspname = 'public' and p.proname = 'submit_mobile_laundry_request'
                                      and pg_get_functiondef(p.oid) like '%''vest''%')
                       then 'YES' else 'NO' end)
          end) as detail
)
select section, item, detail from tables_info
union all select section, item, detail from staff_info
union all select section, item, detail from columns_info
union all select section, item, detail from rules_info
union all select section, item, detail from functions_info
union all select section, item, detail from laundry_fn_info
order by section, item;


-- ============================================================================
-- HOW TO READ THE RESULT (you do not have to, just send it)
-- ============================================================================
--
-- Section 1 Which tables exist, and whether their protection is switched on.
-- Anything showing "protection OFF" is readable by strangers.
--
-- Section 2 Whether your staff logins are linked. "MISSING a login" should be
-- 0 before we tighten any rules, or we lock your own team out.
--
-- Section 3 The real column names. Stops me assuming names that do not exist.
-- Assuming wrong names is what caused the earlier error.
--
-- Section 4 Every access rule, so we can see all the open doors at once.
--
-- Section 5 Every function that exists, so I stop assuming they are there.
--
-- Section 6 Whether your live laundry pricing reads its own price list or a
-- hardcoded copy, and whether the project matches production.
-- ============================================================================
