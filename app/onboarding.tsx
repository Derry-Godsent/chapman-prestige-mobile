import { useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { ChapmanMark, DisplayText, palette } from "@/components/chapman-ui";

const slides = [
  { icon: "water", eyebrow: "CHAPMAN PRESTIGE", title: "Care that makes life feel lighter.", body: "Premium home and facility services, arranged around the way you live and work in Kumasi." },
  { icon: "shirt-outline", eyebrow: "GARMENT CARE", title: "Stop giving your weekends to laundry.", body: "Choose your items, book a pickup, and let your wardrobe return fresh and ready." },
  { icon: "bed-outline", eyebrow: "FABRIC REVIVAL", title: "Your furniture deserves a professional reset.", body: "Bring back the comfort of your sofas, carpets, and everyday spaces." },
  { icon: "shield-checkmark-outline", eyebrow: "FUMIGATION", title: "Protect the spaces that look after you.", body: "Request assessment-led pest care for homes, businesses, and facilities." },
  { icon: "car-sport-outline", eyebrow: "PREMIUM DETAILING", title: "A cleaner drive starts here.", body: "Arrange vehicle care that restores a polished, comfortable experience." },
  { icon: "sparkles-outline", eyebrow: "READY WHEN YOU ARE", title: "A better routine is one tap away.", body: "Book, track, and manage every care request in one considered place." },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isFinal = current === slides.length - 1;
  const continueFlow = () => { if (isFinal) router.replace("/welcome" as never); else setCurrent((value) => value + 1); };
  return <AppScreen dark edges={["top", "bottom", "left", "right"]}><LinearGradient colors={["#001452", "#003EC7", "#001452"]} style={styles.page}><View style={styles.glowOne} /><View style={styles.glowTwo} /><View style={styles.top}><ChapmanMark inverted size={44} /><TouchableOpacity onPress={() => router.replace("/welcome" as never)}><Text style={styles.skip}>Skip</Text></TouchableOpacity></View><View style={styles.center}><View style={styles.iconRing}><View style={styles.iconCore}><Ionicons name={slide.icon as keyof typeof Ionicons.glyphMap} size={58} color="#FFFFFF" /></View></View><Text style={styles.eyebrow}>{slide.eyebrow}</Text><DisplayText style={styles.title}>{slide.title}</DisplayText><Text style={styles.body}>{slide.body}</Text></View><View style={styles.bottom}><View style={styles.progressRow}>{slides.map((_, index) => <View key={index} style={[styles.progress, index <= current && styles.progressActive, index === current && styles.progressCurrent]} />)}</View><TouchableOpacity onPress={continueFlow} activeOpacity={0.9} style={styles.cta}><Text style={styles.ctaText}>{isFinal ? "Get started" : "Continue"}</Text><Ionicons name="arrow-forward" size={20} color={palette.deep} /></TouchableOpacity></View></LinearGradient></AppScreen>;
}

const styles = StyleSheet.create({ page: { flex: 1, padding: 24, justifyContent: "space-between", overflow: "hidden" }, glowOne: { width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(108,134,255,0.22)", position: "absolute", top: -100, right: -90 }, glowTwo: { width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(255,255,255,0.06)", position: "absolute", bottom: -105, left: -100 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, skip: { color: "#DDE1FF", fontFamily: "Inter_600SemiBold", fontSize: 13 }, center: { alignItems: "center", paddingHorizontal: 12, gap: 15 }, iconRing: { width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 8 }, iconCore: { width: 110, height: 110, borderRadius: 42, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }, eyebrow: { color: "#BFCBFF", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.4 }, title: { textAlign: "center", color: "#FFFFFF", fontSize: 29, lineHeight: 37 }, body: { textAlign: "center", color: "#DDE1FF", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, maxWidth: 310 }, bottom: { gap: 22 }, progressRow: { flexDirection: "row", gap: 7, justifyContent: "center" }, progress: { width: 22, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)" }, progressActive: { backgroundColor: "#BFCBFF" }, progressCurrent: { width: 43, backgroundColor: "#FFFFFF" }, cta: { height: 55, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }, ctaText: { color: palette.deep, fontFamily: "Inter_700Bold", fontSize: 15 } });
