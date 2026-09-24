# Chapman Prestige, the customer app

This is the Chapman Prestige app: laundry and home services for customers, in one place.
It runs on a phone through Expo Go, and in a browser on a computer.

## What you need first

1. **Node.js**, version 20 or newer. Download the LTS version from
   [nodejs.org](https://nodejs.org) and install it.
2. **A phone**, if you want to see it on a real phone. Install **Expo Go** from the App Store
   (iPhone) or Play Store (Android).
3. **Git**, which is already on most computers. If the steps below say git is not found,
   install it from [git-scm.com](https://git-scm.com).

## Download the project

Open Terminal (Mac) or Command Prompt (Windows) and run these, one line at a time:

```
git clone https://github.com/Derry-Godsent/chapman-prestige-mobile.git
```

```
cd chapman-prestige-mobile
```

```
git checkout arena/01a0bf82-chapman-prestige-mobile
```

The third line matters. The newest work lives on that branch, not on main.

The app's two settings, the Supabase address and the publishable key, are already saved in
`.env` inside the project, so there is nothing to configure.

## If you already have the project

You only need this part when you want the newest changes from me:

```
git pull
```

## Install and start the app

```
npm install -g pnpm@9.12.0
```

```
pnpm install --frozen-lockfile
```

```
npx expo start
```

The last command prints a square QR code and a short menu of keys.

## Open it

- **On your computer:** press `w` in that same Terminal window. The app opens in your browser.
- **On your phone:** open the **Camera** app on the iPhone, or **Expo Go** on Android, point it
  at the QR code, and tap the link that appears. The app loads on your phone.

To stop the app, go back to Terminal and press `Ctrl` and `C` together.

## Checking your work

Run these in the project folder whenever you want to know the code is sound:

| Command | What it tells you |
| --- | --- |
| `pnpm check` | Whether the code has any type errors |
| `pnpm test` | Whether every test still passes |
| `pnpm lint` | Whether the code style is clean |

## The short version, to paste

If you already cloned the project before, these four lines are all you need:

```
cd chapman-prestige-mobile
```

```
git pull
```

```
pnpm install --frozen-lockfile
```

```
npx expo start
```

Then press `w` for the browser, or point your phone camera at the QR code.

## Where things live

| Path | What is in it |
| --- | --- |
| `app/` | Every screen, one file per screen |
| `lib/` | The rules and the database reads and writes |
| `hooks/` | Shared data that several screens use |
| `components/` | Shared pieces of the screens |
| `docs/ROADMAP.md` | What is done, what is next, and what is waiting on Chapman |
| `docs/staff-web-app/` | The staff system page and its setup, in plain words |
| `docs/BETA.md` | The plan for testing on the boss and staff phones: the APK, the iPhone route, and the checks |
