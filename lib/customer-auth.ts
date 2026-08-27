import { CustomerGender, normalizeGhanaPhone } from "@/lib/customer-auth-utils";
import { supabase } from "@/lib/supabase";

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
  if (error) throw error;
  return data as CustomerAccount;
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
  if (error) throw error;
  return data as CustomerAccount | null;
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
}
