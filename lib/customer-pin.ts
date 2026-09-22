import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { isValidPin, shouldForgetPin } from "./pin-policy";

/**
 * The 4 digit app PIN, kept on this device only.
 *
 * What it is for: so a customer who has already signed in does not need a fresh
 * text message every time they open the app. One text message, then the PIN.
 *
 * What it is not: a replacement for signing in. The PIN unlocks a sign-in that
 * is already stored on this device. If that stored sign-in is gone, which
 * happens if the app is reinstalled or the browser forgets it, no PIN can bring
 * it back and a new text message is required. That limitation is real and is
 * stated plainly in the app rather than hidden.
 *
 * The PIN itself is never stored. Only a salt and a hash of the PIN are kept, so
 * reading the storage does not reveal the PIN. On a phone that storage is the
 * operating system keychain, which is encrypted by the phone itself. In a web
 * browser it is ordinary browser storage, which is readable by anyone using that
 * browser, so treat the web version as a convenience lock rather than a
 * security boundary.
 */

const PIN_KEY = "chapman-app-pin";
const PROMPT_KEY = "chapman-app-pin-prompted";

type StoredPin = {
  salt: string;
  hash: string;
  failedAttempts: number;
  createdAt: string;
};

const isWeb = Platform.OS === "web";

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function readRaw(): Promise<string | null> {
  try {
    if (isWeb) {
      if (!hasWindow()) return null;
      return await AsyncStorage.getItem(PIN_KEY);
    }
    return await SecureStore.getItemAsync(PIN_KEY);
  } catch {
    return null;
  }
}

async function writeRaw(value: string): Promise<void> {
  if (isWeb) {
    if (!hasWindow()) return;
    await AsyncStorage.setItem(PIN_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(PIN_KEY, value);
}

async function removeRaw(): Promise<void> {
  try {
    if (isWeb) {
      if (!hasWindow()) return;
      await AsyncStorage.removeItem(PIN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(PIN_KEY);
  } catch {
    // Removing something that is not there is not an error worth reporting.
  }
}

async function readStored(): Promise<StoredPin | null> {
  const raw = await readRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPin>;
    if (typeof parsed.salt !== "string" || typeof parsed.hash !== "string") return null;
    return {
      salt: parsed.salt,
      hash: parsed.hash,
      failedAttempts: typeof parsed.failedAttempts === "number" ? parsed.failedAttempts : 0,
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

/** True when this device has a PIN to unlock with. */
export async function hasCustomerPin(): Promise<boolean> {
  return (await readStored()) !== null;
}

/**
 * Whether this customer has already been offered the PIN after signing in.
 *
 * The offer is made once and only once per account, so a customer who chose not
 * to set a PIN is not asked again on every sign-in.
 */
export async function wasPinOffered(userId: string): Promise<boolean> {
  if (!userId) return true;
  try {
    const raw = isWeb ? (hasWindow() ? await AsyncStorage.getItem(PROMPT_KEY) : null) : await SecureStore.getItemAsync(PROMPT_KEY);
    return raw === userId;
  } catch {
    return false;
  }
}

/** Remembers that this customer has had the offer, whether or not they took it. */
export async function markPinOffered(userId: string): Promise<void> {
  if (!userId) return;
  try {
    if (isWeb) {
      if (hasWindow()) await AsyncStorage.setItem(PROMPT_KEY, userId);
      return;
    }
    await SecureStore.setItemAsync(PROMPT_KEY, userId);
  } catch {
    // Losing this flag only means the offer appears once more. Not worth failing over.
  }
}

/** How many wrong tries have been made since the last correct one. */
export async function getPinFailedAttempts(): Promise<number> {
  return (await readStored())?.failedAttempts ?? 0;
}

/**
 * Saves a new PIN, replacing any existing one and clearing the try counter.
 * Rejects a PIN that is not exactly four digits.
 */
export async function setCustomerPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error("Choose exactly 4 digits.");
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  const record: StoredPin = { salt, hash, failedAttempts: 0, createdAt: new Date().toISOString() };
  await writeRaw(JSON.stringify(record));
}

/** Forgets the PIN on this device. Used when it is removed, or used up. */
export async function clearCustomerPin(): Promise<void> {
  await removeRaw();
}

export type PinCheck = {
  ok: boolean;
  failedAttempts: number;
  forgotten: boolean;
};

/**
 * Checks a PIN. A wrong one counts up, and once the tries are used up the PIN is
 * deleted and the caller is told, so the app can send the customer back to a
 * fresh sign-in rather than leaving them stuck on a screen they cannot pass.
 */
export async function verifyCustomerPin(pin: string): Promise<PinCheck> {
  const stored = await readStored();
  if (!stored) return { ok: false, failedAttempts: 0, forgotten: true };

  const hash = await hashPin(pin, stored.salt);
  if (hash === stored.hash) {
    if (stored.failedAttempts !== 0) {
      await writeRaw(JSON.stringify({ ...stored, failedAttempts: 0 }));
    }
    return { ok: true, failedAttempts: 0, forgotten: false };
  }

  const failedAttempts = stored.failedAttempts + 1;
  if (shouldForgetPin(failedAttempts)) {
    await clearCustomerPin();
    return { ok: false, failedAttempts, forgotten: true };
  }

  await writeRaw(JSON.stringify({ ...stored, failedAttempts }));
  return { ok: false, failedAttempts, forgotten: false };
}
