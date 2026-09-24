import { useCallback, useState } from "react";
import { Linking, Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Camera } from "expo-camera";

import { requestChapmanNotificationPermission } from "@/lib/chapman-notifications";

/**
 * The real state of one phone permission, and the honest way to change it.
 *
 * A phone only ever asks once. After a customer says no, iOS and Android will
 * not ask again on their behalf, so the only way to change the answer is the
 * phone's own settings. This reports which situation the customer is in, so the
 * app can offer the right thing instead of a button that silently does nothing.
 */
export type PermissionStatus = "allowed" | "ask" | "blocked" | "unavailable";

export type PermissionReading = {
  status: PermissionStatus;
  /** True when the phone will still show its own question. */
  canAsk: boolean;
};

export type ChapmanPermission = "notifications" | "location" | "camera";

const unavailable: PermissionReading = { status: "unavailable", canAsk: false };

export async function readPermission(which: ChapmanPermission): Promise<PermissionReading> {
  if (Platform.OS === "web") return unavailable;

  try {
    if (which === "notifications") {
      const current = await Notifications.getPermissionsAsync();
      if (current.status === "granted") return { status: "allowed", canAsk: false };
      const canAsk = current.canAskAgain !== false;
      return { status: canAsk ? "ask" : "blocked", canAsk };
    }

    if (which === "location") {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status === "granted") return { status: "allowed", canAsk: false };
      const canAsk = current.canAskAgain !== false;
      return { status: canAsk ? "ask" : "blocked", canAsk };
    }

    const current = await Camera.getCameraPermissionsAsync();
    if (current.status === "granted") return { status: "allowed", canAsk: false };
    const canAsk = current.canAskAgain !== false;
    return { status: canAsk ? "ask" : "blocked", canAsk };
  } catch {
    return unavailable;
  }
}

export async function askForPermission(which: ChapmanPermission): Promise<PermissionReading> {
  if (Platform.OS === "web") return unavailable;

  // Notification permission is asked through the app's own helper so the
  // Android channel is created at the same time.
  if (which === "notifications") {
    const outcome = await requestChapmanNotificationPermission();
    if (outcome.enabled) return { status: "allowed", canAsk: false };
    return readPermission(which);
  }

  try {
    if (which === "location") await Location.requestForegroundPermissionsAsync();
    else await Camera.requestCameraPermissionsAsync();
  } catch {
    // The reading below says what actually happened.
  }
  return readPermission(which);
}

/**
 * Opens the phone's own settings for this app, which is the only place a
 * refused permission can be changed.
 */
export async function openPhoneSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Some browsers and unusual devices have no settings screen. Nothing to do.
  }
}

/** Reads all three permissions, and re-reads them when the customer comes back. */
export function usePhonePermissions() {
  const [readings, setReadings] = useState<Record<ChapmanPermission, PermissionReading>>({
    notifications: unavailable,
    location: unavailable,
    camera: unavailable,
  });
  const [busy, setBusy] = useState<ChapmanPermission | null>(null);

  const refresh = useCallback(async () => {
    const [notifications, location, camera] = await Promise.all([
      readPermission("notifications"),
      readPermission("location"),
      readPermission("camera"),
    ]);
    setReadings({ notifications, location, camera });
  }, []);

  const ask = useCallback(async (which: ChapmanPermission) => {
    setBusy(which);
    try {
      const reading = await askForPermission(which);
      setReadings((current) => ({ ...current, [which]: reading }));
    } finally {
      setBusy(null);
    }
  }, []);

  return { readings, busy, refresh, ask };
}

/** Plain words for each reading, used on screen so nothing is guessed at. */
export function permissionWords(reading: PermissionReading): string {
  if (reading.status === "allowed") return "Allowed";
  if (reading.status === "blocked") return "Open phone settings";
  if (reading.status === "unavailable") return "In the mobile app only";
  return "Allow";
}
