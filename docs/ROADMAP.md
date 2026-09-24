# Chapman Prestige, The Plan

**This is the only document you need to read.** Everything else in `docs/` is
background you can ignore unless you want the detail.

Last updated: 21 September 2026

---

## What happened, in three sentences

You asked me to audit the app and confirm it runs. It does run, I proved that. But
while checking it, I found that several parts of your database are open to the public
internet, and I went straight into fixing that without stopping to explain the journey
to you. That was my mistake. This document fixes it.

---

## Where we are, the dashboard

| # | Phase | What it means for you | Status |
| --- | --- | --- | --- |
| 1 | **Understand what you have** | An audit of the app, the staff system, and the website | DONE **Done** |
| 2 | **Clean up the app code** | Removed dead scaffolding, fixed broken checks | DONE **Done, but not sent to you yet** |
| 2b | **Ask only for your own data** | Every screen now asks for the signed-in customer's records | DONE **Done, you can test it now** |
| 2c | **Two screens you asked me to improve** | Bookings in date order with a time on each, and a way off the tracking page | DONE **Done, you can test it now** |
| 2d | **The tracking page told you things that were not true** | A cleaning request could be shown as approved and labelled laundry | DONE **Done, you can test it now** |
| 2e | **The 4 digit app PIN** | One text message, then a PIN on that phone | DONE **Running. Offer after sign-in now built** |
| 2f | **Automatic measuring (AR and LiDAR)** | The honest answer is below, including what it cannot do | DECIDED **You chose the half that works on every phone** |
| 3 | **Close the security holes** | Your customer data was readable by strangers | DONE **Fix run on 22 September. Four quick checks left, below** |
| 4 | **Let staff see every request** | Cleaning and fumigation requests currently reach nobody | BUILD **Page, decline with reason, and live preview ready. Needs 5 minutes from you** |
| 5 | **Write down the database** | Parts of your database can't be rebuilt if lost | TODO Not started |
| 6 | **Connect the website** | It's currently not connected to anything | TODO Waiting on your decision |
| 7 | **Same features on the web** | Every app feature visible and usable in the browser | STARTED **Customer side already works, staff page written** |
| 8 | **No more placeholders** | Every screen real, every tap does something | STARTED **First batch done: loyalty, updates, history, settings** |
| 9 | **The office sees its work arrive** | Counts on the staff menu and live alerts | STARTED **Built and running in the preview** |
| 10 | **What you found on the phone** | Crash, daily updates, PIN, dark mode, permissions, routines | DONE **All seven** |
| 11 | **Daily messages, dark colours, live area** | Chapman writes the messages, each service coloured, honest location | DONE **Waiting on one SQL** |
| 12 | **Signing back in, birthdays, and the client list** | Returning customers go straight in, optional birthday, app sign-ups appear as clients | DONE **Waiting on one SQL** |
| 13 | **The team page, your ideas, and the bonus box** | Every Chapman person as a bubble you can open, a form for app ideas, a bonus box that explains itself | DONE **Waiting on the same SQL** |
| 14 | **The beta test, boss and staff** | One Android file, one iPhone route, and the checks before anyone installs | READY **The plan is in docs/BETA.md** |
| 15 | **The company logo as the app icon** | The droplet on the Chapman navy, replacing the blue placeholder | DONE **Ready for the next build** |
| 16 | **The two Supabase emails, and the Vercel one** | Every remaining open table closed, new tables closed on arrival, website moved off a dead Node | DONE **One paste and one line from you** |
| 17 | **The dark mode switch, and the PIN after signing in** | The switch now answers at once, and a returning customer is asked for their own PIN | DONE **Ready to test on your phone** |

**Phases 1 and 2 are finished. Phase 3 is the only urgent one. Phase 4 is written and
waiting on five minutes from you. Phases 5 to 7 are planned and queued.**

---

## Phase 1, Understand what you have DONE DONE

**What I did:** Read through all three of your products, the mobile app, the staff
operations system (`laundry-app`), and the website (`Chapman-Website`). Checked how
they connect, what's built, and what's missing.

**What I found:**

- Your app is genuinely well built. Design system, booking flows, phone login.
 loyalty, chat, notifications, a lot of solid work.
- The **mobile app and staff system barely talk to each other.** They share a database
 but almost nothing is joined up.
- Non-laundry requests (cleaning, fumigation, detailing, polytank, contract) go into
 the database and **no staff screen reads them.** They sit in a table nobody opens.
- Your website has **no database connection at all.** It's a brochure.
- The app was built from a template that left behind a lot of dead machinery.

**Read the detail:** `docs/audit-2026-09-20.md`

---

## Phase 2b, Make the app ask only for its own data DONE

**What I found while you were testing the app.** Your app was asking the database for
"all laundry requests" and trusting the database to hand back only yours. It worked
that way because the protection is off. So even before the security fix, this was a
bug in the app, and after the security fix it would still have been wrong, just
hidden.

**What I changed, in plain terms:**

| Screen | Before | After |
| --- | --- | --- |
| Bookings list | asked for every customer's requests | asks for yours only |
| A single booking's detail page | anyone who knew a request number could open it | must also be yours, otherwise it appears empty |
| Live status updates | watched everybody's requests for changes | watches yours only |
| Accept or decline a proposed date | would have written to any request number | writes only to your own |

**Nothing looks different.** Same screens, same buttons. The difference is that each
one now asks the right question.

**I also added a guard so this cannot quietly come back.** A test now reads the app's
code and refuses to pass if any screen forgets to say "mine". If a future change
reintroduces the mistake, the check fails immediately instead of leaking data.

**One thing I put back the way it was.** I had trimmed what the app sends when you
book laundry down to just the item and quantity. Then I read your staff Mobile
Requests page and saw it reads the item name from that same list, so I restored the
full list. Submitting a booking behaves exactly as it always has.

---

## Phase 2e, The 4 digit app PIN DONE, offer now built

**You asked for it, so I built it.** Here is exactly what it does.

### How it works

1. Customer signs in once with a text message, as they do today.
2. **The app offers the PIN straight after sign-in**, on the way into the app. One
   screen, two boxes to type the same 4 digits twice. There is a clear way out:
   "Not now, take me to the app". The offer is made once per customer and does not
   nag them again if they skip it.
3. It is also in Profile, under Manage, for anyone who wants it later.
4. From then on, opening the app asks for the 4 digit PIN instead of sending
   another text message.

**Wrong PIN five times and the app gives up on the PIN and asks for a fresh text
message.** That is deliberate. Someone holding a phone that is not theirs gets five
guesses out of ten thousand.

### What I did to keep it safe

