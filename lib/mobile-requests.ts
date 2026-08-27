import type { CartLine } from "./chapman-data";
import { supabase } from "./supabase";
import type { MobileLaundryRequest, PickupWindow } from "./mobile-request-contract";

export { PICKUP_WINDOWS } from "./mobile-request-contract";
export type { MobileLaundryRequest, PickupWindow } from "./mobile-request-contract";

export type LaundryRequestInput = {
  requestedFor: string;
  pickupArea: string;
  pickupAddress: string;
  pickupWindow: PickupWindow;
  items: CartLine[];
  express: boolean;
  customerNote?: string;
};

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
