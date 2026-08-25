import { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { DisplayText, palette } from "@/components/chapman-ui";
import { haptic } from "@/lib/haptics";

const slides = [
  { label: "CARE, MADE SIMPLE", title: "A better routine starts with one small decision.", body: "Arrange thoughtful care for the parts of life that ask the most of you.", action: "Show me how", image: "/manus-storage/chapman-cleaning-hero_d1b3b6b9.jpg" },
  { label: "GARMENT CARE", title: "Keep your weekend for yourself.", body: "Book a pickup, choose your care, and welcome your wardrobe back ready to wear.", action: "Next", image: "/manus-storage/chapman-laundry-hero_8866adc9.jpg" },
  { label: "HOME & LIVING", title: "The spaces you love can feel new again.", body: "From fabric revival to water safety, arrange the specialist care that restores confidence at home.", action: "Next", image: "/manus-storage/chapman-fabric-hero_4ff5bafd.jpg" },
  { label: "CHAPMAN PRESTIGE", title: "Good care, always within reach.", body: "Discover trusted people, visible progress, and service that meets you where you are.", action: "Get started", image: "/manus-storage/chapman-detailing-hero_f28c3e64.jpg" },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isFinal = current === slides.length - 1;
  const fade = useRef(new Animated.Value(1)).current;
  const imageScale = useRef(new Animated.Value(1.04)).current;

  useEffect(() => {
    fade.setValue(0);
    imageScale.setValue(1.07);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(imageScale, { toValue: 1, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [current, fade, imageScale]);

  const continueFlow = () => {
    haptic.light();
    if (isFinal) router.replace("/welcome" as never);
    else setCurrent((value) => value + 1);
  };

  return (
    <AppScreen edges={["top", "bottom", "left", "right"]}>
      <View style={styles.page}>
        <View style={styles.topBar}>
          <Image source={require("@/assets/images/cpl-wordmark.png")} resizeMode="contain" style={styles.wordmark} />
          <TouchableOpacity onPress={() => router.replace("/welcome" as never)} hitSlop={12} style={styles.skipAction}><Text style={styles.skipText}>Skip</Text></TouchableOpacity>
        </View>

        <Animated.View style={[styles.main, { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
          <View style={styles.imageFrame}>
            <Animated.Image source={{ uri: slide.image }} resizeMode="cover" style={[styles.image, { transform: [{ scale: imageScale }] }]} />
            <LinearGradient colors={["rgba(2,17,54,0)", "rgba(2,17,54,0.15)"]} style={StyleSheet.absoluteFill} />
            <View style={styles.imageCount}><Text style={styles.imageCountText}>0{current + 1}</Text></View>
          </View>

          <View style={styles.copy}><Text style={styles.label}>{slide.label}</Text><DisplayText style={styles.title}>{slide.title}</DisplayText><Text style={styles.body}>{slide.body}</Text></View>
        </Animated.View>

        <View style={styles.bottom}>
          <View style={styles.progressRow}>{slides.map((_, index) => <View key={index} style={[styles.progressLine, index === current && styles.progressLineActive]} />)}</View>
          <TouchableOpacity onPress={continueFlow} activeOpacity={0.88} style={styles.primaryAction}><Text style={styles.primaryActionText}>{slide.action}</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></TouchableOpacity>
          {!isFinal ? <Text style={styles.helperText}>A few considered moments, then you are ready.</Text> : <Text style={styles.helperText}>Your Chapman care journey begins here.</Text>}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8F6", paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14, justifyContent: "space-between" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { width: 122, height: 40 },
  skipAction: { paddingHorizontal: 4, paddingVertical: 9 },
  skipText: { color: "#4E596F", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  main: { gap: 27, marginTop: 10 },
  imageFrame: { height: 333, borderRadius: 26, overflow: "hidden", backgroundColor: "#DCE6FF" },
  image: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  imageCount: { position: "absolute", left: 14, top: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.86)", alignItems: "center", justifyContent: "center" },
  imageCountText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 11 },
  copy: { gap: 9, paddingHorizontal: 2 },
  label: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.45 },
  title: { fontSize: 29, lineHeight: 37, maxWidth: 328 },
  body: { color: "#586378", fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, maxWidth: 320 },
  bottom: { gap: 13 },
  progressRow: { flexDirection: "row", gap: 6 },
  progressLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#DCE1EB" },
  progressLineActive: { backgroundColor: palette.blue },
  primaryAction: { height: 54, borderRadius: 16, backgroundColor: palette.blue, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryActionText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15 },
  helperText: { color: "#8B94A6", fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center" },
});
