import { Booking, BookingStatus, LaundryItem, formatGhs } from "./chapman-data";

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

export function toLaundryItem(row: ChapmanServicePricingRow): LaundryItem {
  return {
    id: row.id,
    name: row.name,
    price: asNumber(row.base_price ?? row.price_wash),
    category: row.super_cat ?? row.category,
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
