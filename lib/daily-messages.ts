/**
 * What Chapman wants to say each morning.
 *
 * The words live here, away from the database and the phone, so they can be
 * read and checked on their own. The reading of Chapman's own written messages
 * happens in lib/daily-messages-live.ts.
 */

export type DailyMessage = {
  kind: "tip" | "news" | "holiday" | "announcement" | "thanks" | string;
  title: string;
  body: string;
};

/**
 * The messages the app carries with it, used when Chapman has not written any.
 * One for each morning of the week, so no day is silent.
 */
export const builtInDailyMessages: DailyMessage[] = [
  { kind: "news", title: "Chapman daily update", body: "Today is a good day for a laundry collection. Send a request and Chapman will confirm your date." },
  { kind: "tip", title: "Chapman care tip", body: "Air bedding before it goes back on the bed. Fifteen minutes is enough to keep it fresh." },
  { kind: "tip", title: "Chapman care tip", body: "Wipe spills on sofas while they are still wet. Set-in marks need a deep clean instead." },
  { kind: "news", title: "Chapman daily update", body: "Polytank cleaning keeps your water clear. Ask Chapman to check yours this month." },
  { kind: "tip", title: "Chapman care tip", body: "Carpets last longer with regular vacuuming along the walking paths, not just the middle of the room." },
  { kind: "news", title: "Chapman daily update", body: "Fumigation works best before the rains. Book a visit and Chapman will confirm a date." },
  { kind: "tip", title: "Chapman care tip", body: "Iron shirts on the inside of the collar first. The creases then sit where nobody sees them." },
];

/** The number of mornings the app books ahead. */
export const MORNINGS_AHEAD = 7;

/** A short label for each kind of message, used in the Updates list. */
export function dailyMessageLabel(kind: string): string {
  switch (kind) {
    case "tip": return "Care tip";
    case "holiday": return "Holiday notice";
    case "announcement": return "Announcement";
    case "thanks": return "Thank you";
    default: return "Chapman news";
  }
}
