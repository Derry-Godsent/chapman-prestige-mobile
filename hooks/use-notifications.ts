import { useCallback, useEffect, useState } from "react";

import { getCurrentCustomerAccount } from "@/lib/customer-auth";
import { loadCustomerActivity } from "@/lib/customer-activity";
import {
  buildNotifications,
  CustomerNotification,
  markNotificationsRead,
  readNotificationIds,
  unreadCount,
} from "@/lib/customer-notifications";

/**
 * The customer's notifications, shared by the bell on the home screen and the
 * Updates screen, so both always agree on what is unread.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const account = await getCurrentCustomerAccount().catch(() => null);
      const activity = await loadCustomerActivity(account?.client_id ?? null);
      setSignedIn(activity.signedIn);
      setNotifications(buildNotifications(activity));
      setReadIds(await readNotificationIds());
    } catch {
      setNotifications([]);
      setSignedIn(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markAllRead = useCallback(async () => {
    const ids = notifications.map((entry) => entry.id);
    await markNotificationsRead(ids);
    setReadIds(await readNotificationIds());
  }, [notifications]);

  return { notifications, unread: unreadCount(notifications, readIds), readIds, signedIn, loading, reload: load, markAllRead };
}
