import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, IconOrb, StatusPill, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { SERVICES, Service } from "@/lib/chapman-data";

export default function ServicesScreen() {
  const openService = (service: Service) => {
    if (service.id === "workers") router.push("/workers" as never);
    else router.push(`/service/${service.id}` as never);
  };

  return (
    <AppScreen>
      <FlatList
        data={SERVICES}
        keyExtractor={(service) => service.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<View style={styles.headerBlock}><ScreenHeader title="Our services" /><View style={styles.search}><Ionicons name="search-outline" size={19} color={palette.muted} /><Text style={styles.searchText}>What would you like help with?</Text></View><View style={styles.introCard}><Text style={styles.introEyebrow}>PREMIUM CARE FOR MODERN LIVING</Text><DisplayText style={styles.introTitle}>Care is easier when the right team is one tap away.</DisplayText><BodyText style={styles.introBody}>Choose a trusted service for your home, vehicle, or facility. Every option begins with a clear next step.</BodyText></View><Text style={styles.listLabel}>EXPLORE ALL SERVICES</Text></View>}
        renderItem={({ item: service }) => <TouchableOpacity style={[styles.serviceCard, service.id === "workers" && styles.workerCard]} onPress={() => openService(service)} activeOpacity={0.82}><View style={styles.serviceTop}><IconOrb icon={service.icon as keyof typeof Ionicons.glyphMap} color={service.accent} size={47} /><View style={styles.cardMeta}>{service.id === "laundry" ? <StatusPill label="VERIFIED CARE" tone="blue" /> : service.id === "polytank" ? <StatusPill label="WATER SAFETY" tone="blue" /> : service.id === "workers" ? <StatusPill label="LIVE NOW" tone="orange" /> : <Text style={[styles.priceHint, { color: service.accent }]}>{service.priceHint}</Text>}<Ionicons name="chevron-forward" size={20} color={palette.muted} /></View></View><Text style={styles.serviceTitle}>{service.title}</Text><Text style={styles.serviceDescription}>{service.description}</Text><View style={styles.cardFooter}><Text style={[styles.actionText, { color: service.accent }]}>{service.actionLabel}</Text><Ionicons name="arrow-forward" size={16} color={service.accent} /></View></TouchableOpacity>}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({ content: { padding: 20, paddingTop: 12, paddingBottom: 34, gap: 11, backgroundColor: palette.canvas }, headerBlock: { gap: 18, paddingBottom: 3 }, search: { height: 48, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 }, searchText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 13 }, introCard: { backgroundColor: "#EEF7F1", borderRadius: 23, padding: 18, gap: 8, overflow: "hidden" }, introEyebrow: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15 }, introTitle: { fontSize: 21, lineHeight: 27, maxWidth: 290 }, introBody: { fontSize: 12, maxWidth: 307, lineHeight: 18 }, listLabel: { color: palette.muted, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.15, marginTop: 4 }, serviceCard: { padding: 16, backgroundColor: "#FFFFFF", borderRadius: 21, borderWidth: 1, borderColor: palette.border, gap: 10 }, workerCard: { borderColor: "#F3D49B", backgroundColor: "#FFFBF0" }, serviceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardMeta: { flexDirection: "row", alignItems: "center", gap: 8 }, priceHint: { fontFamily: "Inter_700Bold", fontSize: 11 }, serviceTitle: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, lineHeight: 23 }, serviceDescription: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 }, cardFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }, actionText: { fontFamily: "Inter_700Bold", fontSize: 12 } });
