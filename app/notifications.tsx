import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";

export default function NotificationsScreen() {
  return <AppScreen><ScrollView contentContainerStyle={styles.content}><ScreenHeader title="Notifications" /><View style={styles.empty}><View style={styles.icon}><Ionicons name="notifications-outline" size={34} color={palette.blue} /></View><DisplayText style={styles.title}>You are all caught up.</DisplayText><BodyText style={styles.body}>Booking status changes, quote updates, and Chapman offers will appear here when they are relevant to you.</BodyText></View><View style={styles.preference}><Ionicons name="notifications-outline" size={18} color={palette.orange} /><Text style={styles.preferenceText}>You can manage service updates anytime in Profile.</Text></View></ScrollView></AppScreen>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingTop: 12, flexGrow: 1, backgroundColor: palette.canvas, gap: 20 }, empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 27, gap: 12, minHeight: 440 }, icon: { width: 76, height: 76, borderRadius: 29, backgroundColor: "#EAF0FF", alignItems: "center", justifyContent: "center" }, title: { textAlign: "center", fontSize: 24 }, body: { textAlign: "center", maxWidth: 290 }, preference: { padding: 14, backgroundColor: "#FFF5F0", borderRadius: 16, borderWidth: 1, borderColor: "#FFE1D1", flexDirection: "row", gap: 9, alignItems: "center" }, preferenceText: { color: palette.secondaryOrange, fontFamily: "Inter_500Medium", fontSize: 12, flex: 1, lineHeight: 17 } });
