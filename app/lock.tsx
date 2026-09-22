import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { ChapmanMark, DisplayText, palette } from "@/components/chapman-ui";
import { clearCustomerPin, hasCustomerPin, verifyCustomerPin } from "@/lib/customer-pin";
import { getCustomerSession, signOutCustomer } from "@/lib/customer-auth";
import { PIN_LENGTH, wrongPinMessage } from "@/lib/pin-policy";
import { haptic } from "@/lib/haptics";
import { notify } from "@/lib/notify";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/**
 * The PIN screen shown when the app opens and a PIN is set for this device.
 *
 * Uses a stored sign-in, so no text message is sent. If the PIN is wrong too
 * many times, or if the stored sign-in has gone, it sends the customer back to
 * the phone sign-in rather than leaving them stuck.
 */
export default function AppLockScreen() {
  const [digits, setDigits] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const submitted = useRef(false);

  // This screen only makes sense when there is both a PIN and a stored sign-in
  // for it to unlock. If either has gone, there is nothing to unlock, so the
  // customer goes straight to the phone sign-in instead of being stuck here.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [present, session] = await Promise.all([
        hasCustomerPin().catch(() => false),
        getCustomerSession().catch(() => null),
      ]);
      if (cancelled) return;
      if (!present) { router.replace("/(tabs)" as never); return; }
      if (!session) {
        await clearCustomerPin().catch(() => undefined);
        if (!cancelled) router.replace("/auth/phone" as never);
        return;
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const leaveForSignIn = useCallback(async (reason: string) => {
    await clearCustomerPin().catch(() => undefined);
    await signOutCustomer().catch(() => undefined);
    notify("Sign in again", reason);
    router.replace("/auth/phone" as never);
  }, []);

  const submit = useCallback(async (pin: string) => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const result = await verifyCustomerPin(pin);
      if (result.ok) {
        haptic.success();
        router.replace("/(tabs)" as never);
        return;
      }
      haptic.medium();
      setDigits("");
      setMessage(wrongPinMessage(result.failedAttempts));
      if (result.forgotten) {
        await leaveForSignIn("The PIN has been used up, so we need to confirm your number again.");
      }
    } catch {
      setDigits("");
      setMessage("That could not be checked. Please try again.");
    } finally {
      submitted.current = false;
      setBusy(false);
    }
  }, [leaveForSignIn]);

  const press = useCallback((key: string) => {
    if (busy) return;
    haptic.light();
    if (key === "back") {
      setDigits((current) => current.slice(0, -1));
      setMessage(null);
      return;
    }
    if (digits.length >= PIN_LENGTH) return;
    const next = digits + key;
    setDigits(next);
    setMessage(null);
    if (next.length === PIN_LENGTH) void submit(next);
  }, [busy, digits, submit]);

  if (checking) return <AppScreen><View style={styles.page} /></AppScreen>;

  return (
    <AppScreen>
      <View style={styles.page}>
        <View style={styles.top}>
          <ChapmanMark size={54} />
          <DisplayText style={styles.title}>Welcome back.</DisplayText>
          <Text style={styles.subtitle}>Enter your 4 digit PIN to open Chapman. No text message needed.</Text>

          <View style={styles.dots}>
            {Array.from({ length: PIN_LENGTH }).map((_, index) => (
              <View key={index} style={[styles.dot, index < digits.length && styles.dotFilled]} />
            ))}
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : <Text style={styles.hint}>Your PIN stays on this phone.</Text>}
        </View>

        <View style={styles.keypad}>
          {KEYS.map((key, index) => {
            if (key === "") return <View key={`gap-${index}`} style={styles.key} />;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => press(key)}
                activeOpacity={0.7}
                accessibilityLabel={key === "back" ? "Delete" : key}
                style={styles.key}
              >
                {key === "back" ? (
                  <Ionicons name="backspace-outline" size={23} color={palette.ink} />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => void leaveForSignIn("Sign in with your phone number and choose a new PIN.")}
          style={styles.forgot}
        >
          <Text style={styles.forgotText}>Forgot your PIN?</Text>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, justifyContent: "space-between", backgroundColor: palette.canvas },
  top: { alignItems: "center", gap: 9, paddingTop: 34 },
  title: { fontSize: 27, marginTop: 8 },
  subtitle: { textAlign: "center", maxWidth: 280, color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  dots: { flexDirection: "row", gap: 14, marginTop: 26 },
  dot: { width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: "#C9BFB0", backgroundColor: "#FFFFFF" },
  dotFilled: { backgroundColor: palette.blue, borderColor: palette.blue },
  hint: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4 },
  message: { color: palette.error, fontFamily: "Inter_600SemiBold", fontSize: 11, textAlign: "center", maxWidth: 280, marginTop: 4, lineHeight: 16 },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 },
  key: { width: 76, height: 60, borderRadius: 19, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  keyText: { color: palette.ink, fontFamily: "PlusJakartaSans_700Bold", fontSize: 23 },
  forgot: { alignItems: "center", paddingVertical: 14 },
  forgotText: { color: palette.blue, fontFamily: "Inter_700Bold", fontSize: 13 },
});
