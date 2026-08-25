import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { BodyText, ChapmanMark, DisplayText, IconOrb, SectionHeading, StatusPill, palette } from "@/components/chapman-ui";
import { AnimatedServiceScene } from "@/components/service-illustration";
import { DailyAnnouncement } from "@/components/daily-announcement";
import { SERVICES, Service } from "@/lib/chapman-data";
import { useBookingStore } from "@/lib/booking-store";
import { haptic } from "@/lib/haptics";

const quickServiceIds = ["laundry", "cleaning", "fumigation", "detailing", "fabric", "polytank", "workers", "contract"];

export default function HomeScreen() {
  const { bookings } = useBookingStore();
  const quickServices = useMemo(() => quickServiceIds.map((id) => SERVICES.find((service) => service.id === id)).filter(Boolean) as Service[], []);
  const activeBooking = bookings[0];

  return (
    <AppScreen>
      <DailyAnnouncement onOpen={() => router.push("/notifications" as never)} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <ChapmanMark size={45} />
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>Chapman Prestige</Text>
              <Text style={styles.brandSub}>LIMITED</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push("/notifications" as never)} style={styles.bellButton} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={22} color={palette.ink} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/profile" as never)} style={styles.avatar} activeOpacity={0.8}>
              <Text style={styles.avatarText}>AE</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>GOOD MORNING</Text>
          <DisplayText style={styles.greetingTitle}>Make your space work better for you.</DisplayText>
        </View>

        <TouchableOpacity onPress={() => router.push("/service/laundry" as never)} activeOpacity={0.9} style={styles.storyMoment}>
          <View style={styles.storyCopy}><Text style={styles.storyLabel}>LAUNDRY MADE SIMPLE</Text><Text style={styles.storyTitle}>More fresh clothes. More time for you.</Text><Text style={styles.storyAction}>See how it works <Ionicons name="arrow-forward" size={13} color={palette.blue} /></Text></View>
          <View style={styles.storyArt}><AnimatedServiceScene serviceId="laundry" height={136} /></View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/profile" as never)} activeOpacity={0.92} style={styles.loyaltyPress}>
          <LinearGradient colors={["#0038B6", "#0052FF", "#001452"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loyaltyCard}>
            <View style={styles.loyaltyGlowOne} />
            <View style={styles.loyaltyGlowTwo} />
            <View style={styles.loyaltyTop}>
              <View>
                <Text style={styles.loyaltyLabel}>ELITE PATRONAGE</Text>
                <Text style={styles.loyaltyTier}>Bronze Member</Text>
              </View>
              <View style={styles.discountBubble}><Text style={styles.discountValue}>5%</Text><Text style={styles.discountLabel}>OFF</Text></View>
            </View>
            <View style={styles.loyaltyBottom}>
              <View style={styles.progressCopy}><Text style={styles.progressLabel}>₵180 to Silver rewards</Text><View style={styles.progressTrack}><View style={styles.progressFill} /></View></View>
              <Ionicons name="arrow-forward-circle" size={26} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <SectionHeading eyebrow="SERVICES" title="Care, on your terms" action="See all" onAction={() => router.push("/services" as never)} />
        <View style={styles.quickGrid}>
          {quickServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.75}
              style={styles.quickCard}
              onPress={() => {
                haptic.light();
                if (service.id === "workers") router.push("/workers" as never);
                else router.push(`/service/${service.id}` as never);
              }}
            >
              <IconOrb icon={service.icon as keyof typeof Ionicons.glyphMap} color={service.accent} size={40} />
              <Text numberOfLines={2} style={styles.quickLabel}>{service.shortTitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeading eyebrow="YOUR ACTIVITY" title="Booking updates" action="Bookings" onAction={() => router.push("/bookings" as never)} />
        {activeBooking ? (
          <TouchableOpacity onPress={() => router.push(`/booking/${activeBooking.id}` as never)} activeOpacity={0.88} style={styles.activeBooking}>
            <View style={styles.activeBookingTop}>
              <IconOrb icon="calendar-outline" color={palette.blue} />
              <View style={styles.activeBookingCopy}><StatusPill label={activeBooking.status.replace("-", " ")} tone="blue" /><Text style={styles.activeTitle}>{activeBooking.serviceTitle}</Text><Text style={styles.activeMeta}>{activeBooking.scheduledFor}</Text></View>
              <Ionicons name="chevron-forward" size={20} color="#7A7E8D" />
            </View>
            <View style={styles.trackButton}><Ionicons name="navigate-outline" size={16} color={palette.blue} /><Text style={styles.trackText}>Track live</Text></View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyBooking}>
            <View style={styles.emptyIcon}><Ionicons name="calendar-clear-outline" size={22} color={palette.blue} /></View>
            <View style={styles.emptyCopy}><Text style={styles.emptyTitle}>Your care schedule is clear</Text><BodyText style={styles.emptyBody}>Book a service today and follow every step from pickup to completion.</BodyText></View>
            <TouchableOpacity onPress={() => router.push("/services" as never)} style={styles.emptyAction}><Ionicons name="add" size={21} color="#FFFFFF" /></TouchableOpacity>
          </View>
        )}

        <SectionHeading eyebrow="EXCLUSIVE VALUE" title="More room for your weekend" />
        <View style={styles.promoCard}>
          <View style={styles.promoContent}><StatusPill label="KUMASI FAVOURITE" tone="orange" /><DisplayText style={styles.promoTitle}>Your weekends are for living.</DisplayText><BodyText style={styles.promoBody}>Let our garment-care team collect, care for, and return the laundry on your schedule.</BodyText><TouchableOpacity onPress={() => router.push("/service/laundry" as never)} style={styles.promoLink}><Text style={styles.promoLinkText}>Explore garment care</Text><Ionicons name="arrow-forward" size={16} color={palette.blue} /></TouchableOpacity></View>
          <View style={styles.promoOrb}><Ionicons name="shirt-outline" size={42} color="#FFFFFF" /></View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: palette.canvas }, content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36, gap: 23 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, brandRow: { flexDirection: "row", alignItems: "center", gap: 8 }, brandCopy: { justifyContent: "center", paddingTop: 1 }, brandName: { color: palette.deep, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 14, letterSpacing: -0.35 }, brandSub: { color: palette.orange, fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 2.7, marginTop: 1 }, headerActions: { flexDirection: "row", alignItems: "center", gap: 10 }, bellButton: { width: 41, height: 41, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.border }, notificationDot: { position: "absolute", top: 9, right: 10, width: 7, height: 7, backgroundColor: "#D8362A", borderWidth: 1.5, borderColor: "#FFFFFF", borderRadius: 4 }, avatar: { width: 41, height: 41, borderRadius: 15, backgroundColor: "#DEEBFF", alignItems: "center", justifyContent: "center" }, avatarText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 12 },
  greeting: { gap: 4 }, eyebrow: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.3 }, greetingTitle: { maxWidth: 315, fontSize: 28, lineHeight: 35 },
  storyMoment: { minHeight: 151, borderRadius: 22, backgroundColor: "#EEF3FF", overflow: "hidden", flexDirection: "row", alignItems: "center", paddingLeft: 17 }, storyCopy: { flex: 1, zIndex: 2, gap: 7, paddingVertical: 15 }, storyLabel: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.05 }, storyTitle: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 17, lineHeight: 23, maxWidth: 175 }, storyAction: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 11, flexDirection: "row" }, storyArt: { width: 154, height: 151, marginRight: -5, justifyContent: "center" },
  loyaltyPress: { borderRadius: 24, overflow: "hidden", shadowColor: palette.blue, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, loyaltyCard: { minHeight: 162, borderRadius: 24, padding: 20, overflow: "hidden", justifyContent: "space-between" }, loyaltyGlowOne: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(204,215,255,0.16)", right: -48, top: -84 }, loyaltyGlowTwo: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.09)", left: 120, bottom: -70 }, loyaltyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, loyaltyLabel: { color: "#DDE1FF", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.35 }, loyaltyTier: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 21, marginTop: 5 }, discountBubble: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" }, discountValue: { color: "#FFFFFF", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 15 }, discountLabel: { color: "#DDE1FF", fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.8 }, loyaltyBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }, progressCopy: { flex: 1, gap: 8, paddingRight: 16 }, progressLabel: { color: "#DDE1FF", fontFamily: "Inter_500Medium", fontSize: 11 }, progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.23)", borderRadius: 99, overflow: "hidden" }, progressFill: { width: "57%", height: "100%", borderRadius: 99, backgroundColor: "#FFFFFF" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, quickCard: { width: "22.7%", minHeight: 104, borderRadius: 19, backgroundColor: "#FFFFFF", padding: 10, justifyContent: "space-between", borderWidth: 1, borderColor: "#EDF0F5" }, quickLabel: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 14 },
  activeBooking: { padding: 15, backgroundColor: "#FFFFFF", borderRadius: 20, gap: 14, borderWidth: 1, borderColor: palette.border }, activeBookingTop: { flexDirection: "row", alignItems: "center", gap: 11 }, activeBookingCopy: { flex: 1, gap: 4 }, activeTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14, marginTop: 2 }, activeMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12 }, trackButton: { height: 37, borderRadius: 11, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, trackText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 13 },
  emptyBooking: { minHeight: 104, padding: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12 }, emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }, emptyCopy: { flex: 1, gap: 3 }, emptyTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, emptyBody: { fontSize: 12, lineHeight: 17 }, emptyAction: { width: 35, height: 35, borderRadius: 12, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" },
  promoCard: { backgroundColor: "#FFFFFF", borderRadius: 23, padding: 18, overflow: "hidden", minHeight: 194, flexDirection: "row", borderWidth: 1, borderColor: palette.border }, promoContent: { flex: 1, justifyContent: "space-between", gap: 10, zIndex: 2 }, promoTitle: { fontSize: 19, lineHeight: 24, maxWidth: 190 }, promoBody: { fontSize: 12, lineHeight: 17, maxWidth: 215 }, promoLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 3 }, promoLinkText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 12 }, promoOrb: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: palette.orange, right: -40, bottom: -42, alignItems: "flex-start", justifyContent: "flex-start", paddingTop: 24, paddingLeft: 27 },
});