| Concern | What I did |
| --- | --- |
| The PIN itself | Never stored. Only a scrambled version plus a random ingredient, so reading the file does not reveal the PIN |
| Where it lives | The phone's own encrypted keychain. It never leaves the phone and is never sent to Chapman |
| Guessing | Five tries, then the PIN is deleted and a text message is required |
| Forgetting it | A "Forgot your PIN?" button that signs out and starts a fresh sign-in |
| Logging out | The PIN is thrown away with the sign-in, so it cannot block the next person on a shared phone |

### What it does and does not fix, plainly

| Situation | Result |
| --- | --- |
| The app on a phone, closed and reopened | **Asks for the PIN, no text message.** This is the main win |
| The published web link on a phone | **Asks for the PIN, no text message** |
| The preview window in our chat | Behaves like the sign-in does. If that window cannot store anything, the PIN is lost with it. The test on the next page settles this |
| The app reinstalled, or a different phone | Text message required. A PIN cannot bring back a sign-in that is gone |
| A customer who never sets a PIN | Unchanged, text message each time |

**So the answer to your credit question is yes on a real phone, and this also cuts
your costs:** a customer who has signed in once and set a PIN no longer costs you a
message each time they open the app.

---

## Phase 2f, Automatic measuring DECIDED, the every-phone half first

**You asked for the camera to work out the sizes so customers who do not know them
still get an accurate quote. I researched it properly. Some of the news is good and
one part is important enough that you should decide before I build anything.**

### What is actually possible, and on which phones

| Method | What the customer does | Which phones can do it |
| --- | --- | --- |
| **Automatic room scan (LiDAR)** | Walks slowly around the room. The app draws the walls, the floor and gives the area | iPhone 12 Pro and every Pro since, plus iPad Pro 2020 and later. **No Android phone has ever had this sensor** |
| **Tap two points (AR)** | Points at two corners, taps each one, the app gives the distance | Most iPhones and many Android phones |
| **Manual (what you have now)** | Types length and width | Every phone, including the cheapest |

**The part you should know before spending money:** the fully automatic experience
you described, where the app detects walls, floors and surfaces by itself, is only
possible on the Pro iPhone range. A standard iPhone and every Android phone cannot
do it, because the hardware is not there. On those phones the app can offer tapping
two points, which is a real help for someone who cannot pace out a room, but it is
not the same thing.

### What it takes to build the AR part

| Requirement | Reality |
| --- | --- |
| A custom build of the app | AR is native code. It cannot run in Expo Go or in our chat preview. The app has to be built and installed from a link, about 15 minutes per build |
| An Apple Developer account | 99 US dollars a year. Apple requires a paid account before a custom build can be installed on a physical iPhone. Android needs nothing |
| A phone to test with | Yours. I cannot test the camera from here at all, so every AR change is built blind until you run it |
| Google ARCore | A free key from Google for the Android side |

### What I recommend, and why

**Do the useful half first, the expensive half second.**

1. **Now, works on every phone.** Make the measuring screen as good as it can be for
   someone who does not know the size: clearer guidance, common room and carpet
   presets, and the photo reaching Chapman's team so a human can confirm the scope.
   Today the photo stays on the phone and nobody at Chapman ever sees it, which is
   why a customer who does not know the size is stuck. This needs no new accounts,
   no cost, and you can see all of it in the preview.
2. **Then, the AR layer**, once you have decided it is worth a development build and
   the yearly Apple fee, and once we know how many of your customers actually carry a
   Pro iPhone.

**My honest opinion:** I would not spend the 99 dollars yet. The automatic scan is a
beautiful feature that only works on the highest priced iPhones, and your customers
in Kumasi are mostly on Android and standard iPhones. The measuring problem they
actually have is "I do not know the size and I cannot get a quote", and sending a
photo to a human fixes that for every single one of them, on the phone they already
own.

### Where this sits

**You chose the first half, and that is what I will build:** better guidance, presets
for common rooms and carpets, and the photo reaching Chapman's team so a human can
confirm the scope. It works on every phone and costs nothing. The AR layer stays on
the ideas list until you decide the yearly Apple fee is worth it.

**Where it sits in the queue.** The web work in Phase 7 is running now, because you
asked for it without interruption. The measuring improvements come straight after it.
Nothing is blocked, and Phase 3, the security fix, is still the only urgent item.

---

## Phase 2d, The tracking page told you things that were not true DONE

**You were right, and the cause was worse than the symptom.**

### What you saw

A cleaning request opened on "your service date is approved", and the page called
itself Laundry & Garment Care, when nothing had been approved and nothing was laundry.

### Why it happened

Two faults stacked on top of each other.

**Fault one: the request was saved under a name that then changed.** When you asked for
a cleaning assessment, the app first made a placeholder record on your phone, called
something like `QTE-0301`, and only afterwards saved it to the database, which gave it
a different, permanent name. The app then walked you to the tracking page using the
placeholder name. By the time the page opened, the placeholder had been replaced by
the permanent name, so the page went looking for a record that no longer existed under
that name.

**Fault two: instead of admitting that, the page guessed.** When it could not find the
request, its last fallback line said "your service date is approved", and its last
fallback title said "Laundry & Garment Care". So a page that had found nothing
confidently described an approved laundry booking.

### What I changed

| What | Before | After |
| --- | --- | --- |
| Saving a cleaning request | Placeholder name first, real name swapped in later | Saved to the database first, then opened under the real name |
| Tracking page with nothing to show | Claimed approval, called it laundry | Says plainly: we could not find this request, with My bookings and Back to home |
| Nothing found | Showed the six step progress list at step one | Hides the progress list and the specialist card, because there is nothing to progress |
| Cleaning requests after reopening the app | Could load before the sign-in had been restored, leaving the list empty | Reload on every sign-in change, so they are there when you open the app |

**A guard check now protects this.** It refuses to pass if the tracking page ever
states an approval for a request it could not find.

### One more thing I found while in there

The accept or decline buttons on a cleaning request wrote to the database using only
the quote number, without confirming the quote belonged to the signed-in customer. I
closed that, and widened the guard so any write by number alone now fails the checks.
This is the same class of problem as the security fix, just found from the app side.

---

## Phase 2c, Two screens you asked me to improve DONE

**What you asked for, and what I did.**

### 1. The track your service page

You were right that "Message Chapman" was the only way off that screen. If you did not
want to message anyone, you were stuck. That screen now offers three choices at the
bottom:

| Button | What it does |
| --- | --- |
| **Message Chapman** (or Make Payment when a date is approved) | Unchanged. This is still the main action. |
| **Back to home** | Goes straight to the home screen, clearing the tracking page behind you |
| **My bookings** | Goes to your bookings list with every request in one place |

Both new buttons are quiet outlined buttons, so the main action still stands out.

### 2. The bookings tab

Two things were wrong and you spotted both.

