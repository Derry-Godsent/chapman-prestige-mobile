import { useCallback, useEffect, useState } from "react";

import { CustomerAccount, getCurrentCustomerAccount } from "@/lib/customer-auth";
import { CustomerActivity, loadCustomerActivity } from "@/lib/customer-activity";
import { laundryStanding, serviceStanding, TrackStanding } from "@/lib/loyalty";

/**
 * One read of the signed-in customer's account, their real activity, and the
 * loyalty standing that follows from it. The home screen, the profile screen and
 * the loyalty screen all use this, so they can never disagree with each other.
 */
export function useCustomerSummary() {
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [activity, setActivity] = useState<CustomerActivity | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await getCurrentCustomerAccount().catch(() => null);
      setAccount(current);
      setActivity(await loadCustomerActivity(current?.client_id ?? null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const laundry: TrackStanding | null = activity ? laundryStanding(activity) : null;
  const services: TrackStanding | null = activity ? serviceStanding(activity) : null;
  const firstName = account?.full_name ? account.full_name.trim().split(/\s+/)[0] : null;
  const initials = account?.full_name
    ? account.full_name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("")
    : "CP";

  return { account, activity, laundry, services, firstName, initials, signedIn: Boolean(activity?.signedIn), loading, reload: load };
}

/** Good morning, good afternoon, good evening, from the phone's own clock. */
export function greetingForHour(hour: number) {
  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}
