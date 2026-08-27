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
}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("complete_customer_onboarding", {
    p_full_name: input.fullName,
    p_gender: input.gender,
    p_email: input.email ?? null,
  });
  if (!error) return data as CustomerAccount;

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
    .select("auth_user_id, client_id, phone, full_name, email, gender, avatar_style, profile_completed_at")
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
