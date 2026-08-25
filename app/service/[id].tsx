import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, IconOrb, PrimaryButton, StatusPill, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { getService } from "@/lib/chapman-data";

const serviceDetails: Record<string, { points: string[]; guidance: string[] }> = {
  laundry: { points: ["Flexible doorstep pickup", "Careful wash, dry, iron, and fold", "Express option for urgent garments"], guidance: ["Basics from ₵3", "Everyday items from ₵7", "Express adds ₵10 per item"] },
  cleaning: { points: ["Pre-service assessment", "Room-by-room cleaning checklist", "Residential, commercial, and institutional teams"], guidance: ["1 bedroom from ₵450", "3 bedrooms from ₵850", "Minimum charge ₵500"] },
  fumigation: { points: ["Pest-specific treatment plan", "Residential and commercial coverage", "Service guidance from a trained team"], guidance: ["Cockroaches from ₵250", "Bedbugs from ₵500", "Minimum charge ₵300"] },
  detailing: { points: ["Interior and exterior options", "Vehicle-appropriate detailing plan", "Careful finish checks before handover"], guidance: ["Sedan wash ₵45", "SUV wash ₵60", "Full detail from ₵180"] },
  fabric: { points: ["Fabric-sensitive cleaning", "Optional stain and odour treatment", "Sofa, carpet, and rug care"], guidance: ["Sofa minimum ₵150", "Carpet minimum ₵200", "Single-seater from ₵60"] },
  polytank: { points: ["Tank-size guidance", "Planned sanitization process", "A practical water-safety routine"], guidance: ["Small tank ₵150", "Medium tank ₵350", "Large tank ₵600"] },
  contract: { points: ["Monthly service planning", "Routine quality review", "Suitable for facilities of every size"], guidance: ["Small office from ₵600/mo", "Schools from ₵1,200/mo", "Clinics from ₵1,500/mo"] },
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const service = getService(id);
  const detail = serviceDetails[service.id] ?? serviceDetails.cleaning;
  const isLaundry = service.id === "laundry";

  const beginBooking = () => {
    if (isLaundry) router.push("/booking/laundry" as never);
    else router.push({ pathname: "/booking/request-quote" as never, params: { serviceId: service.id } });
  };

  return <AppScreen><View style={styles.page}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ScreenHeader title={service.shortTitle} /><LinearGradient colors={[`${service.accent}`, "#001452"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}><View style={styles.heroTop}><IconOrb icon={service.icon as keyof typeof Ionicons.glyphMap} color="#FFFFFF" size={54} /><StatusPill label={isLaundry ? "INSTANT BOOKING" : "ASSESSMENT-LED"} tone="gray" /></View><DisplayText style={styles.heroTitle}>{service.title}</DisplayText><Text style={styles.heroDescription}>{service.valueStatement}</Text><View style={styles.heroPrice}><Text style={styles.heroPriceLabel}>PRICE GUIDE</Text><Text style={styles.heroPriceValue}>{service.priceHint}</Text></View></LinearGradient><View style={styles.section}><Text style={styles.sectionEyebrow}>THE CHAPMAN APPROACH</Text>{detail.points.map((point) => <View key={point} style={styles.pointRow}><View style={styles.pointCheck}><Ionicons name="checkmark" size={13} color="#FFFFFF" /></View><Text style={styles.pointText}>{point}</Text></View>)}</View><View style={styles.priceCard}><View style={styles.priceCardHeader}><View><Text style={styles.sectionEyebrow}>TRANSPARENT GUIDANCE</Text><Text style={styles.priceCardTitle}>What to expect</Text></View><Ionicons name="receipt-outline" size={22} color={service.accent} /></View>{detail.guidance.map((item) => <View key={item} style={styles.priceLine}><Ionicons name="ellipse" size={6} color={service.accent} /><Text style={styles.priceLineText}>{item}</Text></View>)}</View><View style={styles.assurance}><Ionicons name="shield-checkmark-outline" size={20} color={palette.blue} /><BodyText style={styles.assuranceText}>{isLaundry ? "Your selection is priced item by item before you confirm." : "Your request is reviewed before a final quote is shared — no surprise service scope."}</BodyText></View></ScrollView><View style={styles.bottomBar}><PrimaryButton label={service.actionLabel} icon="arrow-forward" onPress={beginBooking} /></View></View></AppScreen>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.canvas }, content: { padding: 20, paddingTop: 12, paddingBottom: 110, gap: 17 }, hero: { borderRadius: 25, padding: 20, minHeight: 244, gap: 13, overflow: "hidden" }, heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, heroTitle: { color: "#FFFFFF", fontSize: 27, lineHeight: 34, maxWidth: 280 }, heroDescription: { color: "#DDE1FF", fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, maxWidth: 295 }, heroPrice: { marginTop: "auto" }, heroPriceLabel: { color: "#BFD0FF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15 }, heroPriceValue: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14, marginTop: 3 }, section: { backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: palette.border, padding: 16, gap: 13 }, sectionEyebrow: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15 }, pointRow: { flexDirection: "row", alignItems: "center", gap: 10 }, pointCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, pointText: { flex: 1, color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 }, priceCard: { borderRadius: 20, backgroundColor: "#FFF9F5", padding: 16, gap: 10, borderWidth: 1, borderColor: "#FFE7D7" }, priceCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }, priceCardTitle: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, marginTop: 3 }, priceLine: { flexDirection: "row", alignItems: "center", gap: 8 }, priceLineText: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 12 }, assurance: { padding: 14, backgroundColor: "#EEF2FF", borderRadius: 16, flexDirection: "row", gap: 10, alignItems: "flex-start" }, assuranceText: { flex: 1, fontSize: 12, lineHeight: 18 }, bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, backgroundColor: "rgba(248,249,250,0.97)", borderTopWidth: 1, borderTopColor: palette.border } });
