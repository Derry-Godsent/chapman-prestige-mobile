import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { getService } from "@/lib/chapman-data";
import { useBookingStore } from "@/lib/booking-store";

const propertyOptions = ["Home", "Office", "Shop", "School / church", "Hospitality"];
const timingOptions = ["This week", "Next week", "I am flexible"];

export default function QuoteRequestScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const service = getService(serviceId);
  const { createQuoteRequest } = useBookingStore();
  const [property, setProperty] = useState("Home");
  const [timing, setTiming] = useState("This week");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => { const request = createQuoteRequest(service, property, timing); setSubmitted(true); setTimeout(() => router.replace(`/booking/${request.id}` as never), 650); };
  if (submitted) return <AppScreen><View style={styles.success}><View style={styles.successIcon}><Ionicons name="checkmark" size={43} color="#FFFFFF" /></View><DisplayText style={styles.successTitle}>Request received.</DisplayText><BodyText style={styles.successBody}>We are preparing the right next step for your {service.shortTitle.toLowerCase()} request.</BodyText></View></AppScreen>;

  return <AppScreen><View style={styles.page}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ScreenHeader title="Request assessment" subtitle={service.shortTitle} /><View style={styles.hero}><Ionicons name={service.icon as keyof typeof Ionicons.glyphMap} size={30} color="#FFFFFF" /><View><Text style={styles.heroLabel}>TAILORED TO YOUR SPACE</Text><DisplayText style={styles.heroTitle}>{service.title}</DisplayText></View></View><View style={styles.questionBlock}><Text style={styles.question}>What kind of place needs care?</Text><BodyText style={styles.questionHint}>This helps us prepare an appropriate assessment.</BodyText><View style={styles.chipGrid}>{propertyOptions.map((option) => <TouchableOpacity key={option} onPress={() => setProperty(option)} style={[styles.chip, property === option && styles.chipSelected]}><Text style={[styles.chipText, property === option && styles.chipTextSelected]}>{option}</Text></TouchableOpacity>)}</View></View><View style={styles.questionBlock}><Text style={styles.question}>When would you prefer service?</Text><BodyText style={styles.questionHint}>A Chapman coordinator will confirm the final time with you.</BodyText><View style={styles.chipGrid}>{timingOptions.map((option) => <TouchableOpacity key={option} onPress={() => setTiming(option)} style={[styles.chip, timing === option && styles.chipSelected]}><Text style={[styles.chipText, timing === option && styles.chipTextSelected]}>{option}</Text></TouchableOpacity>)}</View></View><View style={styles.note}><Ionicons name="information-circle-outline" size={20} color={palette.blue} /><BodyText style={styles.noteText}>You are requesting an assessment, not agreeing to a final price. The team will confirm scope and quote before service begins.</BodyText></View></ScrollView><View style={styles.bottom}><PrimaryButton label="Request assessment" icon="arrow-forward" onPress={submit} /></View></View></AppScreen>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.canvas }, content: { padding: 20, paddingTop: 12, paddingBottom: 106, gap: 21 }, hero: { minHeight: 112, padding: 17, borderRadius: 21, backgroundColor: palette.blue, flexDirection: "row", gap: 13, alignItems: "center" }, heroLabel: { color: "#BFCBFF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.1 }, heroTitle: { color: "#FFFFFF", fontSize: 20, lineHeight: 26, marginTop: 4, maxWidth: 250 }, questionBlock: { gap: 7 }, question: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, lineHeight: 24 }, questionHint: { fontSize: 12 }, chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }, chip: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border }, chipSelected: { backgroundColor: palette.blue, borderColor: palette.blue }, chipText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 12 }, chipTextSelected: { color: "#FFFFFF" }, note: { padding: 14, backgroundColor: "#EEF2FF", borderRadius: 17, flexDirection: "row", gap: 9, alignItems: "flex-start" }, noteText: { flex: 1, fontSize: 12, lineHeight: 18 }, bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 12, paddingBottom: 18, backgroundColor: "rgba(248,249,250,0.98)", borderTopWidth: 1, borderTopColor: palette.border }, success: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.canvas, padding: 32, gap: 13 }, successIcon: { width: 83, height: 83, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: palette.green }, successTitle: { fontSize: 26, textAlign: "center" }, successBody: { textAlign: "center", maxWidth: 285 } });
