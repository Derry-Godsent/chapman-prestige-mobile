import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const serverSafeStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => undefined,
  removeItem: async (_key: string): Promise<void> => undefined,
};

const SECURE_STORAGE_CHUNK_SIZE = 1800;

function securePartKey(key: string, index: number) {
  return `${key}.part.${index}`;
}

function secureMetaKey(key: string) {
  return `${key}.meta`;
}

async function readSecureValue(key: string): Promise<string | null> {
  const storedMeta = await SecureStore.getItemAsync(secureMetaKey(key));
  if (storedMeta) {
    try {
      const { parts } = JSON.parse(storedMeta) as { parts?: unknown };
      if (typeof parts === "number" && Number.isInteger(parts) && parts > 0 && parts <= 20) {
        const storedParts = await Promise.all(Array.from({ length: parts }, (_, index) => SecureStore.getItemAsync(securePartKey(key, index))));
        if (storedParts.every((part): part is string => typeof part === "string")) return storedParts.join("");
      }
    } catch {
      // A partial or older session falls through to the legacy key below.
    }
  }
  return SecureStore.getItemAsync(key);
}

async function writeSecureValue(key: string, value: string): Promise<void> {
  const chunks = value.match(new RegExp(`.{1,${SECURE_STORAGE_CHUNK_SIZE}}`, "g")) ?? [""];
  const previousMeta = await SecureStore.getItemAsync(secureMetaKey(key));
  let previousParts = 0;
  try { previousParts = Number((JSON.parse(previousMeta ?? "{}") as { parts?: number }).parts) || 0; } catch { previousParts = 0; }

  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(securePartKey(key, index), chunk)));
  await SecureStore.setItemAsync(secureMetaKey(key), JSON.stringify({ parts: chunks.length }));
  await SecureStore.deleteItemAsync(key);
  await Promise.all(Array.from({ length: Math.max(0, previousParts - chunks.length) }, (_, index) => SecureStore.deleteItemAsync(securePartKey(key, chunks.length + index))));
}

async function removeSecureValue(key: string): Promise<void> {
  const storedMeta = await SecureStore.getItemAsync(secureMetaKey(key));
  let parts = 0;
  try { parts = Number((JSON.parse(storedMeta ?? "{}") as { parts?: number }).parts) || 0; } catch { parts = 0; }
  await Promise.all([
    SecureStore.deleteItemAsync(key),
    SecureStore.deleteItemAsync(secureMetaKey(key)),
    ...Array.from({ length: Math.min(Math.max(parts, 0), 20) }, (_, index) => SecureStore.deleteItemAsync(securePartKey(key, index))),
  ]);
}

const authStorage = {
  getItem: (key: string) => Platform.OS === "web" ? (typeof window === "undefined" ? serverSafeStorage.getItem(key) : AsyncStorage.getItem(key)) : readSecureValue(key),
  setItem: (key: string, value: string) => Platform.OS === "web" ? (typeof window === "undefined" ? serverSafeStorage.setItem(key, value) : AsyncStorage.setItem(key, value)) : writeSecureValue(key, value),
  removeItem: (key: string) => Platform.OS === "web" ? (typeof window === "undefined" ? serverSafeStorage.removeItem(key) : AsyncStorage.removeItem(key)) : removeSecureValue(key),
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
