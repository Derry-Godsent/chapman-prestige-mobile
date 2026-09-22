import { useCallback, useEffect, useState } from "react";

import { useCustomerAccount } from "@/hooks/use-customer-account";
import { readCustomerAccount } from "@/hooks/use-customer-account";
import { CustomerActivity, loadCustomerActivity } from "@/lib/customer-activity";
import { laundryStanding, serviceStanding, TrackStanding } from "@/lib/loyalty";

/**
 * One read of the signed-in customer's account, their real activity, and the
 * loyalty standing that follows from it. The home screen, the profile screen and
 * the loyalty screen all use this, so they can never disagree with each other.
 */
export function useCustomerSummary() {
  const { account, checking } = useCustomerAccount();
  const [activity, setActivity] = useState<CustomerActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const load = useCallback(async () => {
    setActivityLoading(true);
    try {
      setActivity(await loadCustomerActivity(readCustomerAccount()?.client_id ?? null));
    } finally {
      setActivityLoading(false);
    }
  }, []);

  // Wait for the account before reading activity, so the first read is the
  // signed-in customer's own records rather than a guess.
  const clientId = account?.client_id ?? null;
  useEffect(() => {
    if (checking) return;
    void load();
  }, [checking, clientId, load]);

  const loading = checking || activityLoading;

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
