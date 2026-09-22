import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AppScreen } from "@/components/app-screen";
import { DisplayText, PrimaryButton, StatusPill, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { formatGhs } from "@/lib/chapman-data";
import { notify } from "@/lib/notify";
import { useBookingStore } from "@/lib/booking-store";
import { getCustomerSession } from "@/lib/customer-auth";
import { loadCustomerAccount } from "@/hooks/use-customer-account";
import { CustomerSignInRequiredError, submitMobileLaundryRequest } from "@/lib/mobile-requests";
import { PICKUP_WINDOWS, PickupLocation, PickupWindow } from "@/lib/mobile-request-contract";
import { haptic } from "@/lib/haptics";

const payments = [
  { id: "momo", title: "Mobile Money", detail: "MTN, Telecel, or AT", icon: "phone-portrait-outline" },
  { id: "card", title: "Card", detail: "Visa or Mastercard", icon: "card-outline" },
  { id: "cash", title: "Cash", detail: "Pay when we arrive", icon: "cash-outline" },
] as const;

const KUMASI_AREAS = [
  "Adum", "Ahodwo", "Asokwa", "Bantama", "Danyame", "Nta", "Santasi", "Suame", 
  "Tech Junction", "KNUST", "Ridge", "Roman Ridge", "Airport Residential", 
  "Kwadaso", "Ohwimase", "Hill Top", "Abrepo Junction", "Ayeduase", "Patasi", 
  "Oduom", "Anloga Junction", "Maxmart", "Other Kumasi area"
];

function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value: string): string {
  if (!value) return "Select a date";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" });
}

