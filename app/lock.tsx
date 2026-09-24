import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "@/components/app-screen";
import { ChapmanMark, DisplayText, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { clearCustomerPin, forgetPinOffer, hasCustomerPin, pinOwnerId, verifyCustomerPin } from "@/lib/customer-pin";
import { getCustomerSession, signOutCustomer } from "@/lib/customer-auth";
import { PIN_LENGTH, pinRecoveryRoute, wrongPinMessage } from "@/lib/pin-policy";
import { haptic } from "@/lib/haptics";
import { confirmAction, notify } from "@/lib/notify";
import { recordSecurityEvent } from "@/lib/app-security-log";
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
   * Throws the PIN away, and records that it happened, so the customer and the
   * Chapman office can both see it rather than it vanishing silently. The owner is
   * read before the PIN is cleared, because afterwards there is nobody to blame
   * the loss on.
   *
   * "inviteAgain" is for a PIN that was lost rather than declined: it clears the
   * "already offered" flag, so the next sign-in invites the customer to set a new
   * one. A customer who removed their own PIN on purpose is not invited again.
   */
  const dropPin = useCallback(async ({ reason, inviteAgain }: { reason: string; inviteAgain: boolean }) => {
    const owner = await pinOwnerId().catch(() => null);
    await clearCustomerPin().catch(() => undefined);
    if (inviteAgain) await forgetPinOffer(owner).catch(() => undefined);
    void recordSecurityEvent("pin_used_up");
    return { owner, reason };
  }, []);

  /**
   * Opening the app, and the PIN is gone: the sign-in on this phone goes too, so
   * the only way back in is proving the phone number again with a text message.
   * This is the rule for opening the app, and it cannot be waved through.
   */
  const leaveForSignIn = useCallback(async (reason: string) => {
    await dropPin({ reason, inviteAgain: true });
    await signOutCustomer().catch(() => undefined);
    notify("Sign in again", reason);
    router.replace("/auth/phone" as never);
  }, [dropPin]);

  /**
   * Finishing a sign-in, and the PIN is gone: the phone number was proved by text
   * message moments ago, so the sign-in stands and the customer keeps it. They are
   * invited to set a new PIN straight away, or to carry on and set one later from
   * their profile.
   */
  const carryOnWithoutPin = useCallback(async (reason: string) => {
    await dropPin({ reason, inviteAgain: false });
    notify("PIN removed", `${reason}\n\nYou can set a new 4 digit PIN now, or later from your profile.`);
    router.replace("/(tabs)" as never);
  }, [dropPin]);
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
        // Five wrong tries: the PIN is thrown away either way. Where the customer
        // goes next is decided by lib/pin-policy.ts, not here, and opening the app
        // can never answer "carry on".
        if (pinRecoveryRoute(afterSignIn ? "finishing-sign-in" : "opening-the-app") === "carry-on-without-pin") {
          await carryOnWithoutPin("The PIN has been removed after too many wrong tries.");
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
          {message ? <Text style={styles.message}>{message}</Text> : <Text style={styles.hint}>{afterSignIn ? "Your name on the sign-in was proved by text message. The PIN is kept on this phone only." : "Your PIN stays on this phone. Five wrong tries remove it."}</Text>}
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
            void (async () => {
              if (afterSignIn) {
                // The phone number was proved moments ago, so a second text
                // message would prove nothing new. The customer chooses: set a
                // new PIN now, or carry on without one.
                const wantsNewPin = await confirmAction(
                  "Set a new PIN?",
                  "Choose Continue to pick a new 4 digit PIN now, or Cancel to carry on without one and set it later from your profile.",
                  "Choose a new PIN",
                );
                if (wantsNewPin) {
                  await dropPin({ reason: "The old PIN was forgotten.", inviteAgain: false });
                  router.replace("/set-pin?from=forgot" as never);
                  return;
                }
                await carryOnWithoutPin("Your PIN has been removed.");
                return;
              }
              // Opening the app: this is the strict path. Say plainly what is
              // about to happen, because it costs a text message and the PIN.
              const sure = await confirmAction(
                "Forgotten PIN",
                "We will sign you out and text a new six digit code to your number. The old PIN will be removed, and after the code you can set a new one.",
                "Sign out and text me a code",
              );
              if (sure) await leaveForSignIn("Sign in with your phone number and choose a new PIN.");
            })();
          }}
          style={styles.forgot}
        >
          <Text style={styles.forgotText}>Forgot your PIN?</Text>
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
