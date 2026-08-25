import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import * as SplashScreen from "expo-splash-screen";

import { BookingProvider } from "@/lib/booking-store";
import { ThemeProvider } from "@/lib/theme-provider";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <BookingProvider>
        <Stack initialRouteName="onboarding" screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="services" />
          <Stack.Screen name="service/[id]" />
          <Stack.Screen name="booking/laundry" />
          <Stack.Screen name="booking/request-quote" />
          <Stack.Screen name="checkout" />
          <Stack.Screen name="booking/[id]" />
          <Stack.Screen name="notifications" />
        </Stack>
      </BookingProvider>
    </ThemeProvider>
  );
}