**The order was wrong.** Your list was really three separate lists stacked on top of
each other, so a booking from this morning could sit below one from last month. Now
every request, every booking and every enquiry goes into one list, and the newest is
always at the top.

**You could not tell when anything happened.** Every card now ends with a plain time
statement, and it stays correct while you look at it:

| How long ago | What the card says |
| --- | --- |
| Under a minute | Requested just now |
| Under an hour | Requested 4 min ago |
| Over an hour | Requested 3 hrs ago |
| Yesterday | Requested yesterday |
| This month | Requested 6 days ago |
| Older than a month | Requested 12 Aug |

Nothing else about the card changed. Same icon, same wording, same price, same
status pill. The only addition is the time line at the bottom.

### Where these sit in the queue

**Neither change touched your database, and neither needed the security fix to be
run first.** They are app changes only. So I made them now rather than parking them
behind the queue.

The security fix itself **still has not been run.** It is ready and waiting for your
two minutes. Nothing I did today changes that, and the app works correctly either
way.

---

## Phase 2, Clean up the app code DONE DONE (not yet visible to you)

**What I did:** Removed the dead template machinery, fixed broken checks, fixed a real
bug.

**What's better now:**

| Before | After |
| --- | --- |
| The app's checks couldn't pass, 1 error, 3 test failures | All pass cleanly |
| A hardcoded test account was baked into two screens | Removed |
| Dead template machinery: a second database, an unused login system, ~5,500 lines | Removed |
| A setting pointed Expo Go at a dead address (**the cause of your "Expo Go won't load" problem**) | Fixed |
| App name, colours, and deep-link scheme were template defaults | Now Chapman Prestige |

**WARNING: You cannot see any of this yet, because I haven't pushed it.** You chose "not
yet" earlier when I asked, but that was before either of us knew this would become
the reason you can't see progress. See "What I need from you" below.

**Nothing about the app looks different.** It's the same app, cleaned underneath. The
one visible difference: the Chat tab no longer offers "Chapman AI" (you asked me to
drop it).

---

## Phase 3, Close the security holes DONE, four checks left

**You ran the fix on 22 September 2026 and the database reported success.**

Before your run I proved it on a working copy of your database, built from your own
report: the same tables, columns, rules, functions and locks. That run is written up in
`docs/database-proof/` and the result is in section 4 of this file.

### What the fix changed

| Drawer | Before | After |
| --- | --- | --- |
| Your 36 item price list | Anyone could read it, and anyone could rewrite your prices | Guests can still read prices, only staff can change them |
| 8 laundry requests with addresses and map points | Anyone could read and change them | A customer reaches only their own, staff reach all |
| 4 saved routines | Anyone could read, change or delete them | A customer reaches only their own, staff can read |
| 8 cleaning enquiries | Protected, but two rules literally said everyone | Two open rules replaced with a proper staff check |
| Orders and order items | Unprotected, empty for now | Protected from the moment your first real order exists |

### The four checks that prove it on your live database

1. **In the staff system, log out and back in.** Old sessions carry old permissions.
2. **Mobile Requests still lists your 8 requests.** This proves your staff keep their access.
3. **In the app, the laundry price list still shows prices** before signing in. This
   proves guests can still browse.
4. **In the app, the Bookings tab shows only your own requests**, and a test request you
   send reaches the staff system. This is the proof that the lock works.

### The undo, if anything looks wrong

At the bottom of `docs/security-fix.sql`, between the two fences, is the undo. It puts
the five drawers back to exactly today's state within seconds. Your data is never touched
either way.

### Two things I checked while reading your report

| Question | Answer |
| --- | --- |
| Does the app read the same field my new staff page writes when a date is offered? | **Yes.** The app reads `details.proposedDate` and the `appointment_response` answer, and that is exactly what the staff page writes. The two sides match |
| Can a request be declined in the app? | **No.** The database has only waiting, accepted, and the customer wanting another date. Declining with a reason would need one new column, and I would explain it plainly first |

---

## Phase 4, Let staff see every request BUILD READY, needs five minutes from you

**The biggest business problem you have.**

Today, if a customer opens your app and asks for Deep Cleaning, Fumigation,
Detailing, Polytank, or Contract Cleaning, the request goes into your database and
**your staff cannot see it.** Your staff system has a page for laundry requests only.

**In plain terms: customers are asking you for services and nobody is answering.**
They will assume you ignored them.

**The page is written and it compiles.** I built it against the real staff project. It
passed the type check and the production build, so it is real code rather than a
sketch. It sits in `docs/staff-web-app/` in this repository, with instructions in
plain words.

**Why it is here and not already done.** The staff system is a **separate project**
(`laundry-app`). This session is locked to the mobile app repository, so I cannot
commit into that one. The folder holds the page, its styling, and the three small
edits, each written out in words you can follow.

**What the page does:**

| Area | What it does |
| --- | --- |
| Four views across the top | Needs a date, With the customer, Accepted, Wants another date |
| The list | Every app request, newest first, with the customer's name |
| The detail panel | Property, preference, their preferred date, measured area, areas chosen, concerns |
| Offer a date | Sends a date the customer accepts or rejects in the app, which closes the loop |
| Live updates | New requests and customer replies appear without refreshing |

**What it needs from you:** about five minutes to copy two files and make three small
edits, plus one database statement that lets admins and managers see the page. That
statement is explained in plain English in the folder.

**Declining with a reason is built, because you asked for it.** The page has a "Decline
with reason" action: three ready made reasons or your own line, and the customer reads
exactly that line in the app, under "Chapman cannot take this request". A declined
request can be taken back later by offering a date, and what the customer was told stays
in their history.

It needs one database statement, explained in plain English in
`docs/decline-with-reason.sql`: it adds one empty box where the reason is written. No
data is touched, and it is safe to run twice. I ran it against the working copy of your
database and watched the whole round trip: the office declines, the customer reads that
exact sentence, and no other customer can see it.

**One honest limitation:** I could not click through the page myself, because I cannot
sign into your staff system. It compiles, and it follows the same pattern as your
existing laundry page, but the first real test is yours.

---

## Phase 5, Write down the database TODO

Three parts of your database exist **only inside Supabase's website.** They aren't
written into your project anywhere:

- your laundry price list (36 items)
- customers' saved routines
- cleaning-quote requests

**Why it matters:** if Supabase were ever lost, or you wanted a practice copy to test
on safely, these would be missing and nobody could rebuild them.

**What I'll do:** Write them into your project as proper records. Safe and additive, it changes nothing in production.

**Also:** your project contains an outdated copy of the laundry pricing rule that
doesn't match what's actually running. Confirmed: **production is correct, the project
file is stale.** I'll correct the file to match reality.

---

## Phase 6, Connect the website TODO

Right now `Chapman-Website` has **no database connection at all.** It's a brochure.

