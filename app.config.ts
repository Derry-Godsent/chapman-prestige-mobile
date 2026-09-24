// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Application identity. A bundle ID only contains letters, numbers, and dots,
// and every dot-separated segment must start with a letter (Android rule).
// Note: changing this after a release creates a new app on the stores, so it
// must be settled before the first store submission.
const bundleId = "com.app.chapmanprestigeclient";

// Brand deep-link scheme, e.g. chapmanprestige://booking/123
const appScheme = "chapmanprestige";

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Chapman Prestige",
  appSlug: "chapman-prestige-client",
  scheme: appScheme,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};


const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  // The home screen icon and the launch screen, both drawn from the Chapman
  // Prestige logo: the droplet on the company navy, with no text, because the
  // name under an icon is too small to read on a phone.
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#1C2A5E",
      foregroundImage: "./assets/images/adaptive-icon-foreground.png",
      backgroundImage: "./assets/images/adaptive-icon-background.png",
      monochromeImage: "./assets/images/adaptive-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to use your camera to guide room and carpet measurements.",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location to show your service area and help with booking addresses.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#0038B6",
        defaultChannel: "chapman-updates",
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#FBF7F0",
        dark: {
          backgroundColor: "#111318",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
