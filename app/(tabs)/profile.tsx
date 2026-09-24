import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, SectionHeading, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";

import { useBookingStore } from "@/lib/booking-store";
import { SERVICES } from "@/lib/chapman-data";
import { useThemeContext } from "@/lib/theme-provider";
import { useCustomerAccount } from "@/hooks/use-customer-account";
import { useCustomerSummary } from "@/hooks/use-customer-summary";
import { laundryStanding, serviceStanding, trackProgressLine } from "@/lib/loyalty";
import { timeAgo } from "@/lib/chapman-format";

type GuestGender = "woman" | "man" | "unspecified";
const GENDER_STORAGE_KEY = "chapman-profile-gender";

export default function ProfileScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const { bookings, quotes, routines, removeRoutine } = useBookingStore();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { account, checking } = useCustomerAccount();
  const { activity, loading: summaryLoading } = useCustomerSummary();
  const laundryTrack = activity ? laundryStanding(activity) : null;
  const serviceTrack = activity ? serviceStanding(activity) : null;
  const [guestGender, setGuestGender] = useState<GuestGender>("unspecified");
  const [locationLabel, setLocationLabel] = useState("Location not shared");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState<Date | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  // Counted from the customer's real account: every enquiry and every laundry
  // request they have ever sent, plus anything still saved on this phone.
  const frequentServices = useMemo(() => {
    const counts: Record<string, number> = {};
    counts["Laundry"] = activity?.requests.length ?? 0;
    for (const quote of activity?.quotes ?? []) counts[quote.serviceTitle] = (counts[quote.serviceTitle] ?? 0) + 1;
    for (const booking of bookings) counts[booking.serviceTitle] = (counts[booking.serviceTitle] ?? 0) + 1;
    for (const quote of quotes) counts[quote.serviceTitle] = (counts[quote.serviceTitle] ?? 0) + 1;
    return Object.entries(counts).sort(([, left], [, right]) => right - left).slice(0, 3);
  }, [activity, bookings, quotes]);
  // The real trail: their newest requests and enquiries, newest first.
  const recentActivity = useMemo(() => {
    if (!activity) return [];
    const rows = [
      ...activity.requests.map((request) => ({
        id: request.id,
        title: `Laundry, ${request.itemCount} item${request.itemCount === 1 ? "" : "s"}`,
        meta: `${timeAgo(request.createdAt)} · ${request.pickupArea ?? "Kumasi"}`,
        href: `/booking/${request.id}`,
        icon: "cube-outline" as const,
      })),
      ...activity.quotes.map((quote) => ({
        id: quote.id,
        title: quote.serviceTitle,
        meta: `${timeAgo(quote.createdAt)} · ${quote.propertyType || "service enquiry"}`,
        href: `/booking/${quote.id}`,
        icon: "sparkles-outline" as const,
      })),
    ];
    return rows.sort((left, right) => (right.meta > left.meta ? 1 : -1)).slice(0, 4);
  }, [activity]);

  useEffect(() => {
    void AsyncStorage.getItem(GENDER_STORAGE_KEY).then((value) => { if (value === "woman" || value === "man" || value === "unspecified") setGuestGender(value); });
    return () => watcher.current?.remove();
  }, []);

  const chooseGuestGender = (value: GuestGender) => { setGuestGender(value); void AsyncStorage.setItem(GENDER_STORAGE_KEY, value); };
  /**
   * Your current area, told honestly.
   *
   * This reads the phone's position, names the area it lands in, and keeps
   * following you while this screen is open, so the area stays current. It does
   * not run in the background, it is not stored by Chapman, and nothing is sent
   * anywhere: it is here so you can see which area a collection would be priced
   * and routed from. A pickup point is only shared when you send a booking and
   * press Share.
   */
  const startLocation = async () => {
    setLocationBusy(true);
    try {
      if (!await Location.hasServicesEnabledAsync()) {
        setLocationLabel("Location services are off on this phone. Turn them on to see your area.");
        return;
      }
      const current = await Location.getForegroundPermissionsAsync();
      const permission = current.status === "granted" ? current : await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        if (permission.canAskAgain === false) {
          setLocationLabel("Location is off for Chapman. Opening your phone settings.");
          await Linking.openSettings().catch(() => undefined);
        } else {
          setLocationLabel("Location was not allowed, so your area cannot be shown.");
        }
        return;
      }

      setLocationLabel("Finding your area");

      // Named position, so there is something to read straight away.
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nameFor = async (latitude: number, longitude: number) => {
        try {
          const places = await Location.reverseGeocodeAsync({ latitude, longitude });
          const place = places[0];
          return [place?.district ?? place?.city ?? place?.subregion, place?.region, place?.country].filter(Boolean).join(", ");
        } catch {
          return "";
        }
      };
      setLocationLabel((await nameFor(position.coords.latitude, position.coords.longitude)) || "Your area is being used");
      setLocationUpdatedAt(new Date());

      // Then follow along while the screen is open, so it stays live.
      watcher.current?.remove();
      watcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 20000, distanceInterval: 25 },
        async (next) => {
          setLocationLabel((await nameFor(next.coords.latitude, next.coords.longitude)) || "Your area is being used");
          setLocationUpdatedAt(new Date());
        },
      );
    } catch {
      setLocationLabel("Your area could not be read just now. Please try again.");
    } finally {
      setLocationBusy(false);
    }
  };

  const avatarIcon = account?.avatar_style === "female" || (!account && guestGender === "woman") ? "woman-outline" : account?.avatar_style === "male" || (!account && guestGender === "man") ? "man-outline" : "person-outline";
  const accountName = account?.full_name || "Your Chapman profile";
  const accountDetail = account?.phone || "Sign in to keep bookings and updates together";

  return <AppScreen><ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Text style={styles.eyebrow}>YOUR ACCOUNT</Text><TouchableOpacity onPress={() => router.push("/settings" as never)} style={styles.settingsButton} accessibilityLabel="App settings"><Ionicons name="settings-outline" size={21} color={palette.ink} /></TouchableOpacity></View>
    <TouchableOpacity onPress={() => router.push(account ? "/account" as never : "/auth/phone" as never)} style={styles.profileBlock}>
      <View style={styles.avatar}><Ionicons name={avatarIcon} size={27} color={palette.accent} /></View><View style={styles.profileCopy}><DisplayText style={styles.name}>{accountName}</DisplayText><Text style={styles.phone}>{account === undefined ? "Checking account" : accountDetail}</Text></View><Ionicons name="chevron-forward" size={21} color={palette.muted} />
    </TouchableOpacity>
    {checking ? <View style={styles.checkingCard}><ActivityIndicator color={palette.accent} /><Text style={styles.checkingText}>Checking your account</Text></View> : !account ? <View style={styles.signInCard}><View style={styles.signInCopy}><Text style={styles.signInTitle}>Keep every booking in one place.</Text><Text style={styles.signInText}>Sign in with your phone to receive real dates, tracking, and service updates.</Text></View><PrimaryButton label="Sign in with phone" icon="phone-portrait-outline" onPress={() => router.push("/auth/phone" as never)} style={styles.signInButton} /></View> : <TouchableOpacity onPress={() => router.push("/loyalty" as never)} activeOpacity={0.9} style={styles.bonusCard} accessibilityLabel="Open your Chapman bonus and tier">
      <View style={styles.bonusIcon}><Ionicons name="gift-outline" size={23} color="#FFFFFF" /></View>
      <View style={styles.bonusCopy}>
        <Text style={styles.bonusLabel}>CHAPMAN BONUS</Text>
        <Text style={styles.bonusTitle}>
          {summaryLoading
            ? "Checking your ladders"
            : `Laundry ${laundryTrack?.tier.name ?? "Standard"} ${laundryTrack?.tier.discount ?? 0}% | Services ${serviceTrack?.tier.name ?? "Standard"} ${serviceTrack?.tier.discount ?? 0}%`}
        </Text>
        <Text style={styles.bonusText}>
          {laundryTrack && serviceTrack
            ? `Laundry: ${trackProgressLine(laundryTrack)} (${laundryTrack.count} visits counted). Services: ${trackProgressLine(serviceTrack)} (${serviceTrack.count} jobs counted). Tap to see every step.`
            : "Send your first request and both ladders start counting. Tap to see how they work."}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color="#FFFFFF" />
    </TouchableOpacity>}
    <SectionHeading title="Profile and appearance" />
    <View style={styles.settingsCard}>
      {!account ? <><View style={styles.settingBlock}><View style={styles.settingIcon}><Ionicons name="person-circle-outline" size={19} color={palette.accent} /></View><View style={styles.settingCopy}><Text style={styles.settingLabel}>Avatar preference</Text><Text style={styles.settingDetail}>Choose how your guest profile appears. Your account preference is saved after sign-in.</Text></View></View><View style={styles.avatarChoices}>{(["woman", "man", "unspecified"] as GuestGender[]).map((option) => <TouchableOpacity key={option} onPress={() => chooseGuestGender(option)} style={[styles.avatarChoice, guestGender === option && styles.avatarChoiceSelected]}><Ionicons name={option === "woman" ? "woman-outline" : option === "man" ? "man-outline" : "person-outline"} size={18} color={guestGender === option ? "#FFFFFF" : palette.blue} /><Text style={[styles.avatarChoiceText, guestGender === option && styles.avatarChoiceTextSelected]}>{option === "woman" ? "Female" : option === "man" ? "Male" : "Other"}</Text></TouchableOpacity>)}</View><View style={styles.settingDivider} /></> : <><View style={styles.settingBlock}><View style={styles.settingIcon}><Ionicons name="shield-checkmark-outline" size={19} color={palette.green} /></View><View style={styles.settingCopy}><Text style={styles.settingLabel}>Phone verified</Text><Text style={styles.settingDetail}>Manage your Chapman account or log out safely.</Text></View><TouchableOpacity onPress={() => router.push("/account" as never)}><Text style={styles.manageText}>Manage</Text></TouchableOpacity></View><View style={styles.settingDivider} /><TouchableOpacity onPress={() => router.push("/account" as never)} style={styles.settingBlock}><View style={styles.settingIcon}><Ionicons name="keypad-outline" size={19} color={palette.accent} /></View><View style={styles.settingCopy}><Text style={styles.settingLabel}>App lock</Text><Text style={styles.settingDetail}>Set a 4 digit PIN so you do not wait for a text message.</Text></View><Text style={styles.manageText}>Manage</Text></TouchableOpacity>
</>}
      <View style={styles.settingBlock}><View style={styles.settingIcon}><Ionicons name="moon-outline" size={19} color={palette.accent} /></View><View style={styles.settingCopy}><Text style={styles.settingLabel}>Dark mode</Text><Text style={styles.settingDetail}>Use a darker app appearance in low light.</Text></View><Switch value={colorScheme === "dark"} onValueChange={(value) => setColorScheme(value ? "dark" : "light")} trackColor={{ false: "#D7D1C7", true: "#81C5A7" }} thumbColor={palette.blue} /></View>
      <View style={styles.settingDivider} /><TouchableOpacity onPress={() => router.push("/permissions?from=settings" as never)} style={styles.settingBlock}><View style={styles.settingIcon}><Ionicons name="notifications-outline" size={19} color={palette.accent} /></View><View style={styles.settingCopy}><Text style={styles.settingLabel}>Service permissions</Text><Text style={styles.settingDetail}>Choose alerts and pickup-location sharing.</Text></View><Text style={styles.manageText}>Manage</Text></TouchableOpacity>
    </View>
    <SectionHeading title="Your current area" />
    <View style={styles.locationCard}><View style={styles.locationIcon}><Ionicons name="location-outline" size={21} color={palette.accent} /></View><View style={styles.locationCopy}><Text style={styles.locationTitle}>{locationUpdatedAt ? "Following your phone" : "Use my current area"}</Text><Text style={styles.locationText}>{locationLabel}{locationUpdatedAt ? ` · updated ${timeAgo(locationUpdatedAt.toISOString())}` : ""}</Text><Text style={styles.locationNote}>Chapman does not track you in the background. Your area stays on this phone until you send a booking.</Text></View><TouchableOpacity onPress={() => { void startLocation(); }} disabled={locationBusy} style={styles.locationAction}><Text style={styles.locationActionText}>{locationBusy ? "Checking" : locationUpdatedAt ? "Update" : "Allow"}</Text></TouchableOpacity></View>
    <SectionHeading title="Most used services" />
    <View style={styles.activityCard}>{frequentServices.length ? frequentServices.map(([title, count], index) => <TouchableOpacity key={title} onPress={() => router.push(`/service/${serviceIdForTitle(title)}` as never)} style={[styles.frequentRow, index !== frequentServices.length - 1 && styles.frequentDivider]}><View style={styles.activityIcon}><Text style={styles.rankText}>{index + 1}</Text></View><View style={styles.activityCopy}><Text style={styles.activityTitle}>{title}</Text><Text style={styles.activityMeta}>{count} request{count === 1 ? "" : "s"} on your account</Text></View><Ionicons name="chevron-forward" size={18} color={palette.muted} /></TouchableOpacity>) : <EmptyActivity icon="stats-chart-outline" title="Your service record will grow here" text="After a few bookings, your most-used services will be easy to repeat." />}</View>
    <SectionHeading title="Your activity" action="All bookings" onAction={() => router.push("/(tabs)/bookings" as never)} />
    <View style={styles.activityCard}>
      {recentActivity.length ? recentActivity.map((entry, index) => (
        <TouchableOpacity key={entry.id} onPress={() => router.push(entry.href as never)} style={[styles.activityRow, index !== recentActivity.length - 1 && styles.frequentDivider]}>
          <View style={styles.activityIcon}><Ionicons name={entry.icon} size={19} color={palette.accent} /></View>
          <View style={styles.activityCopy}>
            <Text style={styles.activityTitle}>{entry.title}</Text>
            <Text style={styles.activityMeta}>{entry.meta}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </TouchableOpacity>
      )) : (
        <EmptyActivity icon="calendar-outline" title={summaryLoading ? "Reading your account" : "No activity yet"} text={summaryLoading ? "One moment." : "Your requests and enquiries appear here as soon as you send them."} />
      )}
    </View>
    <SectionHeading title="Saved routines" />
    <View style={styles.activityCard}>{routines.length ? routines.map((routine, index) => <View key={routine.id} style={[styles.routineRow, index !== routines.length - 1 && styles.frequentDivider]}><TouchableOpacity onPress={() => router.push(`/service/${routine.serviceId}` as never)} style={styles.routineOpen}><View style={styles.activityIcon}><Ionicons name="repeat-outline" size={18} color={palette.accent} /></View><View style={styles.activityCopy}><Text style={styles.activityTitle}>{routine.serviceTitle}</Text><Text style={styles.activityMeta}>{routine.detail}. Tap to book it again.</Text></View></TouchableOpacity><TouchableOpacity onPress={() => removeRoutine(routine.id)} style={styles.routineDelete} accessibilityLabel={`Remove the ${routine.serviceTitle} routine`}><Ionicons name="close" size={17} color={palette.muted} /></TouchableOpacity></View>) : <EmptyActivity icon="repeat-outline" title="No routines saved yet" text="Save a monthly or seasonal routine from any service page." />}</View>
    <SectionHeading title="Support" />
    <TouchableOpacity onPress={() => router.push("/(tabs)/chat" as never)} style={styles.supportRow} accessibilityLabel="Chat with Chapman">
      <View style={styles.settingIcon}><Ionicons name="help-circle-outline" size={19} color={palette.accent} /></View>
      <View style={styles.settingCopy}><Text style={styles.settingLabel}>Chat with Chapman</Text><Text style={styles.settingDetail}>Admin, CEO, or Contact Us for anything you need.</Text></View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => router.push("/notifications" as never)} style={styles.supportRow} accessibilityLabel="Your service updates">
      <View style={styles.settingIcon}><Ionicons name="notifications-outline" size={19} color={palette.accent} /></View>
      <View style={styles.settingCopy}><Text style={styles.settingLabel}>Your service updates</Text><Text style={styles.settingDetail}>Every date, note, and answer about your bookings.</Text></View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => router.push("/permissions?from=settings" as never)} style={styles.supportRow} accessibilityLabel="Permissions and privacy">
      <View style={styles.settingIcon}><Ionicons name="lock-closed-outline" size={19} color={palette.accent} /></View>
      <View style={styles.settingCopy}><Text style={styles.settingLabel}>Permissions and privacy</Text><Text style={styles.settingDetail}>What the app may use, and why.</Text></View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </TouchableOpacity>
    <BodyText style={styles.legal}>Chapman Prestige Limited · Kumasi, Ghana</BodyText>
  </ScrollView></AppScreen>;
}

