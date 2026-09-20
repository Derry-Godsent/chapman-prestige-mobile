import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, StatusPill, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { useBookingStore } from "@/lib/booking-store";
import { getMobileLaundryRequest, getMobileRequestEvents, MobileLaundryRequest, MobileRequestEvent, respondToMobileRequestDate } from "@/lib/mobile-requests";
import { isDeclinedRequest } from "@/lib/mobile-request-updates";
import { supabase } from "@/lib/supabase";
import { haptic } from "@/lib/haptics";
import type { QuoteRequest, QuoteDetails } from "@/lib/chapman-data";

const progressSteps = [
  "Request received", 
  "Team confirms details", 
  "Payment completed",
  "Specialist assigned", 
  "On the way", 
  "Care complete"
];

const stepForStatus: Record<string, number> = { 
  "quote-requested": 1, 
  pending: 1, 
  "under_review": 1, 
  "needs_customer_confirmation": 1, 
  "pending-review": 1, 
  confirmed: 2, 
  "payment_pending": 3,
  "payment_completed": 3,
  assigned: 4, 
  "en-route": 5, 
  "in-progress": 5, 
  completed: 6 
};

const readableDate = (value?: string | null) => {
  if (!value) return "Date to be confirmed";
  const date = new Date(`${value}T12:00:00`);
  if (isNaN(date.getTime())) return "Date to be confirmed";
  return date.toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const looksLikeRequestId = (value: string | undefined) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value));

function requestStatusLabel(status: MobileLaundryRequest["request_status"]) {
  if (status === "needs_customer_confirmation") return "date ready for approval";
  if (status === "under_review") return "Chapman is reviewing";
  if (status === "pending") return "request received";
  if (status === "confirmed") return "approved";
  return status.replace(/_/g, " ");
}

function eventLabel(event: MobileRequestEvent) {
  if (event.event_type === "submitted") return "Your Laundry request was received";
  if (event.event_type === "needs_customer_confirmation") return "Chapman proposed a date for you";
  if (event.event_type === "date_accepted") return "You accepted the proposed date";
  if (event.event_type === "date_rejected") return "You asked Chapman for another date";
  if (event.event_type === "request_rejected") return "You rejected the proposed date. This request is closed.";
  if (event.event_type === "under_review") return "Chapman is reviewing your request";
  if (event.event_type === "declined") return "Chapman declined this request";
  if (event.event_type === "confirmed") return "Your service date is approved";
  return event.note || event.event_type.replace(/_/g, " ");
}

