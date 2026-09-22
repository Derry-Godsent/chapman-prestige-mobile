# The staff page for app service requests

**What this is.** The mobile app lets a customer ask for Deep Cleaning, Fumigation,
Detailing, Polytank Cleaning or Contract Cleaning. Those requests go into your
database and, until now, **no staff screen read them**, so nobody could answer them.
This is the page that shows them, and lets your team offer a date that the customer
accepts or rejects in the app.

**Where it goes.** The staff system is a separate project (`laundry-app`), so these
files cannot be committed from the mobile app repository. Everything needed is in
this folder. Applying it takes about five minutes.

---

## What is in this folder

| File | What it is |
| --- | --- |
| `ServiceRequests.tsx` | The new page. Drop it into the staff project's `src/pages/` folder |
| `ServiceRequests.css` | Its styling. Same folder |
| `wiring.patch` | The three tiny edits that make the page reachable, as a patch |
| `useIntakeCounts.ts` | Counts for the side menu. Goes in `src/hooks/` |
| `useIntakeNotifications.ts` | The live alerts for the bell. Also `src/hooks/` |
| `counts-and-alerts.patch` | The edits that put numbers on the menu and real alerts in the bell |

**I compiled this against the real staff project before handing it over.** It passed
the TypeScript check and the production build, so it is not guesswork. What I could
not do is click through it, because I have no way to run your staff system signed in
as a staff member.

---

## Step 1: the two files

Copy both files into the staff project:

```
laundry-app/src/pages/ServiceRequests.tsx
laundry-app/src/pages/ServiceRequests.css
```

## Step 2: the three small edits

They are listed here in plain words. The patch file contains the same three changes.

**a. Add the page to the routes.** In `src/router.tsx`

Find:
```
import { MobileRequests } from "./pages/MobileRequests";
```
Add below it:
```
import { ServiceRequests } from "./pages/ServiceRequests";
```

Find:
```
      { path: "mobile-requests", element: <MobileRequests /> },
```
Add below it:
```
      { path: "service-requests", element: <ServiceRequests /> },
```

**b. Add it to the side menu.** In `src/components/sidebar/Sidebar.tsx`

Find the line that ends with:
```
  Printer, LogOut, X, BarChart3, Inbox
} from "lucide-react";
```
Change it to:
```
  Printer, LogOut, X, BarChart3, Inbox, Sparkles
} from "lucide-react";
```

Find:
```
    { icon: Inbox, label: "Mobile Requests", path: "/mobile-requests", pageKey: "mobile-requests" },
```
Add below it:
```
    { icon: Sparkles, label: "Service Requests", path: "/service-requests", pageKey: "service-requests" },
```

**c. Let the permission system know about it.** In `src/hooks/usePermission.ts`

Find:
```
  "/mobile-requests": "mobile-requests",
```
Add below it:
```
  "/service-requests": "service-requests",
```

## Step 2b: numbers on the menu, and real alerts

Two more small file copies, plus the patch.

**Copies:**

```
laundry-app/src/hooks/useIntakeCounts.ts
laundry-app/src/hooks/useIntakeNotifications.ts
```

**Then apply `counts-and-alerts.patch`,** which makes three small changes:

| File | Change |
| --- | --- |
| `src/components/sidebar/Sidebar.tsx` | The menu numbers now come from the counts hook instead of the one order count, and every record page shows its own number |
| `src/components/sidebar/NavItem.tsx` | The number now explains itself when the office hovers it, for example "8 waiting for Chapman to act" |
| `src/components/topbar/Topbar.tsx` | The bell now listens to the two intake tables. The old listener watched orders filtered by a client id, which a staff member never has, so the bell silently delivered nothing |

If you would rather make those three edits by hand, say so and I will write them out line
by line.

### What the numbers mean

| Menu entry | The number means |
| --- | --- |
| Orders | Every order in the system |
| Mobile Requests | Laundry requests still waiting for Chapman to act |
| Service Requests | Cleaning and service enquiries that need a date from Chapman |
| Staff | Staff records |
| Clients | Client records |

Every number updates by itself the moment a customer sends something or the office changes
something. Nothing needs refreshing.

### What the alerts mean

The bell now tells the office, as it happens:

- a customer sent a laundry request
- a customer asked for cleaning, fumigation, detailing, polytank, or contract work
- a customer accepted or rejected a date Chapman offered

Clicking an alert opens the queue it belongs to, and the count is what is new since that
staff member last looked, so it means something. It is kept per staff member in that
browser.

---

## Step 3: two database statements, one each

**Statement one, the permission row.** Without it the page will not appear in the menu
even though the code is there. Your staff system decides which pages each role may see
by looking in a table called `role_permissions`, and there is no row for this new page
yet.

**In plain English:** "Admins and managers may see and use the Service Requests page."

```sql
insert into public.role_permissions (role, page, can_view, can_edit)
values
  ('admin', 'service-requests', true, true),
  ('manager', 'service-requests', true, true)
on conflict (role, page) do update
set can_view = excluded.can_view,
    can_edit = excluded.can_edit;
```

**Statement two, the decline reason.** Without it the page still works, but the decline
button will say the reason box is missing. This adds one empty box where your team writes
one short line explaining why a request cannot be taken.

**In plain English:** "Add a place to write why Chapman cannot take this cleaning
request." It adds one empty box, touches no data, and is safe to run twice.

```sql
alter table public.quote_requests add column if not exists declined_reason text;
```

Both statements are also saved in `docs/decline-with-reason.sql` in the mobile app
project, with the full explanation and the undo.

---

## What your team can do on the page

| Area | What it does |
| --- | --- |
| Five views across the top | Needs a date, With the customer, Accepted, Wants another date, Not taken, each with a count |
| The list | Every request from the app, newest first, with the customer's name where it can be read |
| The detail panel | What the customer chose: property, preference, their preferred date, the measured area, the areas they picked, and anything they flagged as a concern |
| Offer a date | Sends a date to the customer. They accept or reject it in the app, and the answer appears here within seconds |
| Decline with a reason | Tells the customer Chapman cannot take the request, and why. Three ready made reasons, or write your own line. The customer reads exactly that line in the app |
| Live updates | New requests and customer replies appear without refreshing, the same way the laundry page works |

**What it deliberately does not do:** it does not create an order. Creating the job in
your Orders section stays a deliberate step, exactly as it is for laundry requests.

**A declined request can be taken back.** If the customer sends another request or calls
in, offering a date from the Not taken view puts it back in their hands with a new date
to accept. What the customer was told stays in their history, so nothing is rewritten.

---

## After it is applied

Check these four things and tell me what you see:

1. **Service Requests appears in the side menu** for an admin or manager.
2. **The requests from the app are listed.** There should be 8 cleaning enquiries
   already in your database.
3. **Offer a date on one of them**, then open the app on that customer's account. The
   app should show the date with an accept or reject choice.
4. **Decline one of them with a reason**, then open that customer's app. Their tracking
   page should show "Chapman cannot take this request" with your reason under it.
