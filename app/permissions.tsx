import { useCallback, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AppScreen } from "@/components/app-screen";
import { ChapmanPalette, DisplayText, PrimaryButton, useChapmanStyles } from "@/components/chapman-ui";
import { ScreenHeader } from "@/components/screen-header";
import {
  ChapmanPermission,
  PermissionReading,
  openPhoneSettings,
  permissionWords,
  usePhonePermissions,
} from "@/lib/phone-permissions";

/**
 * What the app may use, and what this phone has actually allowed.
 *
 * This screen shows the real state of each permission rather than a wish. A
 * phone only asks once: after a customer says no, the app cannot ask again, so
 * the button becomes a way into the phone's own settings, which is the only
 * place that answer can be changed.
 *
 * It is reached two ways. During first-time setup it continues on to sign in.
 * From Settings it behaves as an ordinary settings page.
 */
export default function PermissionsScreen() {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const { from } = useLocalSearchParams<{ from?: string }>();
  const openedFromSettings = from === "settings";
  const { readings, busy, refresh, ask } = usePhonePermissions();
  const [message, setMessage] = useState("");

  // Coming back from the phone's own settings must show the new answer.
  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const act = async (which: ChapmanPermission) => {
    const reading = readings[which];
    if (reading.status === "allowed") {
      await openPhoneSettings();
      setMessage("Phone settings are open. Change the Chapman choice there, then come back.");
      return;
    }
    if (reading.status === "blocked") {
      await openPhoneSettings();
      setMessage("The phone has already been asked once, so it will not ask again. Turn the Chapman choice on in the phone settings, then come back.");
      return;
    }
    await ask(which);
    setMessage("");
  };

  return (
    <AppScreen edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {openedFromSettings ? (
          <ScreenHeader title="Permissions" subtitle="What Chapman may use on this phone" onBack={() => router.back()} />
        ) : (
          <DisplayText style={styles.title}>A few helpful permissions.</DisplayText>
        )}

        <Text style={styles.body}>
          Choose what makes booking and service updates easier. Nothing here is required, and you can
          change any of it later. Your phone only asks once, so if you said no before, the button below
          takes you to the phone settings, where it can be turned back on.
        </Text>

        <View style={styles.cards}>
          <PermissionCard
            icon="notifications-outline"
            title="Service updates"
            text="An alert when Chapman confirms a date, writes a note, or answers your request. This is also the 9:00 morning message."
            reading={readings.notifications}
            busy={busy === "notifications"}
            onPress={() => void act("notifications")}
          />
          <PermissionCard
            icon="location-outline"
            title="Pickup location"
            text="Share one pickup point with a booking, so the Chapman team finds you without guessing."
            reading={readings.location}
            busy={busy === "location"}
            onPress={() => void act("location")}
          />
          <PermissionCard
            icon="camera-outline"
            title="Camera"
            text="Used only for guided room and carpet measurements, and only while you are measuring."
            reading={readings.camera}
            busy={busy === "camera"}
            onPress={() => void act("camera")}
          />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {Platform.OS !== "web" ? (
          <TouchableOpacity onPress={() => void openPhoneSettings()} style={styles.settingsLink}>
            <Ionicons name="settings-outline" size={16} color={palette.accent} />
            <Text style={styles.settingsLinkText}>Open phone settings for Chapman</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.note}>
          Chapman does not follow your location in the background. A pickup point is shared only with the
          booking you send, and only when you press Share.
        </Text>

        <View style={styles.actions}>
          {openedFromSettings ? (
            <PrimaryButton label="Done" icon="checkmark" onPress={() => router.back()} />
          ) : (
            <PrimaryButton label="Continue" icon="arrow-forward" onPress={() => router.replace("/welcome" as never)} />
          )}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function PermissionCard({
  icon,
  title,
  text,
  reading,
  busy,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  reading: PermissionReading;
  busy: boolean;
  onPress: () => void;
}) {
  const { styles, palette } = useChapmanStyles(makeStyles);
  const allowed = reading.status === "allowed";
  const blocked = reading.status === "blocked";

  return (
    <View style={[styles.permissionCard, allowed && styles.permissionCardAllowed]}>
      <View style={[styles.cardIcon, allowed && styles.cardIconAllowed]}>
        <Ionicons name={allowed ? "checkmark" : icon} size={20} color={allowed ? palette.onAccent : palette.accent} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
        {blocked ? <Text style={styles.cardWarn}>Not allowed on this phone yet</Text> : null}
      </View>
      <TouchableOpacity
        onPress={onPress}
        disabled={busy}
        style={[styles.cardAction, allowed && styles.cardActionAllowed, blocked && styles.cardActionBlocked]}
      >
        {busy ? (
          <ActivityIndicator color={palette.accent} />
        ) : (
          <Text style={[styles.cardActionText, allowed && styles.cardActionTextAllowed, blocked && styles.cardActionTextBlocked]}>{permissionWords(reading)}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (palette: ChapmanPalette) => StyleSheet.create({
  page: { flexGrow: 1, padding: 24, gap: 12, backgroundColor: palette.canvas },
  title: { fontSize: 29, lineHeight: 36, textAlign: "center", color: palette.title },
  body: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, textAlign: "center" },
  cards: { gap: 10, marginTop: 6 },
  permissionCard: { minHeight: 97, padding: 13, borderRadius: 19, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, flexDirection: "row", alignItems: "center", gap: 10 },
  permissionCardAllowed: { borderColor: palette.accentBorder, backgroundColor: palette.soft },
  cardIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: palette.chipBlue, alignItems: "center", justifyContent: "center" },
  cardIconAllowed: { backgroundColor: palette.green },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { color: palette.ink, fontFamily: "Inter_700Bold", fontSize: 13 },
  cardText: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 14 },
  cardWarn: { color: palette.secondaryOrange, fontFamily: "Inter_700Bold", fontSize: 10 },
  cardAction: { minWidth: 55, maxWidth: 104, minHeight: 38, paddingHorizontal: 8, borderRadius: 10, backgroundColor: palette.chipBlue, alignItems: "center", justifyContent: "center" },
  cardActionAllowed: { backgroundColor: palette.chipGreen },
  cardActionBlocked: { backgroundColor: palette.chipOrange },
  cardActionText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 10, textAlign: "center" },
  cardActionTextAllowed: { color: palette.green },
  cardActionTextBlocked: { color: palette.secondaryOrange },
  message: { color: palette.green, fontFamily: "Inter_600SemiBold", fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 12 },
  settingsLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  settingsLinkText: { color: palette.accent, fontFamily: "Inter_700Bold", fontSize: 12 },
  note: { color: palette.muted, fontFamily: "Inter_400Regular", fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 12 },
  actions: { gap: 12, marginTop: 4 },
});
