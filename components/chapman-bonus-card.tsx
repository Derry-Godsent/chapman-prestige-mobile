import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { TrackStanding, trackProgressLine } from "@/lib/loyalty";

/**
 * The Chapman bonus, in one box.
 *
 * It answers three questions in the order a customer asks them:
 *   1. What am I getting?      the headline, in plain words with no jargon
 *   2. How close am I?         one bar per ladder, filling as the work is counted
 *   3. How does it work?       the whole thing opens the Elite Patronage screen
 *
 * Every number comes from lib/loyalty.ts. Nothing here decides a discount or a
 * tier, so changing Chapman's decision in that one file changes this box too.
 */

type BonusBarProps = {
  title: string;
  standing: TrackStanding | null;
  fallback: string;
  delay: number;
  styles: ReturnType<typeof makeStyles>;
};

function BonusBar({ title, standing, fallback, delay, styles }: BonusBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fill.setValue(0);
    const animation = Animated.timing(fill, {
      toValue: standing?.progress ?? 0,
      duration: 760,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, fill, standing?.progress]);

  const fillWidth = trackWidth > 0
    ? fill.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] })
    : 0;

  return (
    <View style={styles.bonusBar}>
      <View style={styles.bonusBarTop}>
        <Text style={styles.bonusBarTitle}>{title}</Text>
        <Text style={styles.bonusBarValue}>{standing ? `${standing.tier.discount}% off` : ""}</Text>
      </View>
      <View style={styles.bonusTrack} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)} accessibilityLabel={`${title} progress`}>
        <Animated.View style={[styles.bonusFill, { width: fillWidth }]} />
      </View>
      <Text style={styles.bonusBarLine}>
        {standing ? `${standing.tier.name}. ${trackProgressLine(standing)} (${standing.count} ${standing.unitLabel} counted.)` : fallback}
      </Text>
    </View>
  );
}

export function ChapmanBonusCard({ laundryTrack, serviceTrack, loading, onPress, name }: {
  laundryTrack: TrackStanding | null;
  serviceTrack: TrackStanding | null;
  loading: boolean;
  onPress: () => void;
  name?: string | null;
}) {
  const { styles } = useChapmanStyles(makeStyles);
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(appear, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [appear]);

  const laundry = laundryTrack?.tier.discount ?? 0;
  const services = serviceTrack?.tier.discount ?? 0;
  const headline = loading || !laundryTrack || !serviceTrack
    ? "Working out your bonus"
    : laundry + services === 0
      ? `${name ? `${name}, your` : "Your"} bonus starts with your first visit.`
      : `You are saving ${laundry}% on laundry and ${services}% on services.`;

  return (
    <Animated.View style={{ opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={styles.bonusCard} accessibilityLabel="Your Chapman bonus and how it grows">
        <View style={styles.bonusTop}>
          <View style={styles.bonusIcon}><Ionicons name="gift-outline" size={21} color="#FFFFFF" /></View>
          <View style={styles.bonusTopCopy}>
            <Text style={styles.bonusLabel}>YOUR CHAPMAN BONUS</Text>
            <Text style={styles.bonusHeadline}>{headline}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </View>

        <BonusBar
          title="Laundry, counted in visits"
          standing={laundryTrack}
          fallback="Your first collection starts this ladder."
          delay={160}
          styles={styles}
        />
        <BonusBar
          title="Other services, counted in jobs"
          standing={serviceTrack}
          fallback="Cleaning, fumigation, detailing, and polytank work count here."
          delay={320}
          styles={styles}
        />

        <View style={styles.bonusFoot}>
          <Text style={styles.bonusFootText}>Chapman keeps this up to date after every job.</Text>
          <Text style={styles.bonusFootLink}>See every step</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  bonusCard: { borderRadius: 22, padding: 16, backgroundColor: palette.blue, gap: 13 },
  bonusTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  bonusIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  bonusTopCopy: { flex: 1, gap: 3 },
  bonusLabel: { color: "#DCFCE7", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15 },
  bonusHeadline: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 17, lineHeight: 22 },
  bonusBar: { gap: 7 },
  bonusBarTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bonusBarTitle: { color: "#EAF7EF", fontFamily: "Inter_600SemiBold", fontSize: 11.5 },
  bonusBarValue: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11.5 },
  bonusTrack: { height: 7, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.24)", overflow: "hidden" },
  bonusFill: { height: "100%", borderRadius: 99, backgroundColor: "#FFFFFF" },
  bonusBarLine: { color: "#E4F5EA", fontFamily: "Inter_400Regular", fontSize: 10.5, lineHeight: 15 },
  bonusFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 2 },
  bonusFootText: { flex: 1, color: "#CBEBD8", fontFamily: "Inter_400Regular", fontSize: 9.5, lineHeight: 13 },
  bonusFootLink: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11 },
});
