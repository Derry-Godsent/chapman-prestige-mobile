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

const authStorage = {
  getItem: (key: string) => Platform.OS === "web" ? (typeof window === "undefined" ? serverSafeStorage.getItem(key) : AsyncStorage.getItem(key)) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => Platform.OS === "web" ? (typeof window === "undefined" ? serverSafeStorage.setItem(key, value) : AsyncStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => Platform.OS === "web" ? (typeof window === "undefined" ? serverSafeStorage.removeItem(key) : AsyncStorage.removeItem(key)) : SecureStore.deleteItemAsync(key),
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