**You need to decide which you want:**

| Option | What it means |
| --- | --- |
| **Enquiries only** | A contact form that stores leads and alerts your team. Small job. |
| **Full booking** | A website booking and an app booking become the same record. Bigger job. |

No rush, Phases 3, 4 and 5 matter more.

---

## Phase 7, The same features on the web STARTED

### Found and fixed while checking the web build

**The web app was silently swallowing messages.** On a phone, the app shows a pop up
message for things like "Chapman does not operate on Sundays, please pick another day",
"please turn on your GPS", and a note explaining what to type in the address box. On the
web, that kind of message does nothing at all. A customer picks a Sunday, taps the
button, and nothing happens with no explanation.

I checked all six of these messages, in the address box, the pickup point, the date
picker and the PIN lock screen, and they now appear in a browser as well. The phone
behaviour is untouched.

**One honest limit:** in our chat preview, the browser may still refuse to show these
pop ups, because the preview runs inside a frame that is allowed to block them. On your
published web address they will behave normally. If you pick a Sunday in the preview and
see nothing, that is the frame, not the app.

**What you asked for:** every feature in the phone app should be visible and usable in
the web app, and you said to start now and finish it.

**Here is my reading of it, so we are talking about the same thing. Correct me if it is
wrong and I will change course.** You have two web addresses, not one:

| Address | What it is | Who signs in |
| --- | --- | --- |
| The customer web app | The same app as the phone app, opened in a browser. It is the phone app itself, running on the web | Customers, with the same text message sign-in and the same PIN |
| The staff system | What your team uses in the office | Staff |

**So I am treating your instruction as two halves:**

| Half | What it means | Where it stands |
| --- | --- | --- |
| The customer side | Every screen the customer has on the phone must work in a browser: booking, tracking, quotes, laundry, the PIN. **This already works by design**, because it is one codebase. It needs checking and fixing, browser by browser, not rebuilding | Verified by the build, real checking next |
| The staff side | Your team must be able to see and act on everything the app produces. Their system only shows laundry requests. Cleaning, fumigation, detailing, polytank and contract requests reach nobody | **The page is written and compiled**, see Phase 4 |

**Phase 4 above is the first delivery of this phase.** It is the one that loses you
business today, which is why I did it first.

**What I will do next, in order:**

1. Walk every customer screen on the web build and list anything that does not work in
   a browser, then fix what breaks.
2. Make sure a customer who starts something in the web app can finish it in the phone
   app, and the other way around. Same account, same requests.
3. Keep adding staff visibility for whatever else the app starts sending.

**The staff system now runs in our chat, so you can see it.** You told me you could not
see changes because the staff system is not published, so I opened it here. Same
principle from now on: working on the app means the app preview, working on the staff
system means the staff preview.

**One thing I cannot test from here:** clicking through the staff system as a signed-in
staff member. Both previews are yours to drive, and the staff page stays invisible until
the permission statement is run.

---

## Phase 8, Make every screen real STARTED, first batch done

**What you asked for:** no more placeholders, everything clickable does something,
the app recognises the person who signs in, and the database keeps it.

### Your account is already saved, and now it is shown

The app saves the customer to your database the moment they finish signing in. It uses
the `complete_customer_onboarding` function that already exists in your live database
(the one your grid listed). It writes their name, phone, gender and email into
`customer_accounts`, which is why your staff system shows a real name and number instead
of "Verified customer".

New this round: the app now **reads that record back**. The home greeting says the
customer's own name, the avatar shows their real initials, and the profile screen shows
their real number. No invented "AE" avatar and no "GOOD MORNING" at 8 in the evening.

### What became real in this batch

| Item you raised | What it does now |
| --- | --- |
| 1. The logo is clickable | Tapping the Chapman logo opens the full care directory |
| 2. Elite Patronage | Real tier, real discount, real progress, worked out from what the customer has actually spent and completed. Tapping it opens the full programme |
| 6. The notification bell | Opens a real feed built from their own requests: dates waiting for an answer, Chapman's notes, confirmed dates, and their own replies. The bell shows a real unread count, and it is empty when there is nothing |
| 7. The History tab | Enabled. Upcoming holds everything still moving, History holds completed work, requests you declined, requests Chapman could not take, and cancellations. Each tab shows its own count |
| 9. The settings gear | Opens a real settings screen: appearance, daily update, booking alerts, permissions, app lock, location, account, and a working sign out |
| 11. Chapman Bonus | No longer stale. It shows the real tier, the real amount counted, and the real number of completed services, and opens the full breakdown, including what does **not** count yet and why |
| 13. Most used services, your activity, saved routines, support | Counted from the customer's real account. Every row opens what it names, and every routine can be booked again |
| Your care schedule | Reads the real account. If a date is waiting for the customer's answer, it says so first, because that is the only thing that actually needs them |

### Elite Patronage is now two ladders, and the laundry one is your own rule

You said the tiers were complicated, and you were right: I had invented a
money-based ladder that did not match how Chapman actually works. I then found your own
rule running in the staff system, under Settings, then Loyalty.

**The laundry ladder is now exactly your rule**, copied from your staff system so the app
and the office agree:

| Tier | Visits | Discount | What it gets |
| --- | --- | --- | --- |
| Standard | under 5 | 0% | Standard pricing |
| Bronze | 5 to 14 | 5% | 5% off every collection |
| Silver | 15 to 29 | 10% | 10% off every collection |
| Gold | 30 and above | 15% | 15% off and delivery on Chapman |
| VIP | Chapman's decision | 20% | 20% off and door to door care |

A visit counts once Chapman has taken the work on, so a request that is still being
reviewed, or one Chapman could not take, does not count and nobody's tier is inflated.

**The services ladder is separate, and here is my recommendation.** Laundry is many small
visits. A service job is one large piece of work, at least GH₵800 to GH₵1,500, so counting
it the same way would take a customer years to move up. My proposal, now running in the
app, is to count completed jobs with smaller numbers:

| Tier | Completed jobs | Discount | What it gets |
| --- | --- | --- | --- |
| Standard | none yet | 0% | Standard pricing |
| Bronze | 1 | 5% | 5% off the next service |
| Silver | 3 | 8% | 8% off and priority on busy days |
| Gold | 6 | 12% | 12% off, priority booking, and express care free |
| VIP | Chapman's decision | 20% | 20% off, a named coordinator, first call on busy days |

**You chose the counting above, not money bands**, so that is what the app does: services
are counted in completed jobs, exactly as in the table above. No further change needed
unless you want different numbers later.

One honest note on why the numbers are small: with a floor of GH₵800 to GH₵1,500 a job,
three jobs is already GH₵2,400 to GH₵4,500 of business, which is more than a Gold laundry
customer spends across 30 visits. That is what makes counting jobs, rather than counting
money, the fair way to do it.

