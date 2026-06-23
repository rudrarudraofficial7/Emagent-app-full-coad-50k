import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import {
  LogBox,
  StatusBar,
  View,
  ActivityIndicator,
  Animated,
  Text,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/lib/auth";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync();

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

function CustomSplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const candleOpacity1 = new Animated.Value(0);
  const candleOpacity2 = new Animated.Value(0);
  const candleOpacity3 = new Animated.Value(0);
  const candleOpacity4 = new Animated.Value(0);
  const candleOpacity5 = new Animated.Value(0);
  const arrowOpacity = new Animated.Value(0);
  const arrowScale = new Animated.Value(0.8);
  const textOpacity = new Animated.Value(0);
  const subtextOpacity = new Animated.Value(0);

  useEffect(() => {
    // Staggered candle fade-in
    Animated.sequence([
      Animated.timing(candleOpacity1, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(candleOpacity2, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(candleOpacity3, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(candleOpacity4, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(candleOpacity5, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Arrow fade-in and scale (at 800ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(arrowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(arrowScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 800);

    // FREEZ text fade-in (at 1.2s)
    setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 1200);

    // Subtext fade-in (at 1.7s)
    setTimeout(() => {
      Animated.timing(subtextOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1700);

    // Complete at 2.5s
    const timeout = setTimeout(() => {
      onAnimationComplete();
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050505",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Chart candles visualization */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 12,
          marginBottom: 40,
          height: 80,
        }}
      >
        {/* Candle 1 - Gold */}
        <Animated.View
          style={{
            width: 20,
            height: 40,
            backgroundColor: "#D4A574",
            borderRadius: 2,
            opacity: candleOpacity1,
            justifyContent: "flex-start",
            paddingTop: 2,
          }}
        >
          <View style={{ width: 2, height: 20, backgroundColor: "#888", alignSelf: "center" }} />
        </Animated.View>

        {/* Candle 2 - Dark */}
        <Animated.View
          style={{
            width: 20,
            height: 55,
            backgroundColor: "#4A4A4A",
            borderRadius: 2,
            opacity: candleOpacity2,
            justifyContent: "flex-start",
            paddingTop: 3,
          }}
        >
          <View style={{ width: 2, height: 22, backgroundColor: "#888", alignSelf: "center" }} />
        </Animated.View>

        {/* Candle 3 - Gold (tallest) */}
        <Animated.View
          style={{
            width: 20,
            height: 70,
            backgroundColor: "#D4A574",
            borderRadius: 2,
            opacity: candleOpacity3,
            justifyContent: "flex-start",
            paddingTop: 4,
          }}
        >
          <View style={{ width: 2, height: 26, backgroundColor: "#888", alignSelf: "center" }} />
        </Animated.View>

        {/* Candle 4 - Dark */}
        <Animated.View
          style={{
            width: 20,
            height: 50,
            backgroundColor: "#4A4A4A",
            borderRadius: 2,
            opacity: candleOpacity4,
            justifyContent: "flex-start",
            paddingTop: 3,
          }}
        >
          <View style={{ width: 2, height: 20, backgroundColor: "#888", alignSelf: "center" }} />
        </Animated.View>

        {/* Candle 5 - Gold */}
        <Animated.View
          style={{
            width: 20,
            height: 60,
            backgroundColor: "#D4A574",
            borderRadius: 2,
            opacity: candleOpacity5,
            justifyContent: "flex-start",
            paddingTop: 3,
          }}
        >
          <View style={{ width: 2, height: 24, backgroundColor: "#888", alignSelf: "center" }} />
        </Animated.View>

        {/* Arrow */}
        <Animated.Text
          style={{
            position: "absolute",
            right: -30,
            fontSize: 32,
            color: "#D4A574",
            fontWeight: "800",
            opacity: arrowOpacity,
            transform: [{ scale: arrowScale }],
          }}
        >
          ↗
        </Animated.Text>
      </View>

      {/* FREEZ Text */}
      <Animated.Text
        style={{
          fontSize: 40,
          fontWeight: "800",
          color: "#FFFFFF",
          letterSpacing: 8,
          opacity: textOpacity,
          marginBottom: 8,
        }}
      >
        FREEZ
      </Animated.Text>

      {/* Z with gold color */}
      <View style={{ position: "absolute", top: "45%", right: "35%" }}>
        <Animated.Text
          style={{
            fontSize: 40,
            fontWeight: "800",
            color: "#D4A574",
            opacity: textOpacity,
          }}
        >
          Z
        </Animated.Text>
      </View>

      {/* Subtext */}
      <Animated.Text
        style={{
          fontSize: 10,
          color: "#A1A1A8",
          letterSpacing: 2,
          opacity: subtextOpacity,
          marginTop: 12,
        }}
      >
        TRADE • PLAN • PROFIT
      </Animated.Text>
    </View>
  );
}

function AuthGate() {
  const { loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
