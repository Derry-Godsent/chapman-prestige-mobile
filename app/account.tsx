import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, palette } from "@/components/chapman-ui";
import { signOutCustomer } from "@/lib/customer-auth";
import { useCustomerAccount } from "@/hooks/use-customer-account";
import { clearCustomerPin, hasCustomerPin, setCustomerPin } from "@/lib/customer-pin";
import { isValidPin } from "@/lib/pin-policy";

export default function AccountScreen() {
  const { account, checking } = useCustomerAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinSet, setPinSet] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinEntry, setPinEntry] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinNotice, setPinNotice] = useState<string | null>(null);

  useEffect(() => {
    void hasCustomerPin().then(setPinSet).catch(() => setPinSet(false));
  }, []);

  const savePin = async () => {
    setPinNotice(null);
    if (!isValidPin(pinEntry)) { setPinNotice("Choose exactly 4 digits, for example 2 0 4 8."); return; }
    if (pinEntry !== pinConfirm) { setPinNotice("The two entries do not match. Please try again."); return; }
    try {
      await setCustomerPin(pinEntry);
      setPinSet(true);
      setPinOpen(false);
      setPinEntry("");
      setPinConfirm("");
      setPinNotice(null);
    } catch {
      setPinNotice("The PIN could not be saved on this device. Please try again.");
    }
  };

  const removePin = async () => {
    await clearCustomerPin();
    setPinSet(false);
    setPinOpen(false);
    setPinEntry("");
    setPinConfirm("");
  };

  const logout = async () => {
    setBusy(true); setError(null);
    try {
      await signOutCustomer();
      router.replace("/(tabs)/profile" as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not sign you out. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <AppScreen>
      <View style={styles.page}>
        <View style={styles.top}><TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={21} color={palette.ink} /></TouchableOpacity><Text style={styles.topLabel}>ACCOUNT</Text><View style={styles.spacer} /></View>
        {checking ? <View style={styles.loading}><ActivityIndicator color={palette.blue} /></View> : account ? <View style={styles.content}>
          <View style={styles.avatar}><Ionicons name={account.avatar_style === "female" ? "woman-outline" : account.avatar_style === "male" ? "man-outline" : "person-outline"} size={32} color={palette.blue} /></View>
          <DisplayText style={styles.title}>{account.full_name || "Your Chapman account"}</DisplayText>
          <BodyText style={styles.phone}>{account.phone}</BodyText>
          <View style={styles.status}><Ionicons name="shield-checkmark-outline" size={18} color={palette.green} /><Text style={styles.statusText}>Phone number verified</Text></View>
          <View style={styles.info}><Text style={styles.infoTitle}>Your account keeps your bookings together.</Text><Text style={styles.infoBody}>When the staff system connection is activated, your real bookings, dates, payments, and service updates will appear here.</Text></View>

          <View style={styles.pinCard}>
            <View style={styles.pinHead}>
              <View style={styles.pinIcon}><Ionicons name="keypad-outline" size={19} color={palette.blue} /></View>
              <View style={styles.pinCopy}>
                <Text style={styles.pinTitle}>{pinSet ? "App lock is on" : "App lock"}</Text>
                <Text style={styles.pinText}>{pinSet ? "Open Chapman with your 4 digit PIN. No text message needed on this device." : "Set a 4 digit PIN so you do not need a new text message each time you open Chapman."}</Text>
              </View>
            </View>

            {pinOpen ? (
              <View style={styles.pinForm}>
                <Text style={styles.pinFieldLabel}>New 4 digit PIN</Text>
                <TextInput value={pinEntry} onChangeText={setPinEntry} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="4 digits" placeholderTextColor="#9AA1AE" style={styles.pinInput} />
                <Text style={styles.pinFieldLabel}>Enter it again</Text>
                <TextInput value={pinConfirm} onChangeText={setPinConfirm} keyboardType="number-pad" maxLength={4} secureTextEntry placeholder="4 digits" placeholderTextColor="#9AA1AE" style={styles.pinInput} />
                {pinNotice ? <Text style={styles.error}>{pinNotice}</Text> : null}
                <View style={styles.pinActions}>
                  <TouchableOpacity onPress={() => { setPinOpen(false); setPinNotice(null); setPinEntry(""); setPinConfirm(""); }} style={styles.pinCancel}><Text style={styles.pinCancelText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => void savePin()} style={styles.pinSave}><Text style={styles.pinSaveText}>Save PIN</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.pinActions}>
                <TouchableOpacity onPress={() => { setPinOpen(true); setPinNotice(null); }} style={styles.pinSave}><Text style={styles.pinSaveText}>{pinSet ? "Change PIN" : "Set a PIN"}</Text></TouchableOpacity>
                {pinSet ? <TouchableOpacity onPress={() => void removePin()} style={styles.pinCancel}><Text style={styles.pinCancelText}>Remove</Text></TouchableOpacity> : null}
              </View>
            )}

            <Text style={styles.pinFine}>Your PIN stays on this phone and is never sent to Chapman. If you forget it, or the app is reinstalled, you sign in again with a text message.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={busy ? "Signing out" : "Log out"} icon="log-out-outline" onPress={logout} disabled={busy} />
        </View> : <View style={styles.content}>
          <View style={styles.avatar}><Ionicons name="person-outline" size={32} color={palette.blue} /></View>
          <DisplayText style={styles.title}>You are browsing as a guest.</DisplayText>
          <BodyText style={styles.phone}>Sign in with your phone to keep bookings and service updates in one place.</BodyText>
          <PrimaryButton label="Sign in with phone" icon="phone-portrait-outline" onPress={() => router.replace("/auth/phone" as never)} />
        </View>}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, padding: 20, backgroundColor: palette.canvas }, top: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" }, topLabel: { color: palette.blue, fontFamily: "Inter_700Bold", letterSpacing: 1.2, fontSize: 10 }, spacer: { width: 42 }, loading: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, gap: 12 }, avatar: { width: 86, height: 86, borderRadius: 30, backgroundColor: "#E4F4E9", alignItems: "center", justifyContent: "center", marginBottom: 5 }, title: { textAlign: "center", fontSize: 26, lineHeight: 34 }, phone: { textAlign: "center", maxWidth: 300 }, status: { flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 11, minHeight: 34, borderRadius: 12, backgroundColor: "#E5F5EA", marginTop: 5 }, statusText: { color: palette.green, fontFamily: "Inter_700Bold", fontSize: 11 }, info: { width: "100%", marginTop: 14, marginBottom: 10, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", gap: 5 }, infoTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, infoBody: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 }, error: { color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center" }, pinCard: { width: "100%", marginBottom: 8, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", gap: 12 }, pinHead: { flexDirection: "row", alignItems: "center", gap: 10 }, pinIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: "#E4F4E9", alignItems: "center", justifyContent: "center" }, pinCopy: { flex: 1, gap: 2 }, pinTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, pinText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 }, pinForm: { gap: 6 }, pinFieldLabel: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 11, marginTop: 3 }, pinInput: { height: 46, borderRadius: 13, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 13, color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 15, letterSpacing: 4, backgroundColor: "#FFFFFF" }, pinActions: { flexDirection: "row", gap: 9, marginTop: 2 }, pinSave: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: palette.blue, alignItems: "center", justifyContent: "center" }, pinSaveText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12 }, pinCancel: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }, pinCancelText: { color: palette.muted, fontFamily: "Inter_700Bold", fontSize: 12 }, pinFine: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 9, lineHeight: 14 } });
