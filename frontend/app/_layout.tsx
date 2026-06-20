import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar, View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/lib/auth";

LogBox.ignoreAllLogs(true);

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Login gate removed — app is accessible without sign-in. If somebody lands on
  // /login by accident (legacy link), bounce them straight to the dashboard.
  useEffect(() => {
    if (loading) return;
    if (segments[0] === "login") {
      router.replace("/(tabs)");
    }
  }, [loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#050505", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#00E5FF" size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#050505" },
        animation: "fade",
      }}
    />
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050505" }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
