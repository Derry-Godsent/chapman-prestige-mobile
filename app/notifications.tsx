import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "@/components/app-screen";
import { BodyText, PrimaryButton, StatusPill, palette, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { disableDailyChapmanUpdates, enableDailyChapmanUpdates } from "@/lib/chapman-notifications";
import { CustomerNotification } from "@/lib/customer-notifications";
import { timeAgo } from "@/lib/chapman-format";
import { useNotifications } from "@/hooks/use-notifications";
const KIND_STYLE: Record<CustomerNotification["kind"], { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  date: { icon: "calendar-outline", color: "#EA580C", label: "ACTION NEEDED" },
  booking: { icon: "cube-outline", color: palette.accent, label: "BOOKING" },
  answer: { icon: "checkmark-circle-outline", color: "#047857", label: "CONFIRMED" },
  team: { icon: "people-outline", color: "#3E39C8", label: "FROM CHAPMAN" },
  service: { icon: "sparkles-outline", color: "#B45309", label: "SERVICE" },
};
/**
 * Updates. Every entry here is a real record from the customer's own account:
 * a request they sent, a date Chapman offered, a note the office wrote, or an
 * answer they gave. Nothing on this screen is invented.
 */
export default function NotificationsScreen()
   {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const { notifications, unread, signedIn, loading, reload, markAllRead } = useNotifications();
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { if (unread > 0) void markAllRead(); }, [unread, markAllRead]);
  const toggleDaily = async (value: boolean) => {
    setBusy(true);
    try {
      if (value) { const result = await enableDailyChapmanUpdates(); setDailyEnabled(result.enabled); setNotice(result.message); }
      else { await disableDailyChapmanUpdates(); setDailyEnabled(false); setNotice("Daily updates are turned off."); }
    } catch { setNotice("We could not update notification settings. Please try again."); }
    finally { setBusy(false); }
  };
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Updates" subtitle={unread > 0 ? `${unread} new` : "Your service news, in one place"} />
        <View style={styles.dailyCard}>
          <View style={styles.dailyIcon}><Ionicons name="notifications-outline" size={23} color="#FFFFFF" /></View>
          <View style={styles.dailyCopy}>
            <Text style={styles.dailyTitle}>Daily Chapman update</Text>
            <Text style={styles.dailyText}>One optional alert at 9:00 AM for promotions, care tips, and seasonal news. Service updates about your own bookings always appear below, whether this is on or off.</Text>
          </View>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Switch value={dailyEnabled} onValueChange={toggleDaily} trackColor={{ false: "rgba(255,255,255,0.3)", true: "#BFD0FF" }} thumbColor="#FFFFFF" />}
        </View>
        {notice ? <View style={styles.notice}><Ionicons name="information-circle-outline" size={18} color={palette.accent} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>YOUR SERVICE UPDATES</Text>
          <TouchableOpacity onPress={() => void reload()} style={styles.refresh}><Ionicons name="refresh" size={15} color={palette.accent} /></TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={palette.accent} /><Text style={styles.loadingText}>Checking your account</Text></View>
        ) : !signedIn ? (
          <View style={styles.emptyCard}>
            <Ionicons name="phone-portrait-outline" size={24} color={palette.accent} />
            <Text style={styles.emptyTitle}>Sign in to see your updates</Text>
            <BodyText style={styles.emptyText}>Dates, notes from Chapman, and your answers all gather here once your phone number is connected.</BodyText>
            <PrimaryButton label="Sign in with phone" icon="phone-portrait-outline" onPress={() => router.push("/auth/phone" as never)} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={24} color={palette.accent} />
            <Text style={styles.emptyTitle}>Nothing to report yet</Text>
            <BodyText style={styles.emptyText}>Send a request and every reply, date, and note from Chapman appears here.</BodyText>
            <PrimaryButton label="See services" icon="grid-outline" onPress={() => router.push("/services" as never)} />
          </View>
        ) : (
          notifications.map((update) => {
            const style = KIND_STYLE[update.kind];
            return (
              <TouchableOpacity key={update.id} onPress={() => router.push(update.href as never)} style={[styles.updateCard, update.urgent && styles.updateCardUrgent]} activeOpacity={0.85}>
                <View style={[styles.updateIcon, { backgroundColor: `${style.color}18` }]}><Ionicons name={style.icon} size={21} color={style.color} /></View>
                <View style={styles.updateCopy}>
                  <View style={styles.updateTop}>
                    <Text style={[styles.updateType, { color: style.color }]}>{style.label}</Text>
                    <Text style={styles.updateTime}>{timeAgo(update.createdAt)}</Text>
                  </View>
                  <Text style={styles.updateTitle}>{update.title}</Text>
                  <Text style={styles.updateText}>{update.body}</Text>
                  {update.urgent ? <View style={styles.actionHint}><StatusPill label="Open to answer" tone="orange" /></View> : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.explore}>
          <Text style={styles.exploreText}>Explore Chapman services</Text>
          <Ionicons name="arrow-forward" size={18} color={palette.accent} />
        </TouchableOpacity>
      </ScrollView>
    </AppScreen>
  );
}
const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  content: { padding: 20, paddingTop: 12, paddingBottom: 38, gap: 13, backgroundColor: palette.canvas },
  dailyCard: { padding: 16, borderRadius: 21, backgroundColor: palette.blue, flexDirection: "row", gap: 11, alignItems: "center" },
  dailyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  dailyCopy: { flex: 1, gap: 3 },
  dailyTitle: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 },
  dailyText: { color: "#DCE5FF", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 },
  notice: { padding: 12, borderRadius: 14, backgroundColor: palette.chipBlue, flexDirection: "row", gap: 8, alignItems: "center" },
  noticeText: { flex: 1, color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  sectionLabel: { color: palette.eyebrow, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15 },
  refresh: { width: 32, height: 32, borderRadius: 11, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  loading: { padding: 34, alignItems: "center", gap: 9 },
  loadingText: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 11 },
  emptyCard: { padding: 22, borderRadius: 21, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", gap: 9 },
  emptyTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center" },
  emptyText: { textAlign: "center", fontSize: 12, lineHeight: 17 },
  updateCard: { padding: 15, borderRadius: 19, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, flexDirection: "row", alignItems: "flex-start", gap: 11 },
  updateCardUrgent: { borderColor: "#FDBA74", backgroundColor: "#FFFBF7" },
  updateIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  updateCopy: { flex: 1, gap: 3 },
  updateTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  updateType: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 },
  updateTime: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 9 },
  updateTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 },
  updateText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  actionHint: { marginTop: 4, alignSelf: "flex-start" },
  explore: { minHeight: 49, borderRadius: 15, borderWidth: 1, borderColor: "#C6D2FF", backgroundColor: "#F9FAFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 4 },
  exploreText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 13 },
});
