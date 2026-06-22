import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import {
  LogBox,
  StatusBar,
  View,
  ActivityIndicator,
  Animated,
} from "react-native";
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

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

function CustomSplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const rotateAnim = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);
  const subtextOpacity = new Animated.Value(0);
  const ringScaleAnim = new Animated.Value(1);
  const ringOpacityAnim = new Animated.Value(1);

  useEffect(() => {
    // Rotate animation (continuous loop)
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );

    // Start rotation
    rotateLoop.start();

    // Text fade in at 1 second
    setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // Subtext fade in at 1.5 seconds
    setTimeout(() => {
      Animated.timing(subtextOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1500);

    // Ring scale up + fade out at 2 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ringScaleAnim, {
          toValue: 1.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    // Complete splash at 2.5 seconds
    const timeout = setTimeout(() => {
      onAnimationComplete();
    }, 2500);

    return () => {
      clearTimeout(timeout);
      rotateLoop.stop();
    };
  }, [rotateAnim, textOpacity, subtextOpacity, ringScaleAnim, ringOpacityAnim, onAnimationComplete]);

  const rotateDeg = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050505",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer ring (larger, dimmer) */}
      <Animated.View
        style={{
          position: "absolute",
          width: 140,
          height: 140,
          borderRadius: 70,
          borderWidth: 2,
          borderColor: "#00E5FF",
          opacity: Animated.multiply(ringOpacityAnim, 0.3),
          transform: [
            { scale: ringScaleAnim },
            { rotate: rotateDeg },
          ],
        }}
      />

      {/* Inner ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 2,
          borderColor: "#00E5FF",
          opacity: ringOpacityAnim,
          transform: [
            { scale: ringScaleAnim },
            { rotate: rotateDeg },
          ],
        }}
      />

      {/* Main text */}
      <Animated.Text
        style={{
          position: "absolute",
          fontSize: 32,
          fontWeight: "800",
          color: "#00E5FF",
          letterSpacing: 6,
          opacity: textOpacity,
        }}
      >
        FREEZ AI
      </Animated.Text>

      {/* Subtext */}
      <Animated.Text
        style={{
          position: "absolute",
          fontSize: 11,
          color: "#A1A1A8",
          letterSpacing: 8,
          opacity: subtextOpacity,
          marginTop: 60,
        }}
      >
        COMMAND CENTER
      </Animated.Text>
    </View>
  );
}

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
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  if (!splashDone) {
    return <CustomSplashScreen onAnimationComplete={() => setSplashDone(true)} />;
  }

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
