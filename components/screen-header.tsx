import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ChapmanMark, palette } from "@/components/chapman-ui";

export function ScreenHeader({ title, subtitle, onBack }: { title?: string; subtitle?: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack ?? (() => router.back())} style={styles.back} activeOpacity={0.72}>
        <Ionicons name="chevron-back" size={22} color={palette.ink} />
      </TouchableOpacity>
      {title ? <View style={styles.titleWrap}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View> : <ChapmanMark size={39} />}
      <View style={styles.rightGap} />
    </View>
  );
}

const styles = StyleSheet.create({ header: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" }, titleWrap: { alignItems: "center", flex: 1, paddingHorizontal: 8 }, title: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15 }, subtitle: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 1 }, rightGap: { width: 42 } });
