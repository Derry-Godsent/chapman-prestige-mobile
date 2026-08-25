import { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, IconOrb, StatusPill, palette } from "@/components/chapman-ui";
import { SERVICES, Service } from "@/lib/chapman-data";
import { useBookingStore } from "@/lib/booking-store";
import { haptic } from "@/lib/haptics";

const heroServices = ["laundry", "cleaning", "fabric", "fumigation"];
const focusServices = ["detailing", "polytank", "workers"];

export default function HomeScreen() {
  const { bookings } = useBookingStore();
  const highlightedServices = useMemo(() => heroServices.map((id) => SERVICES.find((service) => service.id === id)).filter(Boolean) as Service[], []);
  const careFocus = useMemo(() => focusServices.map((id) => SERVICES.find((service) => service.id === id)).filter(Boolean) as Service[], []);
  const activeBooking = bookings[0];

  const goToService = (service: Service) => {
    haptic.light();
    if (service.id === "workers") router.push("/workers" as never);
    else router.push(`/service/${service.id}` as never);
  };

  return (
    <AppScreen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoPlate}>
            <Image source={require("@/assets/images/cpl-wordmark.png")} resizeMode="contain" style={styles.logoImage} />
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push("/notifications" as never)} style={styles.bellButton} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={20} color={palette.ink} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/profile" as never)} style={styles.avatar} activeOpacity={0.8}>
              <Text style={styles.avatarText}>AE</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.introRow}>
          <View>
            <Text style={styles.kicker}>YOUR SPACE, ELEVATED</Text>
            <DisplayText style={styles.introTitle}>Good morning, Adwoa.</DisplayText>
          </View>
          <View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>CONCIERGE LIVE</Text></View>
        </View>

        <LinearGradient colors={["#020B35", "#063FC5", "#004DE8"]} start={{ x: 0.05, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroGlowLarge} />
          <View style={styles.heroGlowSmall} />
          <View style={styles.heroGridVertical} />
          <View style={styles.heroTop}><View><Text style={styles.heroEyebrow}>CHAPMAN CARE COLLECTIVE</Text><Text style={styles.heroHeadline}>A polished life is built in the details.</Text></View><View style={styles.cplBadge}><Text style={styles.cplBadgeCpl}>CPL</Text><Ionicons name="water" size={15} color="#E6EBFF" /></View></View>
          <BodyText style={styles.heroBody}>Discover the professional care that makes your home, wardrobe, vehicle, and workspaces feel renewed.</BodyText>
          <View style={styles.heroFooter}><TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.heroCTA} activeOpacity={0.85}><Text style={styles.heroCTAText}>Curate my care</Text><Ionicons name="arrow-forward" size={16} color={palette.deep} /></TouchableOpacity><View style={styles.heroFeature}><Ionicons name="shield-checkmark" size={15} color="#C6D2FF" /><Text style={styles.heroFeatureText}>Premium verified teams</Text></View></View>
        </LinearGradient>

        <TouchableOpacity onPress={() => router.push("/profile" as never)} activeOpacity={0.9} style={styles.patronagePress}>
          <View style={styles.patronageCard}>
            <View style={styles.patronageAccent} />
            <View style={styles.patronageTop}><View><Text style={styles.patronageKicker}>ELITE PATRONAGE</Text><Text style={styles.patronageTitle}>Bronze Circle</Text></View><View style={styles.patronageSeal}><Text style={styles.patronageSealValue}>5%</Text><Text style={styles.patronageSealLabel}>REWARD</Text></View></View>
            <View style={styles.patronageRule} />
            <View style={styles.patronageFooter}><View><Text style={styles.patronageMeta}>Your next tier unlocks after</Text><Text style={styles.patronageValue}>₵180 more in considered care</Text></View><Ionicons name="arrow-forward-circle" size={28} color={palette.blue} /></View>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionKicker}>CURATED FOR YOU</Text><DisplayText style={styles.sectionTitle}>Where should we start?</DisplayText></View><TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.viewAll}><Text style={styles.viewAllText}>All care</Text><Ionicons name="arrow-forward" size={14} color={palette.blue} /></TouchableOpacity></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceRail}>
          {highlightedServices.map((service, index) => <TouchableOpacity key={service.id} activeOpacity={0.84} onPress={() => goToService(service)} style={[styles.featureServiceCard, index === 0 && styles.featureServiceCardFirst]}><LinearGradient colors={[`${service.accent}`, `${service.accent}D6`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featureServiceGradient}><View style={styles.featureServiceTop}><View style={styles.serviceNumber}><Text style={styles.serviceNumberText}>0{index + 1}</Text></View><Ionicons name={service.icon as keyof typeof Ionicons.glyphMap} size={29} color="#FFFFFF" /></View><View><Text style={styles.featureServiceName}>{service.shortTitle}</Text><Text numberOfLines={2} style={styles.featureServiceInfo}>{service.valueStatement}</Text></View><View style={styles.featureServiceFoot}><Text style={styles.featureServiceAction}>{service.actionLabel}</Text><Ionicons name="arrow-up-outline" size={16} color="#FFFFFF" /></View></LinearGradient></TouchableOpacity>)}
        </ScrollView>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionKicker}>YOUR CARE RHYTHM</Text><DisplayText style={styles.sectionTitle}>Continue with confidence.</DisplayText></View><TouchableOpacity onPress={() => router.push("/bookings" as never)} style={styles.viewAll}><Text style={styles.viewAllText}>Bookings</Text><Ionicons name="arrow-forward" size={14} color={palette.blue} /></TouchableOpacity></View>
        {activeBooking ? <TouchableOpacity onPress={() => router.push(`/booking/${activeBooking.id}` as never)} style={styles.bookingCard} activeOpacity={0.85}><View style={styles.bookingIcon}><Ionicons name="navigate" size={20} color="#FFFFFF" /></View><View style={styles.bookingCopy}><StatusPill label={activeBooking.status.replace("-", " ")} tone="blue" /><Text style={styles.bookingTitle}>{activeBooking.serviceTitle}</Text><Text style={styles.bookingMeta}>{activeBooking.scheduledFor}</Text></View><Ionicons name="chevron-forward" size={21} color="#7481A4" /></TouchableOpacity> : <View style={styles.rhythmCard}><View style={styles.rhythmMark}><Ionicons name="sparkles" size={21} color={palette.blue} /></View><View style={styles.rhythmCopy}><Text style={styles.rhythmTitle}>Make room for better moments.</Text><Text style={styles.rhythmBody}>Your next service can start with one simple request.</Text></View><TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.rhythmAction}><Ionicons name="add" size={20} color="#FFFFFF" /></TouchableOpacity></View>}

        <LinearGradient colors={["#FAF1E9", "#FFF9F5", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.editorialCard}>
          <View style={styles.editorialStamp}><Text style={styles.editorialStampText}>THE CPL EDIT</Text></View><Text style={styles.editorialKicker}>THE WEEKEND RECLAIMED</Text><DisplayText style={styles.editorialTitle}>Let your laundry leave. Let your weekend stay.</DisplayText><BodyText style={styles.editorialBody}>Book doorstep garment care, track the pickup, and receive every piece back ready to wear.</BodyText><TouchableOpacity onPress={() => router.push("/service/laundry" as never)} style={styles.editorialLink}><Text style={styles.editorialLinkText}>Explore garment care</Text><Ionicons name="arrow-forward" size={17} color={palette.blue} /></TouchableOpacity><View style={styles.editorialArt}><Ionicons name="shirt-outline" size={72} color="#FFFFFF" /></View></LinearGradient>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionKicker}>BEYOND THE BASICS</Text><DisplayText style={styles.sectionTitle}>Care that keeps life moving.</DisplayText></View></View>
        <View style={styles.focusGrid}>{careFocus.map((service) => <TouchableOpacity key={service.id} activeOpacity={0.8} onPress={() => goToService(service)} style={styles.focusCard}><IconOrb icon={service.icon as keyof typeof Ionicons.glyphMap} color={service.accent} size={44} /><View style={styles.focusCopy}><Text style={styles.focusTitle}>{service.shortTitle}</Text><Text numberOfLines={1} style={styles.focusMeta}>{service.priceHint}</Text></View><Ionicons name="arrow-forward" size={16} color={service.accent} /></TouchableOpacity>)}</View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F5F7FC" }, content: { paddingTop: 9, paddingBottom: 38, gap: 23 },
  header: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, logoPlate: { width: 127, height: 49, backgroundColor: "#FFFFFF", borderRadius: 15, padding: 5, borderWidth: 1, borderColor: "#E1E7F2", shadowColor: "#061A50", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, logoImage: { width: "100%", height: "100%" }, headerActions: { flexDirection: "row", alignItems: "center", gap: 9 }, bellButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E1E7F2" }, notificationDot: { position: "absolute", top: 9, right: 10, width: 7, height: 7, backgroundColor: "#E75438", borderWidth: 1.5, borderColor: "#FFFFFF", borderRadius: 4 }, avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#0A48C9", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#DCE6FF" }, avatarText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 },
  introRow: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }, kicker: { color: "#365CBF", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 }, introTitle: { fontSize: 28, lineHeight: 35, marginTop: 3 }, liveIndicator: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: "#EBF8F3", flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#24AD78" }, liveText: { color: "#168267", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.65 },
  heroCard: { marginHorizontal: 20, minHeight: 252, padding: 20, borderRadius: 29, overflow: "hidden", justifyContent: "space-between", shadowColor: "#001A73", shadowOpacity: 0.26, shadowRadius: 18, shadowOffset: { width: 0, height: 11 }, elevation: 5 }, heroGlowLarge: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(148,184,255,0.20)", right: -128, top: -94 }, heroGlowSmall: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.09)", left: 90, bottom: -81 }, heroGridVertical: { position: "absolute", right: 34, top: 45, width: 1, height: 160, backgroundColor: "rgba(255,255,255,0.17)" }, heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 15 }, heroEyebrow: { color: "#BFCFFF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 }, heroHeadline: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 26, lineHeight: 33, letterSpacing: -0.7, maxWidth: 247, marginTop: 7 }, cplBadge: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.26)", alignItems: "center", justifyContent: "center", gap: 0 }, cplBadgeCpl: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 13, letterSpacing: 0.4 }, heroBody: { color: "#DCE5FF", fontSize: 12, lineHeight: 18, maxWidth: 280, marginTop: 8 }, heroFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, heroCTA: { backgroundColor: "#FFFFFF", borderRadius: 14, minHeight: 45, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7 }, heroCTAText: { color: "#001452", fontFamily: "Inter_700Bold", fontSize: 12 }, heroFeature: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "flex-end" }, heroFeatureText: { color: "#C6D2FF", fontFamily: "Inter_600SemiBold", fontSize: 10, textAlign: "right" },
  patronagePress: { marginHorizontal: 20 }, patronageCard: { minHeight: 142, backgroundColor: "#FFFFFF", borderRadius: 23, padding: 17, overflow: "hidden", borderWidth: 1, borderColor: "#D9E1F0", shadowColor: "#1B2D5F", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 }, patronageAccent: { position: "absolute", width: 8, height: "100%", left: 0, top: 0, backgroundColor: "#E6C369" }, patronageTop: { paddingLeft: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, patronageKicker: { color: "#5A6A91", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 }, patronageTitle: { color: "#122153", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 20, marginTop: 4 }, patronageSeal: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FEF7DE", borderWidth: 1, borderColor: "#F3D779", alignItems: "center", justifyContent: "center" }, patronageSealValue: { color: "#A07300", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 15 }, patronageSealLabel: { color: "#A07300", fontFamily: "Inter_700Bold", fontSize: 6.5, letterSpacing: 0.55 }, patronageRule: { height: 1, backgroundColor: "#EAEFF7", marginTop: 13, marginLeft: 5 }, patronageFooter: { paddingLeft: 5, marginTop: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, patronageMeta: { color: "#687593", fontFamily: "Inter_400Regular", fontSize: 10 }, patronageValue: { color: "#1C2C5D", fontFamily: "Inter_700Bold", fontSize: 12, marginTop: 2 },
  sectionHeader: { paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }, sectionKicker: { color: "#365CBF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.25 }, sectionTitle: { fontSize: 22, lineHeight: 28, marginTop: 3 }, viewAll: { flexDirection: "row", alignItems: "center", gap: 4, paddingBottom: 4 }, viewAllText: { color: "#1746B6", fontFamily: "Inter_700Bold", fontSize: 12 },
  serviceRail: { paddingHorizontal: 20, gap: 11, paddingRight: 40 }, featureServiceCard: { width: 177, height: 205, borderRadius: 22, overflow: "hidden" }, featureServiceCardFirst: { marginLeft: 0 }, featureServiceGradient: { flex: 1, padding: 15, justifyContent: "space-between" }, featureServiceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, serviceNumber: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }, serviceNumberText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.7 }, featureServiceName: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, lineHeight: 22 }, featureServiceInfo: { color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, marginTop: 4 }, featureServiceFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.18)", paddingTop: 9 }, featureServiceAction: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10 },
  bookingCard: { marginHorizontal: 20, minHeight: 100, backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#DDE5F3", padding: 14, flexDirection: "row", gap: 12, alignItems: "center" }, bookingIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, bookingCopy: { flex: 1, gap: 3 }, bookingTitle: { color: "#17214A", fontFamily: "Inter_700Bold", fontSize: 14 }, bookingMeta: { color: "#64708F", fontFamily: "Inter_400Regular", fontSize: 11 }, rhythmCard: { marginHorizontal: 20, minHeight: 108, padding: 15, backgroundColor: "#FFFFFF", borderRadius: 21, borderWidth: 1, borderColor: "#DDE5F3", flexDirection: "row", alignItems: "center", gap: 12 }, rhythmMark: { width: 47, height: 47, borderRadius: 16, backgroundColor: "#EAF0FF", alignItems: "center", justifyContent: "center" }, rhythmCopy: { flex: 1, gap: 3 }, rhythmTitle: { color: "#17214A", fontFamily: "Inter_700Bold", fontSize: 13 }, rhythmBody: { color: "#66738E", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 }, rhythmAction: { width: 37, height: 37, borderRadius: 13, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" },
  editorialCard: { marginHorizontal: 20, minHeight: 220, padding: 19, borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: "#F0DFD2", gap: 8 }, editorialStamp: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E8CDB8" }, editorialStampText: { color: "#A04C1F", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.9 }, editorialKicker: { color: "#A04C1F", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2, marginTop: 3 }, editorialTitle: { color: "#1E2544", fontSize: 22, lineHeight: 28, maxWidth: 242 }, editorialBody: { color: "#6E6270", fontSize: 11, lineHeight: 17, maxWidth: 238 }, editorialLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: "auto" }, editorialLinkText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 12 }, editorialArt: { position: "absolute", right: -29, bottom: -35, width: 128, height: 128, borderRadius: 64, backgroundColor: "#EF9A69", alignItems: "flex-start", justifyContent: "flex-start", paddingTop: 22, paddingLeft: 23, transform: [{ rotate: "-13deg" }] },
  focusGrid: { marginHorizontal: 20, gap: 9 }, focusCard: { minHeight: 74, padding: 12, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E1E7F2", flexDirection: "row", alignItems: "center", gap: 10 }, focusCopy: { flex: 1 }, focusTitle: { color: "#17214A", fontFamily: "Inter_700Bold", fontSize: 13 }, focusMeta: { color: "#697590", fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 3 },
});
