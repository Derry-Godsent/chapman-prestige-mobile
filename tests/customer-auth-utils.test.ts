import { describe, expect, it } from "vitest";

import { cleanGhanaLocalEntry, cleanOtpCode, normalizeGhanaPhone } from "../lib/customer-auth-utils";

describe("customer phone authentication helpers", () => {
  it("normalizes familiar Ghana phone formats to E.164", () => {
    expect(normalizeGhanaPhone("024 123 4567")).toBe("+233241234567");
    expect(normalizeGhanaPhone("233241234567")).toBe("+233241234567");
    expect(normalizeGhanaPhone("+233 (24) 123-4567")).toBe("+233241234567");
  });

  it("rejects a non-Ghana or incomplete number", () => {
    expect(normalizeGhanaPhone("024 123 45")).toBeNull();
    expect(normalizeGhanaPhone("+447700900123")).toBeNull();
  });

  it("keeps only the nine digits displayed after the fixed +233 prefix", () => {
    expect(cleanGhanaLocalEntry("024 123 4567")).toBe("241234567");
    expect(cleanGhanaLocalEntry("+233 24 123 4567")).toBe("241234567");
    expect(cleanGhanaLocalEntry("24123456789")).toBe("241234567");
  });

  it("retains only the first six numeric OTP characters", () => {
    expect(cleanOtpCode("12a3-4567")).toBe("123456");
  });
});
