# The staff side of the app's records

**What this is.** The mobile app has been writing three kinds of record that no
staff screen read, so work your customers did landed nowhere:

| What the customer did in the app | Where it went | Who saw it |
| --- | --- | --- |
| Asked for cleaning, fumigation, detailing, polytank or contract work | `quote_requests` | Nobody |
| Sent an idea for the app | `chapman_app_ideas` | Nobody |
| Signed in, set a PIN, gave up a PIN | `chapman_app_security_events` | Nobody |

This change gives the staff system the pages that show them, and it connects the
numbers on the side menu and the bell to records that actually exist.

**Where it goes.** The staff system is a separate project, `laundry-app`. My
GitHub connection in this sandbox can read that repository but not write to it,
so I cannot push the branch myself. Everything needed is here, and it is already
compiled and built against the real staff project.

---

## What is in this folder

| File | What it is |
| --- | --- |
| `app-records-pages.patch` | The whole change, as one patch. Fourteen files: three new pages with their styling, two new hooks, and six small edits |
| `vite.preview.config.ts` | The config used to preview the staff app locally while building this |

The two database statements the pages need live one folder up, in
`docs/staff-app-pages.sql`, and they have been run against a real Postgres engine
to prove they work and are safe to run twice.

---

## What it does

**Service Requests** (`/service-requests`). Every cleaning, fumigation,
detailing, polytank and contract enquiry sent from the app. The list shows the
customer's name where it can be read, the property, the preference, the measured
area, the areas they picked and any concerns they flagged. The office can offer a
date, which the customer accepts or rejects in the app, or decline with one short
line that the customer reads. A declined request can be taken back later.

**App Ideas** (`/app-ideas`). Every idea sent from the app, with the sender's name
and number, and a way to move it along: new, reading, planned, done, not doing.

**App Accounts** (`/app-accounts`). Who has signed into the app, with every
security moment on their account: a sign-in, a PIN set, a PIN removed, a PIN used
up. The four digits are never stored anywhere, here or on the phone's own record,
and the page says so.

**The side menu** now shows a number beside Orders, Mobile Requests, Service
Requests, App Ideas, App Accounts, Staff and Clients, and each number explains
itself when hovered. **The bell** now listens to real records. The old bell
watched orders filtered by a client id, which a staff member never has, so it
silently delivered nothing.

Each page says plainly, on screen, when the table or the rule it needs has not
been created in the project yet, instead of showing an empty list as though there
were nothing to see.

---

## Getting it in, two ways

**Way one, and I would prefer it: let me do it.** The GitHub connection this
sandbox uses can read `laundry-app` but not write to it. Reconnecting GitHub in
Arena with access to that repository means I push the branch and open the pull
request myself, for every staff change from here on. Chat and the workers pages
both need staff-side work, so this is worth doing once.

**Way two, by hand.** One block, in a folder where you keep projects. It clones
the staff system, applies the patch, checks it, and pushes a branch you can merge:

```bash
git clone https://github.com/Derry-Godsent/laundry-app.git
cd laundry-app
git checkout -b app-records-pages
git apply /path/to/chapman-prestige-mobile/docs/staff-web-app/app-records-pages.patch
npm install
npx tsc -b
git add -A
git commit -m "feat: read the app's records in the staff system"
git push -u origin app-records-pages
```

Then open the pull request GitHub offers you and merge it. The staff system
deploys from the branch it already deploys from, so merging is what puts it live.

---

## The one database paste

Run `docs/staff-app-pages.sql` once in Supabase, SQL Editor, Run. Two statements:
six menu rows so admins and managers may open the new pages, and one empty box
where a decline reason is written. Safe to run twice.

If Service Requests opens and shows an empty list even though requests exist, the
two staff rules in `docs/security-fix.sql`, section 4, have not been run in this
project yet. The page says so on screen. Running that file once is the fix.

---

## What to check afterwards

1. Three new entries in the staff side menu: **Service Requests**, **App Ideas**,
   **App Accounts**, with numbers beside them.
2. **Service Requests** lists the cleaning enquiries already sent from the app.
3. **App Ideas** lists any idea already sent, and moving one changes its label.
4. **App Accounts** lists app customers, and opening one shows their sign-ins and
   PIN moments.

---

## The honest limits

I compiled and built this against the real staff project: the TypeScript check
passes and the production build succeeds, both in my working copy and again after
applying the patch to a fresh clone of `master`. What I could not do is sign in
to your staff system and click through the pages, because this sandbox has no
route to Supabase. So the checks above are yours, and if anything reacts oddly,
tell me what you see and I will fix it.
