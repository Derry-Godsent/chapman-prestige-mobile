import type { MobileLaundryRequest } from "./mobile-request-contract";

export type StaffRequestUpdateNotice = { title: string; body: string } | null;

/** Returns a customer-facing alert only for staff outcomes that require attention. */
export function getStaffRequestUpdateNotice(status: MobileLaundryRequest["request_status"]): StaffRequestUpdateNotice {
  if (status === "needs_customer_confirmation") return { title: "Chapman proposed a service date", body: "Open your Laundry request to accept the date or ask for another option." };
  if (status === "declined") return { title: "Laundry request declined", body: "Chapman could not approve this request. Open it to message the team for help." };
  return null;
}

export function isDeclinedRequest(status: MobileLaundryRequest["request_status"] | undefined) {
  return status === "declined" || status === "cancelled";
}
