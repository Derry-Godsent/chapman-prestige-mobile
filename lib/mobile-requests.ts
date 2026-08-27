import type { CartLine } from "./chapman-data";
import { supabase } from "./supabase";
import type { MobileLaundryRequest, MobileRequestEvent, PickupLocation, PickupWindow } from "./mobile-request-contract";

export { PICKUP_WINDOWS } from "./mobile-request-contract";
export type { MobileLaundryRequest, MobileRequestEvent, PickupLocation, PickupWindow } from "./mobile-request-contract";

export type LaundryRequestInput = {
  requestedFor: string;
  pickupArea: string;
  pickupAddress: string;
  pickupWindow: PickupWindow;
  items: CartLine[];
  express: boolean;
  customerNote?: string;
  pickupLocation?: PickupLocation | null;
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
 * Sends only item identifiers, quantities, and an optional customer-approved
 * pickup point. The database derives the customer, validates the payload, and
 * calculates the official estimate without trusting the app.
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
    p_pickup_latitude: input.pickupLocation?.latitude ?? null,
    p_pickup_longitude: input.pickupLocation?.longitude ?? null,
    p_pickup_accuracy_meters: input.pickupLocation?.accuracyMeters ?? null,
  });

  if (error) throw error;
  if (!data) throw new Error("Chapman could not receive this request. Please try again.");
  return data as MobileLaundryRequest;
}

const requestFields = "id, request_status, requested_for, confirmed_for, pickup_area, pickup_address, pickup_window, pickup_latitude, pickup_longitude, pickup_accuracy_meters, laundry_items, express, estimated_total, customer_note, customer_response, created_at";

export async function getMobileLaundryRequest(requestId: string): Promise<MobileLaundryRequest | null> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();
  const { data, error } = await client.from("mobile_requests").select(requestFields).eq("id", requestId).eq("service_code", "laundry").maybeSingle();
  if (error) throw error;
  return data as MobileLaundryRequest | null;
}

export async function getMyMobileLaundryRequests(): Promise<MobileLaundryRequest[]> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();
  const { data, error } = await client.from("mobile_requests").select(requestFields).eq("service_code", "laundry").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MobileLaundryRequest[];
}

export async function getMobileRequestEvents(requestId: string): Promise<MobileRequestEvent[]> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();
  const { data, error } = await client.from("mobile_request_events").select("id, mobile_request_id, actor_type, event_type, note, created_at").eq("mobile_request_id", requestId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MobileRequestEvent[];
}

export async function respondToMobileRequestDate(requestId: string, response: CustomerDateResponse): Promise<MobileLaundryRequest> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();
  const { data, error } = await client.rpc("respond_to_mobile_request_date", { p_request_id: requestId, p_response: response });
  if (error) throw error;
  if (!data) throw new Error("Chapman could not save your response. Please try again.");
  return data as MobileLaundryRequest;
}
