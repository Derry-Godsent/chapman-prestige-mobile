import { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { getService } from "@/lib/chapman-data";
import { useBookingStore } from "@/lib/booking-store";
import { calculateAreaSquareMetres, carpetEstimateLabel, quoteGuidance } from "@/lib/quote-guidance";
const defaultPlaces = ["My home", "My workplace", "Another address"];
const timingOptions = ["Morning", "Afternoon", "I am flexible"];
const concernOptions: Record<string, string[]> = {
  cleaning: ["Move-in / Move-out clean", "Post-renovation cleanup", "Pet odour removal", "Mold / mildew concern", "Hoarding cleanup", "Regular deep clean"],
  fumigation: ["Recurring infestation", "Food preparation area", "Children or pets on site", "Previous treatment failed"],
  detailing: ["Heavy stain removal", "Pet hair interior", "Smoke odour", "Leather restoration"],
  fabric: ["Pet stains", "Smoke odour", "Water damage", "Heavy traffic areas"],
  polytank: ["Algae growth", "Bad taste or smell", "Sediment buildup", "Never cleaned before"],
  contract: ["Current cleaner underperforming", "Urgent start needed", "Specialised equipment required", "Security clearance needed"],
};
// Dynamic space breakdown configuration per property type
type SpaceField = { label: string; key: string; options: string[] };
type SpaceConfig = { fields: SpaceField[]; areasLabel: string; areas: string[] };
const spaceBreakdowns: Record<string, SpaceConfig> = {
  "Home": {
    fields: [
      { label: "How many bedrooms?", key: "bedrooms", options: ["1", "2", "3", "4", "5+"] },
      { label: "How many kitchens?", key: "kitchens", options: ["1", "2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3", "4+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Compound", "Staircase", "Corridor", "Living room", "Dining room", "Balcony", "Garage", "Storage room"],
  },
  "Office": {
    fields: [
      { label: "How many offices/rooms?", key: "offices", options: ["1-3", "4-6", "7-10", "10+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Reception", "Meeting rooms", "Kitchen/Pantry", "Corridor", "Staircase", "Parking area", "Server room"],
  },
  "Shop": {
    fields: [
      { label: "How many floors?", key: "floors", options: ["1", "2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Display area", "Storage/Back room", "Fitting rooms", "Counter area"],
  },
  "School / church": {
    fields: [
      { label: "How many classrooms/halls?", key: "classrooms", options: ["1-3", "4-6", "7-10", "10+"] },
      { label: "How many offices?", key: "offices", options: ["1", "2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3", "4+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Assembly hall", "Library", "Laboratory", "Compound", "Corridor", "Staircase", "Canteen", "Staff room"],
  },
  "Hospitality": {
    fields: [
      { label: "How many rooms/suites?", key: "rooms", options: ["1-5", "6-10", "11-20", "20+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1-3", "4-6", "7+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Lobby/Reception", "Restaurant", "Bar/Lounge", "Pool area", "Gym", "Conference room", "Corridor", "Staircase", "Laundry room", "Parking"],
  },
  "Warehouse / Factory": {
    fields: [
      { label: "How large is the floor?", key: "floorSize", options: ["Small <200m\u00B2", "Medium 200-500m\u00B2", "Large 500m\u00B2+"] },
      { label: "How many offices?", key: "offices", options: ["None", "1-2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Loading bay", "Storage area", "Production floor", "Staff canteen", "Parking"],
  },
  "Clinic / Hospital": {
    fields: [
      { label: "How many wards/rooms?", key: "wards", options: ["1-3", "4-6", "7-10", "10+"] },
      { label: "How many consulting rooms?", key: "consultingRooms", options: ["1", "2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Reception/Waiting area", "Pharmacy", "Laboratory", "Corridor", "Staircase", "Morgue", "Laundry room"],
  },
  "Restaurant / Bar": {
    fields: [
      { label: "How many dining areas?", key: "diningAreas", options: ["1", "2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Kitchen", "Bar area", "Outdoor seating", "Storage", "Cold room", "Staff area"],
  },
  "Salon / Spa": {
    fields: [
      { label: "How many treatment rooms?", key: "treatmentRooms", options: ["1", "2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Reception", "Hair washing area", "Pedicure area", "Storage", "Staff area"],
  },
  "Gym / Studio": {
    fields: [
      { label: "How many workout areas?", key: "workoutAreas", options: ["1", "2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Changing rooms", "Shower area", "Reception", "Sauna/Steam room", "Storage"],
  },
  "Event Space": {
    fields: [
      { label: "How many halls/rooms?", key: "halls", options: ["1", "2", "3+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: ["Stage area", "Kitchen/Catering", "Outdoor area", "VIP room", "Parking", "Storage"],
  },
  "Apartment Block": {
    fields: [
      { label: "How many floors?", key: "floors", options: ["1-3", "4-6", "7-10", "10+"] },
      { label: "How many units?", key: "units", options: ["1-5", "6-10", "11-20", "20+"] },
    ],
    areasLabel: "Common areas? (select all that apply)",
    areas: ["Corridor", "Staircase", "Lift/Elevator", "Lobby", "Parking", "Compound", "Rooftop", "Laundry room"],
  },
  "Construction Site": {
    fields: [
      { label: "How many floors?", key: "floors", options: ["1", "2", "3+"] },
      { label: "Approximate size?", key: "size", options: ["Small <100m\u00B2", "Medium 100-300m\u00B2", "Large 300m\u00B2+"] },
    ],
    areasLabel: "Areas to clean? (select all that apply)",
    areas: ["Interior walls", "Windows", "Floors", "Fixtures", "Debris removal", "Exterior"],
  },
  "Other": {
    fields: [
      { label: "How many rooms/areas?", key: "rooms", options: ["1-3", "4-6", "7-10", "10+"] },
      { label: "How many washrooms?", key: "washrooms", options: ["1", "2", "3+"] },
    ],
    areasLabel: "Other areas? (select all that apply)",
    areas: [],
  },
};
const serviceChoices: Record<string, { propertyLabel: string; propertyHint: string; properties: string[]; primaryLabel: string; primaryHint: string; primary: string[]; secondaryLabel?: string; secondary?: string[]; tertiaryLabel?: string; tertiary?: string[]; multi?: boolean }> = {
  cleaning: { 
    propertyLabel: "What kind of place needs cleaning?", 
    propertyHint: "This helps us prepare an appropriate assessment.", 
    properties: ["Home", "Office", "Shop", "School / church", "Hospitality", "Warehouse / Factory", "Clinic / Hospital", "Restaurant / Bar", "Salon / Spa", "Gym / Studio", "Event Space", "Apartment Block", "Construction Site", "Other"], 
    primaryLabel: "How large is the space?", 
    primaryHint: "This gives you a helpful starting range before assessment.", 
    primary: ["1 bedroom", "2 bedrooms", "3 bedrooms", "4 bedrooms", "5+ bedrooms"] 
  },
  fumigation: { propertyLabel: "Where will we treat the pest problem?", propertyHint: "Choose where the team should come. We will confirm the address before service.", properties: ["Home", "Office", "Shop", "School / church", "Hospitality", "Warehouse / Factory", "Clinic / Hospital", "Restaurant / Bar", "Another address"], primaryLabel: "What needs attention?", primaryHint: "Select one, several, or all common pests. The team confirms the safest treatment.", primary: ["Cockroaches", "Rodents", "Bedbugs", "Termites"], multi: true },
  detailing: { propertyLabel: "Where will your car be detailed?", propertyHint: "Choose the service location that is easiest for you.", properties: ["At my home", "At my office", "At another address"], primaryLabel: "What do you drive?", primaryHint: "We will confirm the final condition and package before service.", primary: ["Sedan", "SUV", "Pickup / 4x4", "Van / bus"], secondaryLabel: "What kind of care do you want?", secondary: ["Basic wash", "Full detail", "Ceramic coating"] },
  fabric: { propertyLabel: "Where will we clean your sofa or carpet?", propertyHint: "Choose where the care team should come.", properties: defaultPlaces, primaryLabel: "What needs care?", primaryHint: "For a carpet, use the measurement guide for a clearer estimated range.", primary: ["Carpet", "Sofa", "Carpet and sofa"] },
  polytank: { propertyLabel: "Where is the polytank located?", propertyHint: "Choose the service location and we will confirm access before the visit.", properties: defaultPlaces, primaryLabel: "What is your tank size?", primaryHint: "Choose the closest capacity.", primary: ["Small (200L\u2013500L)", "Medium (1kL\u20132.5kL)", "Large (5000L+)"] },
  contract: { propertyLabel: "What facility needs outsourced cleaners?", propertyHint: "Choose the closest option so we can plan the right staffing approach.", properties: ["Bank", "Hotel", "Guest house", "Airbnb / serviced apartment", "Hostel", "Office", "School", "Church", "Clinic / hospital", "Shop / restaurant", "Warehouse"], primaryLabel: "How many cleaners do you need?", primaryHint: "You can adjust the exact schedule and scope after the assessment.", primary: ["1 cleaner", "2 cleaners", "3 cleaners", "4 cleaners", "5+ cleaners"], secondaryLabel: "Team preference, where available", secondary: ["Women cleaners", "Men cleaners", "No preference"], tertiaryLabel: "Experience preference", tertiary: ["Early-career team", "Experienced team", "No preference"] },
};
function formatDate(date: Date) {
  return date.toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
export default function QuoteRequestScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const { serviceId, measureLength, measureWidth, cameraGuided } = useLocalSearchParams<{ serviceId: string; measureLength?: string; measureWidth?: string; cameraGuided?: string }>();
  const service = getService(serviceId);
  const choice = serviceChoices[service.id] ?? serviceChoices.cleaning;
  const { createQuoteRequest } = useBookingStore();
  const [property, setProperty] = useState(choice.properties[0]);
  const [timing, setTiming] = useState("Morning");
  const [primaryValue, setPrimaryValue] = useState(service.id === "fabric" && measureLength && measureWidth ? "Carpet" : choice.primary[0]);
  const [selectedPrimary, setSelectedPrimary] = useState<string[]>([]);
  const [secondaryValue, setSecondaryValue] = useState(choice.secondary?.[0] ?? "");
  const [tertiaryValue, setTertiaryValue] = useState(choice.tertiary?.[0] ?? "");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [requestedDate, setRequestedDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Dynamic space breakdown state
  const [spaceValues, setSpaceValues] = useState<Record<string, string>>({});
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [otherDescription, setOtherDescription] = useState("");
  const estimatedAreaM2 = useMemo(() => measureLength && measureWidth ? calculateAreaSquareMetres(measureLength, measureWidth) : null, [measureLength, measureWidth]);
  const primarySelection = choice.multi ? selectedPrimary : [primaryValue];
  const estimateLabel = service.id === "fabric" && estimatedAreaM2 ? carpetEstimateLabel(estimatedAreaM2) : quoteGuidance(service.id, primarySelection.join(", ") || primaryValue, secondaryValue);
  const isAllSelected = choice.multi && selectedPrimary.length === choice.primary.length;
  const concerns = concernOptions[service.id] ?? [];
  // Get the dynamic space config for the selected property type (cleaning only)
  const spaceConfig = service.id === "cleaning" ? spaceBreakdowns[property] : null;
  // Reset space breakdown when property type changes
  const handlePropertyChange = (newProperty: string) => {
    setProperty(newProperty);
    setSpaceValues({});
    setSelectedAreas([]);
    setOtherDescription("");
  };
  const togglePrimary = (option: string) => {
    if (!choice.multi) { setPrimaryValue(option); return; }
    setSelectedPrimary((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option]);
  };
  const toggleAllPests = () => setSelectedPrimary((current) => current.length === choice.primary.length ? [] : choice.primary);
  const toggleConcern = (concern: string) => {
    setSelectedConcerns((current) => current.includes(concern) ? current.filter((c) => c !== concern) : [...current, concern]);
  };
  const toggleArea = (area: string) => {
    setSelectedAreas((current) => current.includes(area) ? current.filter((a) => a !== area) : [...current, area]);
  };
  const setSpaceValue = (key: string, value: string) => {
    setSpaceValues((current) => ({ ...current, [key]: value }));
  };
  // Build the space breakdown object for saving
  const spaceBreakdown = spaceConfig ? {
    ...spaceValues,
    otherAreas: selectedAreas.length > 0 ? selectedAreas : undefined,
    ...(property === "Other" && otherDescription.trim() ? { description: otherDescription.trim() } : {}),
  } : undefined;
  const submit = () => {
    if (submitting) return;
    setSubmitting(true);
    void (async () => {
    const request = await createQuoteRequest(service, property, `${formatDate(requestedDate)} \u00B7 ${timing}`, { 
      primaryLabel: choice.primaryLabel, 
      primaryValue: primarySelection.join(", ") || undefined, 
      secondaryLabel: choice.secondaryLabel, 
      secondaryValue: secondaryValue || undefined, 
      estimatedAreaM2: estimatedAreaM2 ?? undefined, 
      cameraGuided: cameraGuided === "1", 
      estimateLabel, 
      serviceLocation: property, 
      selectedOptions: primarySelection, 
      requestedDate: requestedDate.toISOString(), 
      cleanerCount: service.id === "contract" ? primaryValue : undefined, 
      cleanerGenderPreference: service.id === "contract" ? secondaryValue : undefined, 
      cleanerExperiencePreference: service.id === "contract" ? tertiaryValue : undefined, 
      concerns: selectedConcerns.length > 0 ? selectedConcerns : undefined,
      spaceBreakdown: spaceBreakdown as any,
    });
    // The saved record is now in hand, so the tracking page opens on an id that
    // really exists.
    setSubmitted(true);
    setTimeout(() => router.replace(`/booking/${request.id}` as never), 650);
    })();
  };
  if (submitted) return <AppScreen><View style={styles.success}><View style={styles.successIcon}><Ionicons name="checkmark" size={43} color="#FFFFFF" /></View><DisplayText style={styles.successTitle}>Request received.</DisplayText><BodyText style={styles.successBody}>We will review your preferred date and send a service confirmation for you to accept or reject.</BodyText></View></AppScreen>;
  return <AppScreen><View style={styles.page}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ScreenHeader title="Request assessment" subtitle={service.shortTitle} /><View style={styles.hero}><Ionicons name={service.icon as keyof typeof Ionicons.glyphMap} size={30} color="#FFFFFF" /><View><Text style={styles.heroLabel}>TAILORED TO YOUR SERVICE</Text><DisplayText style={styles.heroTitle}>{service.title}</DisplayText></View></View>
  {/* Step 1: Property Type */}
  <View style={styles.questionBlock}><Text style={styles.question}>{choice.propertyLabel}</Text><BodyText style={styles.questionHint}>{choice.propertyHint}</BodyText><View style={styles.chipGrid}>{choice.properties.map((option) => <TouchableOpacity key={option} onPress={() => handlePropertyChange(option)} style={[styles.chip, property === option && styles.chipSelected]}><Text style={[styles.chipText, property === option && styles.chipTextSelected]}>{option}</Text></TouchableOpacity>)}</View></View>
  {/* Step 2: Dynamic Space Breakdown (Cleaning only) OR Static Primary Selection (other services) */}
  {spaceConfig ? (
    <View style={styles.questionBlock}>
      <Text style={styles.question}>Tell us about your space</Text>
      <BodyText style={styles.questionHint}>This helps Chapman prepare the right team and equipment for your assessment.</BodyText>
      {property === "Other" ? (
        <View style={styles.otherInputCard}>
          <Text style={styles.inputLabel}>Describe your space</Text>
          <TextInput value={otherDescription} onChangeText={setOtherDescription} placeholder="e.g., A 2-floor commercial building with a rooftop terrace" placeholderTextColor={palette.placeholder} style={styles.textInput} multiline numberOfLines={3} textAlignVertical="top" />
        </View>
      ) : null}
      {spaceConfig.fields.map((field) => (
        <View key={field.key} style={styles.spaceFieldBlock}>
          <Text style={styles.spaceFieldLabel}>{field.label}</Text>
          <View style={styles.chipGrid}>
            {field.options.map((option) => (
              <TouchableOpacity key={option} onPress={() => setSpaceValue(field.key, option)} style={[styles.chip, spaceValues[field.key] === option && styles.chipSelected]}>
                <Text style={[styles.chipText, spaceValues[field.key] === option && styles.chipTextSelected]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      {spaceConfig.areas.length > 0 ? (
        <View style={styles.spaceFieldBlock}>
          <Text style={styles.spaceFieldLabel}>{spaceConfig.areasLabel}</Text>
          <View style={styles.chipGrid}>
            {spaceConfig.areas.map((area) => (
              <TouchableOpacity key={area} onPress={() => toggleArea(area)} style={[styles.chip, selectedAreas.includes(area) && styles.chipSelected]}>
                <Text style={[styles.chipText, selectedAreas.includes(area) && styles.chipTextSelected]}>{area}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  ) : (
    <>
      <View style={styles.questionBlock}><Text style={styles.question}>{choice.primaryLabel}</Text><BodyText style={styles.questionHint}>{choice.primaryHint}</BodyText>{choice.multi ? <TouchableOpacity onPress={toggleAllPests} style={[styles.allChoice, isAllSelected && styles.allChoiceSelected]}><Ionicons name={isAllSelected ? "checkbox" : "square-outline"} size={18} color={isAllSelected ? "#FFFFFF" : palette.blue} /><Text style={[styles.allChoiceText, isAllSelected && styles.allChoiceTextSelected]}>All common pests</Text></TouchableOpacity> : null}<View style={styles.chipGrid}>{choice.primary.map((option) => { const selected = choice.multi ? selectedPrimary.includes(option) : primaryValue === option; return <TouchableOpacity key={option} onPress={() => togglePrimary(option)} style={[styles.chip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text></TouchableOpacity>; })}</View></View>
      {choice.secondary ? <View style={styles.questionBlock}><Text style={styles.question}>{choice.secondaryLabel}</Text><View style={styles.chipGrid}>{choice.secondary.map((option) => <TouchableOpacity key={option} onPress={() => setSecondaryValue(option)} style={[styles.chip, secondaryValue === option && styles.chipSelected]}><Text style={[styles.chipText, secondaryValue === option && styles.chipTextSelected]}>{option}</Text></TouchableOpacity>)}</View></View> : null}
      {choice.tertiary ? <View style={styles.questionBlock}><Text style={styles.question}>{choice.tertiaryLabel}</Text><View style={styles.chipGrid}>{choice.tertiary.map((option) => <TouchableOpacity key={option} onPress={() => setTertiaryValue(option)} style={[styles.chip, tertiaryValue === option && styles.chipSelected]}><Text style={[styles.chipText, tertiaryValue === option && styles.chipTextSelected]}>{option}</Text></TouchableOpacity>)}</View></View> : null}
    </>
  )}
  {/* Concerns */}
  {concerns.length > 0 ? <View style={styles.questionBlock}><Text style={styles.question}>Any specific concerns?</Text><BodyText style={styles.questionHint}>Select all that apply. This helps the team prepare the right approach.</BodyText><View style={styles.chipGrid}>{concerns.map((option) => <TouchableOpacity key={option} onPress={() => toggleConcern(option)} style={[styles.chip, selectedConcerns.includes(option) && styles.chipSelected]}><Text style={[styles.chipText, selectedConcerns.includes(option) && styles.chipTextSelected]}>{option}</Text></TouchableOpacity>)}</View></View> : null}
  {/* Measure Card */}
  {service.id !== "laundry" && service.id !== "workers" ? <TouchableOpacity activeOpacity={0.82} onPress={() => router.push(`/measure?serviceId=${service.id}` as never)} style={styles.measureCard}><View style={styles.measureIcon}><Ionicons name="scan-outline" size={22} color={palette.accent} /></View><View style={styles.measureCopy}><Text style={styles.measureTitle}>{estimatedAreaM2 ? `${estimatedAreaM2} m\u00B2 saved for this quote` : "Measure a room or item"}</Text><Text style={styles.measureText}>{estimatedAreaM2 ? `${cameraGuided === "1" ? "Camera-guided" : "Manual"} measurement \u00B7 ${estimateLabel}` : "Use your camera for a reference photo, then enter length and width."}</Text></View><Ionicons name="chevron-forward" size={18} color="#7A7E8D" /></TouchableOpacity> : null}
  {/* Date Picker */}
  <View style={styles.dateCard}><View style={styles.dateCopy}><Text style={styles.dateLabel}>PREFERRED SERVICE DATE</Text><Text style={styles.dateTitle}>{formatDate(requestedDate)}</Text><Text style={styles.dateText}>Chapman will confirm a time. You can accept or reject the proposed appointment.</Text></View><TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateAction}><Ionicons name="calendar-outline" size={20} color={palette.accent} /></TouchableOpacity></View>
  {showDatePicker ? <DateTimePicker value={requestedDate} minimumDate={new Date()} mode="date" display={Platform.OS === "ios" ? "inline" : "default"} onChange={(_, date) => { if (Platform.OS !== "ios") setShowDatePicker(false); if (date) setRequestedDate(date); }} /> : null}
  {/* Time Preference */}
  <View style={styles.questionBlock}><Text style={styles.question}>What time works best?</Text><BodyText style={styles.questionHint}>The team confirms the final time after checking availability.</BodyText><View style={styles.chipGrid}>{timingOptions.map((option) => <TouchableOpacity key={option} onPress={() => setTiming(option)} style={[styles.chip, timing === option && styles.chipSelected]}><Text style={[styles.chipText, timing === option && styles.chipTextSelected]}>{option}</Text></TouchableOpacity>)}</View></View>
  {/* Estimate */}
  <View style={styles.estimateCard}><View><Text style={styles.label}>ESTIMATED STARTING RANGE</Text><Text style={styles.estimateValue}>{estimateLabel}</Text></View><Ionicons name="information-circle-outline" size={20} color={palette.accent} /></View>
  {/* Disclaimer */}
  <View style={styles.note}><Ionicons name="information-circle-outline" size={20} color={palette.accent} /><BodyText style={styles.noteText}>This request does not agree to a final price. Chapman confirms scope, appointment, price, and payment before service begins.</BodyText></View>
  </ScrollView><View style={styles.bottom}><PrimaryButton label={submitting ? "Sending your request\u2026" : "Request assessment"} icon="arrow-forward" onPress={submit} disabled={submitting} /></View></View></AppScreen>;
}
const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({ 
  page: { flex: 1, backgroundColor: palette.canvas }, 
  content: { padding: 20, paddingTop: 12, paddingBottom: 106, gap: 21 }, 
  hero: { minHeight: 112, padding: 17, borderRadius: 21, backgroundColor: palette.blue, flexDirection: "row", gap: 13, alignItems: "center" }, 
  heroLabel: { color: "#BFCBFF", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.1 }, 
  heroTitle: { color: "#FFFFFF", fontSize: 20, lineHeight: 26, marginTop: 4, maxWidth: 250 }, 
  questionBlock: { gap: 7 }, 
  question: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, lineHeight: 24 }, 
  questionHint: { fontSize: 12 }, 
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }, 
  chip: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }, 
  chipSelected: { backgroundColor: palette.blue, borderColor: palette.blue }, 
  chipText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 12 }, 
  chipTextSelected: { color: "#FFFFFF" }, 
  allChoice: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: palette.chipBlue, borderWidth: 1, borderColor: "#C6D2FF", marginTop: 2 }, 
  allChoiceSelected: { backgroundColor: palette.blue, borderColor: palette.blue }, 
  allChoiceText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 12 }, 
  allChoiceTextSelected: { color: "#FFFFFF" }, 
  spaceFieldBlock: { gap: 6, paddingTop: 4 }, 
  spaceFieldLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, 
  otherInputCard: { padding: 14, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, gap: 6 }, 
  inputLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 12 }, 
  textInput: { minHeight: 80, borderRadius: 12, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 12, paddingVertical: 10, color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 13, backgroundColor: "#FAFAFA", lineHeight: 18 }, 
  measureCard: { padding: 14, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", gap: 10 }, 
  measureIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.chipBlue, alignItems: "center", justifyContent: "center" }, 
  measureCopy: { flex: 1, gap: 2 }, 
  measureTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, 
  measureText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 }, 
  dateCard: { padding: 15, borderRadius: 19, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", gap: 12 }, 
  dateCopy: { flex: 1, gap: 3 }, 
  dateLabel: { color: palette.eyebrow, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 }, 
  dateTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15 }, 
  dateText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 }, 
  dateAction: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.chipBlue, alignItems: "center", justifyContent: "center" }, 
  estimateCard: { padding: 14, borderRadius: 17, backgroundColor: palette.chipBlue, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, 
  label: { color: palette.eyebrow, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.05 }, 
  estimateValue: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, marginTop: 4 }, 
  note: { padding: 14, backgroundColor: palette.chipBlue, borderRadius: 17, flexDirection: "row", gap: 9, alignItems: "flex-start" }, 
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 }, 
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 12, paddingBottom: 18, backgroundColor: "rgba(248,249,250,0.98)", borderTopWidth: 1, borderTopColor: palette.border }, 
  success: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.canvas, padding: 32, gap: 13 }, 
  successIcon: { width: 83, height: 83, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: palette.green }, 
  successTitle: { fontSize: 26, textAlign: "center" }, 
  successBody: { textAlign: "center", maxWidth: 285 } 
});