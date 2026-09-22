# Proof that the database files work

**What this is.** Before I hand you a file to run against your live database, I run it
here first, against a working copy of your database, and check that it does what it
says.

**Why it exists.** Twice now a file I gave you has been damaged by the way it was saved,
and you found out by running it and getting an error. That is my mistake to prevent, not
yours to discover. This catches that class of damage before you ever see it.

**What it builds.** A small Postgres database inside Node, matching your live database as
closely as I can make it: the same table names, the same column names and types from your
own report, the same access rules, the same functions, including the laundry booking
function and the customer's date reply function, and the same locked and unlocked state.
No customer data ever goes in it, only made-up rows carrying the same counts as your
grid: 8 laundry requests, 8 cleaning enquiries, 36 price list rows, 4 routines, 3 staff.

**How to run it.** Only a developer needs to do this.

```
mkdir -p /tmp/pg && cd /tmp/pg
npm init -y && npm install @electric-sql/pglite
cp /path/to/docs/database-proof/run.mjs .
CHAPMAN_DOCS=/path/to/docs node run.mjs
```

**What it checks, in order:**

| Step | Check |
| --- | --- |
| 0 | The old damaged shape of the check file is rejected, reproducing the error you saw |
| 1 | The rebuilt check file runs end to end and returns one grid |
| 2 | A stranger with no login can read 8 laundry requests, 4 routines, 8 enquiries, and your 36 prices |
| 3 | The security fix runs with no errors |
| 4 | Protection is on for every table, and no cleaning enquiry rule lets everyone through |
| 5 | A stranger sees 0 customer rows, guests can still browse prices, a signed in person who is not staff gets no staff powers |
| 6 | Your app still works: book laundry, save and delete a routine, ask for fumigation, staff offer a date, the customer accept it, the customer answer a laundry date offer |
| 7 | One customer cannot read another's routines or change another's enquiry, no customer can change your prices, and no customer can give themselves staff powers |
| 8 | The undo, copied straight out of the file, returns the database to exactly today's state |
| 9 | Both files contain no odd characters and no line ends in a comma, which is what made the earlier error possible |

**Last run against the real live structure: every check passed.**

**The one honest limit.** This proves the files are correct against a faithful copy of
your database. It cannot prove your live database has nothing unusual in it, which is
exactly why the check file exists and why you run it first.