// Load a quote request from Supabase by ID
async function getQuoteRequestFromSupabase(quoteId: string): Promise<QuoteRequest | null> {
  const client = supabase;
  if (!client) return null;
  try {
    const { data: session } = await client.auth.getSession();
    const userId = session?.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await client
      .from("quote_requests")
      .select("*")
      .eq("id", quoteId)
      .eq("customer_account_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      serviceId: data.service_id as any,
      serviceTitle: data.service_title || "",
      propertyType: data.property_type || "",
      preference: data.preference || "",
      details: (data.details as QuoteDetails) ?? undefined,
      appointmentResponse: (data.appointment_response as any) || "awaiting-chapman",
      status: "quote-requested",
      createdAt: data.created_at || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Update a quote request in Supabase
async function updateQuoteRequestInSupabase(quoteId: string, updates: Record<string, any>): Promise<boolean> {
  const client = supabase;
  if (!client) return false;
  try {
    const { error } = await client
      .from("quote_requests")
      .update(updates)
      .eq("id", quoteId);
    return !error;
  } catch {
    return false;
  }
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, quotes, respondToAppointment } = useBookingStore();
  const booking = bookings.find((item) => item.id === id);
  const localQuote = quotes.find((item) => item.id === id);
  
  // Determine if this is a quote or a laundry request
  const isLocalQuote = Boolean(localQuote);
  const shouldLoadLiveRequest = !isLocalQuote && looksLikeRequestId(id);
  
  // Live laundry request state
  const [liveRequest, setLiveRequest] = useState<MobileLaundryRequest | null>(null);
  const [events, setEvents] = useState<MobileRequestEvent[]>([]);
  const [liveLoading, setLiveLoading] = useState(shouldLoadLiveRequest);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const approvedPulse = useRef(new Animated.Value(0)).current;
  
  // Live quote request state (loaded from Supabase)
  const [liveQuote, setLiveQuote] = useState<QuoteRequest | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  
  // Use live quote if available, otherwise fall back to local
  const quote = liveQuote ?? localQuote;
  const isQuote = Boolean(quote);

  // Load live laundry request
  const loadLiveRequest = useCallback(async () => {
    if (!shouldLoadLiveRequest || !id) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const [request, requestEvents] = await Promise.all([getMobileLaundryRequest(id), getMobileRequestEvents(id)]);
      setLiveRequest(request);
      setEvents(requestEvents);
      if (!request) setLiveError("This request is not available in your signed-in account.");
    } catch (cause) {
      setLiveError(cause instanceof Error ? cause.message : "The live request could not be refreshed.");
    } finally {
      setLiveLoading(false);
    }
  }, [id, shouldLoadLiveRequest]);

  // Load live quote from Supabase (for UUID-based quote IDs or when local quote not found)
  const loadLiveQuote = useCallback(async () => {
    if (!id) return;
    // Load from Supabase if: it's a UUID (persisted quote) OR local quote not found
    if (looksLikeRequestId(id) || !localQuote) {
      setQuoteLoading(true);
      try {
        const data = await getQuoteRequestFromSupabase(id);
        if (data) setLiveQuote(data);
      } catch {
        // Silently fail — local quote may still work
      } finally {
        setQuoteLoading(false);
      }
    }
  }, [id, localQuote]);

  useEffect(() => { void loadLiveRequest(); }, [loadLiveRequest]);
  useEffect(() => { void loadLiveQuote(); }, [loadLiveQuote]);

  // Realtime for laundry requests
  useEffect(() => {
    const client = supabase;
    if (!shouldLoadLiveRequest || !id || !client) return;

    void client.removeChannel(client.channel(`customer-booking-${id}`));

    const channel = client.channel(`customer-booking-${id}`)
      .on(
        "postgres_changes", 
        { event: "*", schema: "public", table: "mobile_requests", filter: `id=eq.${id}` }, 
        () => { void loadLiveRequest(); }
      )
      .on(
        "postgres_changes", 
        { event: "INSERT", schema: "public", table: "mobile_request_events", filter: `mobile_request_id=eq.${id}` }, 
        () => { void loadLiveRequest(); }
      )
      .subscribe((status: any) => {
        if (status === "SUBSCRIBED") console.log("Tracking page realtime connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Tracking page realtime disconnected", status);
        }
      });

    return () => { 
      void client.removeChannel(channel); 
    };
  }, [id, loadLiveRequest, shouldLoadLiveRequest]);

  // Realtime for quote requests
  useEffect(() => {
    const client = supabase;
    if (!isQuote || !id || !client) return;

    void client.removeChannel(client.channel(`customer-quote-${id}`));

    const channel = client.channel(`customer-quote-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quote_requests", filter: `id=eq.${id}` },
        () => { void loadLiveQuote(); }
      )
      .subscribe((status: any) => {
        if (status === "SUBSCRIBED") console.log("Quote tracking realtime connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Quote tracking realtime disconnected", status);
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [id, isQuote, loadLiveQuote]);

  const respondToDate = async (response: "accepted" | "rejected") => {
    if (!id) return;
    setResponding(true);
    setLiveError(null);
    try {
      if (isQuote) {
        // Update quote in Supabase
        await updateQuoteRequestInSupabase(id, { appointment_response: response });
        respondToAppointment(id, response);
        await loadLiveQuote();
      } else {
        const updated = await respondToMobileRequestDate(id, response);
        setLiveRequest(updated);
      }
      haptic.success();
    } catch (cause) {
      setLiveError(cause instanceof Error ? cause.message : "Chapman could not save your response. Please try again.");
    } finally {
      setResponding(false);
    }
  };

  const isLiveRequest = Boolean(liveRequest);
  const localAwaitingChapman = booking?.status === "pending-review";
  const liveStatus = liveRequest?.request_status;
  const liveAwaitingResponse = liveStatus === "needs_customer_confirmation";
  const liveIsBeingReviewed = liveStatus === "pending" || liveStatus === "under_review";
  const isDeclined = isDeclinedRequest(liveStatus);
  const declinedByClient = isDeclined && liveRequest?.customer_response === "rejected";
  const requestInReview = isQuote || localAwaitingChapman || liveAwaitingResponse || liveIsBeingReviewed;
  const isApproved = liveStatus === "confirmed";
  const title = booking?.serviceTitle ?? quote?.serviceTitle ?? "Laundry & Garment Care";
  const status = isQuote ? "assessment requested" : liveRequest ? requestStatusLabel(liveRequest.request_status) : localAwaitingChapman ? "awaiting Chapman confirmation" : booking?.status.replace("-", " ") ?? "confirmed";
  const currentStep = stepForStatus[isQuote ? "quote-requested" : liveStatus ?? booking?.status ?? "confirmed"] ?? 1;
  const measurement = quote?.details?.estimatedAreaM2;
  const contextUrl = `/(tabs)/chat?bookingId=${id}&service=${encodeURIComponent(title)}`;
  const appointment = quote?.appointmentResponse;
  const reference = booking?.referenceCode ?? (id ? `CPL-${id.slice(0, 8).toUpperCase()}` : "CPL request");
  
  const serviceMeta = isQuote 
    ? `${quote?.propertyType} \u00B7 ${quote?.preference}` 
    : liveRequest 
      ? `${readableDate(liveRequest.confirmed_for ?? liveRequest.requested_for)} \u00B7 ${liveRequest.pickup_window ?? "time to be confirmed"}` 
      : booking?.scheduledFor;

  // Space breakdown data for quote requests
  const spaceBreakdown = quote?.details?.spaceBreakdown as Record<string, any> | undefined;
  const spaceEntries = spaceBreakdown ? Object.entries(spaceBreakdown).filter(([key]) => key !== "otherAreas" && key !== "description") : [];
  const otherAreas = spaceBreakdown?.otherAreas as string[] | undefined;
  const otherDescription = spaceBreakdown?.description as string | undefined;
  const concernsList = quote?.details?.concerns;

  useEffect(() => {
    if (!isApproved) { approvedPulse.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(approvedPulse, { toValue: 1, duration: 720, useNativeDriver: true }),
      Animated.timing(approvedPulse, { toValue: 0, duration: 720, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [approvedPulse, isApproved]);

  const isLoading = liveLoading || quoteLoading;

  return (
    <AppScreen>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader title="Track your service" />
          <View style={styles.lead}>
            <View style={[styles.leadIcon, requestInReview && styles.leadIconQuote, isDeclined && styles.leadIconDeclined, isApproved && styles.leadIconApproved]}>
              {isApproved ? <Animated.View style={[styles.approvedHalo, { transform: [{ scale: approvedPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.24] }) }], opacity: approvedPulse.interpolate({ inputRange: [0, 1], outputRange: [0.52, 0] }) }]} /> : null}
              <Ionicons name={isDeclined ? "close" : requestInReview ? "document-text-outline" : "checkmark"} size={28} color="#FFFFFF" />
            </View>
            <StatusPill label={status} tone={isDeclined ? "red" : requestInReview ? "orange" : "green"} />
            <DisplayText style={styles.leadTitle}>{isDeclined ? declinedByClient ? "You declined this request." : "This request was declined." : isApproved ? "Date confirmed." : requestInReview ? "We have your request." : "Your service date is approved."}</DisplayText>
            <BodyText style={styles.leadBody}>{isDeclined ? declinedByClient ? "You rejected the proposed date, so this request is now closed. Message Chapman when you are ready to start a new request." : "Chapman could not approve this request. Use Message Chapman for a clear next step or another service option." : isApproved ? "Chapman has confirmed your service date. Your service team and arrival updates will appear here next." : liveAwaitingResponse ? "Chapman has proposed a date. Accept it to approve your service, or reject it to close this request." : requestInReview ? "Chapman will check the details and keep you updated here." : "Chapman has approved this service date. We will share each practical update here."}</BodyText>
            <Text style={styles.reference}>{reference}</Text>
          </View>
          
          {isLoading ? <View style={styles.refreshState}><ActivityIndicator size="small" color={palette.blue} /><Text style={styles.refreshText}>Refreshing your secure request\u2026</Text></View> : null}
          {liveError ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={palette.error} /><Text style={styles.errorText}>{liveError}</Text><TouchableOpacity onPress={() => { void loadLiveRequest(); void loadLiveQuote(); }} style={styles.tryAgain}><Text style={styles.tryAgainText}>Refresh</Text></TouchableOpacity></View> : null}
          
          <View style={styles.serviceSummary}>
            <Text style={styles.label}>YOUR SERVICE</Text>
            <Text style={styles.serviceTitle}>{title}</Text>
            <Text style={styles.serviceMeta}>{serviceMeta}</Text>
            {quote?.details?.estimateLabel ? <View style={styles.estimateLine}><Ionicons name="calculator-outline" size={14} color={palette.blue} /><Text style={styles.estimateLineText}>{measurement ? `${measurement} m\u00B2 \u00B7 ` : ""}{quote.details.estimateLabel}{quote.details.cameraGuided ? " \u00B7 camera-guided" : ""}</Text></View> : null}
          </View>

          {/* Space Breakdown Card (for quote requests with dynamic space data) */}
          {isQuote && (spaceEntries.length > 0 || otherAreas?.length || otherDescription) ? (
            <View style={styles.spaceBreakdownCard}>
              <Text style={styles.label}>SPACE DETAILS</Text>
              <Text style={styles.spaceBreakdownTitle}>What you told us</Text>
              {otherDescription ? <Text style={styles.spaceDescription}>{otherDescription}</Text> : null}
              {spaceEntries.length > 0 ? (
                <View style={styles.spaceGrid}>
                  {spaceEntries.map(([key, value]) => (
                    <View key={key} style={styles.spaceItem}>
                      <Text style={styles.spaceItemLabel}>{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</Text>
                      <Text style={styles.spaceItemValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {otherAreas && otherAreas.length > 0 ? (
                <View style={styles.areasSection}>
                  <Text style={styles.areasLabel}>Other areas</Text>
                  <View style={styles.areasGrid}>
                    {otherAreas.map((area) => (
                      <View key={area} style={styles.areaChip}>
                        <Ionicons name="checkmark" size={10} color={palette.blue} />
                        <Text style={styles.areaChipText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Concerns Card */}
          {isQuote && concernsList && concernsList.length > 0 ? (
            <View style={styles.concernsCard}>
              <Text style={styles.label}>SPECIFIC CONCERNS</Text>
              <View style={styles.concernsList}>
                {concernsList.map((concern) => (
                  <View key={concern} style={styles.concernRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={palette.orange} />
                    <Text style={styles.concernText}>{concern}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          
          {isLiveRequest && liveRequest?.pickup_latitude !== null && liveRequest?.pickup_latitude !== undefined && liveRequest?.pickup_longitude !== null && liveRequest?.pickup_longitude !== undefined ? (
            <View style={styles.pickupPointCard}>
              <View style={styles.pickupPointIcon}><Ionicons name="location" size={18} color="#FFFFFF" /></View>
              <View style={styles.pickupPointCopy}>
                <Text style={styles.pickupPointTitle}>Pickup location saved</Text>
                <Text style={styles.pickupPointText}>Your Chapman pickup team can use this point to find you. It was shared only with this booking.</Text>
              </View>
              <Ionicons name="checkmark-circle" size={19} color={palette.green} />
            </View>
          ) : null}
          
          {isQuote ? (
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentIcon}><Ionicons name="calendar-outline" size={20} color={palette.blue} /></View>
                <View style={styles.appointmentCopy}>
                  <Text style={styles.appointmentTitle}>{appointment === "awaiting-customer" ? "Chapman has proposed a date" : appointment === "accepted" ? "Appointment accepted" : appointment === "rejected" ? "You asked for another date" : "Preferred date received"}</Text>
                  <Text style={styles.appointmentDate}>{readableDate(quote?.details?.proposedDate ?? quote?.details?.requestedDate)}</Text>
                </View>
              </View>
              {appointment === "awaiting-customer" ? (
                <>
                  <Text style={styles.appointmentText}>Please accept this date or reject it so Chapman can offer another time.</Text>
                  <View style={styles.appointmentActions}>
                    <TouchableOpacity disabled={responding} onPress={() => void respondToDate("rejected")} style={[styles.rejectButton, responding && styles.disabledButton]}><Text style={styles.rejectButtonText}>Reject date</Text></TouchableOpacity>
                    <TouchableOpacity disabled={responding} onPress={() => void respondToDate("accepted")} style={[styles.acceptButton, responding && styles.disabledButton]}><Text style={styles.acceptButtonText}>{responding ? "Saving\u2026" : "Accept date"}</Text><Ionicons name="checkmark" size={17} color="#FFFFFF" /></TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={styles.appointmentText}>{appointment === "accepted" ? "Chapman has your approval. The next update will show your service team and arrival status." : appointment === "rejected" ? "A coordinator will send a new appointment proposal for your review." : "A coordinator will confirm availability and send a date for you to accept or reject."}</Text>
              )}
            </View>
          ) : isLiveRequest ? (
            <View style={[styles.appointmentCard, isDeclined && styles.declinedCard]}>
              <View style={styles.appointmentHeader}>
                <View style={[styles.appointmentIcon, isDeclined && styles.declinedAppointmentIcon]}>
                  <Ionicons name={isDeclined ? "close-outline" : "calendar-outline"} size={20} color={isDeclined ? palette.error : palette.blue} />
                </View>
                <View style={styles.appointmentCopy}>
                  <Text style={styles.appointmentTitle}>{liveAwaitingResponse ? "Chapman has proposed a date" : liveStatus === "confirmed" ? "Service date approved" : isDeclined ? declinedByClient ? "You rejected this request" : "Request declined" : "Preferred pickup received"}</Text>
                  <Text style={[styles.appointmentDate, isDeclined && styles.declinedAppointmentDate]}>
                    {isDeclined 
                      ? "No service date was confirmed" 
                      : readableDate(liveRequest?.confirmed_for ?? liveRequest?.requested_for)}
                  </Text>
                </View>
              </View>
              {liveAwaitingResponse ? (
                <>
                  <Text style={styles.appointmentText}>Accept this date to approve your service, or reject it to close this request.</Text>
                  <View style={styles.appointmentActions}>
                    <TouchableOpacity disabled={responding} onPress={() => void respondToDate("rejected")} style={[styles.rejectButton, responding && styles.disabledButton]}><Text style={styles.rejectButtonText}>Reject date</Text></TouchableOpacity>
                    <TouchableOpacity disabled={responding} onPress={() => void respondToDate("accepted")} style={[styles.acceptButton, responding && styles.disabledButton]}><Text style={styles.acceptButtonText}>{responding ? "Saving\u2026" : "Accept date"}</Text><Ionicons name="checkmark" size={17} color="#FFFFFF" /></TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={styles.appointmentText}>{liveStatus === "confirmed" ? "Your service date is approved. The next update will show your service team and arrival status." : isDeclined ? declinedByClient ? "You rejected the proposed date. This request is closed. Message Chapman when you are ready to make a new request." : "This request was denied. Message Chapman if you would like an explanation or another service option." : "Chapman is checking availability and will send a date for your approval."}</Text>
              )}
            </View>
          ) : localAwaitingChapman ? (
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentIcon}><Ionicons name="calendar-outline" size={20} color={palette.blue} /></View>
                <View style={styles.appointmentCopy}>
                  <Text style={styles.appointmentTitle}>Preferred pickup received</Text>
                  <Text style={styles.appointmentDate}>{booking?.scheduledFor}</Text>
                </View>
              </View>
              <Text style={styles.appointmentText}>Chapman will first review your collection details, then send a confirmed date and time for your approval. No service has been scheduled yet.</Text>
            </View>
          ) : null}
          
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.label}>LIVE SERVICE STATUS</Text>
                <Text style={styles.progressTitle}>What is happening now</Text>
              </View>
              <TouchableOpacity onPress={() => { void loadLiveRequest(); void loadLiveQuote(); }} disabled={(!shouldLoadLiveRequest && !isQuote) || isLoading} style={styles.refreshButton}>
                <Ionicons name="refresh" size={18} color={palette.blue} />
              </TouchableOpacity>
            </View>
            {progressSteps.map((step, index) => { 
              const failed = isDeclined && index >= 1; 
              const completed = (isDeclined && index === 0) || (!isDeclined && index < currentStep); 
              const active = !isDeclined && index === currentStep; 
              return (
                <View key={step} style={styles.progressRow}>
                  <View style={styles.progressRail}>
                    <View style={[styles.progressDot, completed && styles.progressDotActive, failed && styles.progressDotFailed]}>
                      {completed ? <Ionicons name="checkmark" size={10} color="#FFFFFF" /> : failed ? <Ionicons name="close" size={11} color="#FFFFFF" /> : null}
                    </View>
                    {index < progressSteps.length - 1 ? <View style={[styles.progressLine, completed && styles.progressLineActive, failed && styles.progressLineFailed]} /> : null}
                  </View>
                  <View style={styles.progressCopy}>
                    <Text style={[styles.progressText, active && styles.progressTextActive, failed && styles.progressTextFailed]}>{step}</Text>
                    <Text style={[styles.progressHint, failed && styles.progressHintFailed]}>
                      {failed 
                        ? index === 1 ? "Chapman did not approve this request" : "This step will not continue because the request was declined" 
                        : index === 0 ? "Your request is safely in the Chapman system" 
                        : index === 1 ? "We confirm the right scope and price" 
                        : index === 2 ? "Complete payment to secure your booking slot"
                        : index === 3 ? "Your verified specialist appears here" 
                        : index === 4 ? "You receive an arrival update before work starts" 
                        : "Your receipt, activity, and eligible reward appear here"}
                    </Text>
                  </View>
                </View>
              ); 
            })}
          </View>
          
          {events.length ? (
            <View style={styles.activityCard}>
              <Text style={styles.label}>REQUEST ACTIVITY</Text>
              {events.slice(-3).reverse().map((event) => (
                <View key={event.id} style={styles.activityRow}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityTitle}>{eventLabel(event)}</Text>
                    <Text style={styles.activityTime}>{new Date(event.created_at).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          
          <View style={[styles.specialistCard, isDeclined && styles.declinedCard]}>
            <View style={[styles.specialistIcon, isDeclined && styles.declinedAppointmentIcon]}>
              <Ionicons name={isDeclined ? "chatbubble-ellipses-outline" : "person-outline"} size={20} color={isDeclined ? palette.error : palette.blue} />
            </View>
            <View style={styles.specialistCopy}>
              <Text style={styles.specialistTitle}>{booking?.specialistName ? booking.specialistName : isDeclined ? "Need another option?" : requestInReview ? "Chapman coordinator" : "Specialist to be assigned"}</Text>
              <Text style={styles.specialistText}>{booking?.specialistName ? "Your assigned specialist is responsible for this service update." : isDeclined ? "Message Chapman for help with another date or a different service option." : requestInReview ? "A coordinator is checking your request before sharing a date for your approval." : "We show the person, arrival update, and service details here after confirmation."}</Text>
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.bottom}>
          <PrimaryButton 
            label={isDeclined ? "Message Chapman for help" : isApproved ? "Make Payment" : "Message Chapman"} 
            icon={isDeclined ? "chatbubble-ellipses-outline" : isApproved ? "card-outline" : "chatbubble-outline"} 
            onPress={() => {
              if (isApproved) {
                alert("Payment gateway will open here. (e.g., Paystack/Hubtel)");
              } else {
                router.push(contextUrl as never);
              }
            }} 
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ 
  page: { flex: 1, backgroundColor: palette.canvas }, 
  content: { padding: 20, paddingTop: 12, paddingBottom: 106, gap: 17 }, 
  lead: { alignItems: "center", paddingHorizontal: 17, paddingTop: 4, gap: 9 }, 
  leadIcon: { width: 55, height: 55, borderRadius: 20, backgroundColor: palette.green, alignItems: "center", justifyContent: "center", marginBottom: 2, overflow: "visible" }, 
  leadIconQuote: { backgroundColor: palette.orange }, 
  leadIconDeclined: { backgroundColor: palette.error }, 
  leadIconApproved: { shadowColor: palette.green, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, 
  approvedHalo: { position: "absolute", width: 55, height: 55, borderRadius: 22, borderWidth: 3, borderColor: "#9AE6B4" }, 
  leadTitle: { textAlign: "center", fontSize: 24, lineHeight: 30 }, 
  leadBody: { textAlign: "center", maxWidth: 300, fontSize: 12, lineHeight: 18 }, 
  reference: { color: "#8790A1", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8 }, 
  refreshState: { minHeight: 43, borderRadius: 14, backgroundColor: "#EEF3FF", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 }, 
  refreshText: { color: palette.blue, fontFamily: "Inter_600SemiBold", fontSize: 11 }, 
  error: { minHeight: 48, padding: 11, borderRadius: 14, backgroundColor: "#FDEBEB", flexDirection: "row", alignItems: "center", gap: 8 }, 
  errorText: { flex: 1, color: palette.error, fontFamily: "Inter_500Medium", fontSize: 10, lineHeight: 14 }, 
  tryAgain: { minHeight: 30, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" }, 
  tryAgainText: { color: palette.error, fontFamily: "Inter_700Bold", fontSize: 10 }, 
  serviceSummary: { padding: 16, borderRadius: 18, backgroundColor: "#EEF3FF", gap: 4 }, 
  label: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.1 }, 
  serviceTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15 }, 
  serviceMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12 }, 
  estimateLine: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }, 
  estimateLineText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 10 }, 
  spaceBreakdownCard: { padding: 16, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, gap: 8 }, 
  spaceBreakdownTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, 
  spaceDescription: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, fontStyle: "italic" }, 
  spaceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, 
  spaceItem: { minWidth: 100, padding: 10, borderRadius: 12, backgroundColor: "#F5F7FA", gap: 3 }, 
  spaceItemLabel: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 10 }, 
  spaceItemValue: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, 
  areasSection: { gap: 6, paddingTop: 4 }, 
  areasLabel: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 11 }, 
  areasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, 
  areaChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#EEF3FF" }, 
  areaChipText: { color: palette.blue, fontFamily: "Inter_600SemiBold", fontSize: 10 }, 
  concernsCard: { padding: 16, borderRadius: 18, backgroundColor: "#FFF9F0", borderWidth: 1, borderColor: "#F2E4BF", gap: 8 }, 
  concernsList: { gap: 6 }, 
  concernRow: { flexDirection: "row", alignItems: "center", gap: 7 }, 
  concernText: { color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 12 }, 
  pickupPointCard: { minHeight: 68, padding: 13, borderRadius: 18, backgroundColor: "#F0FAF2", borderWidth: 1, borderColor: "#B7DFC0", flexDirection: "row", alignItems: "center", gap: 10 }, 
  pickupPointIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: palette.green, alignItems: "center", justifyContent: "center" }, 
  pickupPointCopy: { flex: 1, gap: 2 }, 
  pickupPointTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 12 }, 
  pickupPointText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14 }, 
  appointmentCard: { padding: 15, borderRadius: 19, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#C6D2FF", gap: 12 }, 
  declinedCard: { borderColor: "#E9B8B2", backgroundColor: "#FFF9F8" }, 
  appointmentHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, 
  appointmentIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" }, 
  declinedAppointmentIcon: { backgroundColor: "#FDEBEB" }, 
  appointmentCopy: { flex: 1, gap: 2 }, 
  appointmentTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, 
  appointmentDate: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 12 }, 
  declinedAppointmentDate: { color: palette.error }, 
  appointmentText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 }, 
  appointmentActions: { flexDirection: "row", gap: 9 }, 
  rejectButton: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "#E9B8B2", alignItems: "center", justifyContent: "center", backgroundColor: "#FFF8F7" }, 
  rejectButtonText: { color: palette.error, fontFamily: "Inter_700Bold", fontSize: 12 }, 
  acceptButton: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: palette.blue, flexDirection: "row", gap: 6 }, 
  disabledButton: { opacity: 0.58 }, 
  acceptButtonText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 }, 
  progressSection: { padding: 17, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, gap: 12 }, 
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 1 }, 
  progressTitle: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, marginTop: 3 }, 
  refreshButton: { width: 35, height: 35, borderRadius: 12, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" }, 
  progressRow: { flexDirection: "row", gap: 11, minHeight: 50 }, 
  progressRail: { alignItems: "center", width: 22 }, 
  progressDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#DDE1E9", alignItems: "center", justifyContent: "center" }, 
  progressDotActive: { backgroundColor: palette.blue }, 
  progressDotFailed: { backgroundColor: palette.error }, 
  progressLine: { width: 2, flex: 1, backgroundColor: "#DDE1E9" }, 
  progressLineActive: { backgroundColor: palette.blue }, 
  progressLineFailed: { backgroundColor: "#E7A19A" }, 
  progressCopy: { gap: 2, flex: 1 }, 
  progressText: { color: "#727B8C", fontFamily: "Inter_600SemiBold", fontSize: 13 }, 
  progressTextActive: { color: palette.ink }, 
  progressTextFailed: { color: palette.error }, 
  progressHint: { color: "#8E96A5", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15 }, 
  progressHintFailed: { color: "#A8615A" }, 
  activityCard: { padding: 15, borderRadius: 19, backgroundColor: "#FFFCF6", borderWidth: 1, borderColor: "#F2E4BF", gap: 11 }, 
  activityRow: { flexDirection: "row", gap: 9, alignItems: "flex-start" }, 
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.orange, marginTop: 4 }, 
  activityCopy: { flex: 1, gap: 2 }, 
  activityTitle: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 11 }, 
  activityTime: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 9 }, 
  specialistCard: { padding: 15, borderRadius: 19, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, flexDirection: "row", gap: 11, alignItems: "flex-start" }, 
  specialistIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" }, 
  specialistCopy: { flex: 1, gap: 2 }, 
  specialistTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, 
  specialistText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 }, 
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 12, paddingBottom: 18, backgroundColor: "rgba(248,249,250,0.98)", borderTopWidth: 1, borderTopColor: palette.border } 
});