Both ladders live in one file, `lib/loyalty.ts`, one table each. Changing a number or a
word there changes the home card, the profile card, and the whole Elite Patronage screen
together. Nothing else needs editing.

### What is next, in order

1. **Edit profile and photo upload.** Name, email, and gender can be changed today through
   the function already in your database. A profile photo needs one small database setup
   for picture storage, which I will explain in plain words before you run it.
2. **Fumigation, Car Detailing, Sofa and Carpet, Polytank.** The questions each one asks
   are already built and real. What they do not have is their own photography, the way
   laundry, cleaning, detailing and contract do. See the note in my message.
3. **Workers and Chat tabs**, which you said we would do properly after this.
4. Then the web app, so both sides match, and last the website.

---

## Two bugs you found, both fixed (22 Sep)

**Location in Settings sent you back to sign in.** The permissions screen was written as a
first-time setup screen: its button said Continue and it went on to the sign-in welcome page.
Opening it later from Settings, which is what the gear and the Location row do, put a
signed-in customer back into setup. It now knows how it was opened. From Settings it has a
back arrow and a Done button that returns you to Settings, and the sign-in journey is only
ever reached during first-time setup.

**Profile showed "Sign in with phone" for a moment before your own details appeared.** Six
screens each fetched the account separately, and while that was happening the screen could not
tell "still checking" from "signed out", so it showed the sign-in prompt. There is now one
shared account for the whole app: the first screen asks, every other screen reads the answer
instantly, and signing out clears it. A slow or failed request can no longer sign a customer
out by mistake, which is now covered by tests.

---

## Phase 17, The slow dark mode switch, and the PIN when signing back in DONE

### Why the dark mode switch felt slow

Because the app was asking the phone to change its appearance, not just itself.

The switch called two things: React Native's own appearance setter, and
nativewind's, which calls the same one underneath. Both tell the OPERATING SYSTEM
to switch appearance, and that is expensive:

- the whole app is drawn a second time, because the system then reports the new
  appearance back to the app;
- on Android, the system is asked for a configuration change, which means another
  full redraw and sometimes a visible flash;
- on iOS, the window cross-fades, which adds its own delay.

So one tap produced two redraws and a round trip to the phone before the colours
appeared. That is the delay you were seeing.

**The fix.** The app no longer asks the phone for anything. Every screen in this
app reads its colours from the palette in `lib/theme-palette.ts`, so switching is
now just a redraw with the other palette, which is what should have been happening
all along. A happy side effect: choosing dark in the app no longer changes anything
else on your phone, and choosing light inside a dark phone does not fight with it.

**Three smaller things found while fixing it:**

1. The switch itself now moves the instant it is tapped, and the colours follow. On
   a slower phone the knob can no longer appear stuck.
2. The phone's clock and battery icons were dark-on-dark in dark mode, because they
   followed the screen rather than the skin. They now follow the skin.
3. The web version had two older components still asking the browser what the
   visitor's computer was set to, so they ignored the choice made in Settings. They
   now follow the choice like everything else.

### The PIN when signing back in

What you asked for, in the order it now happens after the six digit code:

1. **A PIN is set for this account on this phone** -> the PIN screen appears, and
   the PIN opens the app. This is new.
2. **No PIN, but it was never offered** -> the one-time offer to set one, exactly
   as before.
3. **No PIN, and it was offered before** -> straight in.

**What had to change underneath.** Signing out used to delete the PIN, because the
PIN only unlocked a stored sign-in. Now the PIN stays, and it remembers WHICH
account set it. That is what makes it safe on a shared phone: a PIN can only ever be
asked of the account that created it, so if a different person signs in, the old PIN
is dropped and they simply move on. Without that one detail, the phone would ask the
next person for somebody else's PIN.

**Two honest details.** The PIN at this step is a confirmation, not a second lock:
the phone number was proved by text message moments earlier, so if the PIN is
forgotten or the five tries are used up, the PIN is thrown away and the customer goes
into the app rather than back to the start. And the app-lock PIN you already had,
when the app is opened fresh, works exactly as before.

### Face ID and Touch ID

Agreed as the next step, and written down here so it is not lost. When we build it,
it replaces typing the PIN rather than replacing the PIN itself, and it needs the
same care: a device that fails the face or fingerprint check falls back to the PIN,
and the PIN rules above still apply underneath. It also needs a real installed build
to be tested properly, so it fits naturally with the TestFlight and APK step.

---

## Phase 16, What the three emails asked for DONE

### Supabase, "new tables will need permission"

From 30 October, a brand new table is no longer reachable until somebody grants
permission on purpose. Every file we are adding already grants its own tables, to
the guest, the signed-in customer, and the office role. The lock file below goes
one step further and withdraws the automatic permission for future tables, and
installs a rule on the database itself so any table created afterwards gets its
lock switched on the moment it is created. Their deadline cannot surprise us.

### Supabase, "critical, table publicly accessible"

This is the one that matters. A file in `docs/security-lock-everything.sql` closes
it for good. It finds every table that still has its lock off, switches the lock
on, gives each one a single rule that only Chapman staff may touch it, writes down
what it changed so the undo is exact, and leaves every existing customer rule
alone. It is proved here first, on a copy of your database:

- tables still unlocked afterwards: 0
- a stranger sees 0 rows everywhere, and is refused outright on the log table
- guests can still browse the 36 prices
- the customer keeps their own requests, routines, enquiries, and ideas, and can
  still send one
- the office keeps every request and the client list
- a table created afterwards arrives locked, and a stranger is refused
- safe to run twice, and the undo puts everything back

### Vercel, "move to Node 24"

Your website pins `"node": "20.x"` in its own `package.json`, which is exactly the
case Vercel's dashboard button cannot fix. The change is one line in that file, and
because my access covers the app repository rather than the website one, you make
it in the browser: open `package.json` on GitHub, press the pencil, change `20.x`
to `24.x`, commit. `docs/what-the-emails-mean.md` has the five steps written out.

### The new app icon

The app icon was a blue shield and flame that had nothing to do with Chapman. It is
now the Chapman Prestige droplet on the company navy, at 1024 by 1024, which is
what Expo asks for. The same art is used for the Android adaptive icon, the themed
(monochrome) icon, the launch screen, and the browser tab. The wording under the
droplet was left out on purpose: at the size a phone draws an icon it would be a
grey smear, so the icon carries the mark alone and the name lives on the screen.

### And the answer about the UK

Does your boss have to use Expo Go? No. See `docs/BETA.md`. An iPhone can get the
app properly installed through TestFlight, which needs the paid Apple account, or
through Expo Go for a first look. An Android phone needs no account at all: one
file, sent to the phone, tapped.

