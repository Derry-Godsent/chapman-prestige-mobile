import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "@/components/app-screen";
import { ChapmanMark, DisplayText, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { clearCustomerPin, hasCustomerPin, verifyCustomerPin } from "@/lib/customer-pin";
import { getCustomerSession, signOutCustomer } from "@/lib/customer-auth";
import { PIN_LENGTH, wrongPinMessage } from "@/lib/pin-policy";
import { haptic } from "@/lib/haptics";
import { notify } from "@/lib/notify";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
/**
 * The PIN screen, which does two jobs.
 *
 * 1. Opening the app. Arrived at from the splash screen, and it unlocks the
 *    sign-in already stored on this phone, so no text message is needed.
 * 2. Finishing a sign-in. Arrived at from /auth/phone?after=signin, straight
 *    after the six digit code, for a customer who set a PIN here before. The
 *    number has just been proved by text message, so the PIN is a confirmation,
 *    not a second lock: if it is forgotten or used up at this point, the PIN is
 *    thrown away and the customer carries on into the app rather than being sent
 *    back to the start.
 *
 * The PIN only ever answers for the account that set it, so a PIN left on a
 * shared phone cannot be asked of the next person who signs in.
 */
export default function AppLockScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const [digits, setDigits] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const submitted = useRef(false);
  const params = useLocalSearchParams<{ after?: string }>();
  // True when this screen is the last step of a sign-in rather than the lock on
  // an app that is already open.
  const afterSignIn = params?.after === "signin";
  // This screen only makes sense when there is both a PIN and a stored sign-in
  // for it to unlock. If either has gone, there is nothing to unlock, so the
  // customer goes straight to the phone sign-in instead of being stuck here.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getCustomerSession().catch(() => null);
      const userId = session?.user?.id ?? null;
      // A PIN only counts when this device also holds the sign-in it unlocks.
      const present = await hasCustomerPin(userId).catch(() => false);
      if (cancelled) return;
      if (!session) {
        await clearCustomerPin().catch(() => undefined);
        // Straight after a sign-in the number was proved seconds ago, so the
        // customer carries on rather than being sent through a second text
        // message for a session that is simply not there.
        if (!cancelled) router.replace(afterSignIn ? ("/(tabs)" as never) : ("/auth/phone" as never));
        return;
      }
      if (!present) {
        // Nothing of this customer's to answer. After a sign-in that means they
        // simply carry on into the app; on opening the app it means the same.
        if (!cancelled) router.replace("/(tabs)" as never);
        return;
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, []);
  /**
   * The PIN is gone and there is no session left to unlock, so the customer goes
   * back to the phone sign-in for a fresh text message.
   */
  const leaveForSignIn = useCallback(async (reason: string) => {
    await clearCustomerPin().catch(() => undefined);
    await signOutCustomer().catch(() => undefined);
    notify("Sign in again", reason);
    router.replace("/auth/phone" as never);
  }, []);
  /**
   * The PIN is gone, but the customer has just proved this phone by text message,
   * so they keep their sign-in and simply carry on. Used only at the end of a
   * sign-in, never when opening the app.
   */
  const carryOnWithoutPin = useCallback((reason: string) => {
    notify("PIN removed", reason);
    router.replace("/(tabs)" as never);
  }, []);
  const submit = useCallback(async (pin: string) => {
    if (submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const session = await getCustomerSession().catch(() => null);
      const result = await verifyCustomerPin(pin, session?.user?.id ?? null);
      if (result.ok) {
        haptic.success();
        router.replace("/(tabs)" as never);
        return;
      }
      haptic.medium();
      setDigits("");
      setMessage(wrongPinMessage(result.failedAttempts));
      if (result.forgotten) {
        if (afterSignIn) {
          await clearCustomerPin().catch(() => undefined);
          carryOnWithoutPin("The PIN has been removed after too many wrong tries. You can set a new one in your profile.");
          return;
        }
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
          <DisplayText style={styles.title}>{afterSignIn ? "One more step." : "Welcome back."}</DisplayText>
          <Text style={styles.subtitle}>{afterSignIn ? "Enter your 4 digit PIN to finish signing in. Chapman will remember this phone." : "Enter your 4 digit PIN to open Chapman. No text message needed."}</Text>
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
          onPress={() => {
            if (afterSignIn) {
              // The phone number was proved moments ago, so a fresh text message
              // would be pointless. The PIN is dropped and the customer is in.
              void clearCustomerPin().then(() => carryOnWithoutPin("Your PIN has been removed. You can set a new one in your profile."));
              return;
            }
            void leaveForSignIn("Sign in with your phone number and choose a new PIN.");
          }}
          style={styles.forgot}
        >
          <Text style={styles.forgotText}>{afterSignIn ? "Forgot your PIN? Continue without it" : "Forgot your PIN?"}</Text>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}
const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  page: { flex: 1, padding: 24, justifyContent: "space-between", backgroundColor: palette.canvas },
  top: { alignItems: "center", gap: 9, paddingTop: 34 },
  title: { fontSize: 27, marginTop: 8 },
  subtitle: { textAlign: "center", maxWidth: 280, color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  dots: { flexDirection: "row", gap: 14, marginTop: 26 },
  dot: { width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: "#C9BFB0", backgroundColor: palette.surface },
  dotFilled: { backgroundColor: palette.blue, borderColor: palette.blue },
  hint: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 4 },
  message: { color: palette.error, fontFamily: "Inter_600SemiBold", fontSize: 11, textAlign: "center", maxWidth: 280, marginTop: 4, lineHeight: 16 },
  keypad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 },
  key: { width: 76, height: 60, borderRadius: 19, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  keyText: { color: palette.ink, fontFamily: "PlusJakartaSans_700Bold", fontSize: 23 },
  forgot: { alignItems: "center", paddingVertical: 14 },
  forgotText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 13 },
});
