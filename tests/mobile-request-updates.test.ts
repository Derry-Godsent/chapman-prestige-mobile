import { describe, expect, it } from "vitest";

import { getStaffRequestUpdateNotice, isDeclinedRequest } from "../lib/mobile-request-updates";

describe("mobile request update presentation", () => {
  it("alerts customers only for staff outcomes requiring attention", () => {
    expect(getStaffRequestUpdateNotice("needs_customer_confirmation")?.title).toContain("proposed");
    expect(getStaffRequestUpdateNotice("declined")?.title).toContain("declined");
    expect(getStaffRequestUpdateNotice("under_review")).toBeNull();
  });

  it("treats declined and cancelled requests as negative outcomes", () => {
    expect(isDeclinedRequest("declined")).toBe(true);
    expect(isDeclinedRequest("cancelled")).toBe(true);
    expect(isDeclinedRequest("confirmed")).toBe(false);
  });
});