---

## Phase 12, Signing back in, birthdays, the client list, and the team page DONE

### Signing back in no longer asks who you are

A customer who had already given Chapman their name was being asked for it again
every time they signed back in. Now, after the six digit code, the app checks
whether this phone number already has a finished profile. If it does, the
customer goes straight to the home screen. The details form only appears once, on
the first sign-up, and never again.

### The birthday, optional, day and month only

The details form now has an optional birthday: two small boxes, a day and a month.
There is no year, and no year is stored. It is used for one thing, wishing the
customer on the day:

- On the day itself, the home screen shows a birthday card and the profile shows
  the date with a gift beside it.
- Every other day, the profile simply shows the date, so the customer can check it.
- Chapman sees the day and the month on the client record, and can use it for a
  message or a call.

### App sign-ups appear in the client list

This was the missing join between the two apps. When someone signs up in the
mobile app they are now found or created in the Chapman client list by their phone
number, with their name, number, email, gender, and birthday, and marked as
"Added from the Chapman app". Signing in again never creates a second copy: the
same record is found and refreshed. This runs quietly on every sign-in, so
customers who signed up before today are added too.

### The team page, behind the people button

Beside the settings gear on the profile screen there is now a people button. It
opens the Chapman team: all eight people from the website, founder first, each as
a bubble. Tap a bubble and it opens with the person's role, a short description of
what they do, and their published contact details. Below the team there is a form
for app ideas: add something, remove something, or change something. Chapman reads
every one.

### The bonus box, rebuilt

The old box was three lines of text that nobody could read quickly. It is now a
card that answers three questions in order: what am I getting, how close am I, and
how does it work. Each ladder has its own bar that fills when the screen opens,
with the tier, the discount, and the plain sentence from `lib/loyalty.ts`. Every
number still comes from that one file, so changing Chapman's decision there changes
the whole app.

### Two things fixed that you spotted

- **The name that vanished in dark mode.** "Chapman Prestige" on the home screen
  was being drawn in the canvas colour, which is the same near-black as the dark
  background. It now uses the text colour, so it reads in both skins.
- **The switch that would not stay on.** The Updates screen was guessing the daily
  update switch was off. It now reads the truth from the phone every time the
  screen opens. Switching it off cancels only that phone's booked mornings: other
  people's messages are untouched, and the app never re-books after you switch it
  off.

### Waiting on you: two pastes, and the beta

1. `docs/customers-birthdays-and-ideas.sql` adds the birthday columns, the client
   link, and the ideas table. Proved here first: a sign-up creates one client and
   never two, the birthday is saved, an idea can be sent by a signed-in customer,
   another customer cannot read it, a stranger cannot send one, and the office can
   mark it.
2. `docs/daily-messages.sql` is still the one that lets Chapman write the daily
   message. Also proved.
3. The beta plan is written out in full in `docs/BETA.md`: the APK, the two iPhone
   routes, the accounts and what they cost, the security position, and the list of
   things each tester should try.

---

## Phase 11, Daily messages, dark colours, and the live area FIXED

### How daily messages reach customers, the honest answer

There are three ways this can work, and the app now uses the third:

| Way | What it would need | Why not this one |
| --- | --- | --- |
| Chapman buys a push service | A developer build, an Apple and Google account, a server that sends each message | Slowest to set up, and Expo Go cannot receive these |
| The app fetches news and shows it in Updates only | Nothing extra | The customer only sees it if they open the app |
| **The office writes the message, the phone delivers it at 9:00** | One small table, which is written and proved | **This is what the app does now** |

**How it works.** The Chapman office writes a message in one small table: a title,
the words, and the day it should appear. The app reads the messages that are due,
then books the next seven mornings on the customer's own phone. That is why the
message still arrives at 9:00 with the app closed and with no internet, and why
Chapman pays nothing for a push service.

**What can be sent:** care tips, service news, holiday notices, announcements, and
thank-you notes. Each has its own label. They also appear in the app's Updates
list, so a customer who opens the app sees them there too.

**Two honest limits.** A message cannot be sent *instantly* to a phone that is
closed: the phone holds the next seven mornings, so a message written today
reaches customers from tomorrow morning. When we build push notifications later,
instant delivery becomes possible and needs the paid developer build.

**Two things waiting on you:**

1. One database statement, `docs/daily-messages.sql`, which adds the table and its
   two access rules. It is proved: a customer can read a due message, cannot
   publish one, cannot see one dated in the future, and the office can publish.
   Run it when you are ready and the app starts reading your messages.
2. Birthdays need the customer's date of birth, which the app does not ask for
   today. That is one new column and one new field at sign-up. Say the word and I
   will build it, with the same proof.

### The switch that would not switch on

It asked the phone for 9:00 today. After nine in the morning that moment has
already passed, so the phone refused the whole week and the switch sprang back to
off. The mornings are now always in the future, each one is booked on its own so
one refusal cannot take the week down, and the switch reports what actually got
booked.

### Dark mode, less brown

The dark skin was warm brown everywhere, which flattened the whole app. It is now
a cool near-black, with cards sitting slightly above the background and hairlines
barely above the cards. The bright line above the tab bar and the glaring workers
card are gone, because they were hard-coded light colours that ignored the skin.

**Every service now has its own colour, in both skins:** laundry keeps the brand
green, cleaning is blue, fumigation amber, detailing violet, fabric rose, polytank
cyan, contract teal, and the team is gold. Each one is brightened for the dark
skin so none of them disappears.

### Your current area, told honestly

You were right: it was not really live. It asked the phone once and showed a name.
It now reads your position, names the area, keeps following you while the screen
is open so the area stays current, shows when it last updated, and says plainly
that Chapman does not track you in the background and that nothing is sent
anywhere until you send a booking.

---

## Phase 10, What you found on the phone FIXED

**1. A crash on the profile screen.** Six spaces sitting between two elements on one line.
React Native treats those spaces as text outside a Text component and refuses to draw the
screen at all, which is what you saw. My mistake, and it is now guarded by a test that reads
every screen and refuses to let that pattern back in.

**2. The daily update switch did not stay on.** It had no memory. It now remembers your
choice, shows how many mornings are already waiting on the phone, and tops the week up each
time you open the app so it does not quietly stop after seven days. There is also a **Send a
test message** row so you can see one arrive in five seconds instead of waiting for 9:00.

**3. The PIN screens.** The keyboard covered the fields and the Save button, and nothing put
it away. Both PIN screens now move up with the keyboard, tapping anywhere outside the fields
puts the keyboard away, there is a Hide the keyboard button, and the fields accept digits
only. **Changing or removing the PIN now asks for the current PIN first**, so nobody holding
your phone can simply remove the lock. Five wrong tries still throws the PIN away and asks for
a fresh text message.

