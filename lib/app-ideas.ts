import { supabase } from "@/lib/supabase";

/**
 * Sending an idea from inside the app.
 *
 * A signed-in customer can send one, and Chapman sees it in
 * public.chapman_app_ideas together with their name and number, so the reply can
 * find them. A guest cannot send one, and the app says so plainly rather than
 * pretending it worked.
 *
 * This never throws: the screen shows the message that comes back.
 */

export type AppIdeaKind = "add" | "remove" | "change";

export const APP_IDEA_KINDS: { value: AppIdeaKind; label: string; hint: string }[] = [
  { value: "add", label: "Add something", hint: "Something the app should do and does not." },
  { value: "remove", label: "Remove something", hint: "Something that gets in your way." },
  { value: "change", label: "Change something", hint: "Something that should work differently." },
];

export async function sendAppIdea(input: {
  kind: AppIdeaKind;
  idea: string;
  authorName?: string | null;
  phone?: string | null;
}): Promise<{ sent: boolean; message: string }> {
  const client = supabase;
  if (!client) return { sent: false, message: "Sending ideas needs the app to be connected to Chapman. Please try again later." };

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) {
    return { sent: false, message: "Sign in with your phone first, so Chapman knows who the idea came from and can reply." };
  }

  const idea = input.idea.trim();
  if (idea.length < 4) return { sent: false, message: "Please write a little more, so the idea is clear." };

  const { error } = await client.from("chapman_app_ideas").insert({
    author_name: input.authorName ?? null,
    phone: input.phone ?? null,
    kind: input.kind,
    idea,
  });

  if (error) {
    // The table arrives with the customers and ideas statement. Until it has
    // been run on this project, say so honestly instead of blaming the idea.
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { sent: false, message: "Ideas are not switched on for this project yet. Your idea is not lost on your side: please tell Chapman directly for now." };
    }
    return { sent: false, message: "The idea could not be sent just now. Please try again in a moment." };
  }

  return { sent: true, message: "Thank you. Chapman has your idea." };
}
