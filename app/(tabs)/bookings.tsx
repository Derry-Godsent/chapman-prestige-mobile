import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, IconOrb, StatusPill, palette, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { useNow } from "@/hooks/use-now";
import { useBookingStore } from "@/lib/booking-store";
import { newestFirst, timeAgo } from "@/lib/chapman-format";
import { CustomerSignInRequiredError, getMyMobileLaundryRequests, MobileLaundryRequest } from "@/lib/mobile-requests";
import { supabase } from "@/lib/supabase";
import type { QuoteRequest } from "@/lib/chapman-data";
/**
 * Every card on this screen, whichever kind of record it came from, reduced to
 * one shape so they can be listed together, most recent first, rather than in
 * three separate blocks.
 */
type BookingCard = {
  key: string;
  serviceId: string;
  status?: string;
  title: string;
  meta: string;
  pillLabel: string;
  pillTone: "blue" | "orange" | "green" | "gray" | "red";
  rightText: string;
  trailingIcon: "chevron-forward" | "time-outline";
  createdAt: string;
  href: string;
};
type PillTone = BookingCard["pillTone"];
function laundryPillTone(status: MobileLaundryRequest["request_status"]): PillTone {
  if (status === "needs_customer_confirmation") return "orange";
  if (status === "confirmed") return "green";
  if (status === "declined") return "red";
  return "blue";
}
function requestLabel(request: MobileLaundryRequest) {
  const status = request.request_status;
  if (status === "needs_customer_confirmation") return "date ready";
  if (status === "under_review") return "under review";
  if (status === "pending") return "request received";
  if (status === "confirmed") return "approved";
  if (status === "declined" && request.customer_response === "rejected") return "you declined";
  return status.replace(/_/g, " ");
}
function requestDate(request: MobileLaundryRequest) {
  const date = request.confirmed_for ?? request.requested_for;
  return date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" }) : "Date to be confirmed";
}
// Get the correct icon for a service type
function getServiceIcon(serviceId: string, status?: string) {
  if (status === "declined") return "close-outline";
  switch (serviceId) {
    case "laundry": return "shirt-outline";
    case "cleaning": return "sparkles-outline";
    case "fumigation": return "shield-checkmark-outline";
    case "detailing": return "car-sport-outline";
    case "fabric": return "bed-outline";
    case "polytank": return "water-outline";
    case "contract": return "business-outline";
    default: return "document-text-outline";
  }
}
// Get accent color for a service type
function getServiceColor(serviceId: string, status?: string) {
  if (status === "declined") return palette.error;
  switch (serviceId) {
    case "laundry": return palette.green;
    case "cleaning": return "#D97706";
    case "fumigation": return "#92400E";
    case "detailing": return "#047857";
    case "fabric": return "#7A6A59";
    case "polytank": return "#059669";
    case "contract": return "#4B3E30";
    default: return palette.blue;
  }
}
// Format a quote ID into a clean reference code
function formatQuoteRef(id: string) {
  // If it's already a formatted ref like QTE-0302, return as-is
  if (id.startsWith("QTE-")) return id;
  // If it's a UUID, show first 8 chars uppercase
  if (/^[0-9a-f]{8}-/i.test(id)) return `CPL-${id.slice(0, 8).toUpperCase()}`;
  return id;
}
export default function BookingsScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const { bookings, quotes } = useBookingStore();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const now = useNow();
  const [liveRequests, setLiveRequests] = useState<MobileLaundryRequest[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const loadLiveRequests = useCallback(async () => {
    setLoadingLive(true);
    try { 
      setLiveRequests(await getMyMobileLaundryRequests()); 
    } catch (cause) { 
      if (!(cause instanceof CustomerSignInRequiredError)) setLiveRequests([]); 
    } finally { 
      setLoadingLive(false); 
    }
  }, []);
  useEffect(() => { 
    void loadLiveRequests(); 
  }, [loadLiveRequests]);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let channel: any = null;
    const setupRealtime = async () => {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      // Guests have no customer records to watch. Subscribing without a real
      // signed-in id would either leak nothing or, worse, watch another account.
      if (!userId) return;
      await client.removeChannel(client.channel(`customer-mobile-${userId}`));
      channel = client.channel(`customer-mobile-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "mobile_requests",
            filter: `customer_account_id=eq.${userId}`,
          },
          () => {
            void loadLiveRequests();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mobile_request_events",
          },
          () => {
            void loadLiveRequests();
          },
        )
        .subscribe((status: any) => {
          if (status === "SUBSCRIBED") console.log("Customer realtime connected");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("Customer realtime disconnected", status);
          }
        });
    };
    void setupRealtime();
    return () => {
      if (channel) {
        void client.removeChannel(channel);
      }
    };
  }, [loadLiveRequests]);
  const liveIds = new Set(liveRequests.map((request) => request.id));
  const localBookings = bookings.filter((booking) => !liveIds.has(booking.id));
  const hasActivity = localBookings.length > 0 || quotes.length > 0 || liveRequests.length > 0;
  // Live laundry requests, saved bookings and quote requests all become cards,
  // then one sort puts the newest request at the top of the screen.
  const cards: BookingCard[] = [
    ...liveRequests.map((request) => ({
      key: request.id,
      serviceId: "laundry",
      status: request.request_status,
      title: "Laundry & Garment Care",
      meta:
        request.request_status === "declined"
          ? request.customer_response === "rejected"
            ? "You rejected the proposed date. This request is closed."
            : "Chapman declined this request"
          : `${requestDate(request)} \u00B7 ${request.pickup_window ?? "time to be confirmed"}`,
      pillLabel: requestLabel(request),
      pillTone: laundryPillTone(request.request_status),
      rightText: request.estimated_total === null ? "Estimate pending" : `\u20B5${Number(request.estimated_total).toFixed(0)}`,
      trailingIcon: "chevron-forward" as const,
      createdAt: request.created_at,
      href: `/booking/${request.id}`,
    })),
    ...localBookings.map((booking) => ({
      key: booking.id,
      serviceId: booking.serviceId,
      title: booking.serviceTitle,
      meta: booking.scheduledFor,
      pillLabel: booking.status.replace("-", " "),
      pillTone: "blue" as const,
      rightText: booking.totalLabel,
      trailingIcon: "chevron-forward" as const,
      createdAt: booking.createdAt,
      href: `/booking/${booking.id}`,
    })),
    ...quotes.map((quote: QuoteRequest) => ({
      key: quote.id,
      serviceId: quote.serviceId,
      title: quote.serviceTitle,
      meta: `${quote.propertyType} \u00B7 ${quote.preference}`,
      status: quote.appointmentResponse === "declined" ? "declined" : quote.appointmentResponse === "accepted" ? "accepted" : "quote-requested",
      pillLabel: quote.appointmentResponse === "declined" ? "not taken" : quote.appointmentResponse === "accepted" ? "accepted" : "assessment requested",
      pillTone: (quote.appointmentResponse === "declined" ? "red" : quote.appointmentResponse === "accepted" ? "green" : "orange") as "red" | "orange" | "green",
      rightText: formatQuoteRef(quote.id),
      trailingIcon: "time-outline" as const,
      createdAt: quote.createdAt,
      href: `/booking/${quote.id}`,
    })),
  ];
  // Upcoming holds anything still moving. History holds anything that has ended:
  // work Chapman completed or converted to an order, a request the customer
  // declined, a request Chapman could not take, and anything cancelled.
  const finishedStatuses = ["completed", "converted", "declined", "cancelled"];
  const withTab: Record<string, any>[] = (cards as Record<string, any>[]).map((card) => ({
    ...card,
    tab: finishedStatuses.includes(String(card.status)) ? "history" : "upcoming",
  }));
  const orderedCards = newestFirst(withTab, (card) => String(card.createdAt ?? "")) as Record<string, any>[];
  const upcomingCards = orderedCards.filter((card) => card.tab === "upcoming");
  const historyCards = orderedCards.filter((card) => card.tab === "history");
  const shownCards = tab === "upcoming" ? upcomingCards : historyCards;
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR SCHEDULE</Text>
            <DisplayText style={styles.title}>Bookings</DisplayText>
          </View>
          <TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.addButton}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.filters}>
          <TouchableOpacity onPress={() => setTab("upcoming")} style={tab === "upcoming" ? styles.filterSelected : styles.filter} accessibilityRole="button">
            <Text style={tab === "upcoming" ? styles.filterTextSelected : styles.filterText}>Upcoming{upcomingCards.length ? ` (${upcomingCards.length})` : ""}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab("history")} style={tab === "history" ? styles.filterSelected : styles.filter} accessibilityRole="button">
            <Text style={tab === "history" ? styles.filterTextSelected : styles.filterText}>History{historyCards.length ? ` (${historyCards.length})` : ""}</Text>
          </TouchableOpacity>
        </View>
        {loadingLive ? (
          <View style={styles.liveLoading}>
            <ActivityIndicator size="small" color={palette.accent} />
            <Text style={styles.liveLoadingText}>Refreshing secure request updates\u2026</Text>
          </View>
        ) : null}
        {!loadingLive && shownCards.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name={tab === "history" ? "time-outline" : "calendar-clear-outline"} size={24} color={palette.accent} />
            <Text style={styles.emptyHistoryTitle}>{tab === "history" ? "No finished work yet" : "Nothing in progress"}</Text>
            <Text style={styles.emptyHistoryText}>
              {tab === "history"
                ? "Completed services, requests you declined, and requests Chapman could not take all stay here as your record."
                : "Send a request and it appears here from the moment Chapman receives it."}
            </Text>
            <TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.emptyHistoryAction}><Text style={styles.emptyHistoryActionText}>See services</Text></TouchableOpacity>
          </View>
        ) : null}
        {shownCards.map((card) => (
          <TouchableOpacity
            key={String(card.key)}
            onPress={() => router.push(String(card.href) as never)}
            style={styles.bookingCard}
            activeOpacity={0.82}
          >
            <View style={styles.cardTop}>
              <IconOrb icon={getServiceIcon(card.serviceId, card.status)} color={getServiceColor(card.serviceId, card.status)} />
              <View style={styles.cardCopy}>
                <Text style={styles.bookingTitle}>{card.title}</Text>
                <Text style={styles.bookingMeta}>{card.meta}</Text>
              </View>
              <Ionicons name={card.trailingIcon} size={20} color="#7A7E8D" />
            </View>
            <View style={styles.cardFoot}>
              <StatusPill label={card.pillLabel} tone={card.pillTone} />
              <Text style={styles.price}>{card.rightText}</Text>
            </View>
            <Text style={styles.bookingAge}>Requested {timeAgo(card.createdAt, now)}</Text>
          </TouchableOpacity>
        ))}
        {!hasActivity ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-clear-outline" size={36} color={palette.accent} />
            </View>
            <DisplayText style={styles.emptyTitle}>Nothing booked yet.</DisplayText>
            <BodyText style={styles.emptyBody}>
              Your upcoming services and quote requests will appear here. Start with the service that gives your week back the most time.
            </BodyText>
            <TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.emptyCTA}>
              <Text style={styles.emptyCTAText}>Explore services</Text>
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}
const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({ 
  content: { padding: 20, paddingTop: 18, paddingBottom: 34, gap: 18, backgroundColor: palette.canvas, flexGrow: 1 }, 
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, 
  eyebrow: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 }, 
  title: { fontSize: 30, marginTop: 2 }, 
  addButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, 
  filters: { flexDirection: "row", gap: 8 },
  emptyHistory: { padding: 24, borderRadius: 21, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", gap: 9 },
  emptyHistoryTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center" },
  emptyHistoryText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, textAlign: "center" },
  emptyHistoryAction: { marginTop: 4, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 14, backgroundColor: palette.blue },
  emptyHistoryActionText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 }, 
  filterSelected: { paddingVertical: 9, paddingHorizontal: 14, backgroundColor: palette.blue, borderRadius: 999 }, 
  filter: { paddingVertical: 9, paddingHorizontal: 14, backgroundColor: palette.surface, borderRadius: 999, borderWidth: 1, borderColor: palette.border }, 
  filterTextSelected: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 }, 
  filterText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 12 }, 
  liveLoading: { minHeight: 38, borderRadius: 13, backgroundColor: palette.chipBlue, alignItems: "center", paddingHorizontal: 12, flexDirection: "row", gap: 9 }, 
  liveLoadingText: { color: palette.accent, fontFamily: "Inter_600SemiBold", fontSize: 10 }, 
  bookingCard: { backgroundColor: palette.surface, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: palette.border, gap: 14 }, 
  cardTop: { flexDirection: "row", alignItems: "center", gap: 11 }, 
  cardCopy: { flex: 1, gap: 4 }, 
  bookingTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, 
  bookingMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }, 
  cardFoot: { paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EEF0F4", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, 
  bookingAge: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 10 }, 
  price: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, 
  quoteRef: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 11 }, 
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingTop: 85, gap: 12 }, 
  emptyIcon: { width: 78, height: 78, borderRadius: 30, backgroundColor: palette.chipBlue, alignItems: "center", justifyContent: "center", marginBottom: 5 }, 
  emptyTitle: { textAlign: "center", fontSize: 24 }, 
  emptyBody: { textAlign: "center", maxWidth: 280 }, 
  emptyCTA: { minHeight: 48, paddingHorizontal: 17, backgroundColor: palette.blue, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 7 }, 
  emptyCTAText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 } 
});