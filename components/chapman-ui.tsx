import { ReactNode } from "react";
import { Image, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { haptic } from "@/lib/haptics";

export const palette = {
  blue: "#003EC7",
  electric: "#0052FF",
  deep: "#001452",
  orange: "#FE6B00",
  secondaryOrange: "#A04100",
  canvas: "#F8F9FA",
  surface: "#FFFFFF",
  ink: "#191C1D",
  muted: "#434656",
  border: "#E4E7EE",
  paleBlue: "#DDE1FF",
  green: "#168267",
  error: "#BA1A1A",
};

type TextProps = { children: ReactNode; style?: TextStyle; numberOfLines?: number };

export function DisplayText({ children, style, numberOfLines }: TextProps) {
  return <Text numberOfLines={numberOfLines} style={[styles.display, style]}>{children}</Text>;
}

export function BodyText({ children, style, numberOfLines }: TextProps) {
  return <Text numberOfLines={numberOfLines} style={[styles.body, style]}>{children}</Text>;
}

export function PrimaryButton({ label, onPress, icon, disabled = false, style }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; style?: ViewStyle }) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      activeOpacity={0.9}
      style={[styles.primaryPress, disabled && styles.disabled, style]}
    >
      <LinearGradient colors={[palette.blue, palette.electric]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
        <Text style={styles.primaryText}>{label}</Text>
        {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function OutlineButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <TouchableOpacity onPress={() => { haptic.light(); onPress(); }} activeOpacity={0.78} style={styles.outlineButton}>
      <Text style={styles.outlineText}>{label}</Text>
      {icon ? <Ionicons name={icon} size={17} color={palette.blue} /> : null}
    </TouchableOpacity>
  );
}

export function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <DisplayText style={styles.sectionTitle}>{title}</DisplayText>
      </View>
      {action && onAction ? <TouchableOpacity onPress={onAction} style={styles.sectionAction}><Text style={styles.sectionActionText}>{action}</Text><Ionicons name="arrow-forward" size={15} color={palette.blue} /></TouchableOpacity> : null}
    </View>
  );
}

export function StatusPill({ label, tone = "blue" }: { label: string; tone?: "blue" | "orange" | "green" | "gray" }) {
  const colors = {
    blue: { backgroundColor: "#E7EDFF", color: palette.blue },
    orange: { backgroundColor: "#FFF0E8", color: palette.secondaryOrange },
    green: { backgroundColor: "#E0F6EF", color: palette.green },
    gray: { backgroundColor: "#EEF0F4", color: palette.muted },
  }[tone];
  return <View style={[styles.statusPill, { backgroundColor: colors.backgroundColor }]}><Text style={[styles.statusText, { color: colors.color }]}>{label}</Text></View>;
}

export function IconOrb({ icon, color = palette.blue, size = 42 }: { icon: keyof typeof Ionicons.glyphMap; color?: string; size?: number }) {
  return <View style={[styles.iconOrb, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}18` }]}><Ionicons name={icon} size={size * 0.47} color={color} /></View>;
}

export function ChapmanMark({ inverted = false, size = 42 }: { inverted?: boolean; size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: inverted ? "rgba(255,255,255,0.14)" : palette.deep }]}>
      <Image source={require("@/assets/images/icon.png")} resizeMode="cover" style={{ width: size, height: size, borderRadius: size * 0.3 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  display: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 24, lineHeight: 31, letterSpacing: -0.7 },
  body: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  primaryPress: { borderRadius: 16, overflow: "hidden" },
  primaryGradient: { minHeight: 52, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, borderRadius: 16 },
  primaryText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15 },
  disabled: { opacity: 0.44 },
  outlineButton: { minHeight: 46, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, borderColor: "#BFCBFC", backgroundColor: "#F9FAFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  outlineText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  sectionCopy: { flex: 1 },
  eyebrow: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 3 },
  sectionTitle: { fontSize: 21, lineHeight: 27 },
  sectionAction: { flexDirection: "row", gap: 4, alignItems: "center", paddingBottom: 4 },
  sectionActionText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 13 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  iconOrb: { alignItems: "center", justifyContent: "center" },
  mark: { alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
});
