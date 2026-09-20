import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, IconOrb, StatusPill, palette } from "@/components/chapman-ui";
import { useBookingStore } from "@/lib/booking-store";
import { CustomerSignInRequiredError, getMyMobileLaundryRequests, MobileLaundryRequest } from "@/lib/mobile-requests";
import { supabase } from "@/lib/supabase";
import type { QuoteRequest } from "@/lib/chapman-data";

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
  const { bookings, quotes } = useBookingStore();
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
      const userId = sessionData?.session?.user?.id || '057b4ebf-cbe3-44fc-bd53-781026d50a14';

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
          <View style={styles.filterSelected}>
            <Text style={styles.filterTextSelected}>Upcoming</Text>
          </View>
          <View style={styles.filter}>
            <Text style={styles.filterText}>History</Text>
          </View>
        </View>
        {loadingLive ? (
          <View style={styles.liveLoading}>
            <ActivityIndicator size="small" color={palette.blue} />
            <Text style={styles.liveLoadingText}>Refreshing secure request updates\u2026</Text>
          </View>
        ) : null}

        {/* Live laundry requests */}
        {liveRequests.map((request) => {
          // FIX: Extract actual service info from customer_note or use metadata
          // For now, use the pickup_area as a hint, but ideally this should come from the DB
          const serviceTitle = "Laundry & Garment Care"; // Laundry always uses this title
          const serviceId = "laundry";
          
          return (
            <TouchableOpacity 
              key={request.id} 
              onPress={() => router.push(`/booking/${request.id}` as never)} 
              style={styles.bookingCard} 
              activeOpacity={0.82}
            >
              <View style={styles.cardTop}>
                <IconOrb icon={getServiceIcon(serviceId, request.request_status)} color={getServiceColor(serviceId, request.request_status)} />
                <View style={styles.cardCopy}>
                  <Text style={styles.bookingTitle}>{serviceTitle}</Text>
                  <Text style={styles.bookingMeta}>
                    {request.request_status === "declined" 
                      ? request.customer_response === "rejected" 
                        ? "You rejected the proposed date. This request is closed." 
                        : "Chapman declined this request" 
                      : `${requestDate(request)} \u00B7 ${request.pickup_window ?? "time to be confirmed"}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7A7E8D" />
              </View>
              <View style={styles.cardFoot}>
                <StatusPill 
                  label={requestLabel(request)} 
                  tone={request.request_status === "needs_customer_confirmation" ? "orange" : request.request_status === "confirmed" ? "green" : request.request_status === "declined" ? "red" : "blue"} 
                />
                <Text style={styles.price}>
                  {request.estimated_total === null ? "Estimate pending" : `\u20B5${Number(request.estimated_total).toFixed(0)}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Local bookings (non-laundry, created locally) */}
        {localBookings.map((booking) => (
          <TouchableOpacity 
            key={booking.id} 
            onPress={() => router.push(`/booking/${booking.id}` as never)} 
            style={styles.bookingCard} 
            activeOpacity={0.82}
          >
            <View style={styles.cardTop}>
              <IconOrb icon={getServiceIcon(booking.serviceId)} color={getServiceColor(booking.serviceId)} />
              <View style={styles.cardCopy}>
                <Text style={styles.bookingTitle}>{booking.serviceTitle}</Text>
                <Text style={styles.bookingMeta}>{booking.scheduledFor}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#7A7E8D" />
            </View>
            <View style={styles.cardFoot}>
              <StatusPill label={booking.status.replace("-", " ")} tone="blue" />
              <Text style={styles.price}>{booking.totalLabel}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Quote requests (Deep Cleaning, Fumigation, etc.) */}
        {quotes.map((quote: QuoteRequest) => (
          <TouchableOpacity 
            key={quote.id} 
            onPress={() => router.push(`/booking/${quote.id}` as never)} 
            style={styles.bookingCard} 
            activeOpacity={0.82}
          >
            <View style={styles.cardTop}>
              <IconOrb icon={getServiceIcon(quote.serviceId)} color={getServiceColor(quote.serviceId)} />
              <View style={styles.cardCopy}>
                <Text style={styles.bookingTitle}>{quote.serviceTitle}</Text>
                <Text style={styles.bookingMeta}>{quote.propertyType} \u00B7 {quote.preference}</Text>
              </View>
              <Ionicons name="time-outline" size={20} color="#7A7E8D" />
            </View>
            <View style={styles.cardFoot}>
              <StatusPill label="assessment requested" tone="orange" />
              <Text style={styles.quoteRef}>{formatQuoteRef(quote.id)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {!hasActivity ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-clear-outline" size={36} color={palette.blue} />
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

const styles = StyleSheet.create({ 
  content: { padding: 20, paddingTop: 18, paddingBottom: 34, gap: 18, backgroundColor: palette.canvas, flexGrow: 1 }, 
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, 
  eyebrow: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 }, 
  title: { fontSize: 30, marginTop: 2 }, 
  addButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, 
  filters: { flexDirection: "row", gap: 8 }, 
  filterSelected: { paddingVertical: 9, paddingHorizontal: 14, backgroundColor: palette.blue, borderRadius: 999 }, 
  filter: { paddingVertical: 9, paddingHorizontal: 14, backgroundColor: "#FFFFFF", borderRadius: 999, borderWidth: 1, borderColor: palette.border }, 
  filterTextSelected: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 }, 
  filterText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 12 }, 
  liveLoading: { minHeight: 38, borderRadius: 13, backgroundColor: "#EEF3FF", alignItems: "center", paddingHorizontal: 12, flexDirection: "row", gap: 9 }, 
  liveLoadingText: { color: palette.blue, fontFamily: "Inter_600SemiBold", fontSize: 10 }, 
  bookingCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 15, borderWidth: 1, borderColor: palette.border, gap: 14 }, 
  cardTop: { flexDirection: "row", alignItems: "center", gap: 11 }, 
  cardCopy: { flex: 1, gap: 4 }, 
  bookingTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, 
  bookingMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 }, 
  cardFoot: { paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EEF0F4", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, 
  price: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, 
  quoteRef: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 11 }, 
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingTop: 85, gap: 12 }, 
  emptyIcon: { width: 78, height: 78, borderRadius: 30, backgroundColor: "#E9EEFF", alignItems: "center", justifyContent: "center", marginBottom: 5 }, 
  emptyTitle: { textAlign: "center", fontSize: 24 }, 
  emptyBody: { textAlign: "center", maxWidth: 280 }, 
  emptyCTA: { minHeight: 48, paddingHorizontal: 17, backgroundColor: palette.blue, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 7 }, 
  emptyCTAText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 } 
});