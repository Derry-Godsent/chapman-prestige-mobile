import { describe, expect, it } from "vitest";

import { calculateAreaSquareMetres, carpetEstimateLabel } from "../lib/quote-guidance";

describe("camera-assisted carpet estimate helpers", () => {
  it("calculates an entered area in square metres", () => {
    expect(calculateAreaSquareMetres("3.2", "2.5")).toBe(8);
  });

  it("keeps carpet price guidance above the service minimum", () => {
    expect(carpetEstimateLabel(8)).toBe("₵200–₵200 estimated");
  });
});
