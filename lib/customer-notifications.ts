import AsyncStorage from "@react-native-async-storage/async-storage";

import { DailyMessage } from "@/lib/daily-messages";

import { CustomerActivity } from "@/lib/customer-activity";
import { timeAgo } from "@/lib/chapman-format";

/**
 * The notification feed, built from what actually happened on this customer's
 * account. There is no server push here and none is pretended: every entry is a
 * real record, written when Chapman reviewed a request, confirmed a date, left a
 * note, or when the customer answered.
 *
 * Read state is kept on the phone, so the bell shows a genuine unread count.
 */

export type CustomerNotification = {
  id: string;
  kind: "booking" | "date" | "answer" | "team" | "service" | "news";
  title: string;
  body: string;
  createdAt: string;
  href: string;
  urgent: boolean;
};

const READ_KEY = "chapman-notifications-read";

export function buildNotifications(activity: CustomerActivity): CustomerNotification[] {
  const entries: CustomerNotification[] = [];

  for (const request of activity.requests) {
    entries.push({
      id: `request-${request.id}`,
      kind: "booking",
      title: "Laundry request received",
      body: `${request.itemCount} item${request.itemCount === 1 ? "" : "s"}${request.pickupArea ? ` from ${request.pickupArea}` : ""}. Chapman has your request and will confirm a collection date.`,
      createdAt: request.createdAt,
      href: `/booking/${request.id}`,
      urgent: false,
    });

    if (request.status === "needs_customer_confirmation") {
      entries.push({
        id: `offer-${request.id}`,
        kind: "date",
        title: "A date is waiting for your answer",
        body: `Chapman proposed ${request.confirmedFor ?? "a collection date"}. Accept it to approve the pickup, or reject it to ask for another day.`,
        createdAt: request.createdAt,
        href: `/booking/${request.id}`,
        urgent: true,
      });
    }

    if (request.status === "confirmed") {
      entries.push({
        id: `confirmed-${request.id}`,
        kind: "date",
        title: "Your service date is approved",
        body: `Chapman confirmed ${request.confirmedFor ?? "your collection"}${request.pickupWindow ? `, ${request.pickupWindow}` : ""}. The team will be in touch before arrival.`,
        createdAt: request.confirmedFor ?? request.createdAt,
        href: `/booking/${request.id}`,
        urgent: false,
      });
    }

    if (request.staffNote) {
      entries.push({
        id: `note-${request.id}`,
        kind: "team",
        title: "A note from Chapman",
        body: request.staffNote,
        createdAt: request.createdAt,
        href: `/booking/${request.id}`,
        urgent: false,
      });
    }

    if (request.status === "declined") {
      entries.push({
        id: `declined-${request.id}`,
        kind: "booking",
        title: "Chapman could not take this request",
        body: request.staffNote || "The office will be glad to find another option with you. Open the request to see the next step.",
        createdAt: request.createdAt,
        href: `/booking/${request.id}`,
        urgent: false,
      });
    }

    if (request.customerResponse === "accepted") {
      entries.push({
        id: `accepted-${request.id}`,
        kind: "answer",
        title: "You approved the date",
        body: "Chapman has your approval and the job is moving forward.",
        createdAt: request.createdAt,
        href: `/booking/${request.id}`,
        urgent: false,
      });
    }
  }

  for (const quote of activity.quotes) {
    if (quote.appointmentResponse === "awaiting-customer") {
      entries.push({
        id: `quote-offer-${quote.id}`,
        kind: "date",
        title: `${quote.serviceTitle}: a date is waiting`,
        body: `Chapman proposed ${quote.proposedDate ?? "a service date"}. Open the request to accept it or ask for another day.`,
        createdAt: quote.createdAt,
        href: `/booking/${quote.id}`,
        urgent: true,
      });
      continue;
    }
    if (quote.appointmentResponse === "declined") {
      entries.push({
        id: `quote-declined-${quote.id}`,
        kind: "service",
        title: `${quote.serviceTitle}: Chapman could not take it`,
        body: quote.declinedReason || "Open the request for the reason and your next options.",
        createdAt: quote.createdAt,
        href: `/booking/${quote.id}`,
        urgent: false,
      });
      continue;
    }
    if (quote.appointmentResponse === "accepted") {
      entries.push({
        id: `quote-accepted-${quote.id}`,
        kind: "answer",
        title: `${quote.serviceTitle}: date accepted`,
        body: "Chapman has your approval and the job is moving forward.",
        createdAt: quote.createdAt,
        href: `/booking/${quote.id}`,
        urgent: false,
      });
      continue;
    }
    entries.push({
      id: `quote-${quote.id}`,
      kind: "service",
      title: `${quote.serviceTitle} request received`,
      body: "Chapman is checking the details and will send a date for you to approve.",
      createdAt: quote.createdAt,
      href: `/booking/${quote.id}`,
      urgent: false,
    });
  }

  // Chapman's own team activity trail, which is the closest thing to a live feed
  // this app has, because it is written as the work happens.
  for (const event of activity.events) {
    entries.push({
      id: `event-${event.id}`,
      kind: "team",
      title: event.note,
      body: "Chapman updated your request.",
      createdAt: event.createdAt,
      href: `/booking/${event.requestId}`,
      urgent: false,
    });
  }

  return entries.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 40);
}

/**
 * Chapman's own messages, shown in the Updates list as well as arriving at 9:00.
 *
 * A message written by the office should be readable in the app too, not only as
 * a phone alert, so a customer who opens Updates sees the news, tips, holiday
 * notices, and thank-you notes Chapman has published.
 */
export function newsNotifications(messages: DailyMessage[], today = new Date().toISOString().slice(0, 10)): CustomerNotification[] {
  return messages.map((message, index) => ({
    id: `news-${today}-${index}`,
    kind: "news" as const,
    title: message.title,
    body: message.body,
    createdAt: new Date(new Date(today).setHours(9, 0, 0, 0)).toISOString(),
    href: "/notifications",
    urgent: false,
  }));
}

export async function readNotificationIds(): Promise<string[]> {
  try {
    const stored = await AsyncStorage.getItem(READ_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export async function markNotificationsRead(ids: string[]) {
  try {
    const existing = await readNotificationIds();
    const merged = Array.from(new Set([...existing, ...ids])).slice(-200);
    await AsyncStorage.setItem(READ_KEY, JSON.stringify(merged));
  } catch {
    // Read state is a convenience. Losing it is not worth breaking a screen over.
  }
}

export function unreadCount(notifications: CustomerNotification[], readIds: string[]) {
  const seen = new Set(readIds);
  return notifications.filter((entry) => !seen.has(entry.id)).length;
}

export { timeAgo };
