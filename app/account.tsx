import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { BodyText, DisplayText, PrimaryButton, palette } from "@/components/chapman-ui";
import { CustomerAccount, getCurrentCustomerAccount, signOutCustomer } from "@/lib/customer-auth";

export default function AccountScreen() {
  const [account, setAccount] = useState<CustomerAccount | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentCustomerAccount().then(setAccount).catch(() => setAccount(null));
  }, []);

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
        {account === undefined ? <View style={styles.loading}><ActivityIndicator color={palette.blue} /></View> : account ? <View style={styles.content}>
          <View style={styles.avatar}><Ionicons name={account.avatar_style === "female" ? "woman-outline" : account.avatar_style === "male" ? "man-outline" : "person-outline"} size={32} color={palette.blue} /></View>
          <DisplayText style={styles.title}>{account.full_name || "Your Chapman account"}</DisplayText>
          <BodyText style={styles.phone}>{account.phone}</BodyText>
          <View style={styles.status}><Ionicons name="shield-checkmark-outline" size={18} color={palette.green} /><Text style={styles.statusText}>Phone number verified</Text></View>
          <View style={styles.info}><Text style={styles.infoTitle}>Your account keeps your bookings together.</Text><Text style={styles.infoBody}>When the staff system connection is activated, your real bookings, dates, payments, and service updates will appear here.</Text></View>
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

const styles = StyleSheet.create({ page: { flex: 1, padding: 20, backgroundColor: palette.canvas }, top: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" }, topLabel: { color: palette.blue, fontFamily: "Inter_700Bold", letterSpacing: 1.2, fontSize: 10 }, spacer: { width: 42 }, loading: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, gap: 12 }, avatar: { width: 86, height: 86, borderRadius: 30, backgroundColor: "#E4F4E9", alignItems: "center", justifyContent: "center", marginBottom: 5 }, title: { textAlign: "center", fontSize: 26, lineHeight: 34 }, phone: { textAlign: "center", maxWidth: 300 }, status: { flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 11, minHeight: 34, borderRadius: 12, backgroundColor: "#E5F5EA", marginTop: 5 }, statusText: { color: palette.green, fontFamily: "Inter_700Bold", fontSize: 11 }, info: { width: "100%", marginTop: 14, marginBottom: 10, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: palette.border, backgroundColor: "#FFFFFF", gap: 5 }, infoTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 }, infoBody: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 17 }, error: { color: palette.error, fontFamily: "Inter_500Medium", fontSize: 11, textAlign: "center" } });
