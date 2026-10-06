# Handover: the staff web app work

**Read this first if you are a new session working on `Derry-Godsent/laundry-app`.**

The Chapman Prestige system is three things: this mobile app
(`chapman-prestige-mobile`), the staff web app (`laundry-app`), and one Supabase
project they share. Work is split by repository. This file is the brief for the
staff web app side, written by the session that works on the mobile app, so
nothing has to be rediscovered.

---

## The one thing waiting, right now

The mobile app has been writing three kinds of record that no staff screen read,
so work customers did in the app landed nowhere. The staff pages that fix that are
finished, proved, and sitting here as a patch:

```
docs/staff-web-app/app-records-pages.patch
```

It adds three pages and wires them in:

| Page | What it reads |
| --- | --- |
| `src/pages/ServiceRequests.tsx` | `quote_requests`, the cleaning, fumigation, detailing, polytank and contract enquiries sent from the app. The office offers a date the customer accepts or rejects in the app, or declines with one line the customer reads |
| `src/pages/AppIdeas.tsx` | `chapman_app_ideas`, every idea sent from the app, with the sender's name and number, moved along as new, reading, planned, done, not doing |
| `src/pages/AppAccounts.tsx` | `customer_accounts` and `chapman_app_security_events`, who signed in to the app and every PIN moment on their account. The four digits are never stored |

Plus, in the same patch: two hooks (`useIntakeCounts`, `useIntakeNotifications`),
routes, side menu entries, permission keys, the Security page's permission list,
live numbers on the menu, and a bell that listens to real records instead of an
orders query filtered by a client id a staff member never has.

### The exact steps that were proved

```bash
git clone https://github.com/Derry-Godsent/laundry-app.git
cd laundry-app
git checkout -b app-records-pages
# fetch the patch from the mobile app repository
gh api repos/Derry-Godsent/chapman-prestige-mobile/contents/docs/staff-web-app/app-records-pages.patch \
  --jq '.content' | base64 -d > app-records-pages.patch
git apply app-records-pages.patch
npm install
npx tsc -b          # must print nothing
npx vite build      # must reach "built in"
git add -A
git commit -m "feat: read the app's records in the staff system"
git push -u origin app-records-pages
gh pr create --base master --head app-records-pages
```

Then open the pull request and let the user merge it. The staff system deploys
from `master`, so merging is what puts it live.

**Already checked, so do not repeat it needlessly:** the patch applies cleanly to
a fresh clone of `master` at `62a0d93`, and on that fresh clone `npx tsc -b`
passes and `npx vite build` succeeds. The user's own checkout is what should be
verified before merging.

**Lint, so you do not chase ghosts:** `npm run lint` reports 27 pre-existing
errors and 10 warnings across the repository, most of them the
`@ts-ignore` ban on lines that predate this work. Do not fix those. Just make sure
nothing you add makes the number worse.

---

## The database statements the pages need

`docs/staff-app-pages.sql` in the mobile app repository. Two statements, in plain
English: admins and managers may open the three new pages (six `role_permissions`
rows), and one empty box where a decline reason is written
(`quote_requests.declined_reason`). It was run against a real Postgres engine
before being handed over: the six rows appear, the column appears, existing
records are untouched, and a second run changes nothing.

Give the user that file as one paste, with the explanation already written in the
file's comments. Never hand over SQL that has not been run in an engine first.

**If Service Requests opens and shows an empty list** even though requests exist,
the two staff rules in `docs/security-fix.sql`, section 4, have not been run in
that project yet. The page says so on screen. That is the fix.

---

## Facts about the staff repository worth knowing

- React 18, Vite 5, TypeScript strict, React Router 6, `@supabase/supabase-js`.
  Styling is hand written CSS plus inline style objects, no Tailwind in pages.
- `src/lib/supabaseClient.js` exports an untyped client, described by
  `supabaseClient.d.ts` as `any`. That is why older files carry `// @ts-ignore`
  above the import. New files do not need it, and leaving it out keeps them clean
  under the project's lint rules.
- The permission system: `usePermission(path)` reads `staff.role`, then
  `role_permissions` for that role and page key, and caches for five minutes.
  `PermissionGuard` wraps a page and shows "access denied" or a view-only banner.
  A new page needs a row in `role_permissions` and an entry in the
  `PATH_TO_PERMISSION` map, or the menu hides it.
- Realtime: pages subscribe with `supabase.channel(...)` and
  `postgres_changes`. That requires the table to be in the publication, which
  migrations `20260827_006` sets up for the mobile request tables.
- The laundry queue is `src/pages/MobileRequests.tsx` and it works in production.
  Treat it as the reference for how a queue page should behave.

## Facts about the shared database worth knowing

- Production is the truth, not the committed migrations. Where a committed copy is
  stale, believe what the running system does and do not "fix" it toward the file.
- `public.is_chapman_staff()` decides staff access in the row level security rules.
- The app signs customers in with a phone code through Supabase auth, and their
  account row is `customer_accounts`, matched to `clients` by normalised phone.

---

## What the user has agreed, in his words

- Beta is internal: his boss and staff. Work the mobile app and this staff app
  first, the public website last.
- Every financial decision goes through Chapman. Nothing pays a worker directly.
- Chat routes by role, not by a named person: Admin is the user, CEO is his boss,
  and "Contact Chapman Prestige Limited" reaches every other staff member.
- Workers are found and vetted by Chapman, customers see a profile and choose,
  Chapman agrees the job and the money, then releases the worker.
- Payments are on hold until he and his boss decide the route.

The full running plan, phase by phase, is in the mobile app repository:
`docs/ROADMAP.md`. Read it before starting anything new, and keep it up to date
from whichever side you change.

## How he likes work explained

Plain words, short sentences, no em dashes, no icons in user facing text. One
file, one statement, one grid per ask. Explain a database change in plain English
before asking him to paste it. Say what is not done as clearly as what is. He runs
a real business, so tie every change to what it means for the office.
