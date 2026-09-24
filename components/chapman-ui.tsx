import { ReactNode, useMemo } from "react";
import { Image, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { haptic } from "@/lib/haptics";
import { useColorSchemeSafe } from "@/lib/theme-provider";
import { ChapmanPalette, darkPalette, lightPalette } from "@/lib/theme-palette";

export type { ChapmanPalette };
/**
 * The light skin, kept as the default.
 *
 * Screens that draw inside a component use useChapmanPalette() or
 * useChapmanStyles() instead, so they follow the customer's choice of skin. This
 * constant stays for the few places that need a colour before a component
 * renders, such as a gradient's starting value.
 */
export const palette: ChapmanPalette = lightPalette;
/** The colours for the skin in use right now. */
export function useChapmanPalette(): ChapmanPalette {
  const scheme = useColorSchemeSafe();
  return scheme === "dark" ? darkPalette : lightPalette;
}
/**
 * Styles that follow the skin.
 *
 * The factory runs once per skin and the result is remembered, so switching to
 * dark does not rebuild every style on every render.
 *
 *   const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({ ... });
 *   
 */
export function useChapmanStyles<T>(factory: (palette: ChapmanPalette) => T): { styles: T; palette: ChapmanPalette } {
  const palette = useChapmanPalette();
  const styles = useMemo(() => factory(palette), [factory, palette]);
  return { styles, palette };
}
type TextProps = { children: ReactNode; style?: TextStyle; numberOfLines?: number };
export function DisplayText({ children, style, numberOfLines }: TextProps) {
  const { styles } = useChapmanStyles(makeStyles);
  return <Text numberOfLines={numberOfLines} style={[styles.display, style]}>{children}</Text>;
}
export function BodyText({ children, style, numberOfLines }: TextProps) {
  const { styles } = useChapmanStyles(makeStyles);
  return <Text numberOfLines={numberOfLines} style={[styles.body, style]}>{children}</Text>;
}
export function PrimaryButton({ label, onPress, icon, disabled = false, style }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; style?: ViewStyle }) {
  const { styles, palette } = useChapmanStyles(makeStyles);
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
  const { styles, palette } = useChapmanStyles(makeStyles);
  return (
    <TouchableOpacity onPress={() => { haptic.light(); onPress(); }} activeOpacity={0.78} style={styles.outlineButton}>
      <Text style={styles.outlineText}>{label}</Text>
      {icon ? <Ionicons name={icon} size={17} color={palette.accent} /> : null}
    </TouchableOpacity>
  );
}
export function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  const { styles, palette } = useChapmanStyles(makeStyles);
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <DisplayText style={styles.sectionTitle}>{title}</DisplayText>
      </View>
      {action && onAction ? <TouchableOpacity onPress={onAction} style={styles.sectionAction}><Text style={styles.sectionActionText}>{action}</Text><Ionicons name="arrow-forward" size={15} color={palette.accent} /></TouchableOpacity> : null}
    </View>
  );
}
export function StatusPill({ label, tone = "blue" }: { label: string; tone?: "blue" | "orange" | "green" | "gray" | "red" }) {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const colors = {
    blue: { backgroundColor: palette.chip, color: palette.accent },
    orange: { backgroundColor: palette.chipOrange, color: palette.secondaryOrange },
    green: { backgroundColor: palette.chipGreen, color: palette.green },
    gray: { backgroundColor: palette.soft, color: palette.muted },
    red: { backgroundColor: palette.chipRed, color: palette.error },
  }[tone];
  return <View style={[styles.statusPill, { backgroundColor: colors.backgroundColor }]}><Text style={[styles.statusText, { color: colors.color }]}>{label}</Text></View>;
}
export function IconOrb({ icon, color, size = 42 }: { icon: keyof typeof Ionicons.glyphMap; color?: string; size?: number }) {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const orbColor = color ?? palette.accent;
  return <View style={[styles.iconOrb, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${orbColor}20`, borderColor: `${orbColor}45` }]}><Ionicons name={icon} size={size * 0.47} color={orbColor} /></View>;
}
export function ChapmanMark({ inverted = false, size = 42 }: { inverted?: boolean; size?: number }) {
  const { styles } = useChapmanStyles(makeStyles);
  return <Image source={require("@/assets/images/cpl-logo-borderless.png")} resizeMode="contain" style={[styles.brandLogo, { width: size * 1.31, height: size }, inverted && styles.brandLogoInverted]} />;
}
const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  display: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 24, lineHeight: 31, letterSpacing: -0.7 },
  body: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  primaryPress: { borderRadius: 16, overflow: "hidden" },
  primaryGradient: { minHeight: 52, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, borderRadius: 16 },
  primaryText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 15 },
  disabled: { opacity: 0.44 },
  outlineButton: { minHeight: 46, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, borderColor: palette.accentBorder, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  outlineText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  sectionCopy: { flex: 1 },
  eyebrow: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 3 },
  sectionTitle: { fontSize: 21, lineHeight: 27 },
  sectionAction: { flexDirection: "row", gap: 4, alignItems: "center", paddingBottom: 4 },
  sectionActionText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 13 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start" },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  iconOrb: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  brandLogo: { opacity: 1 },
  brandLogoInverted: { opacity: 0.94 },
});
