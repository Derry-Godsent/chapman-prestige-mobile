import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import { Platform, View } from "react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";

import { BookingProvider } from "@/lib/booking-store";
import { ThemeProvider } from "@/lib/theme-provider";
import { MobileRequestUpdateListener } from "@/components/mobile-request-update-listener";
import { keepDailyChapmanUpdatesAlive } from "@/lib/chapman-notifications";
import { startUpdateWatch } from "@/lib/app-update";

if (Platform.OS !== "web") void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(
    Platform.OS === "web"
      ? {}
      : {
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          PlusJakartaSans_700Bold,
          PlusJakartaSans_800ExtraBold,
        },
  );

  useEffect(() => {
    if (Platform.OS !== "web" && (loaded || error)) void SplashScreen.hideAsync();
  }, [loaded, error]);

  // If the customer asked for the daily 9:00 message, top the week up on open.
  useEffect(() => { void keepDailyChapmanUpdatesAlive(); }, []);

  // Added to a phone's home screen, a web app is kept alive and never asks the
  // server again, so new work never appears until the icon is deleted and added
  // back. This notices a newer build and refreshes on its own. Nothing happens on
  // a phone, where Expo handles updates.
  useEffect(() => { startUpdateWatch(); }, []);

  if (Platform.OS !== "web" && !loaded && !error) return null;

  return (
    <ThemeProvider>
      <BookingProvider>
        <Head>
          <title>Chapman Prestige</title>
          <meta
            name="description"
            content="Chapman Prestige Limited. Laundry, cleaning and the rest of what we do, booked from the app."
          />
          <meta name="theme-color" content="#1C2A5E" />
        </Head>
        <View style={{ flex: 1 }}>
          <Stack initialRouteName="splash" screenOptions={{ headerShown: false, animation: "fade" }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="splash" options={{ gestureEnabled: false }} />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen name="permissions" options={{ gestureEnabled: false }} />
            <Stack.Screen name="lock" options={{ gestureEnabled: false }} />
            <Stack.Screen name="set-pin" options={{ gestureEnabled: false }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="loyalty" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="auth/phone" />
            <Stack.Screen name="account" />
            <Stack.Screen name="services" />
            <Stack.Screen name="service/[id]" />
            <Stack.Screen name="booking/laundry" />
            <Stack.Screen name="booking/request-quote" />
            <Stack.Screen name="measure" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="booking/[id]" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="team" />
          </Stack>
          <MobileRequestUpdateListener />
        </View>
      </BookingProvider>
    </ThemeProvider>
  );
}
