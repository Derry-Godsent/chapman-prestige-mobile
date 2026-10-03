import { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { setCustomerPin, markPinOffered } from "@/lib/customer-pin";
import { getCurrentCustomerAccount } from "@/lib/customer-auth";
import { recordSecurityEvent } from "@/lib/app-security-log";
import { supabase } from "@/lib/supabase";
import { getCustomerSession } from "@/lib/customer-auth";
import { PinField } from "@/components/pin-field";
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
  const { styles, palette } = useChapmanStyles(makeStyles);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
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
  const finish = async (setIt: boolean) => {
    if (busy) return;
    if (setIt) {
      if (!isValidPin(pin)) { setNotice("Choose exactly 4 digits, for example 2 0 4 8."); return; }
      if (pin !== confirm) { setNotice("The two entries do not match. Please try again."); return; }
    }
    setBusy(true);
    try {
      const userId = await rememberOffered();
      if (setIt) {
        if (!userId) throw new Error("An account is required before a PIN can be saved.");
        // The PIN remembers whose it is, so it can never be asked of a different
        // person who signs in on this phone.
        await setCustomerPin(pin, userId);
        haptic.success();
        void recordSecurityEvent("pin_set");
      }
    } catch {
      // Saying "ready" while keeping nothing is how a customer ends up believing
      // they have a PIN that will never be asked for. Better to stay here, say
      // what happened, and let them try again or skip.
      setNotice("The PIN could not be kept on this device, so it was not saved. Tap Set my PIN to try again, or skip and set one later from your profile.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.replace("/(tabs)" as never);
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
      <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={styles.pageContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* One child only: this component refuses anything else. */}
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
            <View style={styles.pageBody}>
        <View style={styles.top}>
          <View style={styles.icon}><Ionicons name="keypad-outline" size={27} color={palette.accent} /></View>
          <DisplayText style={styles.title}>Open Chapman with a PIN next time.</DisplayText>
          <BodyText style={styles.body}>Your number is confirmed. Set 4 digits and you will not need another text message each time you open the app on this phone.</BodyText>
        </View>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Choose 4 digits</Text>
          <PinField
            value={pin}
            onChangeText={(value) => setPin(value.replace(/[^0-9]/g, ""))}
            boxStyle={styles.input}
            accessibilityLabel="Choose 4 digits"
          />
          <Text style={styles.fieldLabel}>Enter them once more</Text>
          <PinField
            value={confirm}
            onChangeText={(value) => setConfirm(value.replace(/[^0-9]/g, ""))}
            boxStyle={styles.input}
            accessibilityLabel="Enter the 4 digits once more"
          />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.hideKeyboard}>
            <Ionicons name="chevron-down-outline" size={16} color={palette.muted} />
            <Text style={styles.hideKeyboardText}>Hide the keyboard</Text>
          </TouchableOpacity>
          <Text style={styles.fine}>The PIN stays on this phone and is never sent to Chapman. Five wrong tries and it asks for a new text message, which keeps your bookings private.</Text>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label={busy ? "Saving" : "Set my PIN"} icon="checkmark" onPress={() => void finish(true)} disabled={busy} />
          <TouchableOpacity onPress={() => void finish(false)} style={styles.skip} disabled={busy}>
            <Text style={styles.skipText}>Not now, take me to the app</Text>
          </TouchableOpacity>
        </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  signedOut: { flex: 1, alignItems: "center", justifyContent: "center", gap: 13, padding: 26 },
  signedOutAction: { alignSelf: "stretch", marginTop: 12 },
  pageContent: { flexGrow: 1, padding: 22, paddingBottom: 40 }, pageBody: { flexGrow: 1, justifyContent: "space-between", gap: 18 },
  hideKeyboard: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: palette.soft, marginTop: 6 },
  hideKeyboardText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 11 },
  top: { alignItems: "center", gap: 11, paddingTop: 30 },
  icon: { width: 62, height: 62, borderRadius: 21, backgroundColor: palette.chip, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 25, lineHeight: 32, textAlign: "center", maxWidth: 300 },
  body: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 310 },
  card: { padding: 17, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, gap: 7 },
  fieldLabel: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: palette.border, paddingHorizontal: 14, color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 6, backgroundColor: palette.surface },
  notice: { color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15, marginTop: 3 },
  fine: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, marginTop: 7 },
  actions: { gap: 9, paddingBottom: 12 },
  skip: { minHeight: 46, alignItems: "center", justifyContent: "center" },
  skipText: { color: palette.muted, fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
