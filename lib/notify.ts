import { Alert, Platform } from "react-native";

/**
 * Shows a short message to the customer.
 *
 * Why this exists: on a phone, Alert.alert is the normal way to say something.
 * In a browser it does nothing at all, so a customer on the web app taps a
 * button and nothing seems to happen. That is how a warning about a Sunday
 * pickup, or a note explaining what to type, quietly disappears.
 *
 * This uses the phone's own dialog on a phone, and the browser's own dialog on
 * the web, so the same message reaches the customer either way.
 */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(text);
    }
    return;
  }

  Alert.alert(title, message);
}

/**
 * Asks the customer to confirm something, and answers true only if they agree.
 * On a phone this is the normal two button dialog. In a browser it is the
 * browser's own confirmation, because a phone dialog does nothing there.
 */
export function confirmAction(title: string, message?: string, confirmLabel = "Continue"): Promise<boolean> {
  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      return Promise.resolve(window.confirm(text));
    }
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
