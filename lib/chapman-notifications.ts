import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import type { StaffRequestUpdateNotice } from "./mobile-request-updates";
import { DailyMessage, builtInDailyMessages } from "./daily-messages";
import { loadDailyMessages } from "./daily-messages-live";

const DAILY_IDENTIFIER_KEY = "chapman-daily-update";
/** Whether the customer asked for the daily update. Kept on this phone. */
export const DAILY_PREFERENCE_KEY = "chapman-daily-update-wanted";

/**
 * The next mornings at 9:00, as real dates.
 *
 * This is where the switch was failing. The first version asked for 9:00 today,
 * and after nine in the morning that moment has already passed, so the phone
 * refused the whole set and the switch sprang back to off. These are always in
 * the future: today at 9:00 if it is still to come, otherwise tomorrow onwards.
 */
function nextNineAms(count: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(9, 0, 0, 0);
  if (cursor.getTime() <= Date.now()) cursor.setDate(cursor.getDate() + 1);
  while (dates.length < count) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
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

/**
 * Puts the next week of 9:00 messages on this phone.
 *
 * Each morning is scheduled on its own so that one refusal cannot take the whole
 * week down, and the number that actually went in is returned so the switch can
 * tell the truth about it.
 */
async function scheduleWeekOfDailyUpdates(messages: DailyMessage[]): Promise<number> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("chapman-updates", { name: "Chapman updates", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 180], lightColor: "#047857" });
  }
  await cancelScheduledDailyUpdates();
  const toSend = messages.length ? messages : builtInDailyMessages;
  const mornings = nextNineAms(toSend.length);
  let scheduled = 0;
  for (let index = 0; index < toSend.length; index += 1) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: toSend[index].title, body: toSend[index].body, data: { kind: DAILY_IDENTIFIER_KEY, url: "/notifications" } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: mornings[index], channelId: "chapman-updates" },
      });
      scheduled += 1;
    } catch {
      // One morning that the phone would not accept must not stop the others.
    }
  }
  return scheduled;
}

export async function enableDailyChapmanUpdates() {
  if (Platform.OS === "web") return { enabled: false, message: "Daily device notifications are available in the mobile app." };
  const notificationPermission = await requestChapmanNotificationPermission();
  if (!notificationPermission.enabled) {
    await AsyncStorage.removeItem(DAILY_PREFERENCE_KEY);
    return notificationPermission;
  }
  const scheduled = await scheduleWeekOfDailyUpdates(await loadDailyMessages());
  if (scheduled === 0) {
    await AsyncStorage.removeItem(DAILY_PREFERENCE_KEY);
    return { enabled: false, message: "This phone would not accept the message schedule. Alerts may be switched off for Chapman in the phone settings." };
  }
  await AsyncStorage.setItem(DAILY_PREFERENCE_KEY, "yes");
  return { enabled: true, message: `${scheduled} mornings are booked in. A Chapman message will arrive at 9:00 each morning.` };
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
    if ((await countScheduledDailyUpdates()) < 2) await scheduleWeekOfDailyUpdates(await loadDailyMessages());
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
