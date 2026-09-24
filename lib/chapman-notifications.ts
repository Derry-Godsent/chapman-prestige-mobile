import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import type { StaffRequestUpdateNotice } from "./mobile-request-updates";

const DAILY_IDENTIFIER_KEY = "chapman-daily-update";
/** Whether the customer asked for the daily update. Kept on this phone. */
export const DAILY_PREFERENCE_KEY = "chapman-daily-update-wanted";

/**
 * A week of real messages, one per morning.
 *
 * These are not server pushes. The phone holds the schedule itself, which is why
 * they arrive at 9:00 even when the app is closed and even with no internet. The
 * week is put in place when the customer switches the update on, and topped up
 * whenever the app is opened, so the messages stay current.
 */
const DAILY_MESSAGES: Array<{ title: string; body: string }> = [
  { title: "Chapman daily update", body: "Today is a good day for a laundry collection. Send a request and Chapman will confirm your date." },
  { title: "Chapman care tip", body: "Air bedding before it goes back on the bed. Fifteen minutes is enough to keep it fresh." },
  { title: "Chapman care tip", body: "Wipe spills on sofas while they are still wet. Set-in marks need a deep clean instead." },
  { title: "Chapman daily update", body: "Polytank cleaning keeps your water clear. Ask Chapman to check yours this month." },
  { title: "Chapman care tip", body: "Carpets last longer with regular vacuuming along the walking paths, not just the middle of the room." },
  { title: "Chapman daily update", body: "Fumigation works best before the rains. Book a visit and Chapman will confirm a date." },
  { title: "Chapman care tip", body: "Iron shirts on the inside of the collar first. The creases then sit where nobody sees them." },
];

/** Nine in the morning, that many days from today. */
function nextNineAm(dayOffset: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(9, 0, 0, 0);
  return date;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function requestChapmanNotificationPermission() {
  if (Platform.OS === "web") return { enabled: false, message: "Device alerts are available in the mobile app." };
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("chapman-service-updates", { name: "Chapman service updates", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180], lightColor: "#047857" });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  return permission.status === "granted" ? { enabled: true, message: "Service update alerts are on." } : { enabled: false, message: "Service update alerts were not enabled. You can change this later in your phone settings." };
}

/** Whether the customer wants an alert when Chapman changes something on a booking. */
export const BOOKING_ALERTS_KEY = "chapman-booking-alerts-wanted";

/** The booking-alert choice, defaulting to on, as the app has always behaved. */
export async function areBookingAlertsOn(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  return (await AsyncStorage.getItem(BOOKING_ALERTS_KEY)) !== "no";
}

/** Clears the daily messages already waiting on this phone. */
async function cancelScheduledDailyUpdates() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === DAILY_IDENTIFIER_KEY)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

/** How many mornings are already covered by messages waiting on this phone. */
export async function countScheduledDailyUpdates(): Promise<number> {
  if (Platform.OS === "web") return 0;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.filter((item) => item.content.data?.kind === DAILY_IDENTIFIER_KEY).length;
  } catch {
    return 0;
  }
}

/**
 * Whether the daily update is on, told honestly.
 *
 * The answer is yes only when the customer asked for it AND the phone still
 * holds messages to send. If alerts are switched off in the phone's own settings,
 * the phone drops the messages, so this reads off and the switch shows that.
 */
export async function isDailyChapmanUpdateOn(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const wanted = await AsyncStorage.getItem(DAILY_PREFERENCE_KEY);
  if (wanted !== "yes") return false;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return false;
  return (await countScheduledDailyUpdates()) > 0;
}

/** Puts the next week of 9:00 messages on this phone. */
async function scheduleWeekOfDailyUpdates() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("chapman-updates", { name: "Chapman updates", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 180], lightColor: "#047857" });
  }
  await cancelScheduledDailyUpdates();
  await Promise.all(
    DAILY_MESSAGES.map((message, dayOffset) =>
      Notifications.scheduleNotificationAsync({
        content: { title: message.title, body: message.body, data: { kind: DAILY_IDENTIFIER_KEY, url: "/notifications" } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextNineAm(dayOffset), channelId: "chapman-updates" },
      }),
    ),
  );
}

export async function enableDailyChapmanUpdates() {
  if (Platform.OS === "web") return { enabled: false, message: "Daily device notifications are available in the mobile app." };
  const notificationPermission = await requestChapmanNotificationPermission();
  if (!notificationPermission.enabled) {
    await AsyncStorage.removeItem(DAILY_PREFERENCE_KEY);
    return notificationPermission;
  }
  await AsyncStorage.setItem(DAILY_PREFERENCE_KEY, "yes");
  await scheduleWeekOfDailyUpdates();
  return { enabled: true, message: "A Chapman message will arrive at 9:00 every morning." };
}

export async function disableDailyChapmanUpdates() {
  if (Platform.OS === "web") return;
  await AsyncStorage.removeItem(DAILY_PREFERENCE_KEY);
  await cancelScheduledDailyUpdates();
}

/**
 * Keeps the promise the switch makes.
 *
 * Called when the app opens. If the customer asked for daily updates and the
 * phone has fewer than two mornings left, the next week is put back in place, so
 * switching it on once is enough and it does not quietly stop after a week.
 */
export async function keepDailyChapmanUpdatesAlive(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if ((await AsyncStorage.getItem(DAILY_PREFERENCE_KEY)) !== "yes") return;
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") return;
    if ((await countScheduledDailyUpdates()) < 2) await scheduleWeekOfDailyUpdates();
  } catch {
    // Never disturb the app because of this. It is retried on the next open.
  }
}

/**
 * Sends one message right now, so a customer can see that alerts work on this
 * phone. Used by the test button in Settings.
 */
export async function sendTestChapmanUpdate() {
  if (Platform.OS === "web") {
    return { sent: false, message: "Device alerts are only available in the mobile app, so on a computer this cannot be tested." };
  }
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") {
    return { sent: false, message: "Alerts are not allowed on this phone yet. Allow them first, then try again." };
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Chapman Prestige Limited",
      body: "This is a test. Real Chapman updates will arrive like this.",
      data: { kind: "chapman-test", url: "/notifications" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: "chapman-service-updates" },
  });
  return { sent: true, message: "Sent. Look for it in about five seconds. You can leave the app open." };
}

/** Shows a device alert for a live staff update, only when the customer allows them. */
export async function showLiveServiceUpdate(notice: StaffRequestUpdateNotice, requestId: string) {
  if (!notice || Platform.OS === "web") return false;
  if (!(await areBookingAlertsOn())) return false;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return false;
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("chapman-service-updates", { name: "Chapman service updates", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180], lightColor: "#047857" });
  await Notifications.scheduleNotificationAsync({ content: { title: notice.title, body: notice.body, data: { kind: "chapman-service-update", requestId, url: `/booking/${requestId}` } }, trigger: null });
  return true;
}
