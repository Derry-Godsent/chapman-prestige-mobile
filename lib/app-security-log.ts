import { supabase } from "@/lib/supabase";

/**
 * A quiet record of the moments that matter for a customer's account security.
 *
 * Why it exists: if a PIN is removed on somebody's phone, the customer and the
 * Chapman office should be able to see that it happened, and when. Without a
 * record, a PIN being reset quietly leaves no trace at all.
 *
 * What it deliberately does NOT record: the PIN itself, the four digits, the
 * hash, or anything that would help someone guess. Only which kind of event
 * happened, and when.
 *
 * The rules in the database decide who may read these rows: the customer reads
 * their own, and Chapman staff read all of them. A guest reads none.
 *
 * Nothing here ever throws or blocks. A failed record must never stop a customer
 * signing in, setting a PIN, or opening their app, so every failure is swallowed
 * on purpose. The table arrives with docs/customers-birthdays-and-ideas.sql, and
 * until that has been run the writes simply do nothing.
 */

export type SecurityEventKind = "pin_set" | "pin_removed" | "pin_used_up" | "sign_in";

export async function recordSecurityEvent(kind: SecurityEventKind): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { data } = await client.auth.getSession();
    if (!data.session) return;
    await client.from("chapman_app_security_events").insert({ kind });
  } catch {
    // Never disturb the app because of a note that cannot be written.
  }
}
