import { describe, expect, it } from "vitest";

import { asNumber, toBooking, toLaundryItem } from "../lib/chapman-transformers";

describe("Chapman service and order adapters", () => {
  it("converts database numeric strings into a mobile laundry item", () => {
    const item = toLaundryItem({
      id: "service-1", name: "Shirt", category: "Tops", price_wash: "7.00", super_cat: "Everyday", base_price: "7.00",
    });
    expect(item).toEqual({ id: "service-1", name: "Shirt", price: 7, category: "Everyday" });
  });

  it("preserves an order total and normalizes a status for the booking UI", () => {
    const booking = toBooking({
      id: "uuid-1", order_id: "CPL-1042", status: "In Progress", total_due: "97.00", created_at: "2026-08-25T09:00:00.000Z",
    });
    expect(booking.status).toBe("in-progress");
    expect(booking.totalLabel).toBe("₵97");
    expect(booking.id).toBe("CPL-1042");
  });

  it("treats empty numeric fields as zero for safe price calculations", () => {
    expect(asNumber(null)).toBe(0);
    expect(asNumber(undefined)).toBe(0);
    expect(asNumber("11.50")).toBe(11.5);
  });
});
