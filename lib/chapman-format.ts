/**
 * Pure display helpers with no React Native, Expo, or Supabase dependency.
 *
 * These live in their own module so pure-logic tests can import them without
 * pulling the React Native runtime into a Node test environment.
 */

/** Formats a cedi amount for display, e.g. 97 -> "₵97". */
export const formatGhs = (amount: number) => `₵${amount.toFixed(0)}`;

/**
 * How long ago something happened, in words a customer reads at a glance.
 *
 * Minutes while it is fresh, hours once an hour has passed, days after that,
 * and a plain date once it is older than a month.
 *
 *   "just now", "4 min ago", "1 hr ago", "yesterday", "6 days ago", "12 Aug"
 *
 * Returns an empty string when there is no usable timestamp, so callers can
 * simply leave the label out.
 */
export function timeAgo(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return "";

  const then = new Date(value);
  const thenMs = then.getTime();
  if (Number.isNaN(thenMs)) return "";

  const seconds = Math.floor((now.getTime() - thenMs) / 1000);

  // A clock that is slightly ahead (server time versus phone time) reads as
  // brand new rather than as a negative age.
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 min ago" : `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hr ago" : `${hours} hrs ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  return then.toLocaleDateString("en-GH", { day: "numeric", month: "short" });
}

/**
 * Sorts anything carrying a timestamp so the most recent item comes first.
 * Items with an unreadable timestamp keep their relative order at the end.
 */
export function newestFirst<T>(items: T[], timestamp: (item: T) => string | null | undefined): T[] {
  const rank = (item: T) => {
    const value = timestamp(item);
    const ms = value ? new Date(value).getTime() : Number.NaN;
    return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
  };
  return [...items].sort((a, b) => rank(b) - rank(a));
}
