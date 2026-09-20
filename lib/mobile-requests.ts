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
  paymentMethod: string;
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

export async function submitMobileLaundryRequest(input: LaundryRequestInput): Promise<MobileLaundryRequest> {
  const client = requireSupabase();
  
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  // DEBUG: This will print the exact IDs being sent to the database
  const itemsToSend = input.items.map(i => ({
    id: i.item.id,
    name: i.item.name,
    quantity: i.quantity,
    price: i.item.price_wash || 0
  }));
  console.log("🔍 DEBUG: Items being sent to RPC:", JSON.stringify(itemsToSend, null, 2));

  const { data: requestData, error: requestError } = await client.rpc("submit_mobile_laundry_request", {
    p_requested_for: input.requestedFor,
    p_pickup_area: input.pickupArea,
    p_pickup_address: input.pickupAddress,
    p_pickup_window: input.pickupWindow,
    p_laundry_items: itemsToSend,
    p_express: input.express,
    p_customer_note: input.customerNote ? `Payment: ${input.paymentMethod} | ${input.customerNote}` : `Payment: ${input.paymentMethod}`,
    p_pickup_latitude: input.pickupLocation?.latitude ?? null,
    p_pickup_longitude: input.pickupLocation?.longitude ?? null,
    p_pickup_accuracy_meters: input.pickupLocation?.accuracyMeters ?? null,
  });

  if (requestError) {
    console.error('❌ Supabase RPC Error:', requestError);
    throw new Error('Chapman could not receive this request. Please try again.');
  }

  return {
    id: requestData.id,
    request_status: requestData.request_status || 'pending',
    requested_for: requestData.requested_for || input.requestedFor,
    pickup_area: requestData.pickup_area,
    pickup_address: requestData.pickup_address,
    pickup_window: requestData.pickup_window,
    laundry_items: requestData.laundry_items || input.items,
    express: requestData.express ?? input.express,
    estimated_total: requestData.estimated_total,
    created_at: requestData.created_at || new Date().toISOString(),
  } as any;
}
export async function getMobileLaundryRequest(requestId: string): Promise<MobileLaundryRequest | null> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  // FIX: Query 'mobile_requests' table, not 'orders'
  const { data, error } = await client
    .from('mobile_requests')
    .select('id, request_status, requested_for, confirmed_for, pickup_area, pickup_address, pickup_window, pickup_latitude, pickup_longitude, pickup_accuracy_meters, laundry_items, express, estimated_total, customer_note, staff_note, customer_response, created_at')
    .eq('id', requestId) 
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    request_status: data.request_status || 'pending',
    requested_for: data.requested_for || 'Today',
    confirmed_for: data.confirmed_for,
    pickup_area: data.pickup_area,
    pickup_address: data.pickup_address,
    pickup_window: data.pickup_window,
    pickup_latitude: data.pickup_latitude,
    pickup_longitude: data.pickup_longitude,
    pickup_accuracy_meters: data.pickup_accuracy_meters,
    laundry_items: data.laundry_items || [],
    express: data.express || false,
    estimated_total: data.estimated_total,
    customer_note: data.customer_note,
    staff_note: data.staff_note,
    customer_response: data.customer_response,
    created_at: data.created_at,
  } as any;
}

export async function getMyMobileLaundryRequests(): Promise<MobileLaundryRequest[]> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  // FIX: Query 'mobile_requests' table, not 'orders'
  const { data, error } = await client
    .from('mobile_requests')
    .select('id, request_status, requested_for, confirmed_for, pickup_area, pickup_address, pickup_window, pickup_latitude, pickup_longitude, pickup_accuracy_meters, laundry_items, express, estimated_total, customer_note, staff_note, customer_response, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((req: any) => ({
    id: req.id,
    request_status: req.request_status || 'pending',
    requested_for: req.requested_for || 'Today',
    confirmed_for: req.confirmed_for,
    pickup_area: req.pickup_area,
    pickup_address: req.pickup_address,
    pickup_window: req.pickup_window,
    pickup_latitude: req.pickup_latitude,
    pickup_longitude: req.pickup_longitude,
    pickup_accuracy_meters: req.pickup_accuracy_meters,
    laundry_items: req.laundry_items || [],
    express: req.express || false,
    estimated_total: req.estimated_total,
    customer_note: req.customer_note,
    staff_note: req.staff_note,
    customer_response: req.customer_response,
    created_at: req.created_at,
  })) as MobileLaundryRequest[];
}

export async function getMobileRequestEvents(requestId: string): Promise<MobileRequestEvent[]> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  // FIX: Query 'mobile_request_events' table
  const { data, error } = await client
    .from('mobile_request_events')
    .select('id, mobile_request_id, actor_type, event_type, note, created_at')
    .eq('mobile_request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []) as MobileRequestEvent[];
}

export async function respondToMobileRequestDate(requestId: string, response: CustomerDateResponse): Promise<MobileLaundryRequest> {
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new CustomerSignInRequiredError();

  // FIX: Use the designated RPC for customer responses
  const { data, error } = await client.rpc("respond_to_mobile_request_date", {
    p_request_id: requestId,
    p_response: response, // "accepted" or "rejected"
  });

  if (error) throw error;
  if (!data) throw new Error("Chapman could not save your response. Please try again.");

  return {
    id: data.id,
    request_status: data.request_status || 'pending',
    requested_for: data.requested_for || 'Today',
    confirmed_for: data.confirmed_for,
    pickup_area: data.pickup_area,
    pickup_address: data.pickup_address,
    pickup_window: data.pickup_window,
    pickup_latitude: data.pickup_latitude,
    pickup_longitude: data.pickup_longitude,
    pickup_accuracy_meters: data.pickup_accuracy_meters,
    laundry_items: data.laundry_items || [],
    express: data.express || false,
    estimated_total: data.estimated_total,
    customer_note: data.customer_note,
    staff_note: data.staff_note,
    customer_response: data.customer_response,
    created_at: data.created_at,
  } as any;
}