import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { DisplayText, PrimaryButton, StatusPill, palette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { formatGhs } from "@/lib/chapman-data";
import { useBookingStore } from "@/lib/booking-store";
import { getCurrentCustomerAccount, getCustomerSession } from "@/lib/customer-auth";
import { CustomerSignInRequiredError, submitMobileLaundryRequest } from "@/lib/mobile-requests";
import { PICKUP_WINDOWS, PickupWindow } from "@/lib/mobile-request-contract";
import { haptic } from "@/lib/haptics";

const payments = [
  { id: "momo", title: "Mobile Money", detail: "MTN, Telecel, or AT", icon: "phone-portrait-outline" },
  { id: "card", title: "Card", detail: "Visa or Mastercard", icon: "card-outline" },
  { id: "cash", title: "Cash", detail: "Pay when we arrive", icon: "cash-outline" },
] as const;

const pickupAreas = ["Danyame", "Ahodwo", "Asokwa", "Other Kumasi area"];

function localDate(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" });
}

export default function CheckoutScreen() {
  const { cart, cartCount, laundrySubtotal, expressFee, express, createLaundryBooking, clearCart } = useBookingStore();
  const [payment, setPayment] = useState<(typeof payments)[number]["id"]>("momo");
  const [requestedFor, setRequestedFor] = useState(() => localDate(1));
  const [pickupArea, setPickupArea] = useState("Danyame");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupWindow, setPickupWindow] = useState<PickupWindow>(PICKUP_WINDOWS[0]);
  const [customerNote, setCustomerNote] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickupFee = cartCount ? 20 : 0;
  const total = laundrySubtotal + expressFee + pickupFee;
  const dateOptions = useMemo(() => [localDate(1), localDate(2), localDate(3)], []);

  useEffect(() => {
    void getCustomerSession()
      .then((session) => setIsSignedIn(Boolean(session)))
      .catch(() => setIsSignedIn(false))
      .finally(() => setCheckingSession(false));
  }, []);

  const signInToSend = () => router.push("/auth/phone" as never);

  const confirm = async () => {
    setError(null);
    if (!isSignedIn) {
      signInToSend();
      return;
    }
    if (pickupAddress.trim().length < 5) {
      setError("Please add the house, street, or landmark for pickup.");
      return;
    }

    setBusy(true);
    try {
      const account = await getCurrentCustomerAccount();
      if (!account?.profile_completed_at) throw new Error("Please finish your profile before sending a Laundry request.");

      const request = await submitMobileLaundryRequest({
        requestedFor,
        pickupArea,
        pickupAddress,
        pickupWindow,
        items: cart,
        express,
        customerNote,
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
            <View style={styles.progressStepDone}><Ionicons name="checkmark" size={12} color="#FFFFFF" /></View><View style={styles.progressLine} />
            <View style={styles.progressStepActive}><Text style={styles.progressNumber}>2</Text></View><View style={styles.progressLineMuted} />
            <View style={styles.progressStepMuted}><Text style={styles.progressMuted}>3</Text></View>
            <Text style={styles.progressText}>Items · Request details · Chapman confirms</Text>
          </View>

          <View style={styles.requestCard}>
            <View style={styles.requestHeading}><View style={styles.requestIcon}><Ionicons name="calendar-outline" size={20} color={palette.blue} /></View><View style={styles.requestCopy}><Text style={styles.label}>PICKUP DETAILS</Text><Text style={styles.requestTitle}>Tell us what works for you</Text><Text style={styles.requestHelp}>This is your preferred pickup. Chapman confirms the final time with you.</Text></View></View>
            <Text style={styles.fieldLabel}>Preferred pickup date</Text>
            <View style={styles.optionRow}>{dateOptions.map((date) => <TouchableOpacity key={date} onPress={() => { haptic.light(); setRequestedFor(date); }} activeOpacity={0.8} style={[styles.dateOption, requestedFor === date && styles.dateOptionSelected]}><Text style={[styles.dateOptionDay, requestedFor === date && styles.optionTextSelected]}>{date === dateOptions[0] ? "Tomorrow" : date === dateOptions[1] ? "Next day" : "Later"}</Text><Text style={[styles.dateOptionValue, requestedFor === date && styles.optionTextSelected]}>{dateLabel(date)}</Text></TouchableOpacity>)}</View>
            <Text style={styles.fieldLabel}>Pickup area</Text>
            <View style={styles.chipRow}>{pickupAreas.map((area) => <TouchableOpacity key={area} onPress={() => { haptic.light(); setPickupArea(area); }} activeOpacity={0.8} style={[styles.chip, pickupArea === area && styles.chipSelected]}><Text style={[styles.chipText, pickupArea === area && styles.chipTextSelected]}>{area}</Text></TouchableOpacity>)}</View>
            <TextInput value={pickupArea} onChangeText={setPickupArea} placeholder="Enter your Kumasi area" placeholderTextColor="#9AA1AD" style={styles.compactInput} maxLength={100} editable={!busy} />
            <Text style={styles.fieldLabel}>House, street, or landmark</Text>
            <TextInput value={pickupAddress} onChangeText={setPickupAddress} placeholder="e.g. House 14, near the Danyame roundabout" placeholderTextColor="#9AA1AD" style={styles.input} maxLength={300} editable={!busy} />
            <Text style={styles.fieldLabel}>Preferred pickup window</Text>
            <View style={styles.windowGrid}>{PICKUP_WINDOWS.map((window) => <TouchableOpacity key={window} onPress={() => { haptic.light(); setPickupWindow(window); }} activeOpacity={0.8} style={[styles.window, pickupWindow === window && styles.windowSelected]}><Text style={[styles.windowText, pickupWindow === window && styles.optionTextSelected]}>{window}</Text></TouchableOpacity>)}</View>
            <Text style={styles.fieldLabel}>Note for Chapman <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput value={customerNote} onChangeText={setCustomerNote} placeholder="Gate instructions, collection preference, or anything else" placeholderTextColor="#9AA1AD" style={[styles.input, styles.noteInput]} multiline maxLength={1000} editable={!busy} />
          </View>

          <View style={styles.orderCard}><View style={styles.orderHeader}><View><Text style={styles.label}>YOUR GARMENTS</Text><DisplayText style={styles.orderTitle}>{cartCount} item{cartCount === 1 ? "" : "s"} selected</DisplayText></View><StatusPill label={express ? "EXPRESS" : "STANDARD"} tone={express ? "orange" : "blue"} /></View>{cart.map((line) => <View key={line.item.id} style={styles.orderLine}><Text style={styles.orderItem}>{line.quantity} × {line.item.name}</Text><Text style={styles.orderPrice}>{formatGhs(line.item.price * line.quantity)}</Text></View>)}</View>
          <View style={styles.totalCard}><Text style={styles.totalTitle}>Price summary</Text><View style={styles.totalLine}><Text style={styles.totalLabel}>Garment care</Text><Text style={styles.totalValue}>{formatGhs(laundrySubtotal)}</Text></View><View style={styles.totalLine}><Text style={styles.totalLabel}>Pickup and return</Text><Text style={styles.totalValue}>{formatGhs(pickupFee)}</Text></View>{express ? <View style={styles.totalLine}><Text style={styles.totalLabel}>Express priority</Text><Text style={styles.totalValue}>{formatGhs(expressFee)}</Text></View> : null}<View style={styles.totalDivider} /><View style={styles.finalLine}><Text style={styles.finalLabel}>Estimated total</Text><Text style={styles.finalValue}>{formatGhs(total)}</Text></View><Text style={styles.estimateHelp}>Chapman verifies the final scope with you before payment.</Text></View>
          <View style={styles.paymentSection}><View style={styles.paymentHeading}><View><Text style={styles.label}>PAYMENT PREFERENCE</Text><Text style={styles.paymentTitle}>How would you prefer to pay?</Text></View><Ionicons name="wallet-outline" size={18} color={palette.blue} /></View>{payments.map((option) => <TouchableOpacity key={option.id} onPress={() => { haptic.light(); setPayment(option.id); }} activeOpacity={0.78} style={[styles.paymentOption, payment === option.id && styles.paymentOptionSelected]}><View style={[styles.paymentIcon, payment === option.id && styles.paymentIconSelected]}><Ionicons name={option.icon} size={18} color={payment === option.id ? "#FFFFFF" : palette.blue} /></View><View style={styles.paymentCopy}><Text style={styles.paymentOptionTitle}>{option.title}</Text><Text style={styles.paymentOptionDetail}>{option.detail}</Text></View><Ionicons name={payment === option.id ? "radio-button-on" : "radio-button-off"} size={20} color={payment === option.id ? palette.blue : "#A3ABBA"} /></TouchableOpacity>)}<Text style={styles.paymentHelp}>You select the final payment method after Chapman confirms your request.</Text></View>
          {checkingSession ? <View style={styles.sessionNotice}><ActivityIndicator size="small" color={palette.blue} /><Text style={styles.sessionNoticeText}>Checking your secure session…</Text></View> : <View style={[styles.sessionNotice, isSignedIn ? styles.sessionNoticeSigned : styles.sessionNoticeGuest]}><Ionicons name={isSignedIn ? "shield-checkmark-outline" : "person-outline"} size={18} color={isSignedIn ? palette.green : palette.orange} /><Text style={styles.sessionNoticeText}>{isSignedIn ? "Signed in. Your request will be sent directly to Chapman for confirmation." : "Guests can browse and plan. Sign in only when you are ready to send this request."}</Text></View>}
          {error ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={palette.error} /><Text style={styles.errorText}>{error}</Text></View> : null}
        </ScrollView>
        <View style={styles.bottom}><PrimaryButton label={busy ? "Sending to Chapman" : checkingSession ? "Please wait" : isSignedIn ? "Send request to Chapman" : "Sign in to send request"} icon={busy || checkingSession ? undefined : isSignedIn ? "paper-plane-outline" : "lock-closed-outline"} disabled={busy || checkingSession || cartCount === 0} onPress={confirm} /></View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas }, content: { padding: 20, paddingTop: 12, paddingBottom: 106, gap: 16 },
  progress: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, paddingHorizontal: 2 }, progressStepDone: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.green, alignItems: "center", justifyContent: "center" }, progressStepActive: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, progressStepMuted: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#E2E5EB", alignItems: "center", justifyContent: "center" }, progressNumber: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 10 }, progressMuted: { color: palette.muted, fontFamily: "Inter_700Bold", fontSize: 10 }, progressLine: { width: 38, height: 2, backgroundColor: palette.blue }, progressLineMuted: { width: 38, height: 2, backgroundColor: "#E2E5EB" }, progressText: { width: "100%", color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 10, marginTop: 3 },
  requestCard: { padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE6D9", gap: 10 }, requestHeading: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 2 }, requestIcon: { width: 41, height: 41, borderRadius: 14, backgroundColor: "#EEF8F0", alignItems: "center", justifyContent: "center" }, requestCopy: { flex: 1, gap: 2 }, requestTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15 }, requestHelp: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 },
  label: { color: "#5871B5", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.05 }, fieldLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 12, marginTop: 3 }, optional: { color: palette.muted, fontFamily: "Inter_400Regular" }, optionRow: { flexDirection: "row", gap: 7 }, dateOption: { flex: 1, minHeight: 54, padding: 8, borderRadius: 13, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", justifyContent: "center", gap: 3 }, dateOptionSelected: { backgroundColor: palette.blue, borderColor: palette.blue }, dateOptionDay: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 10 }, dateOptionValue: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 9 }, optionTextSelected: { color: "#FFFFFF" }, chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, chip: { minHeight: 32, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", justifyContent: "center" }, chipSelected: { backgroundColor: "#E8F5EA", borderColor: palette.green }, chipText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 10 }, chipTextSelected: { color: palette.green }, compactInput: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FAFBFC", color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 13, paddingHorizontal: 12 }, input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FAFBFC", color: palette.ink, fontFamily: "Inter_500Medium", fontSize: 13, paddingHorizontal: 12 }, noteInput: { minHeight: 74, paddingTop: 11, textAlignVertical: "top" }, windowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, window: { width: "48.5%", minHeight: 38, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, windowSelected: { backgroundColor: palette.blue, borderColor: palette.blue }, windowText: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 11 },
  orderCard: { padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, gap: 11 }, orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: "#EEF0F4" }, orderTitle: { fontSize: 18, lineHeight: 24, marginTop: 3 }, orderLine: { flexDirection: "row", justifyContent: "space-between" }, orderItem: { color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 12 }, orderPrice: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12 },
  totalCard: { padding: 16, borderRadius: 20, backgroundColor: "#F8FAFF", borderWidth: 1, borderColor: "#E1E8FB", gap: 10 }, totalTitle: { color: palette.ink, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18, marginBottom: 2 }, totalLine: { flexDirection: "row", justifyContent: "space-between" }, totalLabel: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 12 }, totalValue: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12 }, totalDivider: { height: 1, backgroundColor: "#DFE6F3", marginVertical: 2 }, finalLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, finalLabel: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 14 }, finalValue: { color: palette.blue, fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 20 }, estimateHelp: { color: "#818A9B", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14 },
  paymentSection: { padding: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, gap: 9 }, paymentHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 2 }, paymentTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 15, marginTop: 3 }, paymentOption: { minHeight: 55, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 13, paddingHorizontal: 8 }, paymentOptionSelected: { backgroundColor: "#F1F5FF" }, paymentIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#EEF3FF", alignItems: "center", justifyContent: "center" }, paymentIconSelected: { backgroundColor: palette.blue }, paymentCopy: { flex: 1, gap: 2 }, paymentOptionTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, paymentOptionDetail: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10 }, paymentHelp: { color: "#818A9B", fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, paddingTop: 3 },
  sessionNotice: { minHeight: 48, padding: 12, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 9 }, sessionNoticeSigned: { backgroundColor: "#EAF7ED" }, sessionNoticeGuest: { backgroundColor: "#FFF5E8" }, sessionNoticeText: { flex: 1, color: palette.muted, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 16 }, error: { minHeight: 48, padding: 12, borderRadius: 15, backgroundColor: "#FDEBEB", flexDirection: "row", alignItems: "center", gap: 9 }, errorText: { flex: 1, color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 16 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, paddingTop: 12, paddingBottom: 18, backgroundColor: "rgba(248,249,250,0.98)", borderTopWidth: 1, borderTopColor: palette.border },
});
