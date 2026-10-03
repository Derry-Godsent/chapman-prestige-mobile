import { Platform } from "react-native";

/**
 * Keeps the web app up to date, including when it was added to a phone's home
 * screen.
 *
 * Why this exists: in a browser tab, every visit fetches the page again, so new
 * work appears on its own. A page added to a home screen is different. The phone
 * keeps it alive in the background and brings it back without ever asking the
 * server again, and iOS in particular is slow to let go of the page it first
 * downloaded. The result is an app that looks frozen in time, showing work from
 * days ago, until it is deleted and added again.
 *
 * So the app checks for itself. Every build is stamped with an identity (see
 * scripts/build-web.mjs). The stamp is inside the page and also in a small
 * version.json beside it. When the app opens, and again when it comes back to the
 * front after a long time away, the two are compared. If the file is newer, the
 * page reloads once and the newest work appears. Nobody has to delete an icon.
 *
 * Deliberately careful:
 * - It never reloads twice for the same stamp, so a stubborn cache cannot turn
 *   this into a loop that leaves the app unusable.
 * - It only reloads after the app has been away for a while, so nothing is taken
 *   out from under a customer mid-way through a booking.
 * - It does nothing at all on a phone, where Expo delivers updates its own way.
 */

const HIDDEN_BEFORE_RELOAD_MS = 10 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 2500;
const GUARD_KEY = "chapman-update-guard";

/** The stamp this page was built with, or null when it is not a stamped build. */
function pageBuildId(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector('meta[name="chapman-build"]');
  const value = meta?.getAttribute("content")?.trim();
  return value || null;
}

/** Where to ask what the newest stamp is. Set by the page next to the build stamp. */
function versionUrl(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector('meta[name="chapman-build-url"]');
  const value = meta?.getAttribute("content")?.trim();
  return value || null;
}

async function newestBuildId(): Promise<string | null> {
  const declared = versionUrl();
  if (!declared) return null;
  let url: string;
  try {
    // Resolved against the page, so the address is always complete and cannot be
    // read as relative to whatever happens to be in front of it.
    url = new URL(declared, window.location.href).toString();
  } catch {
    return null;
  }
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { id?: unknown };
    return typeof data.id === "string" && data.id.trim() ? data.id.trim() : null;
  } catch {
    // No network, or the file is not there. Not worth telling anybody about.
    return null;
  }
}

type Guard = { stamp: string; at: number };

function alreadyTried(stamp: string): boolean {
  try {
    const raw = sessionStorage.getItem(GUARD_KEY);
    if (!raw) return false;
    const guard = JSON.parse(raw) as Guard;
    return guard.stamp === stamp && Date.now() - guard.at < 5 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberTried(stamp: string): void {
  try {
    sessionStorage.setItem(GUARD_KEY, JSON.stringify({ stamp, at: Date.now() } satisfies Guard));
  } catch {
    // Losing the guard only risks one extra reload, never a loop that sticks.
  }
}

/** Reloads the page, asking the server for it fresh rather than from a cache. */
function reloadForBuild(stamp: string): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("v", stamp);
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

/** True when the app was reloaded for the newest build. */
export async function checkForAppUpdate(): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const current = pageBuildId();
  if (!current) return false;
  const newest = await newestBuildId();
  if (!newest || newest === current) return false;
  if (alreadyTried(newest)) return false;
  rememberTried(newest);
  reloadForBuild(newest);
  return true;
}

let started = false;

/**
 * Starts watching for new work. Called once from the root of the app, and it is
 * safe to call more than once.
 */
export function startUpdateWatch(): void {
  if (Platform.OS !== "web" || typeof window === "undefined" || started) return;
  started = true;

  // Shortly after opening, so the first screen has already settled.
  window.setTimeout(() => { void checkForAppUpdate(); }, FIRST_CHECK_DELAY_MS);

  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    // Back in front. Only worth checking after a real absence, so a customer who
    // switched to another app for a moment is not interrupted.
    if (hiddenAt && Date.now() - hiddenAt > HIDDEN_BEFORE_RELOAD_MS) void checkForAppUpdate();
    hiddenAt = 0;
  });
}
