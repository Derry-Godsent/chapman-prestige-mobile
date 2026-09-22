import type { Booking, BookingStatus, LaundryItem } from "./chapman-data";
import { formatGhs } from "./chapman-format";

export interface ChapmanServicePricingRow {
  id: string;
  name: string;
  category: string;
  price_wash: number | string | null;
  super_cat: string | null;
  base_price: number | string | null;
}

export interface ChapmanOrderSummaryRow {
  id: string;
  order_id: string;
  status: string | null;
  total_due: number | string | null;
  created_at: string | null;
}

export const asNumber = (value: number | string | null | undefined) => Number(value ?? 0);

/**
 * Converts a database service row into a mobile laundry item.
 *
 * The wash price is the value the booking flow charges per quantity, and it
 * matches the live path in `fetchLaundryItems()`, which reads `price_wash`.
 * The remaining prices stay null until a customer-facing alternative is agreed.
 */
export function toLaundryItem(row: ChapmanServicePricingRow): LaundryItem {
  const washPrice = asNumber(row.price_wash ?? row.base_price);
  return {
    id: row.id,
    name: row.name,
    category: row.super_cat ?? row.category,
    price: washPrice,
    price_wash: washPrice,
    price_iron: null,
    price_fold: null,
    price_hang: null,
  };
}

export function toBooking(row: ChapmanOrderSummaryRow): Booking {
  const rawStatus = (row.status ?? "confirmed").toLowerCase().replaceAll(" ", "-");
  const status: BookingStatus = ["confirmed", "assigned", "en-route", "in-progress", "completed", "quote-requested"].includes(rawStatus)
    ? rawStatus as BookingStatus
    : "confirmed";

  return {
    id: row.order_id || row.id,
    serviceId: "laundry",
    serviceTitle: "Chapman service order",
    status,
    scheduledFor: row.created_at ? `Requested ${new Date(row.created_at).toLocaleDateString()}` : "Schedule pending",
    totalLabel: formatGhs(asNumber(row.total_due)),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}
