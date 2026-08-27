import type { CartLine } from "./chapman-data";
import { supabase } from "./supabase";
import type { MobileLaundryRequest, MobileRequestEvent, PickupWindow } from "./mobile-request-contract";

export { PICKUP_WINDOWS } from "./mobile-request-contract";
export type { MobileLaundryRequest, MobileRequestEvent, PickupWindow } from "./mobile-request-contract";

export type LaundryRequestInput = {
  requestedFor: string;
  pickupArea: string;
  pickupAddress: string;
  pickupWindow: PickupWindow;
  items: CartLine[];
  express: boolean;
  customerNote?: string;
};

export type CustomerDateResponse = "accepted" | "rejected";

export class CustomerSignInRequiredError extends Error {
  constructor() {
    super("Please sign in before sending this Laundry request.");
    this.name = "CustomerSignInRequiredError";
  }
}

function requireSupabase() {
  if (!supabase) throw new Error("Live requests are not configured yet. Please try again shortly.");
  return supabase;
}

/**
 * Sends only item identifiers and quantities. The database procedure verifies
 * every item, derives the customer from the signed-in session, and calculates
 * the official estimate from Chapman’s approved Laundry price catalogue.
 */
export async function submitMobileLaundryRequest(input: LaundryRequestInput): Promise<MobileLaundryRequest> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  const { data, error } = await client.rpc("submit_mobile_laundry_request", {
    p_requested_for: input.requestedFor,
    p_pickup_area: input.pickupArea.trim(),
    p_pickup_address: input.pickupAddress.trim(),
    p_pickup_window: input.pickupWindow,
    p_laundry_items: input.items.map((line) => ({ id: line.item.id, quantity: line.quantity })),
    p_express: input.express,
    p_customer_note: input.customerNote?.trim() || null,
  });

  if (error) throw error;
  if (!data) throw new Error("Chapman could not receive this request. Please try again.");
  return data as MobileLaundryRequest;
}

export async function getMobileLaundryRequest(requestId: string): Promise<MobileLaundryRequest | null> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  const { data, error } = await client
    .from("mobile_requests")
    .select("id, request_status, requested_for, confirmed_for, pickup_area, pickup_address, pickup_window, laundry_items, express, estimated_total, customer_note, created_at")
    .eq("id", requestId)
    .eq("service_code", "laundry")
    .maybeSingle();
  if (error) throw error;
  return data as MobileLaundryRequest | null;
}

export async function getMyMobileLaundryRequests(): Promise<MobileLaundryRequest[]> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  const { data, error } = await client
    .from("mobile_requests")
    .select("id, request_status, requested_for, confirmed_for, pickup_area, pickup_address, pickup_window, laundry_items, express, estimated_total, customer_note, created_at")
    .eq("service_code", "laundry")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MobileLaundryRequest[];
}

export async function getMobileRequestEvents(requestId: string): Promise<MobileRequestEvent[]> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  const { data, error } = await client
    .from("mobile_request_events")
    .select("id, mobile_request_id, actor_type, event_type, note, created_at")
    .eq("mobile_request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MobileRequestEvent[];
}

export async function respondToMobileRequestDate(requestId: string, response: CustomerDateResponse): Promise<MobileLaundryRequest> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  const { data, error } = await client.rpc("respond_to_mobile_request_date", {
    p_request_id: requestId,
    p_response: response,
  });
  if (error) throw error;
  if (!data) throw new Error("Chapman could not save your response. Please try again.");
  return data as MobileLaundryRequest;
}
