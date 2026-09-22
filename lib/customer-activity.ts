import { supabase } from "@/lib/supabase";

/**
 * Everything the customer sees about their own account, read from the database
 * rather than invented on the screen.
 *
 * Three sources, all of them real:
 * 1. Laundry requests (mobile_requests) that this customer sent.
 * 2. Cleaning and service enquiries (quote_requests) that this customer sent.
 * 3. Their activity trail (mobile_request_events), written by Chapman's team as
 *    a request is reviewed, confirmed and completed.
 *
 * Nothing here is a placeholder. If the customer has done nothing yet, every
 * screen that uses this says so plainly instead of showing a made up number.
 */

export type ActivityRequest = {
  id: string;
  kind: "laundry";
  status: string;
  requestedFor: string | null;
  confirmedFor: string | null;
  pickupArea: string | null;
  pickupWindow: string | null;
  estimatedTotal: number | null;
  staffNote: string | null;
  customerResponse: string | null;
  createdAt: string;
  itemCount: number;
};

export type ActivityQuote = {
  id: string;
  kind: "service";
  serviceId: string | null;
  serviceTitle: string;
  propertyType: string;
  preference: string;
  appointmentResponse: string;
  proposedDate: string | null;
  declinedReason: string | null;
  createdAt: string;
};

export type ActivityEvent = {
  id: string;
  requestId: string;
  note: string;
  createdAt: string;
};

export type CustomerOrder = {
  id: string;
  status: string | null;
  totalDue: number;
  createdAt: string;
};

export type CustomerActivity = {
  signedIn: boolean;
  requests: ActivityRequest[];
  quotes: ActivityQuote[];
  events: ActivityEvent[];
  orders: CustomerOrder[];
  /** True when a request could not be read, so the screen can say so instead of lying. */
  failed: boolean;
};

const EMPTY: CustomerActivity = { signedIn: false, requests: [], quotes: [], events: [], orders: [], failed: false };

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadCustomerActivity(clientId: string | null): Promise<CustomerActivity> {
  if (!supabase) return EMPTY;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return EMPTY;

  const [requestResult, quoteResult, orderResult] = await Promise.all([
    supabase
      .from("mobile_requests")
      .select("id, request_status, requested_for, confirmed_for, pickup_area, pickup_window, estimated_total, staff_note, customer_response, created_at, laundry_items")
      .eq("customer_account_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("quote_requests")
      .select("id, service_id, service_title, property_type, preference, appointment_response, declined_reason, details, created_at")
      .eq("customer_account_id", userId)
      .order("created_at", { ascending: false }),
    clientId
      ? supabase
          .from("orders")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null } as { data: any[]; error: null }),
  ]);

  const failed = Boolean(requestResult.error || quoteResult.error);
  if (orderResult.error) {
    // Order records are a bonus on this screen, not the point of it. If they
    // cannot be read, the customer still sees every request and enquiry.
    console.warn("Chapman: order history could not be read for this account.");
  }

  const requests: ActivityRequest[] = (requestResult.data ?? []).map((row: any) => ({
    id: row.id,
    kind: "laundry",
    status: row.request_status || "pending",
    requestedFor: row.requested_for ?? null,
    confirmedFor: row.confirmed_for ?? null,
    pickupArea: row.pickup_area ?? null,
    pickupWindow: row.pickup_window ?? null,
    estimatedTotal: numberOrNull(row.estimated_total),
    staffNote: row.staff_note ?? null,
    customerResponse: row.customer_response ?? null,
    createdAt: row.created_at,
    itemCount: Array.isArray(row.laundry_items)
      ? row.laundry_items.reduce((total: number, item: any) => total + Number(item?.quantity ?? 1), 0)
      : 0,
  }));

  const quotes: ActivityQuote[] = (quoteResult.data ?? []).map((row: any) => ({
    id: row.id,
    kind: "service",
    serviceId: row.service_id ?? null,
    serviceTitle: row.service_title || "Service request",
    propertyType: row.property_type || "",
    preference: row.preference || "",
    appointmentResponse: row.appointment_response || "awaiting-chapman",
    proposedDate: row.details?.proposedDate ?? null,
    declinedReason: row.declined_reason ?? null,
    createdAt: row.created_at,
  }));

  // Different order records use different names for the money, so read whichever
  // of them the row actually carries rather than assuming one.
  const orders: CustomerOrder[] = ((orderResult.data ?? []) as any[]).map((row) => ({
    id: row.id,
    status: row.status ?? null,
    totalDue: numberOrNull(row.total_due ?? row.total ?? row.amount ?? row.grand_total) ?? 0,
    createdAt: row.created_at,
  }));

  // The activity trail for those requests, newest first.
  let events: ActivityEvent[] = [];
  if (requests.length) {
    const { data: eventRows, error: eventError } = await supabase
      .from("mobile_request_events")
      .select("id, request_id, note, created_at")
      .in("request_id", requests.map((request) => request.id))
      .order("created_at", { ascending: false })
      .limit(60);
    if (!eventError) {
      events = (eventRows ?? []).map((row: any) => ({
        id: row.id,
        requestId: row.request_id,
        note: row.note || "Update from Chapman",
        createdAt: row.created_at,
      }));
    }
  }

  return { signedIn: true, requests, quotes, events, orders, failed };
}

/** How many of this customer's requests have reached the finished end of the journey. */
export function isFinishedRequest(status: string | null | undefined) {
  return status === "declined" || status === "cancelled" || status === "completed" || status === "converted";
}

export function isFinishedQuote(response: string | null | undefined) {
  return response === "declined" || response === "accepted";
}

export function requestStatusLabel(status: string) {
  switch (status) {
    case "pending": return "Waiting for Chapman";
    case "under_review": return "Chapman is checking";
    case "needs_customer_confirmation": return "Date to accept";
    case "confirmed": return "Date confirmed";
    case "completed": return "Completed";
    case "converted": return "Completed";
    case "declined": return "Not taken";
    case "cancelled": return "Cancelled";
    default: return "In progress";
  }
}

export function quoteStatusLabel(response: string) {
  switch (response) {
    case "awaiting-chapman": return "Waiting for Chapman";
    case "awaiting-customer": return "Date to accept";
    case "accepted": return "Accepted";
    case "rejected": return "New date requested";
    case "declined": return "Not taken";
    default: return "In progress";
  }
}
