# What the emails mean, and what to do about each one

Three emails arrived. Two are from Supabase, one is from Vercel. None of them is
a fire in the sense of data already stolen. One of them is a real door left open,
one is a change coming in October, and one is about the website's build.

Here is each, in plain words, with what I have done and what only you can do.

---

## Email 1. Supabase: new tables will need permission from 30 October

**What it says.** Today, when a new table is created in your database, Supabase
automatically lets the app reach it. From 30 October that stops. A new table
arrives unreachable until somebody writes the permission on purpose. Their email
also gives the three permission lines to add.

**Is it dangerous to ignore?** No, but it is annoying: a table created after
30 October would just not work, with a "permission denied" message, and the cause
is not obvious.

**What I did.**

- Every table we are adding already carries its own permissions inside the same
  file that creates it, exactly as they asked:
  - `docs/customers-birthdays-and-ideas.sql` grants its tables, to the guest, the
    signed-in customer, and the office role.
  - `docs/daily-messages.sql` does the same.
- `docs/security-lock-everything.sql` goes further and withdraws the automatic
  permission for brand new tables, so a new table cannot be reached at all until
  somebody says who may reach it. That is their change, applied early, so nothing
  in October can surprise us.
- It also installs a rule on the database itself: any table created in future gets
  its lock switched on in the same breath it is created, even if somebody forgets
  the permission step.

**What only you can do:** nothing, beyond running the one file. It is proved
against a copy of your database, including that a brand new table now arrives
locked.

---

## Email 2. Supabase: critical, table publicly accessible

**What it says.** Two tables in your database have row level security switched
off, which means anyone with your project address can read, change, and delete
everything in them. Supabase's advisor found them and will keep saying so until
they are closed.

**Is it dangerous to ignore?** Yes. This is the one email in the list that matters.
The earlier fix covered the five tables your own check found. This email tells us
the advisor still sees two, which means either the fix was not pasted on this
project, or there are tables the check did not list. Either way the answer is the
same file.

**What I did.** I wrote `docs/security-lock-everything.sql`, one paste:

1. It finds every table in your database that still has its lock off, switches the
   lock on, and gives each of them one rule: only Chapman staff may touch it. It
   does not touch your existing rules for customers.
2. It withdraws the automatic permission for new tables (email 1, applied early).
3. It installs the rule that locks new tables automatically.
4. It writes down every table it locked, so the undo is exact and nothing is
   guesswork.

**What I proved here, on a copy of your database, before giving it to you:**

- Everything with the lock off is now locked: the grid reads 0.
- A stranger with no login sees nothing: requests 0, routines 0, enquiries 0,
  orders 0, clients 0, customer records 0, ideas 0, and the log refuses the request
  altogether.
- Your guests can still browse the 36 laundry prices, which is deliberate.
- The customer still sees their own 4 requests, 2 routines, 8 enquiries, and can
  still send an idea.
- The office still sees all 8 requests and the client list.
- A table created afterwards arrives locked, and a stranger is refused.
- Running the file twice changes nothing, and the undo puts everything back.

**What only you can do:**

1. Take the backup first: Supabase, then Database, then Backups. One click.
2. Paste the whole file into the SQL editor and run it.
3. Check the grid it returns. The line "tables still unlocked" must read 0.
4. Open the advisor page and reload it. Both critical warnings should be gone.
5. If a staff screen ever comes up empty afterwards, send me the table name and I
   will write the one rule it needs. Nothing is destroyed by this file, so a rule
   can always be added back.

---

## Email 3. Vercel: the website must move to Node 24

**What it says.** After 1 October, builds using Node 20 will fail. Your website
project deploys with Node 20.

**Is it dangerous to ignore?** Not to your data, but your website would stop
deploying after 1 October. The fix takes one line.

**What I found.** Your website's `package.json` pins the version itself:

```
"engines": { "node": "20.x", "npm": ">=10" }
```

Vercel's email says exactly this is the case that the dashboard click cannot fix:
a version set in the file overrides the dashboard. So the line has to change to
24.

**What I could not do.** My access works on the mobile app repository, not on the
website repository, so I cannot change that line for you. The good news is that
GitHub lets you change it in the browser in about thirty seconds.

**Do this, exactly:**

1. Open the website repository on GitHub.
2. Open the file `package.json`.
3. Press the pencil button, "Edit this file".
4. On the line that reads `"node": "20.x",` change `20.x` to `24.x`. Nothing else,
   and do not touch the commas around it.
5. Scroll down, press "Commit changes", and choose to commit straight to the main
   branch.

**What happens next.** Vercel notices the change and builds the website again, this
time on Node 24. When that build finishes green, the October deadline is behind
you. If the build fails, paste the message to me and I will read it.

**If you would rather not touch it:** tell me, and I will ask for write access to
the website repository so the same one-line change can be made from here.

---

## The wider question: is the backend "100% secure and impenetrable"?

I will not tell you yes, because nobody can honestly tell you that about any
system. What I can tell you is exactly where the walls are, and what is left.

**Where the walls are, today:**

| Layer | State |
| --- | --- |
| Who may read which row | Decided by the database itself, per table, per person. Proved here on a copy of your database, not claimed |
| The app's key | Only the publishable key ships. It is designed to be public and gives away nothing on its own |
| The office key | The service role key lives in Supabase only. It is never put in the app, never in the repository, never in a chat |
| Staff powers | A staff flag checked inside the database. A customer cannot give themselves staff powers, proved |
| One customer seeing another's data | Refused, proved for requests, routines, enquiries, decline reasons, and ideas |
| Sign in | A one-time code to the person's own phone. Wrong-code limits and the 4 digit PIN rules are in place |
| Location | Only while the app is open, only when the person taps, never in the background |

**What is left to close, honestly:**

1. **The two pastes** (this email and the daily messages one). Until they are run,
   the advisor keeps warning.
2. **Your own accounts are part of the wall.** If someone gets into your Supabase,
   GitHub, or Vercel login, they do not need to break the database at all. Turn on
   two-step verification on all three. That is the single highest-value thing left
   to do, and it is free.
3. **Rotate anything that was ever copied into a chat or an email.** The publishable
   key is fine, it is public by design. An Arkesel key, an SMS hook secret, or a
   database password would not be, and rotating one is a two minute job in the
   dashboard.
4. **Backups.** Confirm the Supabase backup schedule is on, and that you can see a
   recent backup. Security is also about getting your data back.
5. **Payment integration, when we come to it.** Card details will never touch our
   database. The money side will run through a provider such as Paystack or Flutterwave,
   and what we store is a reference and a status, nothing more. That keeps the
   riskiest data out of the system entirely. When you are ready, that is the next
   proper piece of work, and it needs a merchant account in Chapman's name.

**The honest summary:** the database walls can be proved, and they are. The two
files close what the advisor is complaining about. After that, the weakest point
is not the code, it is the passwords on the accounts that control it, which is why
two-step verification is on the list above.
