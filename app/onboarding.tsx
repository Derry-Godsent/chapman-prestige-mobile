import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { ChapmanMark, DisplayText, palette } from "@/components/chapman-ui";
import { AnimatedServiceScene } from "@/components/service-illustration";

const slides = [
  { serviceId: "laundry", eyebrow: "CHAPMAN PRESTIGE", title: "Care that makes life feel lighter.", body: "Premium home and facility services, arranged around the way you live and work in Kumasi." },
  { serviceId: "laundry", eyebrow: "GARMENT CARE", title: "Let laundry take less of your weekend.", body: "Choose your items, book a pickup, and get your clothes back fresh and ready." },
  { serviceId: "cleaning", eyebrow: "DEEP CLEANING", title: "A cleaner space feels better.", body: "Tell us about your place. We will guide you to the right cleaning service." },
  { serviceId: "fabric", eyebrow: "SOFA AND CARPET CARE", title: "Bring comfort back to your home.", body: "Give your sofas, carpets, and rugs the careful clean they deserve." },
  { serviceId: "fumigation", eyebrow: "FUMIGATION", title: "Help protect your space from pests.", body: "Request an assessment and get simple advice from a trained team." },
  { serviceId: "detailing", eyebrow: "CAR DETAILING", title: "A cleaner car for every journey.", body: "Book vehicle care that keeps your drive fresh, comfortable, and ready." },
  { serviceId: "polytank", eyebrow: "READY WHEN YOU ARE", title: "Book, pay, and follow every service in one place.", body: "See your updates, payment choices, and Chapman rewards whenever you need them." },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isFinal = current === slides.length - 1;
  const continueFlow = () => { if (isFinal) router.replace("/welcome" as never); else setCurrent((value) => value + 1); };
  return <AppScreen edges={["top", "bottom", "left", "right"]}><LinearGradient colors={[palette.canvas, "#F5EEDF", "#E8F2E9"]} locations={[0, 0.54, 1]} style={styles.page}><View style={styles.glowOne} /><View style={styles.glowTwo} /><View style={styles.top}><ChapmanMark size={44} /><TouchableOpacity onPress={() => router.replace("/welcome" as never)}><Text style={styles.skip}>Skip</Text></TouchableOpacity></View><View style={styles.center}><AnimatedServiceScene key={slide.serviceId} serviceId={slide.serviceId} height={255} portrait /><Text style={styles.eyebrow}>{slide.eyebrow}</Text><DisplayText style={styles.title}>{slide.title}</DisplayText><Text style={styles.body}>{slide.body}</Text></View><View style={styles.bottom}><View style={styles.progressRow}>{slides.map((_, index) => <View key={index} style={[styles.progress, index <= current && styles.progressActive, index === current && styles.progressCurrent]} />)}</View><TouchableOpacity onPress={continueFlow} activeOpacity={0.9} style={styles.cta}><Text style={styles.ctaText}>{isFinal ? "Get started" : "Continue"}</Text><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></TouchableOpacity></View></LinearGradient></AppScreen>;
}

const styles = StyleSheet.create({ page: { flex: 1, padding: 24, justifyContent: "space-between", overflow: "hidden" }, glowOne: { width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(5,150,105,0.11)", position: "absolute", top: -100, right: -90 }, glowTwo: { width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(245,158,11,0.12)", position: "absolute", bottom: -105, left: -100 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, skip: { color: palette.green, fontFamily: "Inter_600SemiBold", fontSize: 13 }, center: { alignItems: "center", paddingHorizontal: 8, gap: 13 }, eyebrow: { color: palette.green, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.4, marginTop: 5 }, title: { textAlign: "center", color: palette.deep, fontSize: 28, lineHeight: 36 }, body: { textAlign: "center", color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, maxWidth: 310 }, bottom: { gap: 22 }, progressRow: { flexDirection: "row", gap: 6, justifyContent: "center" }, progress: { width: 13, height: 5, borderRadius: 3, backgroundColor: "#DED4C6" }, progressActive: { backgroundColor: "#A7D8C4" }, progressCurrent: { width: 30, backgroundColor: palette.green }, cta: { height: 55, borderRadius: 18, backgroundColor: palette.green, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }, ctaText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15 } });