export default function CheckoutScreen() {
  const { cart, cartCount, expressFee, express, createLaundryBooking, clearCart } = useBookingStore();
  
  const [payment, setPayment] = useState<string | null>(null);
  const [requestedFor, setRequestedFor] = useState(() => formatDateForDB(new Date()));
  const [pickupArea, setPickupArea] = useState("Ahodwo");
  const [outsideKumasiTown, setOutsideKumasiTown] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupWindow, setPickupWindow] = useState<PickupWindow>(PICKUP_WINDOWS[0]);
  const [pickupLocation, setPickupLocation] = useState<PickupLocation | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [customerNote, setCustomerNote] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");

  const pickupFee = cartCount ? 20 : 0;
  const calculatedSubtotal = cart.reduce((sum, line) => sum + (Number(line.item.price_wash || 0) * line.quantity), 0);
  const total = calculatedSubtotal + expressFee + pickupFee;

  const filteredAreas = useMemo(() => {
    return KUMASI_AREAS.filter(area => area.toLowerCase().includes(areaSearch.toLowerCase()));
  }, [areaSearch]);

  useEffect(() => {
    void getCustomerSession()
      .then((session) => setIsSignedIn(Boolean(session)))
      .catch(() => setIsSignedIn(false))
      .finally(() => setCheckingSession(false));
  }, []);

  const signInToSend = () => router.push("/auth/phone" as never);

  const sharePickupLocation = async () => {
    setError(null);
    setLocationBusy(true);
    try {
      if (!await Location.hasServicesEnabledAsync()) {
        notify("Location Services Off", "Please turn on GPS in your phone settings.");
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        notify("Permission Denied", "Location permission is required to share your exact pickup point.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setPickupLocation({ 
        latitude: position.coords.latitude, 
        longitude: position.coords.longitude, 
        accuracyMeters: position.coords.accuracy 
      });
    } catch {
      setError("Could not fetch location. Please enter your address manually.");
    } finally {
      setLocationBusy(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (selectedDate.getDay() === 0) {
        notify("Closed on Sundays", "Chapman does not operate on Sundays. Please select another day.");
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        notify("Invalid Date", "Please select today or a future date.");
        return;
      }
      setRequestedFor(formatDateForDB(selectedDate));
    }
  };

  const handleBottomButtonPress = () => {
    if (!isSignedIn) {
      signInToSend();
      return;
    }
    if (pickupAddress.trim().length < 2) {
      setError("Please add the house, street, or landmark for pickup.");
      return;
    }
    if (!payment) {
      setError("Please select how you would like to pay.");
      return;
    }
    
    confirmOrder();
  };

  const confirmOrder = async () => {
    setError(null);
    setBusy(true);
    try {
      const account = await loadCustomerAccount();
      if (!account?.profile_completed_at) throw new Error("Please finish your profile before sending this Laundry request.");

      const finalArea = pickupArea === "Outside Kumasi" ? `Outside Kumasi: ${outsideKumasiTown}` : pickupArea;

      const request = await submitMobileLaundryRequest({
        requestedFor,
        pickupArea: finalArea,
        pickupAddress,
        pickupWindow,
        items: cart,
        express,
        customerNote,
        pickupLocation,
        paymentMethod: payment as string, // FIX: Cast to string to satisfy TypeScript
      });
      const booking = createLaundryBooking(request);
      haptic.success();
      clearCart();
      router.replace(`/booking/${booking.id}` as never);
    } catch (cause) {
      if (cause instanceof CustomerSignInRequiredError) {
        setIsSignedIn(false);
        setError("Please sign in before sending this Laundry request.");
      } else {
        setError(cause instanceof Error ? cause.message : "Chapman could not receive this request. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Review booking" />
          
          <View style={styles.progress}>
            <View style={styles.progressStepDone}><Ionicons name="checkmark" size={12} color="#FFFFFF" /></View>
            <View style={styles.progressLine} />
            <View style={styles.progressStepActive}><Text style={styles.progressNumber}>2</Text></View>
            <View style={styles.progressLineMuted} />
            <View style={styles.progressStepMuted}><Text style={styles.progressMuted}>3</Text></View>
            <Text style={styles.progressText}>Items · Request details · Chapman confirms</Text>
          </View>

          <View style={styles.requestCard}>
            <View style={styles.requestHeading}>
              <View style={styles.requestIcon}><Ionicons name="calendar-outline" size={20} color={palette.blue} /></View>
              <View style={styles.requestCopy}>
                <Text style={styles.label}>PICKUP DETAILS</Text>
                <Text style={styles.requestTitle}>Tell us what works for you</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Preferred pickup date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
              <Ionicons name="calendar" size={18} color={palette.blue} />
              <Text style={styles.datePickerText}>{formatDateForDisplay(requestedFor)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(requestedFor)}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            <Text style={styles.fieldLabel}>Pickup area</Text>
            <TouchableOpacity onPress={() => setShowAreaModal(true)} style={styles.datePickerButton}>
              <Ionicons name="location" size={18} color={palette.blue} />
              <Text style={styles.datePickerText}>{pickupArea === "Outside Kumasi" ? `Outside Kumasi: ${outsideKumasiTown || 'Select town'}` : pickupArea}</Text>
              <Ionicons name="chevron-down" size={18} color={palette.muted} />
            </TouchableOpacity>

            {pickupArea === "Outside Kumasi" && (
              <TextInput 
                value={outsideKumasiTown} 
                onChangeText={setOutsideKumasiTown} 
                placeholder="Enter town name" 
                placeholderTextColor="#9AA1AD" 
                style={styles.compactInput} 
              />
            )}

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Text style={styles.fieldLabel}>House, street, or landmark <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity onPress={() => notify("What to enter", "Enter the shortest identifier for your location. This can be a house number (e.g., '14'), a building name (e.g., 'Accra Mall'), or a short landmark (e.g., 'BP'). Minimum 2 characters.")}>
                <Ionicons name="information-circle-outline" size={16} color={palette.blue} />
              </TouchableOpacity>
            </View>
            <TextInput 
              value={pickupAddress} 
              onChangeText={setPickupAddress} 
              placeholder="e.g. House 14, near the Danyame roundabout" 
              placeholderTextColor="#9AA1AD" 
              style={styles.input} 
              maxLength={300} 
            />

            <Text style={styles.fieldLabel}>Share your exact pickup point <Text style={styles.optional}>(Optional)</Text></Text>
            <View style={[styles.locationShareCard, pickupLocation && styles.locationShareCardReady]}>
              {pickupLocation ? (
                <View style={styles.locationSuccess}>
                  <View style={styles.locationSuccessIcon}><Ionicons name="checkmark-circle" size={24} color={palette.green} /></View>
                  <View style={styles.locationSuccessText}>
                    <Text style={styles.locationSuccessTitle}>Location Shared Successfully</Text>
                    <Text style={styles.locationSuccessCoords}>
                      {pickupLocation.latitude.toFixed(5)}, {pickupLocation.longitude.toFixed(5)}
                    </Text>
                    <Text style={styles.locationSuccessMeta}>Accuracy: ~{Math.round(pickupLocation.accuracyMeters ?? 0)}m</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPickupLocation(null)} style={styles.locationRemove}>
                    <Ionicons name="close-circle" size={24} color={palette.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={sharePickupLocation} disabled={locationBusy} style={styles.locationShareAction}>
                  <Ionicons name="location" size={20} color={palette.blue} />
                  <Text style={styles.locationShareActionText}>{locationBusy ? "Finding location..." : "Share GPS Location"}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.fieldLabel}>Preferred pickup window</Text>
            <View style={styles.windowGrid}>
              {PICKUP_WINDOWS.map((window) => (
                <TouchableOpacity 
                  key={window} 
                  onPress={() => { haptic.light(); setPickupWindow(window); }} 
                  activeOpacity={0.8} 
                  style={[styles.window, pickupWindow === window && styles.windowSelected]}
                >
                  <Text style={[styles.windowText, pickupWindow === window && styles.optionTextSelected]}>{window}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Note for Chapman <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput 
              value={customerNote} 
              onChangeText={setCustomerNote} 
              placeholder="Gate instructions, collection preference, etc." 
              placeholderTextColor="#9AA1AD" 
              style={[styles.input, styles.noteInput]} 
              multiline 
              maxLength={1000} 
            />
          </View>

          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.label}>YOUR GARMENTS</Text>
                <DisplayText style={styles.orderTitle}>{cartCount} item{cartCount === 1 ? "" : "s"} selected</DisplayText>
              </View>
              <StatusPill label={express ? "EXPRESS" : "STANDARD"} tone={express ? "orange" : "blue"} />
            </View>
            {cart.map((line) => (
              <View key={line.item.id} style={styles.orderLine}>
                <Text style={styles.orderItem}>{line.quantity} × {line.item.name}</Text>
                <Text style={styles.orderPrice}>{formatGhs((line.item.price_wash || 0) * line.quantity)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalTitle}>Price summary</Text>
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Garment care</Text><Text style={styles.totalValue}>{formatGhs(calculatedSubtotal)}</Text></View>
            <View style={styles.totalLine}><Text style={styles.totalLabel}>Pickup and return</Text><Text style={styles.totalValue}>{formatGhs(pickupFee)}</Text></View>
            {express ? <View style={styles.totalLine}><Text style={styles.totalLabel}>Express priority</Text><Text style={styles.totalValue}>{formatGhs(expressFee)}</Text></View> : null}
            <View style={styles.totalDivider} />
            <View style={styles.finalLine}><Text style={styles.finalLabel}>Estimated total</Text><Text style={styles.finalValue}>{formatGhs(total)}</Text></View>
            <Text style={styles.estimateHelp}>Chapman verifies the final scope with you before payment.</Text>
          </View>

          <View style={styles.paymentSection}>
            <View style={styles.paymentHeading}>
              <View>
                <Text style={styles.label}>PAYMENT PREFERENCE</Text>
                <Text style={styles.paymentTitle}>How would you prefer to pay?</Text>
              </View>
              <Ionicons name="wallet-outline" size={18} color={palette.blue} />
            </View>
            {payments.map((option) => (
              <TouchableOpacity 
                key={option.id} 
                onPress={() => { haptic.light(); setPayment(option.id); setError(null); }} 
                activeOpacity={0.78} 
                style={[styles.paymentOption, payment === option.id && styles.paymentOptionSelected]}
              >
                <View style={[styles.paymentIcon, payment === option.id && styles.paymentIconSelected]}>
                  <Ionicons name={option.icon} size={18} color={payment === option.id ? "#FFFFFF" : palette.blue} />
                </View>
                <View style={styles.paymentCopy}>
                  <Text style={styles.paymentOptionTitle}>{option.title}</Text>
                  <Text style={styles.paymentOptionDetail}>{option.detail}</Text>
                </View>
                <Ionicons name={payment === option.id ? "radio-button-on" : "radio-button-off"} size={20} color={payment === option.id ? palette.blue : "#A3ABBA"} />
              </TouchableOpacity>
            ))}
          </View>

          {checkingSession ? (
            <View style={styles.sessionNotice}>
              <ActivityIndicator size="small" color={palette.blue} />
              <Text style={styles.sessionNoticeText}>Checking your secure session…</Text>
            </View>
          ) : (
            <View style={[styles.sessionNotice, isSignedIn ? styles.sessionNoticeSigned : styles.sessionNoticeGuest]}>
              <Ionicons name={isSignedIn ? "shield-checkmark-outline" : "person-outline"} size={18} color={isSignedIn ? palette.green : palette.orange} />
              <Text style={styles.sessionNoticeText}>
                {isSignedIn ? "Signed in. Your request will be sent directly to Chapman." : "Sign in to send this request."}
              </Text>
            </View>
          )}

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle-outline" size={18} color={palette.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottom}>
          <PrimaryButton 
            label={busy ? "Sending to Chapman" : checkingSession ? "Please wait" : isSignedIn ? "Send request to Chapman" : "Sign in to send request"} 
            icon={busy || checkingSession ? undefined : isSignedIn ? "paper-plane-outline" : "lock-closed-outline"} 
            disabled={busy || checkingSession || cartCount === 0} 
            onPress={handleBottomButtonPress} 
          />
        </View>
      </View>

      <Modal visible={showAreaModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Pickup Area</Text>
              <TouchableOpacity onPress={() => setShowAreaModal(false)}><Ionicons name="close" size={24} color={palette.ink} /></TouchableOpacity>
            </View>
            <TextInput 
              value={areaSearch} 
              onChangeText={setAreaSearch} 
              placeholder="Search Kumasi areas..." 
              style={styles.modalSearchInput} 
              autoFocus 
            />
            <FlatList
              data={filteredAreas}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => { 
                    setPickupArea(item); 
                    if (item !== "Outside Kumasi") setOutsideKumasiTown("");
                    setShowAreaModal(false); 
                    haptic.light();
                  }} 
                  style={styles.modalItem}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {pickupArea === item && <Ionicons name="checkmark" size={20} color={palette.blue} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas }, 
  content: { padding: 20, paddingTop: 12, paddingBottom: 106, gap: 16 },
  progress: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, paddingHorizontal: 2 }, 
  progressStepDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.green, alignItems: "center", justifyContent: "center" }, 
  progressStepActive: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, 
  progressStepMuted: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E2E5EB", alignItems: "center", justifyContent: "center" }, 
  progressNumber: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10 }, 
  progressMuted: { color: palette.muted, fontFamily: "Inter_700Bold", fontSize: 10 }, 
  progressLine: { width: 38, height: 2, backgroundColor: palette.blue }, 
  progressLineMuted: { width: 38, height: 2, backgroundColor: "#E2E5EB" }, 
  progressText: { width: "100%", color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 3 },
  
  requestCard: { padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE6D9", gap: 12 }, 
  requestHeading: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 2 }, 
  requestIcon: { width: 41, height: 41, borderRadius: 14, backgroundColor: "#EEF8F0", alignItems: "center", justifyContent: "center" }, 
  requestCopy: { flex: 1, gap: 2 }, 
  requestTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15 }, 
  
  label: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.05 }, 
  fieldLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 12, marginTop: 8 }, 
  required: { color: palette.error },
  optional: { color: palette.muted, fontFamily: "Inter_400Regular" }, 
  
  datePickerButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FAFBFC", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 10 },
  datePickerText: { flex: 1, color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 13 },
  
  locationShareCard: { minHeight: 67, padding: 12, borderRadius: 14, backgroundColor: "#F7F9FE", borderWidth: 1, borderColor: "#DFE6F3", flexDirection: "row", alignItems: "center", justifyContent: "center" }, 
  locationShareCardReady: { backgroundColor: "#EFF9F0", borderColor: "#B7DFC0" }, 
  locationShareAction: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 }, 
  locationShareActionText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 13 },
  locationSuccess: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
  locationSuccessIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EAF7ED", alignItems: "center", justifyContent: "center" },
  locationSuccessText: { flex: 1, gap: 2 },
  locationSuccessTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 12 },
  locationSuccessCoords: { color: palette.blue, fontFamily: "Inter_600SemiBold", fontSize: 11 },
  locationSuccessMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 9 },
  locationRemove: { padding: 5 },
  
  compactInput: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FAFBFC", color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 13, paddingHorizontal: 12, marginTop: 8 }, 
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FAFBFC", color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 13, paddingHorizontal: 12, marginTop: 4 }, 
  noteInput: { minHeight: 74, paddingTop: 11, textAlignVertical: "top" }, 
  windowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 }, 
  window: { width: "48.5%", minHeight: 38, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, 
  windowSelected: { backgroundColor: palette.blue, borderColor: palette.blue }, 
  windowText: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 11 }, 
  optionTextSelected: { color: "#FFFFFF" },
  
  orderCard: { padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, gap: 11 }, 
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: "#EEF0F4" }, 
  orderTitle: { fontSize: 18, lineHeight: 24, marginTop: 3 }, 
  orderLine: { flexDirection: "row", justifyContent: "space-between" }, 
  orderItem: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 12 }, 
  orderPrice: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  
  totalCard: { padding: 16, borderRadius: 20, backgroundColor: "#F8FAFF", borderWidth: 1, borderColor: "#E1E8FB", gap: 10 }, 
  totalTitle: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, marginBottom: 2 }, 
  totalLine: { flexDirection: "row", justifyContent: "space-between" }, 
  totalLabel: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12 }, 
  totalValue: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12 }, 
  totalDivider: { height: 1, backgroundColor: "#DFE6F3", marginVertical: 2 }, 
  finalLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, 
  finalLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, 
  finalValue: { color: palette.blue, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 20 }, 
  estimateHelp: { color: "#818A9B", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14 },
  
  paymentSection: { padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, gap: 9 }, 
  paymentHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 2 }, 
  paymentTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 3 }, 
  paymentOption: { minHeight: 55, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 13, paddingHorizontal: 8 }, 
  paymentOptionSelected: { backgroundColor: "#F1F5FF" }, 
  paymentIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" }, 
  paymentIconSelected: { backgroundColor: palette.blue }, 
  paymentCopy: { flex: 1, gap: 2 }, 
  paymentOptionTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, 
  paymentOptionDetail: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10 },
  
  sessionNotice: { minHeight: 48, padding: 12, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 9 }, 
  sessionNoticeSigned: { backgroundColor: "#EAF7ED" }, 
  sessionNoticeGuest: { backgroundColor: "#FFF5E8" }, 
  sessionNoticeText: { flex: 1, color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 16 }, 
  error: { minHeight: 48, padding: 12, borderRadius: 15, backgroundColor: "#FDEBEB", flexDirection: "row", alignItems: "center", gap: 9 }, 
  errorText: { flex: 1, color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 16 },
  
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, paddingTop: 12, paddingBottom: 18, backgroundColor: "rgba(248,249,250,0.98)", borderTopWidth: 1, borderTopColor: palette.border },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18 },
  modalSearchInput: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FAFBFC", color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 13, paddingHorizontal: 12, marginBottom: 16 },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#EEF0F4" },
  modalItemText: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 14 },
});