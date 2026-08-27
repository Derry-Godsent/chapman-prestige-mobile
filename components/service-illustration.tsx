import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/chapman-ui";

export const SERVICE_ILLUSTRATIONS: Record<string, number> = {
  laundry: require("../assets/images/service-laundry.jpg"),
  cleaning: require("../assets/images/service-cleaning.jpg"),
  fabric: require("../assets/images/service-fabric.jpg"),
  fumigation: require("../assets/images/service-fumigation.jpg"),
  detailing: require("../assets/images/service-detailing.jpg"),
  polytank: require("../assets/images/service-polytank.jpg"),
};

const serviceCaptions: Record<string, string> = {
  laundry: "Your clothes are picked up, cared for, and brought back ready to wear.",
  cleaning: "A trained team gives your space the deep clean it needs.",
  fabric: "We refresh the fabric you live with every day.",
  fumigation: "Careful treatment helps protect your home from pests.",
  detailing: "A complete clean for the car you depend on.",
  polytank: "A cleaner tank helps your water start safer.",
};

export function AnimatedServiceScene({ serviceId, height = 230, dark = false, portrait = false }: { serviceId: string; height?: number; dark?: boolean; portrait?: boolean }) {
  const bob = useRef(new Animated.Value(0)).current;
  const uri = SERVICE_ILLUSTRATIONS[serviceId] ?? SERVICE_ILLUSTRATIONS.cleaning;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return <View pointerEvents="none" style={[styles.scene, dark && styles.sceneDark, portrait && styles.scenePortrait, { height }, portrait && { width: height * 0.8 }]}><Animated.Image source={uri} resizeMode="cover" style={[styles.sceneImage, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [3, -6] }) }, { scale: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) }] }]} /></View>;
}

export function ServiceIllustration({ serviceId }: { serviceId: string }) {
  const caption = serviceCaptions[serviceId] ?? "A Chapman team will guide the next step.";
  return <View style={styles.container}><AnimatedServiceScene serviceId={serviceId} height={230} /><View style={styles.caption}><View style={styles.dot} /><Text style={styles.captionText}>{caption}</Text></View></View>;
}

const styles = StyleSheet.create({ scene: { width: "100%", overflow: "hidden", alignItems: "center", justifyContent: "center" }, sceneDark: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 28 }, scenePortrait: { borderRadius: 26, backgroundColor: palette.canvas }, sceneImage: { width: "100%", height: "100%" }, container: { padding: 12, paddingBottom: 14, borderRadius: 24, backgroundColor: "#EDF3FF", overflow: "hidden" }, caption: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 5, paddingTop: 1 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.blue, marginTop: 5 }, captionText: { flex: 1, color: "#435069", fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 18 } });
