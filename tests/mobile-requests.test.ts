import { describe, expect, it } from "vitest";

import { PICKUP_WINDOWS } from "../lib/mobile-request-contract";

describe("Laundry mobile request contract", () => {
  it("uses only the staff-approved pickup windows", () => {
    expect(PICKUP_WINDOWS).toEqual(["9:00–11:00", "11:00–13:00", "13:00–15:00", "15:00–17:00"]);
  });
});