**4. Dark mode.** It was only switching a few colours that no screen used, which is why
nothing changed. Every screen now draws from one palette with two skins, so dark really is
dark: the background, the cards, the text, the icons, the tab bar, and the dividers. Appearance
now offers three choices: **Light, Dark, and My phone**, which follows your phone setting and
changes with it.

**5. Permissions.** The permissions screen now shows what the phone has actually allowed, and
when the phone has already been asked once and said no, the button opens the phone settings,
because the phone will not ask again. The same is true of Live service area on the profile:
a refused location permission now opens the phone settings instead of doing nothing.

**6. Saved routines never showed.** They were only ever held in memory, so they vanished the
moment the app restarted. They are now saved on the phone and read back when the app opens.

**7. Alerts.** The Booking alerts switch is now a real choice that the live alerts obey, the
daily update is real and remembered, notifications are asked for through the phone, and the
permissions screen reports the truth for alerts, location, and camera.

---

## Phase 9, The office sees its work arrive STARTED, running in the preview

**What you asked for:** the staff side menu should show how many records are waiting, and
alerts should arrive the same way, live.

### Numbers on the side menu

The menu counts now come from the database and keep themselves current:

| Menu entry | The number means |
| --- | --- |
| Orders | Every order in the system |
| Mobile Requests | Laundry requests still waiting for Chapman to act |
| Service Requests | Cleaning and service enquiries that need a date |
| Staff | Staff records |
| Clients | Client records |

Hover a number and it explains itself, for example "8 waiting for Chapman to act". A
number only appears when there is something to show, so the menu stays quiet on a calm day.

### Alerts that are real

**I found why the bell was silent.** It was listening to orders filtered by a client id,
and a staff member never has a client id, so it delivered nothing at all, ever. The bell
now listens to the two tables the office's work actually arrives in.

The office is now told, as it happens:

- a customer sent a laundry request
- a customer asked for cleaning, fumigation, detailing, polytank, or contract work
- a customer accepted or rejected a date Chapman offered

Clicking an alert opens the queue it belongs to. The number on the bell is what is new
since that staff member last looked, so it means something rather than resetting on every
refresh, and it is kept per staff member.

### Where it stands

Both are built, compiled, and running in the staff preview in this chat. To put them into
your own staff system: two files into `src/hooks/`, then one patch with three small edits.
Step 2b of `docs/staff-web-app/README.md` writes it all out in plain words.

---

## Ideas worth considering

You asked me to always bring you ideas that make the app better, not just fix what is
broken. Here is my running list. None of these is built, and I will not start one
without explaining it and getting your yes first. They are in the order I would do
them.

| # | Idea | What it does for your business | Effort |
| --- | --- | --- | --- |
| 1 | **Send the measuring photo to Chapman** | Today a customer takes a photo and nobody at Chapman ever sees it, so a customer who does not know the size cannot get a quote. This closes that gap for every phone | Small |
| 2 | **A reminder the day before pickup** | Fewer missed pickups, fewer wasted trips, fewer apologies | Small |
| 3 | **Repeat the last order in one tap** | Your regulars order the same thing weekly. This makes that a single tap instead of a rebuild | Small |
| 4 | **Email as a second way to sign in** | Text messages cost you money. Customers could choose a code by email instead, and email codes are far cheaper | Medium |
| 5 | **A quote range before the visit** | Instead of "we will get back to you", show an estimated range from the type of service and the room sizes, with the real price confirmed after the visit | Medium |
| 6 | **WhatsApp instead of text messages** | In Ghana WhatsApp reaches customers who barely read texts, and it is cheap. Needs a business account and a template approved by Meta | Medium |
| 7 | **A pickup status the customer can watch live** | Prevents the "where is my pickup" phone calls, because the app shows the team is on the way | Medium |
| 8 | **Automatic room measuring (AR and LiDAR)** | See Phase 2f. Wonderful, but only works on Pro iPhones and needs the yearly Apple fee | Large |

**Tell me which number to pick up and I will plan it properly before writing code.**

---

## What I need from you, the complete list

Everything I'm waiting on, in priority order:

| # | What | Time | Why |
| --- | --- | --- | --- |
| 1 | **The four checks after the security fix** (Phase 3) | ~2 min | Proves the lock works on your live database and your staff still have access |
| 2 | **Apply the Service Requests page** (Phase 4, `docs/staff-web-app/`), including the decline reason | ~6 min | Customers are asking and nobody is answering, and now nobody can say no either |
| 3 | **Use the app after signing in, and set the PIN when it is offered** | 1 minute | Proves the new offer screen and the PIN both behave on your phone, and stops the repeat text messages |
| 4 | **Tell me anything that looks broken while you test** | as you go | I fix it before you look again |
| 5 | **Say the word and I'll push**, so you can see all of this outside our chat | minutes | You can't judge work you can't see |
| 6 | **Decide on the website** (Phase 6) | minutes | Unblocks the last piece |

### See it running first, before you change anything

The staff system is running in our chat with the new page in it. To see it:

1. Open the staff preview above the chat, and sign in as a manager or admin.
2. **Service Requests will not appear in the menu yet**, because the permission row is
   the thing you are about to add. That is expected.
3. Run the first statement from `docs/staff-web-app/README.md`, reload the preview, and
   the menu entry appears. Then the whole page is there to click through, including the
   decline with reason.

### The four checks, written out

1. Staff system: log out, then log back in.
2. Staff system, Mobile Requests: your 8 requests are still there.
3. App, laundry prices: still visible before signing in.
4. App, Bookings: only your own requests, and a test request still reaches the staff system.

**That's everything.** Nothing else is waiting on you right now.

### To try the PIN

**You chose "offer it once after sign-in", and that is what the app now does.**

1. Sign in with a phone number that has no PIN yet. Straight after your name is
   confirmed, **the app shows the PIN offer**: two boxes for the same four digits, and
   a clear way out that says "Not now, take me to the app".
2. Set a PIN, or skip it. Either way the offer does not appear again for that account,
   so nobody is nagged. It is always in Profile, under **App lock**, if you want it
   later.
3. Then close the app or reload the page. **There is one thing to check:** does the app
   ask for your four digits, or does it ask for your phone number again?

| What you see | What it means |
| --- | --- |
| It asks for your 4 digit PIN | Working. Sign in once, then the PIN, and your text message credit is safe |
| It asks for your phone number | The preview window is not allowed to store anything, so it forgets everything the moment it reloads. Tell me and I will stop suggesting you test there |


### The sign-in question you raised

You asked why you have to sign in again every time the server restarts or a change is
made, because each sign-in costs you a text message.

