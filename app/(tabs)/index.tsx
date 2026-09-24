import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppScreen } from "@/components/app-screen";
import { BodyText, ChapmanMark, DisplayText, IconOrb, SectionHeading, StatusPill, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { AnimatedServiceScene } from "@/components/service-illustration";
import { DailyAnnouncement } from "@/components/daily-announcement";
import { SERVICES, Service } from "@/lib/chapman-data";
import { useBookingStore } from "@/lib/booking-store";
import { haptic } from "@/lib/haptics";
import { greetingForHour, useCustomerSummary } from "@/hooks/use-customer-summary";
import { useNotifications } from "@/hooks/use-notifications";
import { laundryStanding, serviceStanding, trackProgressLine } from "@/lib/loyalty";
import { quoteStatusLabel, requestStatusLabel } from "@/lib/customer-activity";
import { timeAgo } from "@/lib/chapman-format";
import { serviceColor } from "@/lib/service-colors";
import { useColorSchemeSafe } from "@/lib/theme-provider";
const quickServiceIds = ["laundry", "cleaning", "fumigation", "detailing", "fabric", "polytank", "workers", "contract"];
export default function HomeScreen() {
  const colorScheme = useColorSchemeSafe();
  const { styles, palette } = useChapmanStyles(makeStyles);
  const { bookings } = useBookingStore();
  const quickServices = useMemo(() => quickServiceIds.map((id) => SERVICES.find((service) => service.id === id)).filter(Boolean) as Service[], []);
  const activeBooking = bookings[0];
  const { activity, firstName, initials, loading } = useCustomerSummary();
  const laundryTrack = activity ? laundryStanding(activity) : null;
  const serviceTrack = activity ? serviceStanding(activity) : null;
  const { unread } = useNotifications();
  // "Your care schedule" is about the customer's real account, not about what is
  // saved on this phone. The newest live request or enquiry leads, and anything
  // waiting for the customer's answer is called out, because that is the thing
  // that actually needs their attention.
  const waitingForAnswer = activity?.requests.find((request) => request.status === "needs_customer_confirmation")
    ?? activity?.quotes.find((quote) => quote.appointmentResponse === "awaiting-customer")
    ?? null;
  const liveRequest = activity?.requests[0] ?? null;
  const liveQuote = activity?.quotes[0] ?? null;
  const scheduleTitle = waitingForAnswer
    ? "A date needs your answer"
    : activeBooking
      ? activeBooking.serviceTitle
      : liveRequest
        ? `Laundry, ${liveRequest.itemCount} item${liveRequest.itemCount === 1 ? "" : "s"}`
        : liveQuote
          ? liveQuote.serviceTitle
          : null;
  const scheduleMeta = waitingForAnswer
    ? "Chapman proposed a date. Open it to accept or ask for another day."
    : activeBooking
      ? activeBooking.scheduledFor
      : liveRequest
        ? `${requestStatusLabel(liveRequest.status)} · sent ${timeAgo(liveRequest.createdAt)}`
        : liveQuote
          ? `${quoteStatusLabel(liveQuote.appointmentResponse)} · sent ${timeAgo(liveQuote.createdAt)}`
          : null;
  const scheduleHref = waitingForAnswer
    ? `/booking/${waitingForAnswer.id}`
    : activeBooking
      ? `/booking/${activeBooking.id}`
      : liveRequest
        ? `/booking/${liveRequest.id}`
        : liveQuote
          ? `/booking/${liveQuote.id}`
          : "/services";
  return (
    <AppScreen>
      <DailyAnnouncement onOpen={() => router.push("/notifications" as never)} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.brandRow}
            activeOpacity={0.75}
            onPress={() => { haptic.light(); router.push("/services" as never); }}
            accessibilityRole="button"
            accessibilityLabel="Open the full Chapman care directory"
          >
            <ChapmanMark size={45} />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>Chapman Prestige</Text>
              <Text style={styles.brandSub}>LIMITED</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push("/notifications" as never)} style={styles.bellButton} activeOpacity={0.7} accessibilityLabel={unread > 0 ? `${unread} new updates` : "Updates"}>
              <Ionicons name="notifications-outline" size={22} color={palette.ink} />
              {unread > 0 ? <View style={styles.notificationDot}><Text style={styles.notificationDotText}>{unread > 9 ? "9+" : unread}</Text></View> : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/profile" as never)} style={styles.avatar} activeOpacity={0.8} accessibilityLabel="Open your profile">
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>{greetingForHour(new Date().getHours())}{firstName ? `, ${firstName.toUpperCase()}` : ""}</Text>
          <DisplayText style={styles.greetingTitle}>{firstName ? `Welcome back, ${firstName}.` : "Make your space work better for you."}</DisplayText>
        </View>
        <TouchableOpacity onPress={() => router.push("/service/laundry" as never)} activeOpacity={0.9} style={styles.storyMoment}>
          <View style={styles.storyCopy}><Text style={styles.storyLabel}>LAUNDRY MADE SIMPLE</Text><Text style={styles.storyTitle}>More fresh clothes. More time for you.</Text><Text style={styles.storyAction}>See how it works <Ionicons name="arrow-forward" size={13} color={palette.accent} /></Text></View>
          <View style={styles.storyArt}><AnimatedServiceScene serviceId="laundry" height={136} /></View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/loyalty" as never)} activeOpacity={0.92} style={styles.loyaltyPress} accessibilityLabel="Open Chapman Elite Patronage">
          <LinearGradient colors={["#047857", "#059669", "#1C1208"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loyaltyCard}>
            <View style={styles.loyaltyGlowOne} />
            <View style={styles.loyaltyGlowTwo} />
            <View style={styles.loyaltyTop}>
              <View>
                <Text style={styles.loyaltyLabel}>ELITE PATRONAGE</Text>
                <Text style={styles.loyaltyTier}>{loading ? "Reading your account" : `${laundryTrack ? laundryTrack.tier.name : "Standard"} laundry`}</Text>
                <Text style={styles.loyaltySub}>{loading ? " " : `${serviceTrack ? serviceTrack.tier.name : "Standard"} services`}</Text>
              </View>
              <View style={styles.discountBubble}>
                <Text style={styles.discountValue}>{laundryTrack ? `${laundryTrack.tier.discount}%` : "0%"}</Text>
                <Text style={styles.discountLabel}>LAUNDRY</Text>
              </View>
            </View>
            <View style={styles.loyaltyBottom}>
              <View style={styles.progressCopy}>
                <Text style={styles.progressLabel}>
                  {loading
                    ? "Checking your ladders"
                    : laundryTrack
                      ? `Laundry: ${trackProgressLine(laundryTrack)}`
                      : "Send your first collection to start the laundry ladder"}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${laundryTrack ? Math.round(laundryTrack.progress * 100) : 0}%` }]} />
                </View>
                <Text style={styles.progressHint}>
                  {loading || !serviceTrack ? " " : `Services: ${trackProgressLine(serviceTrack)}`}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={26} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <SectionHeading eyebrow="SERVICES" title="Care, on your terms" action="See all" onAction={() => router.push("/services" as never)} />
        <View style={styles.quickGrid}>
          {quickServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.75}
              style={styles.quickCard}
              onPress={() => {
                haptic.light();
                if (service.id === "workers") router.push("/workers" as never);
                else router.push(`/service/${service.id}` as never);
              }}
            >
              <IconOrb icon={service.icon as keyof typeof Ionicons.glyphMap} color={serviceColor(service.id, colorScheme).accent} size={40} />
              <Text numberOfLines={2} style={styles.quickLabel}>{service.shortTitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <SectionHeading eyebrow="YOUR ACTIVITY" title="Care schedule" action="Bookings" onAction={() => router.push("/bookings" as never)} />
        {scheduleTitle ? (
          <TouchableOpacity onPress={() => router.push(scheduleHref as never)} activeOpacity={0.88} style={styles.activeBooking}>
            <View style={styles.activeBookingTop}>
              <IconOrb icon={waitingForAnswer ? "calendar-outline" : "cube-outline"} color={waitingForAnswer ? palette.orange : palette.blue} />
              <View style={styles.activeBookingCopy}>
                <StatusPill label={waitingForAnswer ? "answer needed" : "in progress"} tone={waitingForAnswer ? "orange" : "blue"} />
                <Text style={styles.activeTitle}>{scheduleTitle}</Text>
                <Text style={styles.activeMeta}>{scheduleMeta}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </View>
            <View style={styles.trackButton}><Ionicons name="navigate-outline" size={16} color={palette.accent} /><Text style={styles.trackText}>{waitingForAnswer ? "Open and answer" : "Track live"}</Text></View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyBooking}>
            <View style={styles.emptyIcon}><Ionicons name="calendar-clear-outline" size={22} color={palette.accent} /></View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>{loading ? "Reading your schedule" : "Your care schedule is clear"}</Text>
              <BodyText style={styles.emptyBody}>{loading ? "One moment while we check your account." : "Book a service today and follow every step from pickup to completion."}</BodyText>
            </View>
            <TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.emptyAction} accessibilityLabel="Book a service"><Ionicons name="add" size={21} color="#FFFFFF" /></TouchableOpacity>
          </View>
        )}
        <SectionHeading eyebrow="EXCLUSIVE VALUE" title="More room for your weekend" />
        <View style={styles.promoCard}>
          <View style={styles.promoContent}><StatusPill label="KUMASI FAVOURITE" tone="orange" /><DisplayText style={styles.promoTitle}>Your weekends are for living.</DisplayText><BodyText style={styles.promoBody}>Let our garment-care team collect, care for, and return the laundry on your schedule.</BodyText><TouchableOpacity onPress={() => router.push("/service/laundry" as never)} style={styles.promoLink}><Text style={styles.promoLinkText}>Explore garment care</Text><Ionicons name="arrow-forward" size={16} color={palette.accent} /></TouchableOpacity></View>
          <View style={styles.promoOrb}><Ionicons name="shirt-outline" size={42} color="#FFFFFF" /></View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: palette.canvas }, content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36, gap: 23 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, brandRow: { flexDirection: "row", alignItems: "center", gap: 8 }, brandCopy: { justifyContent: "center", paddingTop: 1 }, brandName: { color: palette.deep, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 14, letterSpacing: -0.35 }, brandSub: { color: palette.orange, fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 2.7, marginTop: 1 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 10 }, bellButton: { width: 41, height: 41, borderRadius: 14, backgroundColor: palette.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.border }, notificationDot: { position: "absolute", top: 5, right: 5, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#D97706", borderWidth: 1.5, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, avatar: { width: 41, height: 41, borderRadius: 15, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" }, avatarText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 12 },
  notificationDotText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 9 },
  greeting: { gap: 4 }, eyebrow: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.3 }, greetingTitle: { maxWidth: 315, fontSize: 28, lineHeight: 35 },
  storyMoment: { minHeight: 151, borderRadius: 22, backgroundColor: palette.soft, overflow: "hidden", flexDirection: "row", alignItems: "center", paddingLeft: 17 }, storyCopy: { flex: 1, zIndex: 2, gap: 7, paddingVertical: 15 }, storyLabel: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.05 }, storyTitle: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 17, lineHeight: 23, maxWidth: 175 }, storyAction: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 11, flexDirection: "row" }, storyArt: { width: 154, height: 151, marginRight: -5, justifyContent: "center" },
  loyaltyPress: { borderRadius: 24, overflow: "hidden", shadowColor: palette.deep, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, loyaltyCard: { minHeight: 162, borderRadius: 24, padding: 20, overflow: "hidden", justifyContent: "space-between" }, loyaltyGlowOne: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(250,246,238,0.14)", right: -48, top: -84 }, loyaltyGlowTwo: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(245,158,11,0.13)", left: 120, bottom: -70 }, loyaltyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, loyaltyLabel: { color: "#FCE7B2", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.35 }, loyaltyTier: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 21, marginTop: 5 }, discountBubble: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" }, discountValue: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 15 }, discountLabel: { color: "#FCE7B2", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.8 }, loyaltyBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }, progressCopy: { flex: 1, gap: 8, paddingRight: 16 }, progressLabel: { color: "#FCE7B2", fontFamily: "Inter_500Medium", fontSize: 11 }, progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.23)", borderRadius: 99, overflow: "hidden" }, progressFill: { width: "57%", height: "100%", borderRadius: 99, backgroundColor: palette.surface },
  loyaltySub: { color: "#D1FAE5", fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 1 },
  progressHint: { color: "#BFE7CF", fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 5 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, quickCard: { width: "22.7%", minHeight: 104, borderRadius: 19, backgroundColor: palette.surface, padding: 10, justifyContent: "space-between", borderWidth: 1, borderColor: "#E9E1D5" }, quickLabel: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 14 },
  activeBooking: { padding: 15, backgroundColor: palette.surface, borderRadius: 20, gap: 14, borderWidth: 1, borderColor: palette.border }, activeBookingTop: { flexDirection: "row", alignItems: "center", gap: 11 }, activeBookingCopy: { flex: 1, gap: 4 }, activeTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14, marginTop: 2 }, activeMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12 }, trackButton: { height: 37, borderRadius: 11, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, trackText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 13 },
  emptyBooking: { minHeight: 104, padding: 15, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12 }, emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center" }, emptyCopy: { flex: 1, gap: 3 }, emptyTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, emptyBody: { fontSize: 12, lineHeight: 17 }, emptyAction: { width: 35, height: 35, borderRadius: 12, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" },
  promoCard: { backgroundColor: palette.surface, borderRadius: 23, padding: 18, overflow: "hidden", minHeight: 194, flexDirection: "row", borderWidth: 1, borderColor: palette.border }, promoContent: { flex: 1, justifyContent: "space-between", gap: 10, zIndex: 2 }, promoTitle: { fontSize: 19, lineHeight: 24, maxWidth: 190 }, promoBody: { fontSize: 12, lineHeight: 17, maxWidth: 215 }, promoLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 3 }, promoLinkText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 12 }, promoOrb: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: palette.orange, right: -40, bottom: -42, alignItems: "flex-start", justifyContent: "flex-start", paddingTop: 24, paddingLeft: 27 },
});
