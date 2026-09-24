import { useCallback, useEffect, useState } from "react";

import { loadCustomerAccount } from "@/hooks/use-customer-account";
import { loadCustomerActivity } from "@/lib/customer-activity";
import { loadDailyMessages } from "@/lib/daily-messages-live";
import {
  buildNotifications,
  CustomerNotification,
  newsNotifications,
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
      const account = await loadCustomerAccount();
      const activity = await loadCustomerActivity(account?.client_id ?? null);
      setSignedIn(activity.signedIn);
      // Chapman's own messages lead the list, because they are the same messages
      // that arrive as the 9:00 phone alert.
      const news = newsNotifications(await loadDailyMessages());
      setNotifications([...news, ...buildNotifications(activity)]);
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
