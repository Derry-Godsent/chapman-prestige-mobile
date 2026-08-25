import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { SERVICES, Service } from "@/lib/chapman-data";
import { haptic } from "@/lib/haptics";

const serviceImages: Record<string, string> = {
  laundry: "/manus-storage/chapman-laundry-hero_8866adc9.jpg",
  cleaning: "/manus-storage/chapman-cleaning-hero_d1b3b6b9.jpg",
  fumigation: "/manus-storage/chapman-fumigation-hero_4e38ba34.jpg",
  detailing: "/manus-storage/chapman-detailing-hero_f28c3e64.jpg",
  fabric: "/manus-storage/chapman-fabric-hero_4ff5bafd.jpg",
  polytank: "/manus-storage/chapman-water-hero_302dba58.jpg",
  contract: "/manus-storage/chapman-contract-hero_e7890f61.jpg",
  workers: "/manus-storage/chapman-workers-hero_422ce2ab.jpg",
};

export default function ServicesScreen() {
  const openService = (service: Service) => {
    haptic.light();
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
        ListHeaderComponent={<View style={styles.headerBlock}><ScreenHeader title="Care services" /><View style={styles.intro}><Text style={styles.eyebrow}>THE CHAPMAN COLLECTION</Text><DisplayText style={styles.introTitle}>Every space deserves its own standard of care.</DisplayText><BodyText style={styles.introBody}>Choose the moment you want to improve. We will make the next step simple.</BodyText></View><View style={styles.searchPrompt}><Ionicons name="search-outline" size={18} color={palette.blue} /><Text style={styles.searchText}>Find a service</Text><Text style={styles.searchHint}>Laundry, cleaning, workers…</Text></View><Text style={styles.collectionLabel}>EXPLORE THE COLLECTION</Text></View>}
        renderItem={({ item: service, index }) => <TouchableOpacity onPress={() => openService(service)} activeOpacity={0.88} style={styles.serviceCard}><Image source={{ uri: serviceImages[service.id] }} resizeMode="cover" style={styles.serviceImage} /><LinearGradient colors={["rgba(1,12,42,0.0)", "rgba(1,12,42,0.22)", "rgba(1,12,42,0.91)"]} locations={[0, 0.40, 1]} style={StyleSheet.absoluteFill} /><View style={styles.cardContent}><View style={styles.cardTop}><View style={styles.cardPill}><Text style={styles.cardPillText}>0{index + 1}</Text></View><View style={styles.iconCircle}><Ionicons name={service.icon as keyof typeof Ionicons.glyphMap} size={17} color="#FFFFFF" /></View></View><View style={styles.cardBottom}><Text style={styles.cardTitle}>{service.title}</Text><Text numberOfLines={2} style={styles.cardDescription}>{service.valueStatement}</Text><View style={styles.cardFooter}><Text style={styles.cardAction}>{service.actionLabel}</Text><View style={styles.priceGroup}><Text style={styles.priceLabel}>{service.priceHint}</Text><Ionicons name="arrow-forward" size={15} color="#FFFFFF" /></View></View></View></View></TouchableOpacity>}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 42, gap: 15, backgroundColor: "#F7F8FC" },
  headerBlock: { paddingHorizontal: 22, gap: 22, paddingBottom: 7 },
  intro: { gap: 7, paddingTop: 6 },
  eyebrow: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.35 },
  introTitle: { fontSize: 27, lineHeight: 35, maxWidth: 336 },
  introBody: { maxWidth: 310, fontSize: 13, lineHeight: 20 },
  searchPrompt: { minHeight: 50, paddingHorizontal: 15, borderRadius: 17, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8EBF2", flexDirection: "row", alignItems: "center", gap: 8 },
  searchText: { color: "#17213C", fontFamily: "Inter_700Bold", fontSize: 12 },
  searchHint: { flex: 1, textAlign: "right", color: "#929AAF", fontFamily: "Inter_400Regular", fontSize: 11 },
  collectionLabel: { color: "#6E7890", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2, marginTop: 3 },
  serviceCard: { height: 250, marginHorizontal: 22, borderRadius: 23, overflow: "hidden", backgroundColor: palette.deep },
  serviceImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  cardContent: { flex: 1, padding: 17, justifyContent: "space-between" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.19)", borderWidth: 1, borderColor: "rgba(255,255,255,0.30)" },
  cardPillText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 },
  iconCircle: { width: 35, height: 35, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center" },
  cardBottom: { gap: 5 },
  cardTitle: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 23, lineHeight: 29, maxWidth: 290 },
  cardDescription: { color: "#E5EBFF", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, maxWidth: 280 },
  cardFooter: { marginTop: 7, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.20)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardAction: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11 },
  priceGroup: { flexDirection: "row", gap: 6, alignItems: "center" },
  priceLabel: { color: "#DCE6FF", fontFamily: "Inter_600SemiBold", fontSize: 9, maxWidth: 125, textAlign: "right" },
});
