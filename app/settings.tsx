import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppScreen } from "@/components/app-screen";
import { BodyText, useChapmanStyles, ChapmanPalette } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import { useThemeContext } from "@/lib/theme-provider";
import { signOutCustomer } from "@/lib/customer-auth";
import { useCustomerAccount } from "@/hooks/use-customer-account";
import { BOOKING_ALERTS_KEY, countScheduledDailyUpdates, disableDailyChapmanUpdates, enableDailyChapmanUpdates, isDailyChapmanUpdateOn, requestChapmanNotificationPermission, sendTestChapmanUpdate } from "@/lib/chapman-notifications";
import { hasCustomerPin } from "@/lib/customer-pin";
import { confirmAction, notify } from "@/lib/notify";

/**
 * App settings. Every switch here does something real:
 * appearance is the app's own theme, updates schedule a real device
 * notification, the PIN is the real 4 digit lock, permissions open the real
 * permission screen, and signing out really signs out.
 */
export default function SettingsScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const { colorScheme, preference, setPreference } = useThemeContext();
  const [pinSet, setPinSet] = useState(false);
  const [dailyOn, setDailyOn] = useState(false);
  const [dailyBusy, setDailyBusy] = useState(false);
  const [serviceAlerts, setServiceAlerts] = useState(true);
  const [morningsReady, setMorningsReady] = useState(0);
  const [testBusy, setTestBusy] = useState(false);
  const { account } = useCustomerAccount();

  // The switches show the truth when the screen opens: what the customer asked
  // for, and whether this phone still holds the messages to send.
  useEffect(() => {
    void hasCustomerPin().then(setPinSet);
    void isDailyChapmanUpdateOn().then(setDailyOn);
    void AsyncStorage.getItem(BOOKING_ALERTS_KEY).then((stored) => setServiceAlerts(stored !== "no"));
  }, []);

  const refreshAlerts = async () => {
    setDailyOn(await isDailyChapmanUpdateOn());
    setMorningsReady(await countScheduledDailyUpdates());
    const stored = await AsyncStorage.getItem(BOOKING_ALERTS_KEY);
    setServiceAlerts(stored !== "no");
  };

  // Returning from the phone's own settings must show the new truth at once.
  useFocusEffect(useCallback(() => {
    void refreshAlerts();
  }, []));

  const appVersion = (Constants.expoConfig?.version as string | undefined) ?? "1.0.0";

  const toggleDaily = async (value: boolean) => {
    setDailyBusy(true);
    try {
      if (value) {
        const result = await enableDailyChapmanUpdates();
        setDailyOn(result.enabled);
        if (!result.enabled) notify("Not switched on", result.message);
      } else {
        await disableDailyChapmanUpdates();
        setDailyOn(false);
      }
    } catch {
      notify("Could not change this", "Please try again in a moment.");
    } finally {
      setDailyBusy(false);
    }
  };

  const toggleServiceAlerts = async (value: boolean) => {
    if (!value) {
      setServiceAlerts(false);
      await AsyncStorage.setItem(BOOKING_ALERTS_KEY, "no");
      return;
    }
    const permission = await requestChapmanNotificationPermission();
    setServiceAlerts(permission.enabled);
    await AsyncStorage.setItem(BOOKING_ALERTS_KEY, permission.enabled ? "yes" : "no");
    if (!permission.enabled) notify("Not switched on", permission.message);
  };

  /** Sends a message now, so the customer can see the alerts really arrive. */
  const tryTestMessage = async () => {
    setTestBusy(true);
    try {
      const result = await sendTestChapmanUpdate();
      notify(result.sent ? "Test message sent" : "Could not send the test", result.message);
    } finally {
      setTestBusy(false);
    }
  };

  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = async () => {
    const agreed = await confirmAction(
      "Sign out of Chapman?",
      "Your bookings, routines, and profile stay on your account. You will need a code by text to sign back in.",
      "Sign out",
    );
    if (!agreed) return;
    setSigningOut(true);
    try {
      await signOutCustomer();
      router.replace("/(tabs)/profile" as never);
    } catch {
      notify("Could not sign you out", "Please try again in a moment.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Settings" subtitle="Appearance, alerts, and your account" onBack={() => router.back()} />

        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="contrast-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Appearance</Text>
              <Text style={styles.rowMeta}>
                {preference === "system"
                  ? `Following your phone, which is ${colorScheme === "dark" ? "dark" : "light"} right now.`
                  : `${preference === "dark" ? "Dark" : "Light"}, as you chose.`}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.appearanceChoices}>
            {([["light", "Light", "sunny-outline"], ["dark", "Dark", "moon-outline"], ["system", "My phone", "phone-portrait-outline"]] as const).map(([value, label, icon]) => (
              <TouchableOpacity
                key={value}
                onPress={() => setPreference(value)}
                style={[styles.appearanceChoice, preference === value && styles.appearanceChoiceOn]}
                accessibilityLabel={`Use the ${label} appearance`}
              >
                <Ionicons name={icon} size={18} color={preference === value ? palette.onAccent : palette.accent} />
                <Text style={[styles.appearanceChoiceText, preference === value && styles.appearanceChoiceTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>ALERTS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="notifications-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Daily Chapman update</Text><Text style={styles.rowMeta}>{dailyOn ? `A message every morning at 9:00. ${morningsReady} mornings are already waiting on this phone, so they arrive even with the app closed.` : "One message at 9:00 each morning with news and care tips."}</Text></View>
            {dailyBusy ? <ActivityIndicator color={palette.accent} /> : <Switch value={dailyOn} onValueChange={toggleDaily} trackColor={{ false: "#D7D1C7", true: "#81C5A7" }} thumbColor={palette.blue} />}
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="cube-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Booking alerts</Text><Text style={styles.rowMeta}>A device alert when Chapman confirms a date or writes a note.</Text></View>
            <Switch value={serviceAlerts} onValueChange={toggleServiceAlerts} trackColor={{ false: "#D7D1C7", true: "#81C5A7" }} thumbColor={palette.blue} />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => void tryTestMessage()} disabled={testBusy} style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="paper-plane-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Send a test message</Text><Text style={styles.rowMeta}>See one arrive now, so you know alerts work on this phone.</Text></View>
            {testBusy ? <ActivityIndicator color={palette.accent} /> : <Ionicons name="chevron-forward" size={18} color={palette.muted} />}
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => router.push("/permissions?from=settings" as never)} style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="options-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Permissions</Text><Text style={styles.rowMeta}>Camera, location, and alerts for the whole app.</Text></View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={styles.card}>
          <TouchableOpacity onPress={() => router.push("/account" as never)} style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="keypad-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>App lock</Text>
              <Text style={styles.rowMeta}>{pinSet ? "A 4 digit PIN is on. Change or remove it here." : "Set a 4 digit PIN so you do not wait for a text message."}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => router.push("/permissions?from=settings" as never)} style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="location-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Location sharing</Text><Text style={styles.rowMeta}>Choose when the app may use your area for pickups.</Text></View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>YOUR ACCOUNT</Text>
        <View style={styles.card}>
          <TouchableOpacity onPress={() => router.push("/account" as never)} style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="person-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{account?.full_name ?? "Your Chapman account"}</Text>
              <Text style={styles.rowMeta}>{account?.phone ?? "Not signed in on this device"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => router.push("/loyalty" as never)} style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="ribbon-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Elite Patronage</Text><Text style={styles.rowMeta}>Your tier, your discount, and how it grows.</Text></View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="information-circle-outline" size={19} color={palette.accent} /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Chapman Prestige app</Text><Text style={styles.rowMeta}>Version {appVersion} · Kumasi, Ghana</Text></View>
          </View>
        </View>

        {account ? (
          <TouchableOpacity onPress={() => void confirmSignOut()} disabled={signingOut} style={styles.signOut}>
            {signingOut ? <ActivityIndicator color="#B91C1C" /> : <Ionicons name="log-out-outline" size={19} color="#B91C1C" />}
            <Text style={styles.signOutText}>{signingOut ? "Signing out" : "Sign out"}</Text>
          </TouchableOpacity>
        ) : null}

        <BodyText style={styles.footnote}>Your bookings, routines, and profile are held on your Chapman account, not on this phone. Signing in on another phone brings them with you.</BodyText>
      </ScrollView>
    </AppScreen>
  );
}

const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  content: { padding: 20, paddingTop: 12, paddingBottom: 42, gap: 11, backgroundColor: palette.canvas },
  sectionLabel: { color: palette.eyebrow, fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.15, marginTop: 8 },
  card: { borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.chipBlue, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: palette.ink, fontFamily: "Inter_600SemiBold", fontSize: 13 },
  rowMeta: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15 },
  divider: { height: 1, backgroundColor: "#F1EEE9", marginLeft: 63 },
  signOut: { marginTop: 8, minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  signOutText: { color: "#B91C1C", fontFamily: "Inter_700Bold", fontSize: 13 },
  appearanceChoices: { flexDirection: "row", gap: 8, padding: 14, paddingTop: 12 },
  appearanceChoice: { flex: 1, minHeight: 62, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center", gap: 5 },
  appearanceChoiceOn: { backgroundColor: palette.blue, borderColor: palette.blue },
  appearanceChoiceText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10 },
  appearanceChoiceTextOn: { color: palette.onAccent },
  footnote: { marginTop: 6, fontSize: 10, lineHeight: 15, textAlign: "center" },
});
