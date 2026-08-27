import { describe, expect, it } from "vitest";

import { PICKUP_WINDOWS, type PickupLocation } from "../lib/mobile-request-contract";

describe("Laundry mobile request contract", () => {
  it("uses only the staff-approved pickup windows", () => {
    expect(PICKUP_WINDOWS).toEqual(["9:00–11:00", "11:00–13:00", "13:00–15:00", "15:00–17:00"]);
  });

  it("keeps an optional one-time pickup point to coordinates and optional accuracy only", () => {
    const pickupPoint: PickupLocation = { latitude: 6.6885, longitude: -1.6244, accuracyMeters: 36 };
    expect(pickupPoint).toEqual({ latitude: 6.6885, longitude: -1.6244, accuracyMeters: 36 });
  });
});
