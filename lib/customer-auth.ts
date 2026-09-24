import { CustomerGender, normalizeGhanaPhone } from "@/lib/customer-auth-utils";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const CUSTOMER_GUEST_SESSION_KEY = "chapman-guest-session";

export type CustomerAccount = {
  auth_user_id: string;
  client_id: string | null;
  phone: string;
  full_name: string | null;
  email: string | null;
  gender: CustomerGender;
  avatar_style: "female" | "male" | "neutral";
  profile_completed_at: string | null;
  /** Day of the month, 1 to 31. Kept only to wish the customer on the day. */
  birth_day?: number | null;
  /** Month, 1 to 12. The year is never asked for and never stored. */
  birth_month?: number | null;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Customer sign-in is not configured yet. Please use guest mode for now.");
  }
  return supabase;
}

function accountFromAuthUser(user: User): CustomerAccount {
  const metadata = user.user_metadata as Record<string, unknown>;
  const storedGender = metadata.gender;
  const gender: CustomerGender = storedGender === "female" || storedGender === "male" || storedGender === "prefer_not_to_say"
    ? storedGender
    : "prefer_not_to_say";

  return {
    auth_user_id: user.id,
    client_id: null,
    phone: user.phone ?? "",
    full_name: typeof metadata.full_name === "string" ? metadata.full_name : null,
    email: user.email ?? (typeof metadata.email === "string" ? metadata.email : null),
    gender,
    avatar_style: gender === "female" ? "female" : gender === "male" ? "male" : "neutral",
    profile_completed_at: typeof metadata.profile_completed_at === "string" ? metadata.profile_completed_at : null,
    birth_day: typeof metadata.birth_day === "number" ? metadata.birth_day : null,
    birth_month: typeof metadata.birth_month === "number" ? metadata.birth_month : null,
  };
}

export async function sendCustomerOtp(phoneInput: string) {
  const phone = normalizeGhanaPhone(phoneInput);
  if (!phone) throw new Error("Enter the 9 digits after +233, for example 24 123 4567.");

  const client = requireSupabase();
  const { error } = await client.auth.signInWithOtp({ phone });
  if (error) throw error;
  return phone;
}

export async function verifyCustomerOtp(phone: string, token: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
  if (!data.session || !data.user) throw new Error("The code could not create a secure session. Please request a new code.");
  return data;
}

export async function completeCustomerOnboarding(input: {
  fullName: string;
  gender: CustomerGender;
  email?: string;
  /** Optional. Day and month only, so Chapman can wish them on the day. */
  birthDay?: number | null;
  birthMonth?: number | null;
}) {
  const client = requireSupabase();
  const birthday = { p_birth_day: input.birthDay ?? null, p_birth_month: input.birthMonth ?? null };
  const { data, error } = await client.rpc("complete_customer_onboarding", {
    p_full_name: input.fullName,
    p_gender: input.gender,
    p_email: input.email ?? null,
    ...birthday,
  });
  if (!error) {
    // The same details are kept in the customer's own private sign-in record as
    // well. That way a later sign-in on a weak signal can never make the app ask
    // a returning customer to type everything again.
    const saved = data as CustomerAccount | null;
    void client.auth.updateUser({
      data: {
        full_name: input.fullName,
        gender: input.gender,
        profile_completed_at: saved?.profile_completed_at ?? new Date().toISOString(),
        birth_day: input.birthDay ?? null,
        birth_month: input.birthMonth ?? null,
      },
    }).catch(() => undefined);
    return data as CustomerAccount;
  }

  // The larger customer-record migration has not been activated yet. Until it is,
  // save only this signed-in customer's own basic profile in Supabase Auth metadata.
  // This does not grant access to clients, orders, bookings, or staff data.
  if (error.code !== "PGRST202") throw error;
  const completedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await client.auth.updateUser({
    data: {
      full_name: input.fullName,
      gender: input.gender,
      profile_completed_at: completedAt,
      birth_day: input.birthDay ?? null,
      birth_month: input.birthMonth ?? null,
    },
  });
  if (updateError || !updated.user) throw updateError ?? new Error("Your profile could not be saved yet.");
  return accountFromAuthUser(updated.user);
}