/** Turns a service name from the customer's own history into its page. */
function serviceIdForTitle(title: string) {
  const known = SERVICES.find((service) => service.title === title || service.shortTitle === title);
  if (known) return known.id;
  if (title.toLowerCase().includes("laundry")) return "laundry";
  return "cleaning";
}

function EmptyActivity({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  const { styles, palette } = useChapmanStyles(makeStyles); return <View style={styles.emptyActivity}><View style={styles.activityIcon}><Ionicons name={icon} size={19} color={palette.accent} /></View><View style={styles.activityCopy}><Text style={styles.activityTitle}>{title}</Text><Text style={styles.activityMeta}>{text}</Text></View></View>; }

const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({ scroll: { flex: 1, backgroundColor: palette.canvas }, content: { flexGrow: 1, padding: 20, paddingTop: 18, paddingBottom: 112, gap: 18 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, eyebrow: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 }, settingsButton: { width: 41, height: 41, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 14, alignItems: "center", justifyContent: "center" }, profileBlock: { flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 57, height: 57, borderRadius: 20, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" }, profileCopy: { flex: 1 }, name: { fontSize: 22, lineHeight: 28 }, phone: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 3 }, signInCard: { padding: 15, gap: 12, backgroundColor: palette.surface, borderRadius: 20, borderWidth: 1, borderColor: palette.border }, signInCopy: { gap: 4 }, signInTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, signInText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 }, signInButton: { width: "100%" }, bonusCard: { minHeight: 119, borderRadius: 21, padding: 16, backgroundColor: palette.blue, flexDirection: "row", gap: 12, alignItems: "flex-start" }, bonusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }, bonusCopy: { flex: 1, gap: 3 }, bonusLabel: { color: "#DCFCE7", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15 }, bonusTitle: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 20 }, bonusText: { color: "#E5F5EA", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, maxWidth: 276 }, settingsCard: { borderRadius: 19, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, padding: 14, gap: 12 }, settingBlock: { flexDirection: "row", alignItems: "center", gap: 10 }, settingIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" }, settingCopy: { flex: 1, gap: 2 }, settingLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, settingDetail: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 }, manageText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 11 }, settingDivider: { height: 1, backgroundColor: "#EEE9E0" }, avatarChoices: { flexDirection: "row", gap: 7 }, avatarChoice: { flex: 1, minHeight: 39, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 11, backgroundColor: palette.soft }, avatarChoiceSelected: { backgroundColor: palette.blue }, avatarChoiceText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10 }, avatarChoiceTextSelected: { color: "#FFFFFF" }, locationCard: { minHeight: 76, padding: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 10 }, locationIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" }, locationCopy: { flex: 1, gap: 2 }, locationTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, locationText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 }, locationAction: { paddingHorizontal: 11, minHeight: 34, borderRadius: 10, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" }, locationActionText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10 }, locationNote: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 9, lineHeight: 13, marginTop: 2 }, activityCard: { borderRadius: 19, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, overflow: "hidden" }, activityRow: { minHeight: 70, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 }, frequentRow: { minHeight: 62, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 }, frequentDivider: { borderBottomWidth: 1, borderBottomColor: "#EEE9E0" }, emptyActivity: { minHeight: 70, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 }, activityIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" }, rankText: { color: palette.accent, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 14 }, activityCopy: { flex: 1, gap: 3 }, activityTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, activityMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 }, routineRow: { minHeight: 64, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 }, routineOpen: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11 }, routineDelete: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }, checkingCard: { minHeight: 76, padding: 15, gap: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: palette.surface, borderRadius: 20, borderWidth: 1, borderColor: palette.border }, checkingText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 13 }, supportRow: { minHeight: 69, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface }, legal: { textAlign: "center", fontSize: 11, marginTop: 3 } });
