import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, StatusPill, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { useCustomerAccount } from "@/hooks/use-customer-account";
import { CustomerActivity, loadCustomerActivity } from "@/lib/customer-activity";
import { laundryStanding, serviceStanding, trackProgressLine, TrackStanding } from "@/lib/loyalty";
import { timeAgo } from "@/lib/chapman-format";

/**
 * Elite Patronage, and the screen the Chapman Bonus card opens.
 *
 * TWO TRACKS, counted in the way each kind of work deserves:
 * - Laundry: visits, exactly as the Chapman staff system already counts them.
 * - Services: completed jobs, because each one is a large piece of work.
 *
 * Everything on this screen is read from the customer's own account. Nothing is
 * invented, and the screen says plainly which requests count and which do not.
 */
export default function LoyaltyScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const [activity, setActivity] = useState<CustomerActivity | null>(null);
  const [reading, setReading] = useState(true);
  const { account, checking } = useCustomerAccount();
  const clientId = account?.client_id ?? null;

  const load = useCallback(async () => {
    setReading(true);
    try {
      setActivity(await loadCustomerActivity(clientId));
    } finally {
      setReading(false);
    }
  }, [clientId]);

  // Read only once the account is known, so a signed-in customer is never shown
  // the sign-in card while their own records are on the way.
  useEffect(() => {
    if (checking) return;
    void load();
  }, [checking, load]);

  const loading = checking || reading;

  const laundry = activity ? laundryStanding(activity) : null;
  const services = activity ? serviceStanding(activity) : null;

  const countedLaundry = activity?.requests.filter((request) => ["confirmed", "completed", "converted"].includes(request.status)) ?? [];
  const waitingLaundry = activity?.requests.filter((request) => !["confirmed", "completed", "converted"].includes(request.status)) ?? [];
  const countedServices = activity?.quotes.filter((quote) => quote.appointmentResponse === "accepted") ?? [];
  const waitingServices = activity?.quotes.filter((quote) => quote.appointmentResponse !== "accepted" && quote.appointmentResponse !== "declined") ?? [];

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={20} color={palette.ink} /></TouchableOpacity>
          <Text style={styles.eyebrow}>CHAPMAN ELITE PATRONAGE</Text>
        </View>
        <DisplayText style={styles.title}>Care more, earn more back.</DisplayText>
        <BodyText style={styles.subtitle}>Two ladders, because Chapman does two kinds of work. Every collection you send counts on the laundry ladder, and every service Chapman completes counts on the services ladder. The discount applies to your next booking automatically.</BodyText>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={palette.accent} /><Text style={styles.loadingText}>Reading your account</Text></View>
        ) : !activity?.signedIn ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to see your tiers</Text>
            <BodyText style={styles.cardText}>Your patronage is tied to your phone number, so signing in brings your whole history with it.</BodyText>
            <PrimaryButton label="Sign in with phone" icon="phone-portrait-outline" onPress={() => router.push("/auth/phone" as never)} />
          </View>
        ) : laundry && services ? (
          <>
            <TrackCard
              standing={laundry}
              title="Laundry ladder"
              icon="shirt-outline"
              explanation="Counted in visits, the same way the Chapman office counts them."
            />
            <TrackCard
              standing={services}
              title="Services ladder"
              icon="sparkles-outline"
              explanation="Counted in completed jobs: cleaning, fumigation, detailing, sofa and carpet, polytank, and contract work."
            />

            <TrackLadder standing={laundry} title="The laundry ladder" />
            <TrackLadder standing={services} title="The services ladder" />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>What counted for you</Text>
              <BodyText style={styles.cardText}>A request counts once Chapman has taken the work on. Anything still being reviewed, or that Chapman could not take, waits here instead of counting, so your tier is always honest.</BodyText>

              <Text style={styles.subLabel}>COUNTING NOW</Text>
              {[...countedLaundry.map((request) => ({
                id: request.id,
                title: `Laundry, ${request.itemCount} item${request.itemCount === 1 ? "" : "s"}`,
                meta: `${request.status === "confirmed" ? "Confirmed" : "Completed"} · counted as a visit`,
                href: `/booking/${request.id}`,
              })), ...countedServices.map((quote) => ({
                id: quote.id,
                title: quote.serviceTitle,
                meta: `Accepted · counted as a completed job`,
                href: `/booking/${quote.id}`,
              }))].slice(0, 8).map((entry) => (
                <TouchableOpacity key={entry.id} onPress={() => router.push(entry.href as never)} style={styles.row}>
                  <View style={[styles.rowIcon, styles.rowIconOn]}><Ionicons name="checkmark" size={15} color="#FFFFFF" /></View>
                  <View style={styles.rowCopy}><Text style={styles.rowTitle}>{entry.title}</Text><Text style={styles.rowMeta}>{entry.meta}</Text></View>
                  <Ionicons name="chevron-forward" size={17} color={palette.muted} />
                </TouchableOpacity>
              ))}
              {!countedLaundry.length && !countedServices.length ? (
                <View style={styles.empty}><Ionicons name="sparkles-outline" size={20} color={palette.accent} /><Text style={styles.emptyText}>Nothing counted yet. Your first completed service starts your ladder.</Text></View>
              ) : null}

              <Text style={styles.subLabel}>NOT COUNTING YET</Text>
              {[...waitingLaundry.map((request) => ({
                id: request.id,
                title: `Laundry, ${request.itemCount} item${request.itemCount === 1 ? "" : "s"}`,
                meta: `Still with Chapman · ${timeAgo(request.createdAt)}`,
                href: `/booking/${request.id}`,
              })), ...waitingServices.map((quote) => ({
                id: quote.id,
                title: quote.serviceTitle,
                meta: `${quote.appointmentResponse === "awaiting-customer" ? "A date is waiting for your answer" : "Still with Chapman"} · ${timeAgo(quote.createdAt)}`,
                href: `/booking/${quote.id}`,
              }))].slice(0, 6).map((entry) => (
                <TouchableOpacity key={entry.id} onPress={() => router.push(entry.href as never)} style={styles.row}>
                  <View style={styles.rowIcon}><Ionicons name="time-outline" size={15} color={palette.accent} /></View>
                  <View style={styles.rowCopy}><Text style={styles.rowTitle}>{entry.title}</Text><Text style={styles.rowMeta}>{entry.meta}</Text></View>
                  <Ionicons name="chevron-forward" size={17} color={palette.muted} />
                </TouchableOpacity>
              ))}
              {!waitingLaundry.length && !waitingServices.length ? (
                <Text style={styles.rowMeta}>Nothing is waiting. Everything you have sent has counted.</Text>
              ) : null}
            </View>

            <BodyText style={styles.footnote}>Chapman sets these numbers. Ask the office for your business figures and they change in one place, which updates this screen, the home card, and your profile together.</BodyText>
            <PrimaryButton label="Book a service and move up" icon="add" onPress={() => router.push("/services" as never)} />
          </>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

/** One track, at a glance: tier, discount, and the step to the next one. */
function TrackCard({ standing, title, icon, explanation }: { standing: TrackStanding; title: string; icon: keyof typeof Ionicons.glyphMap; explanation: string }) {
  const { styles } = useChapmanStyles(makeStyles);
  return (
    <LinearGradient colors={standing.track === "laundry" ? ["#047857", "#059669", "#1C1208"] : ["#1D4ED8", "#2563EB", "#111827"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>{title.toUpperCase()}</Text>
          <Text style={styles.heroTier}>{standing.tier.name}</Text>
          <Text style={styles.heroDiscount}>{standing.tier.discount}% off your next booking</Text>
        </View>
        <View style={styles.heroBadge}><Ionicons name={icon} size={26} color="#FFFFFF" /></View>
      </View>
      <Text style={styles.heroBenefit}>{standing.tier.benefit}</Text>
      <Text style={styles.heroCount}>{standing.count} {standing.unitLabel} counted</Text>
      <View style={styles.heroProgress}>
        <View style={styles.heroProgressTop}>
          <Text style={styles.heroProgressLabel}>{trackProgressLine(standing)}</Text>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(standing.progress * 100)}%` }]} /></View>
      </View>
      <Text style={styles.heroExplanation}>{explanation}</Text>
    </LinearGradient>
  );
}

/** The full ladder for one track, so the customer can see where it ends. */
function TrackLadder({ standing, title }: { standing: TrackStanding; title: string }) {
  const { styles } = useChapmanStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {standing.tiers.map((tier, index) => {
        const reached = standing.tier.key === tier.key || (tier.byInvitation ? false : standing.count >= tier.from);
        return (
          <View key={tier.key} style={[styles.tierRow, index === 0 && styles.tierRowFirst]}>
            <View style={styles.tierLeft}>
              <Text style={[styles.tierName, standing.tier.key === tier.key && styles.tierNameActive]}>{tier.name}</Text>
              <Text style={styles.tierFrom}>
                {tier.byInvitation ? "By Chapman's invitation" : tier.from === 0 ? "From the start" : `From ${tier.from} ${standing.track === "laundry" ? "visits" : "completed jobs"}`}
              </Text>
              <Text style={styles.tierBenefit}>{tier.benefit}</Text>
            </View>
            <View style={styles.tierRight}>
              <Text style={styles.tierDiscount}>{tier.discount}% off</Text>
              {standing.tier.key === tier.key ? <StatusPill label="You" tone="green" /> : reached ? <Text style={styles.tierDone}>done</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  content: { padding: 20, paddingTop: 14, paddingBottom: 42, gap: 13, backgroundColor: palette.canvas },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 },
  title: { fontSize: 27, lineHeight: 34, marginTop: 2 },
  subtitle: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  loading: { padding: 40, alignItems: "center", gap: 10 },
  loadingText: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 12 },
  hero: { padding: 18, borderRadius: 24, gap: 9 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLeft: { flex: 1 },
  heroLabel: { color: "#D1FAE5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.3 },
  heroTier: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 25, marginTop: 2 },
  heroDiscount: { color: "#E5F5EA", fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  heroBadge: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  heroBenefit: { color: "#F3F7F4", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  heroCount: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 },
  heroProgress: { gap: 6 },
  heroProgressTop: { flexDirection: "row", justifyContent: "space-between" },
  heroProgressLabel: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11 },
  track: { height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  fill: { height: 7, borderRadius: 4, backgroundColor: palette.surface },
  heroExplanation: { color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 },
  card: { padding: 16, borderRadius: 21, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, gap: 9 },
  cardTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15 },
  cardText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#F1EEE9" },
  rowIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: palette.chipBlue, alignItems: "center", justifyContent: "center" },
  rowIconOn: { backgroundColor: palette.green },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  rowMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 },
  subLabel: { color: palette.eyebrow, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.1, marginTop: 4 },
  empty: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  emptyText: { flex: 1, color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#F1EEE9" },
  tierRowFirst: { borderTopWidth: 0, paddingTop: 2 },
  tierLeft: { flex: 1, gap: 2 },
  tierName: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 },
  tierNameActive: { color: palette.green },
  tierFrom: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10 },
  tierBenefit: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14 },
  tierRight: { alignItems: "flex-end", gap: 3 },
  tierDiscount: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 12 },
  tierDone: { color: palette.green, fontFamily: "Inter_600SemiBold", fontSize: 10 },
  footnote: { fontSize: 10, lineHeight: 15, color: palette.muted, textAlign: "center" },
});
