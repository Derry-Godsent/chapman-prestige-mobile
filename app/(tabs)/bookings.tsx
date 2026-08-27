import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, IconOrb, StatusPill, palette } from "@/components/chapman-ui";
import { useBookingStore } from "@/lib/booking-store";
import { CustomerSignInRequiredError, getMyMobileLaundryRequests, MobileLaundryRequest } from "@/lib/mobile-requests";

function requestLabel(status: MobileLaundryRequest["request_status"]) {
  if (status === "needs_customer_confirmation") return "date ready";
  if (status === "under_review") return "under review";
  if (status === "pending") return "request received";
  if (status === "confirmed") return "confirmed";
  return status.replace(/_/g, " ");
}

function requestDate(request: MobileLaundryRequest) {
  const date = request.confirmed_for ?? request.requested_for;
  return date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" }) : "Date to be confirmed";
}

export default function BookingsScreen() {
  const { bookings, quotes } = useBookingStore();
  const [liveRequests, setLiveRequests] = useState<MobileLaundryRequest[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const loadLiveRequests = useCallback(async () => {
    setLoadingLive(true);
    try { setLiveRequests(await getMyMobileLaundryRequests()); }
    catch (cause) { if (!(cause instanceof CustomerSignInRequiredError)) setLiveRequests([]); }
    finally { setLoadingLive(false); }
  }, []);
  useEffect(() => { void loadLiveRequests(); }, [loadLiveRequests]);
  const liveIds = new Set(liveRequests.map((request) => request.id));
  const localBookings = bookings.filter((booking) => !liveIds.has(booking.id));
  const hasActivity = localBookings.length > 0 || quotes.length > 0 || liveRequests.length > 0;

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>YOUR SCHEDULE</Text><DisplayText style={styles.title}>Bookings</DisplayText></View><TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.addButton}><Ionicons name="add" size={22} color="#FFFFFF" /></TouchableOpacity></View>
        <View style={styles.filters}><View style={styles.filterSelected}><Text style={styles.filterTextSelected}>Upcoming</Text></View><View style={styles.filter}><Text style={styles.filterText}>History</Text></View></View>
        {loadingLive ? <View style={styles.liveLoading}><ActivityIndicator size="small" color={palette.blue} /><Text style={styles.liveLoadingText}>Refreshing secure request updates…</Text></View> : null}
        {liveRequests.map((request) => <TouchableOpacity key={request.id} onPress={() => router.push(`/booking/${request.id}` as never)} style={styles.bookingCard} activeOpacity={0.82}><View style={styles.cardTop}><IconOrb icon="shirt-outline" color={palette.green} /><View style={styles.cardCopy}><Text style={styles.bookingTitle}>Laundry & Garment Care</Text><Text style={styles.bookingMeta}>{requestDate(request)} · {request.pickup_window ?? "time to be confirmed"}</Text></View><Ionicons name="chevron-forward" size={20} color="#7A7E8D" /></View><View style={styles.cardFoot}><StatusPill label={requestLabel(request.request_status)} tone={request.request_status === "needs_customer_confirmation" ? "orange" : request.request_status === "confirmed" ? "green" : "blue"} /><Text style={styles.price}>{request.estimated_total === null ? "Estimate pending" : `₵${Number(request.estimated_total).toFixed(0)}`}</Text></View></TouchableOpacity>)}
        {localBookings.map((booking) => <TouchableOpacity key={booking.id} onPress={() => router.push(`/booking/${booking.id}` as never)} style={styles.bookingCard} activeOpacity={0.82}><View style={styles.cardTop}><IconOrb icon="calendar-outline" color={palette.blue} /><View style={styles.cardCopy}><Text style={styles.bookingTitle}>{booking.serviceTitle}</Text><Text style={styles.bookingMeta}>{booking.scheduledFor}</Text></View><Ionicons name="chevron-forward" size={20} color="#7A7E8D" /></View><View style={styles.cardFoot}><StatusPill label={booking.status.replace("-", " ")} tone="blue" /><Text style={styles.price}>{booking.totalLabel}</Text></View></TouchableOpacity>)}
        {quotes.map((quote) => <View key={quote.id} style={styles.bookingCard}><View style={styles.cardTop}><IconOrb icon="document-text-outline" color={palette.orange} /><View style={styles.cardCopy}><Text style={styles.bookingTitle}>{quote.serviceTitle}</Text><Text style={styles.bookingMeta}>{quote.propertyType} · {quote.preference}</Text></View><Ionicons name="time-outline" size={20} color="#7A7E8D" /></View><View style={styles.cardFoot}><StatusPill label="assessment requested" tone="orange" /><Text style={styles.quoteRef}>{quote.id}</Text></View></View>)}
        {!hasActivity ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="calendar-clear-outline" size={36} color={palette.blue} /></View><DisplayText style={styles.emptyTitle}>Nothing booked yet.</DisplayText><BodyText style={styles.emptyBody}>Your upcoming services and quote requests will appear here. Start with the service that gives your week back the most time.</BodyText><TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.emptyCTA}><Text style={styles.emptyCTAText}>Explore services</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></TouchableOpacity></View> : null}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { padding: 20, paddingTop: 18, paddingBottom: 34, gap: 18, backgroundColor: palette.canvas, flexGrow: 1 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, eyebrow: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 }, title: { fontSize: 30, marginTop: 2 }, addButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, filters: { flexDirection: "row", gap: 8 }, filterSelected: { paddingVertical: 9, paddingHorizontal: 14, backgroundColor: palette.blue, borderRadius: 999 }, filter: { paddingVertical: 9, paddingHorizontal: 14, backgroundColor: "#FFFFFF", borderRadius: 999, borderWidth: 1, borderColor: palette.border }, filterTextSelected: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 }, filterText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 12 }, liveLoading: { minHeight: 38, borderRadius: 13, backgroundColor: "#EEF3FF", alignItems: "center", paddingHorizontal: 12, flexDirection: "row", gap: 9 }, liveLoadingText: { color: palette.blue, fontFamily: "Inter_600SemiBold", fontSize: 10 }, bookingCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 15, borderWidth: 1, borderColor: palette.border, gap: 14 }, cardTop: { flexDirection: "row", alignItems: "center", gap: 11 }, cardCopy: { flex: 1, gap: 4 }, bookingTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, bookingMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }, cardFoot: { paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EEF0F4", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, price: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, quoteRef: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 11 }, empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingTop: 85, gap: 12 }, emptyIcon: { width: 78, height: 78, borderRadius: 30, backgroundColor: "#E9EEFF", alignItems: "center", justifyContent: "center", marginBottom: 5 }, emptyTitle: { textAlign: "center", fontSize: 24 }, emptyBody: { textAlign: "center", maxWidth: 280 }, emptyCTA: { minHeight: 48, paddingHorizontal: 17, backgroundColor: palette.blue, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 7 }, emptyCTAText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 } });
