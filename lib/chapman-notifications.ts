import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { StaffRequestUpdateNotice } from "./mobile-request-updates";

const DAILY_IDENTIFIER_KEY = "chapman-daily-update";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function enableDailyChapmanUpdates() {
  if (Platform.OS === "web") return { enabled: false, message: "Daily device notifications are available in the mobile app." };
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("chapman-updates", { name: "Chapman updates", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 180], lightColor: "#0038B6" });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return { enabled: false, message: "Notification permission was not granted." };
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((item) => item.content.data?.kind === DAILY_IDENTIFIER_KEY).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  await Notifications.scheduleNotificationAsync({ content: { title: "Chapman Prestige Limited", body: "See today’s service news, care tips, and offers.", data: { kind: DAILY_IDENTIFIER_KEY, url: "/notifications" } }, trigger: { hour: 9, minute: 0, repeats: true, channelId: "chapman-updates" } });
  return { enabled: true, message: "Daily updates are scheduled for 9:00 AM." };
}

export async function disableDailyChapmanUpdates() {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((item) => item.content.data?.kind === DAILY_IDENTIFIER_KEY).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

/** Shows a device alert for a live staff update only when the customer has already allowed notifications. */
export async function showLiveServiceUpdate(notice: StaffRequestUpdateNotice, requestId: string) {
  if (!notice || Platform.OS === "web") return false;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return false;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("chapman-service-updates", { name: "Chapman service updates", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180], lightColor: "#047857" });
  await Notifications.scheduleNotificationAsync({ content: { title: notice.title, body: notice.body, data: { kind: "chapman-service-update", requestId, url: `/booking/${requestId}` } }, trigger: null });
  return true;
}
