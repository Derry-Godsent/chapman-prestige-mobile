import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { disableDailyChapmanUpdates, enableDailyChapmanUpdates } from "@/lib/chapman-notifications";

const updates = [
  { type: "SERVICE NEWS", title: "Choose your preferred service date", text: "For assessment-based services, request a suitable day and accept or reject Chapman’s confirmed appointment.", icon: "calendar-outline" as const, color: palette.blue },
  { type: "PROMOTION", title: "More of your weekend, less laundry", text: "Use the laundry booking flow to select your garments, choose express care if needed, and book collection.", icon: "shirt-outline" as const, color: palette.orange },
  { type: "ANNOUNCEMENTS", title: "Seasonal messages will appear here", text: "Holiday availability, New Year care planning, Chapman anniversaries, and important service updates are grouped in one place.", icon: "megaphone-outline" as const, color: "#3E39C8" },
];

export default function NotificationsScreen() {
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const toggleDaily = async (value: boolean) => {
    setBusy(true);
    try {
      if (value) { const result = await enableDailyChapmanUpdates(); setDailyEnabled(result.enabled); setNotice(result.message); }
      else { await disableDailyChapmanUpdates(); setDailyEnabled(false); setNotice("Daily updates are turned off."); }
    } catch { setNotice("We could not update notification settings. Please try again."); }
    finally { setBusy(false); }
  };

  return <AppScreen><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ScreenHeader title="Updates" subtitle="Chapman news and care reminders" /><View style={styles.dailyCard}><View style={styles.dailyIcon}><Ionicons name="notifications-outline" size={23} color="#FFFFFF" /></View><View style={styles.dailyCopy}><Text style={styles.dailyTitle}>Daily Chapman update</Text><Text style={styles.dailyText}>Receive one optional daily alert at 9:00 AM for promotions, news, care tips, and seasonal announcements.</Text></View>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Switch value={dailyEnabled} onValueChange={toggleDaily} trackColor={{ false: "rgba(255,255,255,0.3)", true: "#BFD0FF" }} thumbColor="#FFFFFF" />}</View>{notice ? <View style={styles.notice}><Ionicons name="information-circle-outline" size={18} color={palette.blue} /><Text style={styles.noticeText}>{notice}</Text></View> : null}<Text style={styles.sectionLabel}>LATEST</Text>{updates.map((update) => <View key={update.title} style={styles.updateCard}><View style={[styles.updateIcon, { backgroundColor: `${update.color}18` }]}><Ionicons name={update.icon} size={21} color={update.color} /></View><View style={styles.updateCopy}><Text style={[styles.updateType, { color: update.color }]}>{update.type}</Text><Text style={styles.updateTitle}>{update.title}</Text><Text style={styles.updateText}>{update.text}</Text></View></View>)}<TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.explore}><Text style={styles.exploreText}>Explore Chapman services</Text><Ionicons name="arrow-forward" size={18} color={palette.blue} /></TouchableOpacity><BodyText style={styles.footnote}>Booking and tracking notifications become live after Chapman’s customer authentication and staff-update connection are secured.</BodyText></ScrollView></AppScreen>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingTop: 12, paddingBottom: 34, gap: 13, backgroundColor: palette.canvas }, dailyCard: { padding: 16, borderRadius: 21, backgroundColor: palette.blue, flexDirection: "row", gap: 11, alignItems: "center" }, dailyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }, dailyCopy: { flex: 1, gap: 3 }, dailyTitle: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14 }, dailyText: { color: "#DCE5FF", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 }, notice: { padding: 12, borderRadius: 14, backgroundColor: "#EEF3FF", flexDirection: "row", gap: 8, alignItems: "center" }, noticeText: { flex: 1, color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15 }, sectionLabel: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15, marginTop: 6 }, updateCard: { padding: 15, borderRadius: 19, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "flex-start", gap: 11 }, updateIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }, updateCopy: { flex: 1, gap: 3 }, updateType: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 }, updateTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, updateText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 }, explore: { minHeight: 49, borderRadius: 15, borderWidth: 1, borderColor: "#C6D2FF", backgroundColor: "#F9FAFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 4 }, exploreText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 13 }, footnote: { marginTop: 6, fontSize: 11, lineHeight: 16, textAlign: "center" } });
