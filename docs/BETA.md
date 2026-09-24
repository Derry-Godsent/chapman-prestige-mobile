# The beta test, for the boss and the staff

This is the plan for putting the app into the hands of a small group before the
public does: one Android file to install, one iPhone route, and the checks that
must be true before anyone installs anything.

The beta group is Chapman only. The boss and the staff. No customers yet.

---

## 1. The short answer

To beta test on real phones you need three things:

1. A **build** of the app that is not Expo Go. Expo Go is the development
   container: it changes every time the code changes, and it cannot hold the
   daily 9:00 message schedule the way an installed app can.
   - Android: one `.apk` file, sent by link or WhatsApp, tapped to install.
   - iPhone: either TestFlight (needs a paid Apple Developer account) or Expo Go
     for the closest staff during the first days.
2. A **working phone sign-in**: the six digit code must actually reach a Ghana
   number. That is a Supabase setting, not an app change.
3. The **one SQL file** pasted into Supabase, so app sign-ups appear in the
   staff web app's client list.

Nothing in the app contains a secret. The build only needs the public Supabase
URL and the publishable key, and those are already in the repository, so a build
machine needs no private value at all.

---

## 2. Before the first phone: the checklist

| # | What | Who | Where it stands |
|---|------|-----|-----------------|
| 1 | Paste `docs/customers-birthdays-and-ideas.sql` into the Supabase SQL editor | Chapman (one paste) | Ready, proved here first |
| 2 | Paste `docs/daily-messages.sql` into the Supabase SQL editor | Chapman (one paste) | Ready, proved here first |
| 3 | Confirm the SMS code arrives on a Chapmans own number | Chapman | Supabase, Providers, Phone is enabled with the Arkesel hook. See `docs/phone-auth-readiness.md` |
| 4 | Confirm the staff web app shows a new client after an app sign-up | Chapman | Happens automatically after step 1 |
| 5 | Row level security proved on a real copy of the schema | Done | `docs/database-proof/run.mjs`, "every check passed" |
| 6 | No service role key anywhere in the app | Done | Only `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is in the build |

The app works before steps 1 and 2 as well. Without them, sign-ups still work,
birthdays are kept on the phone's own account, and the daily message falls back
to the seven built in messages. What steps 1 and 2 add is the office side: the
client list and the messages Chapman writes.

---

## 3. Android: the APK

One file, no Play Store, no Google account needed by the tester.

On the machine that has this project:

```bash
npm install -g eas-cli
eas login                 # your free Expo account, create one if needed
eas build -p android --profile preview
```

What happens:

1. EAS packs the project on Expo's servers and returns an `.apk`.
2. The link can be sent to any Android phone in the beta group.
3. On the phone: open the link, download, allow "install from this source" once,
   install. The app appears as Chapman Prestige.

The `preview` profile in `eas.json` is already set for exactly this: internal
distribution and an APK rather than a Play Store bundle.

For later builds, run the same command. The version number lives in
`app.config.ts`, so raising it there decides whether a phone installs over the
old one.

---

## 4. iPhone: two honest routes

**Route A, TestFlight.** This is the one that behaves like a real app: it
installs, keeps the notification schedule, and can be updated by link.

What it costs and needs:

- A paid Apple Developer account, 99 US dollars a year.
- Once, in the browser: `eas build -p ios --profile preview` and EAS guides the
  Apple sign-in, the certificate, and the device list. Then
  `eas submit -p ios` puts the build into TestFlight, and each tester installs
  Apple's free TestFlight app and accepts the invite email.
- Internal distribution covers up to 100 devices a year.

**Route B, Expo Go, for the closest staff only.** Free, works today, no Apple
account.

- The app runs inside Expo Go on the iPhone, by scanning a QR code from the
  development window on a computer that has the project running.
- The stored steps are in `README.md`.
- What it cannot do: a real installed icon. That is the honest answer to the icon
  question. Inside Expo Go, the icon on the phone belongs to Expo Go, and no
  setting of ours can change that, because Expo Go is one container holding every
  developer's app. Only an installed build shows the Chapman icon, which is what
  the APK and TestFlight give you.
- It also cannot hold the 9:00 message the way an installed app does, because it
  depends on Expo Go staying installed and the project server being on.
- It is a testing route, not a beta route, and it is right for one or two people.

**Does anyone abroad need Expo Go?** No. Your boss in the UK does not have to
install Expo Go, and he does not have to be in Ghana either. There are two ways
that work for a phone in the UK:

1. **If he is on an iPhone:** TestFlight, after the one-time Apple Developer
   account. He installs Apple's TestFlight app, opens the invite email, and taps
   Install. That is a real install with the Chapman icon and working alerts.
2. **If he is on Android:** the same one file as everyone else. Send it to him by
   link or WhatsApp, he taps it and allows the install once. Nothing else, no
   account, no computer, and the country makes no difference.

Expo Go is only needed if you want him to look today, before the Apple account
exists. Even then, the QR code has to be reachable from his phone, which means a
computer here running the project and reachable from outside, which is more work
than sending him the Android file or buying the Apple account once.

**Recommendation:** start the beta with the Android APK and the boss on
TestFlight if he uses an iPhone, and use Expo Go for staff on iPhone only during
the first few days. When the beta feedback is in, buy the Apple account once and
TestFlight covers everyone from then on.

---

## 5. Accounts and money, in plain numbers

| Thing | Needed for | Cost |
|-------|-----------|------|
| Expo account | Building the APK and the iPhone build | Free. Build queues are slower on the free plan |
| Apple Developer Program | Installing on iPhone outside Expo Go | 99 US dollars a year |
| Google Play Console | Only for the final public release | 25 US dollars, once |
| Arkesel (SMS) | The six digit sign-in code | Per message, paid to Arkesel |
| Supabase | The database, sign-in, and files | Free plan is enough for a beta |

No Apple fee is needed to finish a working beta if the iPhone testers use Expo Go.

**About the icon.** The Chapman icon shows on a phone only when the app is
installed as its own app, which is what the APK gives Android and TestFlight gives
iPhone. Inside Expo Go the icon is Expo Go's own, and that cannot be changed by
us. The new icon art is already in the project and is described in the roadmap.

---

## 6. Security, the short version

What is already true:

- The database decides what each person can see. A customer can read their own
  bookings and enquiries, and nothing else. A stranger with no login can read
  prices and nothing else. This is proved in `docs/database-proof/run.mjs`,
  which runs the real files against a real Postgres and prints "every check
  passed".
- The app carries only the publishable key, which is designed to be public. The
  service role key, the Arkesel key, and the SMS hook secret live in Supabase
  only, never in the app, never in this repository.
- Sign-in is a one-time code to the person's own phone. The optional 4 digit PIN
  adds a lock on the phone, and five wrong tries delete the PIN and ask for a new
  text message.
- Location is used only while the app is open, only when the person taps, and is
  never tracked in the background.

What the beta must still confirm on real phones:

- The staff web app and the customer app see the same records, in both
  directions: a booking made in the app appears for staff, and a date or a
  decline from staff appears in the app.
- A signed-in customer cannot read another customer's requests or enquiries.
- Alerts land on the phone with the app closed.

---

## 7. What a tester does

Send this list with the APK:

1. Install the app, open it.
2. Sign in with your own number, give your name, and add your birthday if you
   want (day and month only).
3. Book a laundry collection. Watch for the date Chapman offers.
4. Ask for one other service, such as fumigation or cleaning, and answer the
   date Chapman offers.
5. Open Updates, and switch the daily Chapman update on. The next morning at
   9:00 a message should arrive with the app closed.
6. Open your profile. Check the Chapman bonus box, and check that your birthday
   shows correctly.
7. Tap the people button beside the settings gear, read the team, and send one
   idea for the app using the form at the bottom.
8. Turn dark mode on in Settings and look at the home screen, the profile, and
   each service page.

Report anything that looks wrong, in the app idea form or straight to the office.
One line is enough: what you did, what you expected, what happened.

---

## 8. After the beta

1. Collect the feedback into the idea list, which the office reads in Supabase
   today and in the staff web app next.
2. Fix what matters, in the order it hurts: broken things first, then anything
   confusing, then wishes.
3. Then the public release: the Play Store listing, the Apple review, screenshots,
   and a privacy statement that matches what the app actually does.

The last item is the only one that needs money up front, which is why the beta
comes first.
