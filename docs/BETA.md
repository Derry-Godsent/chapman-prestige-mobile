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

## 4b. The UK boss today, before any build

He can test from the UK today, for free, without the Apple account and without a
build. Two things decide whether it works, and both are worth knowing before you
send him anything.

### The exact commands, in order, to copy

Run these in PowerShell on the computer that holds the project. Line by line is
fine, all at once is fine too.

```powershell
cd D:\App\chapman-prestige-mobile

git pull
pnpm install --frozen-lockfile

npm install -g @expo/ngrok@4.1.3
npm ls -g @expo/ngrok --depth=1

Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

npx expo start --tunnel --clear
```

Read the results like this:

- `git pull` may say the code is already up to date. If it refuses because of
  local changes, skip that one line; the code on the computer is fine.
- `pnpm install --frozen-lockfile` should end with "Done".
- `npm ls -g @expo/ngrok --depth=1` must show `@expo/ngrok@4.1.3` and a line with
  `win32-x64`. If it shows nothing, the install did not land and the tunnel
  cannot start.
- The final command prints the QR code. Keep that window open and the computer
  awake.

**Never run plain `npm install` inside this project folder.** The folder is a pnpm
project, and npm warns about the `node-linker` line for exactly that reason.
Running npm there can leave two half-installs behind. If that has already
happened, clean it out with:

```powershell
Remove-Item -Recurse -Force node_modules
pnpm install --frozen-lockfile
npx expo start --tunnel --clear
```

If `pnpm` is not recognised, one line turns it on:

```powershell
corepack prepare pnpm@9.12.0 --activate
```

### First, if the tunnel refuses to start

The message "ngrok tunnel took too long to connect" almost always means one of
these four things. In order:

1. **The tunnel helper is not installed.** Install it once, then try again:
   `npm install -g @expo/ngrok@^4.1.0`
2. **Something in the network is blocking ngrok.** This is the common one in
   Ghana, on office networks, and with some antivirus programs. The quickest test
   is a phone hotspot: connect the computer to the hotspot and run the command
   again. If it works there, the network was the problem, not the app.
3. **An old ngrok process is stuck.** On Windows, open Task Manager, end any
   `ngrok.exe`, or run `taskkill /IM ngrok.exe /F`, then try again.
4. **Stale project cache.** Delete the `.expo` folder inside the project and run
   the command once more.

If none of that works, stop fighting the tunnel. There is a better route below,
and it needs no tunnel at all.

### The better route: send him a web link

The whole app already runs in a browser, and this is the fastest way to put it in
your boss's hands today. No install, no QR code, no tunnel, no Apple account, and
it works from the UK the moment it is deployed.

The project is already set up for it: `vercel.json` builds the web version and
serves it. On the computer that has the project:

```
npm install -g vercel
vercel login
vercel
```

Answer the questions with the defaults, and Vercel prints a link such as
`https://chapman-prestige-mobile.vercel.app`. Send that link to your boss. He opens
it on his phone or his laptop, and he is using the app. Run `vercel --prod` when you
want the final link rather than a preview one.

Later, that link can be given a proper name, such as
`app.chapmanprestige.com`, using a subdomain of the website's own domain.

**What he can test in the browser:** everything visual and everything that reads
data. The home screen, all the services and prices, the booking screens, the team
page with the bubbles and the idea form, the profile, the bonus box, and dark mode,
which switches instantly.

**What he cannot test in the browser, honestly:**

| Cannot test in a browser | Why |
| --- | --- |
| The 9:00 daily message | Phone alerts do not exist in a browser |
| The Chapman icon on the home screen | Only an installed app has an icon |
| Face or fingerprint, when we build it | Browser support is uneven |

The web version is also a convenience lock rather than a secure one, because a
browser stores the PIN differently from a phone. That is written up plainly in
`docs/pin-rules.md`.

### The QR code on its own will not work

The QR code from a plain `npx expo start` contains your computer's address on your
own Wi-Fi network, something like `exp://192.168.1.20:8081`. That address means
nothing in the UK, and he would see a loading error no matter how good the
screenshot is.

There is one command that fixes it:

```
npm install -g @expo/ngrok@^4.1.0
npx expo start --tunnel
```

The tunnel gives the project a public address, so the QR code now points somewhere
his phone can reach from anywhere. A screenshot of THAT QR code works.

Rules for the tunnel:

- The terminal and the computer must stay on and awake for the whole time he is
  testing. Close the terminal and his app stops loading.
- It is slower than a normal connection, because every request travels through the
  tunnel first. That is normal and not a fault in the app.
- If a screenshot comes out blurry, send him the `exp://...` address as text as
  well. Expo Go has an "Enter URL manually" option for exactly this.
- A few work networks block ngrok. If the tunnel refuses to start, that is the
  network, not the app.

### He should install Expo Go, and here is the catch per phone

**iPhone.** Expo Go from the App Store is built for SDK 54, and this project is on
SDK 54, so they match. Nothing to install by hand.

**Android.** The Play Store version of Expo Go may already be built for a newer
SDK than this project, in which case it refuses to open it with "Project is
incompatible with this version of Expo Go". If he is on Android, do not use the
Play Store copy: download the SDK 54 build from expo.dev/go (choose SDK 54, then
Android). That one works.

