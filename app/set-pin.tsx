import { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, palette } from "@/components/chapman-ui";
import { setCustomerPin, markPinOffered } from "@/lib/customer-pin";
import { supabase } from "@/lib/supabase";
import { isValidPin } from "@/lib/pin-policy";
import { haptic } from "@/lib/haptics";

/**
 * Offered once, straight after a customer signs in, because the PIN saves them
 * a text message every time they open the app afterwards.
 *
 * It is skippable. A customer who skips is not asked again, and can set a PIN
 * whenever they like from Profile, then App lock.
 */
export default function SetPinScreen() {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rememberOffered = async () => {
    try {
      const { data } = await supabase!.auth.getSession();
      const userId = data.session?.user?.id;
      if (userId) await markPinOffered(userId);
    } catch {
      // The offer flag is a convenience. Failing to store it must not block the customer.
    }
  };

  const finish = async (setIt: boolean) => {
    if (busy) return;
    if (setIt) {
      if (!isValidPin(pin)) { setNotice("Choose exactly 4 digits, for example 2 0 4 8."); return; }
      if (pin !== confirm) { setNotice("The two entries do not match. Please try again."); return; }
    }
    setBusy(true);
    try {
      if (setIt) {
        await setCustomerPin(pin);
        haptic.success();
      }
      await rememberOffered();
    } catch {
      // If the PIN cannot be saved we still let the customer in rather than
      // trapping them on this screen.
      setNotice("The PIN could not be saved on this device, but your account is ready.");
    } finally {
      setBusy(false);
      router.replace("/(tabs)" as never);
    }
  };

  return (
    <AppScreen>
      <View style={styles.page}>
        <View style={styles.top}>
          <View style={styles.icon}><Ionicons name="keypad-outline" size={27} color={palette.blue} /></View>
          <DisplayText style={styles.title}>Open Chapman with a PIN next time.</DisplayText>
          <BodyText style={styles.body}>Your number is confirmed. Set 4 digits and you will not need another text message each time you open the app on this phone.</BodyText>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Choose 4 digits</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
            maxLength={4}
            secureTextEntry
            placeholder="4 digits"
            placeholderTextColor="#9AA1AE"
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>Enter them once more</Text>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
            maxLength={4}
            secureTextEntry
            placeholder="4 digits"
            placeholderTextColor="#9AA1AE"
            style={styles.input}
          />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Text style={styles.fine}>The PIN stays on this phone and is never sent to Chapman. Five wrong tries and it asks for a new text message, which keeps your bookings private.</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label={busy ? "Saving" : "Set my PIN"} icon="checkmark" onPress={() => void finish(true)} disabled={busy} />
          <TouchableOpacity onPress={() => void finish(false)} style={styles.skip} disabled={busy}>
            <Text style={styles.skipText}>Not now, take me to the app</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 22, justifyContent: "space-between", backgroundColor: palette.canvas },
  top: { alignItems: "center", gap: 11, paddingTop: 30 },
  icon: { width: 62, height: 62, borderRadius: 21, backgroundColor: "#E4F4E9", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 25, lineHeight: 32, textAlign: "center", maxWidth: 300 },
  body: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 310 },
  card: { padding: 17, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, gap: 7 },
  fieldLabel: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 14, color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 6, backgroundColor: "#FFFFFF" },
  notice: { color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15, marginTop: 3 },
  fine: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, marginTop: 7 },
  actions: { gap: 9, paddingBottom: 12 },
  skip: { minHeight: 46, alignItems: "center", justifyContent: "center" },
  skipText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
