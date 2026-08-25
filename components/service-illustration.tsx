import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/chapman-ui";

const illustrations: Record<string, string> = {
  laundry: "/manus-storage/chapman-illustration-laundry_08e3f072.png",
  cleaning: "/manus-storage/chapman-illustration-cleaning_177f1fc3.png",
  fabric: "/manus-storage/chapman-illustration-fabric_86c0535e.png",
  fumigation: "/manus-storage/chapman-illustration-fumigation_2005ecb6.png",
  detailing: "/manus-storage/chapman-illustration-detailing_c1204802.png",
  polytank: "/manus-storage/chapman-illustration-polytank_8dff74aa.png",
};

const serviceCaptions: Record<string, string> = {
  laundry: "Your clothes are picked up, cared for, and brought back ready to wear.",
  cleaning: "A trained team gives your space the deep clean it needs.",
  fabric: "We refresh the fabric you live with every day.",
  fumigation: "Careful treatment helps protect your home from pests.",
  detailing: "A complete clean for the car you depend on.",
  polytank: "A cleaner tank helps your water start safer.",
};

export function ServiceIllustration({ serviceId }: { serviceId: string }) {
  const bob = useRef(new Animated.Value(0)).current;
  const uri = illustrations[serviceId] ?? illustrations.cleaning;
  const caption = serviceCaptions[serviceId] ?? "A Chapman team will guide the next step.";

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 2100, useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 2100, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return <View style={styles.container}><Animated.Image source={{ uri }} resizeMode="contain" style={[styles.image, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]} /><View style={styles.caption}><View style={styles.dot} /><Text style={styles.captionText}>{caption}</Text></View></View>;
}

const styles = StyleSheet.create({ container: { padding: 12, paddingBottom: 14, borderRadius: 24, backgroundColor: "#EDF3FF", overflow: "hidden" }, image: { width: "100%", height: 230 }, caption: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 5, paddingTop: 1 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.blue, marginTop: 5 }, captionText: { flex: 1, color: "#435069", fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18 } });
