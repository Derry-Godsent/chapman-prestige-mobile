import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { palette } from "@/components/chapman-ui";

const tabIcons: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: "home", inactive: "home-outline" },
  bookings: { active: "calendar", inactive: "calendar-outline" },
  workers: { active: "people", inactive: "people-outline" },
  chat: { active: "chatbubble", inactive: "chatbubble-outline" },
  profile: { active: "person", inactive: "person-outline" },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.blue,
        tabBarInactiveTintColor: "#7A6A59",
        tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 10, marginTop: 2 },
        tabBarStyle: {
          height: 60 + bottomPadding,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#DED4C6",
          shadowColor: "#1C1208",
          shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 14,
          elevation: 12,
        },
        tabBarIcon: ({ color, focused }) => {
          const iconSet = tabIcons[route.name];
          return <Ionicons name={focused ? iconSet.active : iconSet.inactive} size={23} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings" }} />
      <Tabs.Screen name="workers" options={{ title: "Workers" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
