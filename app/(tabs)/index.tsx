import { useEffect, useMemo, useRef } from "react";
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, StatusPill, palette } from "@/components/chapman-ui";
import { SERVICES, Service } from "@/lib/chapman-data";
import { useBookingStore } from "@/lib/booking-store";
import { haptic } from "@/lib/haptics";

const serviceMoments = [
  {
    id: "fabric",
    eyebrow: "SOFA & CARPET",
    title: "Bring the comfort back.",
    detail: "Fabric revival",
    image: "/manus-storage/chapman-fabric-hero_4ff5bafd.jpg",
  },
  {
    id: "detailing",
    eyebrow: "PREMIUM DETAILING",
    title: "Leave every drive polished.",
    detail: "Vehicle care",
    image: "/manus-storage/chapman-detailing-hero_f28c3e64.jpg",
  },
  {
    id: "polytank",
    eyebrow: "WATER SAFETY",
    title: "Care begins before the tap.",
    detail: "Tank sanitization",
    image: "/manus-storage/chapman-water-hero_302dba58.jpg",
  },
];

const quietCare = ["cleaning", "fumigation", "contract", "workers"];

export default function HomeScreen() {
  const { bookings } = useBookingStore();
  const activeBooking = bookings[0];
  const careOptions = useMemo(() => quietCare.map((id) => SERVICES.find((service) => service.id === id)).filter(Boolean) as Service[], []);
  const contentFade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(1.06)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(heroScale, { toValue: 1, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [contentFade, heroScale]);

  const goToService = (serviceId: string) => {
    haptic.light();
    if (serviceId === "workers") router.push("/workers" as never);
    else router.push(`/service/${serviceId}` as never);
  };

  return (
    <AppScreen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={require("@/assets/images/cpl-wordmark.png")} resizeMode="contain" style={styles.wordmark} />
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push("/notifications" as never)} style={styles.iconButton} activeOpacity={0.66}>
              <Ionicons name="notifications-outline" size={22} color="#14213D" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/profile" as never)} style={styles.avatar} activeOpacity={0.78}>
              <Text style={styles.avatarText}>AE</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={[styles.greeting, { opacity: contentFade, transform: [{ translateY: contentFade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Text style={styles.kicker}>GOOD MORNING, ADWOA</Text>
          <DisplayText style={styles.greetingTitle}>Care for the life you are building.</DisplayText>
          <BodyText style={styles.greetingBody}>Thoughtful help for your home, wardrobe, vehicle, and workplace, on your own time.</BodyText>
        </Animated.View>

        <TouchableOpacity onPress={() => goToService("laundry")} activeOpacity={0.9} style={styles.heroPress}>
          <View style={styles.heroCard}>
            <Animated.Image source={{ uri: "/manus-storage/chapman-laundry-hero_8866adc9.jpg" }} resizeMode="cover" style={[styles.heroImage, { transform: [{ scale: heroScale }] }]} />
            <LinearGradient colors={["rgba(1,15,49,0.02)", "rgba(1,15,49,0.20)", "rgba(1,15,49,0.94)"]} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroContent}>
              <View style={styles.heroTop}><View style={styles.heroPill}><Text style={styles.heroPillText}>GARMENT CARE</Text></View><View style={styles.heroTime}><Ionicons name="time-outline" size={14} color="#FFFFFF" /><Text style={styles.heroTimeText}>Pickup tomorrow</Text></View></View>
              <View style={styles.heroBottom}><DisplayText style={styles.heroTitle}>Your weekend,
freshly returned.</DisplayText><Text style={styles.heroBody}>Doorstep pickup, meticulous care, and every piece ready to wear.</Text><View style={styles.heroActionRow}><View><Text style={styles.fromLabel}>FROM</Text><Text style={styles.fromPrice}>₵2 <Text style={styles.fromSuffix}>per item</Text></Text></View><View style={styles.heroAction}><Text style={styles.heroActionText}>Book a pickup</Text><Ionicons name="arrow-forward" size={17} color="#061545" /></View></View></View>
            </View>
          </View>
        </TouchableOpacity>

        {activeBooking ? <TouchableOpacity onPress={() => router.push(`/booking/${activeBooking.id}` as never)} activeOpacity={0.82} style={styles.statusStrip}><View style={styles.statusIcon}><Ionicons name="navigate" size={17} color={palette.blue} /></View><View style={styles.statusCopy}><Text style={styles.statusEyebrow}>ACTIVE CARE</Text><Text style={styles.statusTitle}>{activeBooking.serviceTitle}</Text><Text style={styles.statusMeta}>{activeBooking.scheduledFor}</Text></View><StatusPill label={activeBooking.status.replace("-", " ")} tone="blue" /><Ionicons name="chevron-forward" size={18} color="#7B8497" /></TouchableOpacity> : <TouchableOpacity onPress={() => router.push("/services" as never)} activeOpacity={0.78} style={styles.conciergeLine}><Ionicons name="sparkles-outline" size={18} color={palette.blue} /><Text style={styles.conciergeText}>Your Chapman concierge is ready when you are.</Text><Ionicons name="arrow-forward" size={17} color={palette.blue} /></TouchableOpacity>}

        <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>THE CARE EDIT</Text><DisplayText style={styles.sectionTitle}>A better way to feel at home.</DisplayText></View><TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.textAction}><Text style={styles.textActionLabel}>View all</Text><Ionicons name="arrow-forward" size={14} color={palette.blue} /></TouchableOpacity></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentRail} decelerationRate="fast" snapToInterval={258} snapToAlignment="start">
          {serviceMoments.map((moment) => <TouchableOpacity key={moment.id} onPress={() => goToService(moment.id)} activeOpacity={0.87} style={styles.momentCard}><Image source={{ uri: moment.image }} resizeMode="cover" style={styles.momentImage} /><LinearGradient colors={["transparent", "rgba(3,13,37,0.84)"]} locations={[0.25, 1]} style={StyleSheet.absoluteFill} /><View style={styles.momentContent}><Text style={styles.momentEyebrow}>{moment.eyebrow}</Text><Text style={styles.momentTitle}>{moment.title}</Text><View style={styles.momentFooter}><Text style={styles.momentDetail}>{moment.detail}</Text><View style={styles.momentArrow}><Ionicons name="arrow-forward" size={14} color="#FFFFFF" /></View></View></View></TouchableOpacity>)}
        </ScrollView>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>MORE WAYS WE HELP</Text><DisplayText style={styles.sectionTitle}>Designed around real life.</DisplayText></View></View>
        <View style={styles.serviceList}>
          {careOptions.map((service) => <TouchableOpacity key={service.id} onPress={() => goToService(service.id)} activeOpacity={0.7} style={styles.serviceRow}><View style={[styles.serviceAccent, { backgroundColor: service.accent }]} /><View style={styles.serviceCopy}><Text style={styles.serviceName}>{service.shortTitle}</Text><Text numberOfLines={1} style={styles.serviceDescription}>{service.valueStatement}</Text></View><View style={styles.serviceEnd}><Text style={styles.servicePrice}>{service.priceHint}</Text><Ionicons name="arrow-forward" size={16} color={palette.blue} /></View></TouchableOpacity>)}
        </View>

        <TouchableOpacity onPress={() => router.push("/profile" as never)} activeOpacity={0.84} style={styles.patronageCard}><View style={styles.patronageCopy}><Text style={styles.patronageEyebrow}>ELITE PATRONAGE</Text><DisplayText style={styles.patronageTitle}>Your care should give back.</DisplayText><Text style={styles.patronageBody}>You are on Bronze Circle with a 5% reward on each confirmed service.</Text></View><View style={styles.patronageSeal}><Text style={styles.patronageSealValue}>5%</Text><Text style={styles.patronageSealLabel}>REWARD</Text></View><Ionicons name="arrow-forward" size={19} color="#FFFFFF" style={styles.patronageArrow} /></TouchableOpacity>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#F7F8FC" },
  content: { paddingTop: 16, paddingBottom: 42, gap: 32 },
  header: { paddingHorizontal: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wordmark: { width: 132, height: 42 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", position: "relative" },
  notificationDot: { position: "absolute", top: 9, right: 9, width: 6, height: 6, borderRadius: 3, backgroundColor: "#E66A43", borderWidth: 1.5, borderColor: "#F7F8FC" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#DDE7FF", alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 11 },
  greeting: { paddingHorizontal: 22, gap: 6 },
  kicker: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.45 },
  greetingTitle: { fontSize: 29, lineHeight: 37, maxWidth: 330 },
  greetingBody: { fontSize: 13, lineHeight: 20, maxWidth: 310 },
  heroPress: { marginHorizontal: 16, borderRadius: 28, shadowColor: "#031342", shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 11 }, elevation: 7 },
  heroCard: { height: 392, borderRadius: 28, overflow: "hidden", backgroundColor: palette.deep },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroContent: { flex: 1, padding: 19, justifyContent: "space-between" },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.26)" },
  heroPillText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.05 },
  heroTime: { flexDirection: "row", gap: 5, alignItems: "center" },
  heroTimeText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 10 },
  heroBottom: { gap: 9 },
  heroTitle: { color: "#FFFFFF", fontSize: 31, lineHeight: 38, letterSpacing: -0.8, maxWidth: 288 },
  heroBody: { color: "#E8EDFF", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, maxWidth: 270 },
  heroActionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 },
  fromLabel: { color: "#B9C8FF", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1 },
  fromPrice: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 20, marginTop: 1 },
  fromSuffix: { color: "#E8EDFF", fontFamily: "Inter_500Medium", fontSize: 10 },
  heroAction: { height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 8 },
  heroActionText: { color: "#061545", fontFamily: "Inter_700Bold", fontSize: 12 },
  statusStrip: { marginHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 65 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8EEFF", alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1, gap: 1 },
  statusEyebrow: { color: "#6980BA", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1.05 },
  statusTitle: { color: "#16213E", fontFamily: "Inter_700Bold", fontSize: 12 },
  statusMeta: { color: "#6E778C", fontFamily: "Inter_400Regular", fontSize: 10 },
  conciergeLine: { marginHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 9, minHeight: 39 },
  conciergeText: { flex: 1, color: "#43506D", fontFamily: "Inter_500Medium", fontSize: 12 },
  sectionHeader: { paddingHorizontal: 22, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 14 },
  sectionEyebrow: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.35 },
  sectionTitle: { fontSize: 22, lineHeight: 28, marginTop: 4, maxWidth: 275 },
  textAction: { flexDirection: "row", gap: 4, alignItems: "center", paddingBottom: 3 },
  textActionLabel: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 12 },
  momentRail: { gap: 13, paddingLeft: 22, paddingRight: 42 },
  momentCard: { width: 245, height: 284, borderRadius: 23, overflow: "hidden", backgroundColor: palette.deep },
  momentImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  momentContent: { flex: 1, padding: 16, justifyContent: "flex-end", gap: 5 },
  momentEyebrow: { color: "#E7EDFF", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1.2 },
  momentTitle: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 20, lineHeight: 26, maxWidth: 210 },
  momentFooter: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.22)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  momentDetail: { color: "#DEE7FF", fontFamily: "Inter_500Medium", fontSize: 10 },
  momentArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.19)", alignItems: "center", justifyContent: "center" },
  serviceList: { marginHorizontal: 22, backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 15, borderWidth: 1, borderColor: "#E8EBF2" },
  serviceRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: "#EEF0F5" },
  serviceAccent: { width: 3, height: 32, borderRadius: 2 },
  serviceCopy: { flex: 1, gap: 3 },
  serviceName: { color: "#18213D", fontFamily: "Inter_700Bold", fontSize: 13 },
  serviceDescription: { color: "#6A7388", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14, maxWidth: 178 },
  serviceEnd: { alignItems: "flex-end", gap: 5 },
  servicePrice: { color: "#53617F", fontFamily: "Inter_600SemiBold", fontSize: 9, maxWidth: 85, textAlign: "right" },
  patronageCard: { marginHorizontal: 22, borderRadius: 23, backgroundColor: "#0B235E", padding: 19, overflow: "hidden", minHeight: 154, justifyContent: "space-between" },
  patronageCopy: { gap: 4, maxWidth: 242 },
  patronageEyebrow: { color: "#B9C8FF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.3 },
  patronageTitle: { color: "#FFFFFF", fontSize: 21, lineHeight: 27 },
  patronageBody: { color: "#D5DFFF", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16, marginTop: 3 },
  patronageSeal: { position: "absolute", right: 19, top: 20, width: 59, height: 59, borderRadius: 30, backgroundColor: "#315FCF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#7193EC" },
  patronageSealValue: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18 },
  patronageSealLabel: { color: "#DEE7FF", fontFamily: "Inter_700Bold", fontSize: 7, letterSpacing: 0.65 },
  patronageArrow: { position: "absolute", bottom: 17, right: 19 },
});