**That mismatch is also the reason Expo Go is a first look and not the beta.** The
App Store only carries one Expo Go at a time, so the day it moves on, an SDK 54
project stops opening in it.

### What he can and cannot test in Expo Go

| Can test | Cannot test |
| --- | --- |
| Signing in, the birthday, the profile, the bonus box | The Chapman icon on the home screen, which is Expo Go's own |
| The team page and sending an idea | The 9:00 daily message, which needs an installed app |
| Services, prices, requests, bookings, dark mode | Notification behaviour generally |

### The one real blocker: his phone number

The sign-in screen is Ghana only. It shows a fixed `+233` and takes nine digits, so
a UK number cannot be typed in at all. That is by design today, not a fault: every
customer so far is in Ghana.

So, for the boss, three honest routes:

1. **Guest mode today.** He taps "Continue as guest" and can look at everything
   that does not need an account: services, prices, the team page, dark mode. No
   sign-in, so no bookings and no ideas sent.
2. **A Chapman Ghana number.** If there is a spare SIM, signing in with it gives him
   the full experience, bookings and all.
3. **Let the app take international numbers.** This means a country code on the
   sign-in screen and a number stored with its country, plus one test message to a
   UK number to prove the SMS account can deliver there. That is a real feature and
   a paid-message question, so it waits on your word. Ask and it gets built with the
   same proof as everything else.

---

## 4c. Every free way to put this in someone's hands

Three kinds of device, four routes, and only one of them ever costs money. The web
routes need no account from anyone and no app store.

| Route | Devices | What the tester does | Cost |
| --- | --- | --- | --- |
| The web link | Android, iPhone, desktop, tablet | Opens a link | Free |
| Web link added to the home screen | Android, iPhone | Opens a link, then "Add to Home Screen" | Free |
| Android APK | Any Android phone | Taps a download link, installs one file | Free |
| TestFlight | iPhone | Installs from Apple's TestFlight app | 99 dollars a year |
| Expo Go | Android, iPhone | Installs Expo Go, scans a QR code | Free, and the fussiest |

### The web link, which needs nothing from anyone

This is the route to use today. It works on every device, in every country, with no
account, no store, no QR code and no tunnel.

**Where the link comes from.** Two ways, both free.

1. **GitHub's own hosting, no new account.** One click from you turns it on, and
   after that every change republishes itself:
   - Open https://github.com/Derry-Godsent/chapman-prestige-mobile/settings/pages
   - Under "Build and deployment", set Source to **GitHub Actions**
   - Open https://github.com/Derry-Godsent/chapman-prestige-mobile/actions
   - Choose **Publish the web app**, then press **Run workflow**
   - The link is then: https://derry-godsent.github.io/chapman-prestige-mobile/
2. **Vercel**, if you would rather have a shorter address. Three commands on the
   computer that holds the project, which are written out in section 4b.

**Send that link to your boss in the UK.** He opens it on his phone or his laptop
and he is using the app. Nothing to install.

**Added to the home screen it behaves like an app.** On an iPhone: open the link in
Safari, tap the Share button, choose "Add to Home Screen". On Android: open it in
Chrome, tap the three dot menu, choose "Install app". On a desktop: Chrome or Edge
show an install icon in the address bar. The icon is the Chapman droplet, and it
opens full screen with no browser bars. That is the free way to have the app on an
iPhone today.

**What it cannot do.** No 9:00 daily message, because browser alerts are not the
same thing, and the icon is the web icon rather than the installed one. Everything
else is there: services, prices, the booking screens, the team page and its idea
form, the profile, the bonus box, and dark mode.

### The Android APK, one file, no store

An APK is the Android app itself. Anyone can install it from a link you send, and
it has the real Chapman icon, real alerts, and works from the UK. It needs a free
Expo account, which is an email sign up.

```
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The last command prints a link. Open it, download the `.apk`, and send that file to
whoever is testing. On the phone, Android will ask once to allow installing from
this source; allow it, and the app installs with the Chapman icon.

The `preview` profile is already set up in `eas.json` to produce an APK rather than
a store build, so there is nothing to configure.

### The iPhone, honestly

There are exactly three routes, and only two are free:

1. **The web link added to the home screen.** Free, no account, works today, real
   icon, full screen. Not a native app, but it looks and feels like one.
2. **Expo Go.** Free. Works because Expo Go in the App Store is built for the same
   SDK as this project. It needs the tunnel, which your network blocked, or the
   phone on the same Wi-Fi as your computer.
3. **TestFlight.** The proper iPhone beta, with notifications and the real icon, and
   it costs 99 dollars a year because Apple requires a paid developer account for
   any app installed from outside the App Store.

For the boss in the UK today, option 1 is the one that works with no fuss, and the
APK is the one that works if he is on Android.

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
8. Set the app lock PIN when the app offers it. Then sign out from your account
   screen and sign back in with your number: after the six digit code, the app
   should ask for your PIN, and let you in with it.
9. Turn dark mode on in Settings and look at the home screen, the profile, and
   each service page. It should change as soon as you tap.

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
