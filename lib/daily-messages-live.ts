import { supabase } from "@/lib/supabase";
import { DailyMessage, MORNINGS_AHEAD, builtInDailyMessages } from "@/lib/daily-messages";

/**
 * The messages Chapman has written, read from the app's own database.
 *
 * The office writes these in the message table: care tips, service news,
 * holiday notices, announcements, and thank-you notes. The app reads the ones
 * that are due and books the next mornings on the customer's own phone, which is
 * why the message arrives at 9:00 even when the app is closed and even with no
 * internet.
 *
 * If the table is not there yet, or the phone is offline, the built-in messages
 * are used instead, so the morning message works today and gets better the
 * moment Chapman starts writing their own.
 *
 * Never throws and never returns nothing: a customer who switched the daily
 * message on must keep receiving one.
 */
export async function loadDailyMessages(): Promise<DailyMessage[]> {
  const client = supabase;
  if (!client) return builtInDailyMessages;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await client
      .from("chapman_daily_messages")
      .select("kind, title, body, publish_on")
      .lte("publish_on", today)
      .order("publish_on", { ascending: false })
      .limit(MORNINGS_AHEAD);

    if (error || !data || data.length === 0) return builtInDailyMessages;

    return data
      .map((row) => ({
        kind: typeof row.kind === "string" ? row.kind : "news",
        title: typeof row.title === "string" && row.title.trim() ? row.title : "Chapman update",
        body: typeof row.body === "string" ? row.body : "",
      }))
      .filter((message) => message.body.trim() !== "");
  } catch {
    return builtInDailyMessages;
  }
}
