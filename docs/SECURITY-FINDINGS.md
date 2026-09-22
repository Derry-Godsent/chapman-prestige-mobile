# Security Findings, In Plain Language

**Date:** 20 September 2026
**Status:** Confirmed and proven. Fix written, tested, and verified on a replica of
your database. **Nothing has been changed yet, the fix is waiting for your approval.**

---

## 1. What the check found

Six tables in your database are open to strangers, five because their protection is
switched off and one because its rules let everyone through. The key that lets the app
talk to your database is built into the app itself, so anyone who extracts it can read
and change these tables **with no password and no sign-in.**

| Table | What it holds | Protection | Who can reach it |
| --- | --- | --- | --- |
| `mobile_requests` | **7 live laundry requests**, pickup address, **GPS coordinates**, items, notes | **OFF** (3 correct rules sit disabled) | Anyone |
| `routines` | **4 saved customer routines** | **OFF**, no rules | Anyone, read, edit, delete |
| `quote_requests` | **4 live cleaning enquiries**, property, preference, details | **ON**, but 2 of 5 rules say `true` for everyone | Anyone |
| `laundry_items` | **Your 36-item price list** | **OFF**, no rules | Anyone, **including changing prices** |
| `orders` | Order records (currently empty) | **OFF** | Anyone, read or write |
| `order_items` | Line items (currently empty) | **OFF** | Anyone, read or write |

### What this meant in practice, measured, not assumed

A replica of your database was built and four kinds of user were simulated.
**Before the fix, the result was:**

| Simulated user | Prices | Enquiries | Routines | Laundry requests | Orders |
| --- | --- | --- | --- | --- | --- |
| **A stranger, not signed in at all** | 2 | **2** | **2** | **2** | **1** |
| A customer | 2 | 2 | 2 | 2 | 1 |
| A different customer | 2 | 2 | 2 | 2 | 1 |
| Your staff | 2 | 2 | 2 | 2 | 1 |
| **A banned staff member** | 2 | **2** | **2** | **2** | **1** |

Every one of them saw **everything**. A stranger with no login could read every
customer's home address, every GPS pickup point, and every cleaning enquiry.

### The most concrete symptom

Your app's Bookings screen asks for laundry requests **without filtering by customer**.
relying on the database to do the filtering. Because the filtering was switched off, it
returned *every* customer's requests. That is why this matters beyond theory: **the
Bookings tab has been showing customers each other's requests.** Switching protection
on corrects it automatically.

---

## 2. Two things I got wrong earlier, corrected

1. **I wrote in the audit that your laundry tables were "done right".** That was
 wrong. I trusted the migration files instead of checking the live database. The
 rules were written correctly; the step that switches them on was never applied.

2. **My first version of the fix would have failed on your database.** Your
 `routines.client_id` column is **text**, while a login id is **uuid**. PostgreSQL
 refuses to compare those two directly:

 ```
 ERROR: operator does not exist: text = uuid
 ```

 Building the replica caught this. The fix now casts explicitly, and it has been run
 end to end against your real column types.

---

## 3. Good news from the same check

- **Your staff logins are healthy:** 3 accounts, **0 missing a login**. The main risk
 of tightening security, locking your own team out, does not apply. DONE
- **Every helper function the fix needs already exists.** DONE
- **Your laundry pricing is correct in production.** The live booking function
 **reads the `laundry_items` table by UUID** and contains **no hardcoded list**. This
 resolves the biggest audit finding: the app is right and the version of that function
 committed to `laundry-app` is **stale and wrong**. Git must be corrected to match
 production, not the other way round. DONE
- `services`, `clients`, `staff`, `customer_accounts`, and the audit tables are all
 correctly protected. DONE

### One correction to a number I gave you

The "rows" figures in section 1 of the check are PostgreSQL's *estimates* and are stale.
It reported `staff` as 0 rows while simultaneously counting 3 staff accounts. Treat the
`protection ON/OFF` column as exact and the row estimates as unreliable.

---

## 4. The fix, and the proof it works

`security-fix.sql` switches protection on for the five unprotected tables and replaces
the two open `quote_requests` rules with a real staff check.

**It changes no data.** Not one row, column, table, or function. It changes only *who is
allowed to see what*, inside a single transaction. There is an undo at the bottom.

### Verified end to end

Applied to the replica, then re-tested:

| Simulated user | Prices | Enquiries | Routines | Laundry requests | Orders |
| --- | --- | --- | --- | --- | --- |
| **Stranger** (no login) | 2 | **0** | **0** | **0** | **0** |
| The customer | 2 | 1 (own) | 1 (own) | 1 (own) | 1 (own) |
| A different customer | 2 | 1 (own) | 1 (own) | 1 (own) | 0 |
| **Your staff** | 2 | **2** | **2** | **2** | **1** |
| **Banned staff** | 2 | **0** | **0** | **0** | **0** |

### Individual guarantees, each tested

| Test | Result |
| --- | --- |
| Customer reads their own laundry requests | 1 DONE |
| Customer reads another customer's requests | **0** DONE |
| Customer reads another customer's enquiries | **0** DONE |
| Customer sends an enquiry (the app's main action) | succeeds DONE |
| Customer writes an enquiry **forged** for someone else | **blocked** DONE |
| Customer saves their own routine | succeeds DONE |
| Customer writes a routine into someone else's account | **blocked** DONE |
| Customer accepts a staff-proposed date | succeeds DONE |
| Stranger reads all requests | **0** DONE |
| Stranger deletes laundry requests | **0 rows affected** DONE |
| Stranger changes your prices | **0 rows affected** DONE |
| Customer changes your prices | **0 rows affected** DONE |
| Staff read all requests and enquiries | full access DONE |
| Staff change prices | full access DONE |
| Undo restores the exact current state | verified DONE |
| Row counts before vs after | unchanged DONE |

**Nothing the app does today stops working.** Every action the customer app performs was
re-tested after the fix and still succeeds.

---

## 5. What to do

| Step | Action |
| --- | --- |
| 1 | **Take a backup**, Supabase → Database → Backups |
| 2 | **Read** `security-fix.sql`, ask me anything about it |
| 3 | **Run it** when you are ready |
| 4 | Staff system → log out, log back in |
| 5 | Check the Mobile Requests page still lists the 7 requests |
| 6 | Open the app's Bookings tab, it should now show only your own requests |
| 7 | Submit a test laundry request and confirm it reaches the staff system |

If anything looks wrong, the undo at the bottom of the file restores the current state
within seconds.

---

## 6. Still outstanding after this fix

1. **`laundry-app` migration 008 is wrong.** Production reads UUIDs from the table;
 git has a hardcoded list. Git needs correcting so the database can be rebuilt.
2. **`quote_requests`, `routines`, `laundry_items` have no migration**, we now know
 their exact shapes from the check, so this can be written.
3. **Non-laundry requests are invisible to staff**, no page reads `quote_requests` in
 the staff system. Still the biggest operational gap.
4. **The app should also filter by customer.** Right now it relies entirely on the
 database. Adding the filter in the app is good practice, defence in depth.
5. **Optional hardening:** `anon` currently holds full table privileges on everything.
 Switch-on protection makes that harmless, but revoking unnecessary privileges later
 would be belt and braces.