export async function getCurrentCustomerAccount(): Promise<CustomerAccount | null> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data, error } = await client
    .from("customer_accounts")
    .select("auth_user_id, client_id, phone, full_name, email, gender, avatar_style, profile_completed_at, birth_day, birth_month")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (!error && data) return data as CustomerAccount;

  const fallbackAccount = accountFromAuthUser(userData.user);
  if (!fallbackAccount.full_name || !fallbackAccount.profile_completed_at) return fallbackAccount;

  // A profile completed before the customer-record migration is kept in the
  // user's own Auth metadata. On first account access after the migration,
  // create the protected customer link from those already-verified details.
  const { data: linkedAccount, error: linkError } = await client.rpc("complete_customer_onboarding", {
    p_full_name: fallbackAccount.full_name,
    p_gender: fallbackAccount.gender,
    p_email: fallbackAccount.email,
    p_birth_day: fallbackAccount.birth_day ?? null,
    p_birth_month: fallbackAccount.birth_month ?? null,
  });
  if (!linkError && linkedAccount) return linkedAccount as CustomerAccount;

  return fallbackAccount;
}

export async function getCustomerSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOutCustomer() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
  await AsyncStorage.removeItem(CUSTOMER_GUEST_SESSION_KEY);
  // The PIN stays on this phone, and that is deliberate.
  //
  // It is the customer's own habit here, and the saved PIN now remembers which
  // account set it, so it can never be asked of somebody else who signs in on a
  // shared phone. Keeping it is what makes the next sign-in end with the PIN
  // rather than starting over: the number is proved by text message, then the PIN
  // confirms it is the same person holding the phone.
  //
  // It is still thrown away when a customer removes it on purpose, or when the
  // five wrong tries are used up.
}

export async function continueAsGuest() {
  await AsyncStorage.setItem(CUSTOMER_GUEST_SESSION_KEY, "true");
}

export async function getLaunchDestination(): Promise<"/(tabs)" | "/onboarding"> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return "/(tabs)";
  }
  return (await AsyncStorage.getItem(CUSTOMER_GUEST_SESSION_KEY)) === "true" ? "/(tabs)" : "/onboarding";
}


/**
 * Adds this customer to the Chapman client records, with the details they gave.
 *
 * Why it exists: a customer who signs up in the app should appear in the staff
 * system as a client, with their name, number, and birthday, without anyone
 * typing them in twice. The app calls this once the customer's own record
 * exists. It is safe to call on every sign-in: if the customer is already a
 * client, the same record is reused and only the details are refreshed.
 *
 * Returns plainly what happened, so the app can say something true rather than
 * pretend. A missing function means the Chapman side has not been switched on
 * yet, which is not an error the customer needs to see.
 */
export async function linkCustomerToChapmanClients(input: { birthDay?: number | null; birthMonth?: number | null } = {}): Promise<{
  linked: boolean;
  message: string;
}> {
  const client = supabase;
  if (!client) return { linked: false, message: "Sign-in is not configured on this build." };

  const { data, error } = await client.rpc("link_customer_to_chapman_client", {
    p_birth_day: input.birthDay ?? null,
    p_birth_month: input.birthMonth ?? null,
  });

  if (error) {
    if (error.code === "PGRST202") {
      return { linked: false, message: "The Chapman client link is not switched on yet. Your own account is saved." };
    }
    return { linked: false, message: "Your details are saved. The Chapman client list could not be updated just now." };
  }

  const linked = Boolean((data as { linked?: boolean } | null)?.linked);
  return { linked, message: linked ? "Chapman now has you in their client records." : "Your details are saved." };
}

/** True when the customer's own date, day and month, is today. */
export function isBirthdayToday(account: { birth_day?: number | null; birth_month?: number | null } | null | undefined, today = new Date()): boolean {
  if (!account?.birth_day || !account?.birth_month) return false;
  return account.birth_day === today.getDate() && account.birth_month === today.getMonth() + 1;
}

/** The birthday written out, for the profile: "12 June". */
export function formatBirthday(day: number | null | undefined, month: number | null | undefined): string | null {
  if (!day || !month || month < 1 || month > 12) return null;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${day} ${months[month - 1]}`;
}
