export const PICKUP_WINDOWS = ["9:00–11:00", "11:00–13:00", "13:00–15:00", "15:00–17:00"] as const;
export type PickupWindow = (typeof PICKUP_WINDOWS)[number];

export type SubmittedLaundryItem = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type PickupLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
};

export type MobileLaundryRequest = {
  id: string;
  request_status: "pending" | "under_review" | "needs_customer_confirmation" | "confirmed" | "declined" | "cancelled" | "converted";
  requested_for: string | null;
  confirmed_for: string | null;
  pickup_area: string | null;
  pickup_address: string | null;
  pickup_window: PickupWindow | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_accuracy_meters: number | null;
  laundry_items: SubmittedLaundryItem[];
  express: boolean;
  estimated_total: number | string | null;
  customer_note: string | null;
  customer_response: "accepted" | "rejected" | null;
  created_at: string;
};

export type MobileRequestEvent = {
  id: number;
  mobile_request_id: string;
  actor_type: "customer" | "staff" | "system";
  event_type: string;
  note: string | null;
  created_at: string;
};
