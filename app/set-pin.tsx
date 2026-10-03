import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { setCustomerPin, markPinOffered } from "@/lib/customer-pin";
import { getCurrentCustomerAccount } from "@/lib/customer-auth";
import { recordSecurityEvent } from "@/lib/app-security-log";
import { supabase } from "@/lib/supabase";
import { getCustomerSession } from "@/lib/customer-auth";
import { PinPad } from "@/components/pin-pad";
import { PIN_LENGTH } from "@/lib/pin-policy";
import { haptic } from "@/lib/haptics";
/**
 * Offered once, straight after a customer signs in, because the PIN saves them
 * a text message every time they open the app afterwards.
 *
 * It is skippable. A customer who skips is not asked again, and can set a PIN
 * whenever they like from Profile, then App lock.
 */
export default function SetPinScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  // Which of the two entries is being asked for.
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const params = useLocalSearchParams<{ from?: string }>();
  // Arriving here from a forgotten PIN, the customer should be told that the old
  // one is gone rather than silently finding themselves on this screen.
  const cameFromForgotten = params?.from === "forgot";
  useEffect(() => {
    if (cameFromForgotten) setNotice("Your old PIN has been removed. Choose a new 4 digit PIN.");
  }, [cameFromForgotten]);
  /**
   * A PIN belongs to an account, and this page is only reachable with one.
   *
   * If the page is opened without a signed-in account, which can happen by
   * following an old link or a reload at the wrong moment, asking for four digits
   * and then quietly keeping none of them is worse than useless. So the page
   * finds out first, and says so plainly instead.
   */
  const [accountReady, setAccountReady] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getCustomerSession().catch(() => null);
      if (!cancelled) setAccountReady(Boolean(session));
    })();
    return () => { cancelled = true; };
  }, []);
  /**
   * Marks the offer as made and returns the account this PIN belongs to.
   *
   * The account id matters: a PIN with no owner can never be asked for, so if the
   * session cannot be read here the customer record is asked instead. If both
   * fail, the caller is told, and the PIN is not saved as an orphan.
   */
  const rememberOffered = async (): Promise<string> => {
    try {
      const { data } = await supabase!.auth.getSession();
      const fromSession = data.session?.user?.id ?? "";
      if (fromSession) {
        await markPinOffered(fromSession);
        return fromSession;
      }
      const account = await getCurrentCustomerAccount().catch(() => null);
      const fromAccount = account?.auth_user_id ?? "";
      if (fromAccount) await markPinOffered(fromAccount);
      return fromAccount;
    } catch {
      // The offer flag is a convenience. Failing to store it must not block the customer.
      return "";
    }
  };
  /**
   * Saving, once the same four digits have been entered twice.
   *
   * There is no button to press for this: the fourth digit of the second entry is
   * the confirmation. If the PIN cannot be kept, the page says so and starts
   * again rather than walking the customer into the app as if it had worked.
   */
  const savePin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const userId = await rememberOffered();
      if (!userId) throw new Error("An account is required before a PIN can be saved.");
      await setCustomerPin(pin, userId);
      haptic.success();
      void recordSecurityEvent("pin_set");
    } catch {
      setNotice("The PIN could not be kept on this device, so it was not saved. Choose your four digits again to retry, or skip and set one later from your profile.");
      setPin("");
      setConfirm("");
      setStep("choose");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.replace("/(tabs)" as never);
  };
  /** Skips the offer. Still remembered, so nobody is nagged twice. */
  const skip = async () => {
    if (busy) return;
    setBusy(true);
    await rememberOffered();
    setBusy(false);
    router.replace("/(tabs)" as never);
  };
  /** The first four digits. The second box appears on its own. */
  const chooseDigits = (next: string) => {
    setNotice(null);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setConfirm("");
      setStep("confirm");
    }
  };
  /** The same four digits again. That is what saves it. */
  const confirmDigits = (next: string) => {
    setNotice(null);
    setConfirm(next);
    if (next.length !== PIN_LENGTH) return;
    if (next === pin) {
      void savePin();
      return;
    }
    setNotice("The two entries do not match. Start again.");
    setPin("");
    setConfirm("");
    setStep("choose");
  };
  const startAgain = () => {
    setNotice(null);
    setPin("");
    setConfirm("");
    setStep("choose");
  };
  if (accountReady === false) {
    return (
      <AppScreen>
        <View style={styles.signedOut}>
          <View style={styles.icon}><Ionicons name="keypad-outline" size={27} color={palette.accent} /></View>
          <DisplayText style={styles.title}>Sign in first.</DisplayText>
          <BodyText style={styles.body}>A 4 digit PIN belongs to an account. This device has none yet, so there is nothing for a PIN to open. Sign in with your phone number and the app will offer the PIN straight afterwards.</BodyText>
          <View style={styles.signedOutAction}>
            <PrimaryButton label="Go to sign in" icon="phone-portrait-outline" onPress={() => router.replace("/auth/phone" as never)} />
          </View>
        </View>
      </AppScreen>
    );
  }
  return (
    <AppScreen>
      {/* The keyboard must never cover the digits or the buttons. */}
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "web" ? undefined : Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.pageContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Nothing to type into, so nothing for a phone or a browser to stand
              in front of: the four digits are tapped on a pad, exactly as they are
              when opening the app. */}
          <View style={styles.pageBody}>
        <View style={styles.top}>
          <View style={styles.icon}><Ionicons name="keypad-outline" size={27} color={palette.accent} /></View>
          <DisplayText style={styles.title}>Open Chapman with a PIN next time.</DisplayText>
          <BodyText style={styles.body}>Your number is confirmed. Set 4 digits and you will not need another text message each time you open the app on this phone.</BodyText>
        </View>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            {step === "choose" ? "Choose 4 digits" : "Enter them once more"}
          </Text>
          <View style={styles.pad}>
            <PinPad
              value={step === "choose" ? pin : confirm}
              onChange={step === "choose" ? chooseDigits : confirmDigits}
              disabled={busy}
            />
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {busy ? <Text style={styles.notice}>Saving your PIN.</Text> : null}
          <Text style={styles.fine}>The PIN stays on this device and is never sent to Chapman. Five wrong tries and it asks for a new text message, which keeps your bookings private.</Text>
        </View>
        <View style={styles.actions}>
          {step === "confirm" ? (
            <TouchableOpacity onPress={startAgain} style={styles.skip} disabled={busy} accessibilityLabel="Start again">
              <Text style={styles.skipText}>Start again</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => void skip()} style={styles.skip} disabled={busy}>
            <Text style={styles.skipText}>Not now, take me to the app</Text>
          </TouchableOpacity>
        </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  signedOut: { flex: 1, alignItems: "center", justifyContent: "center", gap: 13, padding: 26 },
  signedOutAction: { alignSelf: "stretch", marginTop: 12 },
  pageContent: { flexGrow: 1, padding: 20, paddingBottom: 32 }, pageBody: { flexGrow: 1, justifyContent: "space-between", gap: 14 },
  top: { alignItems: "center", gap: 10, paddingTop: 16 },
  icon: { width: 54, height: 54, borderRadius: 18, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 25, lineHeight: 32, textAlign: "center", maxWidth: 300 },
  body: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 310 },
  card: { padding: 17, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, gap: 11 },
  pad: { alignItems: "center", paddingVertical: 4 },
  fieldLabel: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  notice: { color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15, marginTop: 3 },
  fine: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, marginTop: 7 },
  actions: { gap: 9, paddingBottom: 12 },
  skip: { minHeight: 46, alignItems: "center", justifyContent: "center" },
  skipText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