**What I checked.** The preview address is the same one it has always been, so that is
not the cause. The app does save your sign-in in the browser's own storage, which is
the correct thing to do. What I cannot see from here is whether the preview window is
allowed to use that storage, because the preview runs inside a frame on a page I
cannot inspect. If the frame is not allowed to store anything, then nothing the app
does can survive a reload, and no amount of code changes will fix it in that window.

**The test, and it costs you nothing.** Reload the preview page without signing in, and
tell me which screen you land on:

| What you see | What it means |
| --- | --- |
| It remembers you and opens the app | The preview can store a sign-in, so something else is signing you out and I will keep digging |
| It asks for your phone number again | The preview frame is not allowed to store anything. That window can never remember you, and the fix is to stop testing in it |

**Where you will never be asked twice.** Two places keep you signed in properly:

1. **The app on a phone.** It stores your sign-in in the phone's own secure storage, so
   closing the app and reopening it does not ask again.
2. **The published web link** (the Vercel option below). It is an ordinary web page at
   a fixed address, not a frame inside a chat, so it remembers you the same way your
   bank's website does.

If the test says the preview cannot remember you, I would move your testing to the
published link for everything except camera, GPS and notifications. That will stop the
text messages.

### Two things you already checked for me

These were the two I could not check from here. You confirmed both on 20 September
2026, so they are closed:

| Check | Result |
| --- | --- |
| Signing in with a code sent by text message | **Works.** The text message service is on, so customers can sign in. |
| Saved routines surviving a close and reopen | **Works.** A saved routine is still ticked when you come back. |

That means the whole customer path is confirmed working end to end: sign in, book,
reach the staff system, come back and see the status.

### What I would still like you to try

Nothing is blocking. These are simply the next useful things to look at, and I can
only see them through your eyes because I cannot reach your database from here:

1. **The screens above.** Open a booking and check the three buttons at the bottom,
   then check your bookings list reads newest first with a time on each card.
2. **Ask for a cleaning assessment** and check the tracking page now calls it by its
   right name and waits honestly instead of claiming approval.
3. **Anything that looks wrong while you browse.** Say it plainly, in your words, and
   I will fix it or explain why it is that way.

### A decision I am not making for you: fewer text messages per customer

Every sign-in sends one text message, and you pay for each one. Staying signed in
means a customer signs in once and not again for a long time, so this is mostly a
question about the ones who genuinely come back new. Three ways to cut the cost, and
it is your business call which you want:

| Option | What the customer does | What it costs you | Status |
| --- | --- | --- | --- |
| **Leave it as it is** | Signs in with a text code each time they come back fresh | One message per sign-in | Not chosen |
| **Add a 4 digit app PIN** | Signs in with a text code once, then a PIN they choose on that phone | One message, then nothing for that phone | **You chose this one. It is built** |
| **Add email sign-in as well** | Chooses between a code by text or a code by email | Email codes are far cheaper than texts | Still open, idea 4 below |

The PIN is the one you picked, so it is done. Email sign-in is still on the ideas
list. Tell me if you want that one added to the queue and I will explain it plainly
before anything is built.

---

## How to actually see the work

There are three ways to look at the app. They suit different purposes.

### Option 1: the preview window in our chat (available now, nothing to install)

A window in our chat shows the app exactly as it currently stands. This is the
quickest way to review layout, colours, wording, and navigation flow.

It cannot do camera, GPS, SMS codes, device notifications, or secure storage,
because those do not exist in a browser. It also cannot reach every part of your
database, because I am not able to reach Supabase from here.

### Option 2: a test URL you can open on your phone (recommended, one-time setup)

This is the answer to the install-and-run problem. The app can be built as a web
page, published once, and then opened on any phone with no install at all. Every
time I push a change, the URL updates by itself.

I have prepared everything for this:
- `pnpm build:web` creates the publishable version of the app
- `vercel.json` tells Vercel how to serve it, including the booking detail pages

The one-time setup, in Vercel, takes about three minutes:
1. Vercel, Add New Project, Import this repository
2. Set the production branch to `arena/01a0bf82-chapman-prestige-mobile`
3. Leave the build settings alone, because `vercel.json` already sets them
4. Deploy

You then get a permanent link you can open on your phone. No VS Code, no
`git pull`, no Expo Go. Vercel rebuilds it automatically on every push.

It behaves like the preview window: real screens, real data, real sign-in. No
camera, GPS, or notifications, because it runs in a browser rather than as an
installed app.

### Option 3: the full app on your phone, via Expo Go

Only needed for camera measurement, GPS pickup points, notifications, or the app
icon and splash screen. This requires the repository on your computer:

```
git fetch origin
git checkout arena/01a0bf82-chapman-prestige-mobile
pnpm install
npx expo start
```

Then scan the code with Expo Go. Once this is set up, later changes are quick:
`git pull` and the app reloads itself.

### Reading and undoing changes

```
git diff main --stat        # read what I changed
git checkout main           # undo everything and go back
```

### A note on what I got wrong

I earlier told you to scan a code with Expo Go to test the app directly from my
workspace. That does not work here, and the error you saw was accurate. This
workspace is locked behind an access token that only the preview window can
send. A phone app cannot send it. The QR code has been deleted so nobody tries it
again.

---

## Plain-English glossary

Skip this unless a term is bugging you.

| Term | What it actually means |
| --- | --- |
| **Supabase** | The service holding your database, logins, and files |
| **Database / table** | Your filing cabinet / one drawer in it |
| **Migration** | A written record of a change to the database, so it can be rebuilt |
| **Protection / RLS** | The rule deciding which rows a person may see |
| **Function / RPC** | A small program stored in the database that the app calls |
| **Repo** | The project folder containing all your code and history |
| **Push** | Sending my work up so you can pull it down |
| **Branch** | A separate copy of the project where work happens before it's merged |
| **Expo Go** | The phone app that runs your app during development |
| **Bundle / build** | Turning the code into something a phone can run |

---

## Where to find things

| Document | When to read it |
| --- | --- |
| **This file** | Whenever you want to know where we are |
| `security-fix.sql` | When you're ready to close the security holes |
| `1-RUN-ME-database-check.sql` | Only if I ask, it re-checks the database afterwards |
| `SECURITY-FINDINGS.md` | If you want the proof behind the security fix |
| `audit-2026-09-20.md` | If you want the original full audit |
| `BETA.md` | When you are ready to put the app on the boss and staff phones |
| Everything else in `docs/` | Background from earlier in the project |

---

## The honest summary

**Your app works and is well built.** The problems are in the connections between your
three products, not inside the app itself.

**One thing is urgent:** closing the open database tables. Two minutes, reversible.
already tested.

**Everything else is a queue**, and I'll walk you through each step one at a time, explaining what it does and why before I do it, and showing you the result after.

No more SQL without a plain-English explanation of what it does first. That's a promise.
