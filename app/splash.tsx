import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { ChapmanMark, palette } from "@/components/chapman-ui";

const SPLASH_DURATION_MS = 1450;

export default function ChapmanSplashScreen() {
  const emblemOpacity = useRef(new Animated.Value(0)).current;
  const emblemScale = useRef(new Animated.Value(0.92)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const lineScale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(emblemOpacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(emblemScale, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(180),
        Animated.timing(copyOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(480),
        Animated.timing(lineScale, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    entrance.start();
    const timer = setTimeout(() => router.replace("/onboarding" as never), SPLASH_DURATION_MS);
    return () => { entrance.stop(); clearTimeout(timer); };
  }, [copyOpacity, emblemOpacity, emblemScale, lineScale]);

  return (
    <AppScreen dark edges={["top", "bottom", "left", "right"]}>
      <LinearGradient colors={[palette.deep, "#312315", "#06745B"]} locations={[0, 0.5, 1]} style={styles.page}>
        <View style={styles.ambientOne} />
        <View style={styles.ambientTwo} />
        <View style={styles.center}>
          <Animated.View style={[styles.markWrap, { opacity: emblemOpacity, transform: [{ scale: emblemScale }] }]}>
            <ChapmanMark size={104} />
          </Animated.View>
          <Animated.View style={[styles.copy, { opacity: copyOpacity }]}>
            <Text style={styles.tagline}>Care, arranged around your life.</Text>
          </Animated.View>
        </View>
        <View style={styles.footer}>
          <Animated.View style={[styles.loadingTrack, { transform: [{ scaleX: lineScale }] }]}><View style={styles.loadingFill} /></Animated.View>
          <View style={styles.readyRow}><Ionicons name="sparkles" size={14} color="#F6C769" /><Text style={styles.readyText}>PREPARING YOUR CHAPMAN EXPERIENCE</Text></View>
        </View>
      </LinearGradient>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "space-between", paddingHorizontal: 28, paddingVertical: 34, overflow: "hidden" },
  ambientOne: { position: "absolute", width: 340, height: 340, borderRadius: 170, top: -155, right: -140, backgroundColor: "rgba(255,255,255,0.08)" },
  ambientTwo: { position: "absolute", width: 280, height: 280, borderRadius: 140, bottom: -145, left: -122, backgroundColor: "rgba(246,199,105,0.12)" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 8 },
  markWrap: { width: 190, height: 142, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  copy: { alignItems: "center" },
  tagline: { color: "#E8E0D3", fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 20 },
  footer: { gap: 15, alignItems: "center" },
  loadingTrack: { width: "100%", height: 3, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.18)" },
  loadingFill: { flex: 1, backgroundColor: "#F6C769" },
  readyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  readyText: { color: "#E8E0D3", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1.15 },
});
