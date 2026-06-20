import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useEffect, useState } from "react";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { useAuth } from "@/src/lib/auth";
import { colors, fonts, radius, spacing } from "@/src/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const onSignIn = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.warn("signin failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground>
      {/* Animated trading-grid background accents */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,229,255,0.18)", "transparent"]}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.7, y: 0.4 }}
        style={styles.bgGlow}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(212,175,55,0.10)"]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 1 }}
        style={styles.bgGoldGlow}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: spacing.xl }}
      >
        <View style={styles.brandRow}>
          <Animated.View style={[styles.brandIcon, pulseStyle]}>
            <Ionicons name="pulse" color={colors.brand} size={22} />
          </Animated.View>
          <Text style={styles.brandText}>FREEZY</Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
          <Animated.View entering={FadeInDown.duration(600)}>
            <Text style={styles.eyebrow}>COMMAND CENTER</Text>
            <Text style={styles.title}>Trade.{"\n"}Scale.{"\n"}Dominate.</Text>
            <Text style={styles.sub}>
              Your private prop firm operating system. Pass evaluations, track funded accounts, claim payouts, hit $50K.
            </Text>
          </Animated.View>

          <View style={{ height: spacing.xxl }} />

          <Animated.View entering={FadeIn.delay(280).duration(600)}>
            <View style={styles.featureRow}>
              <Feature icon="checkmark-circle" label="Evaluation Tracking" />
              <Feature icon="trending-up" label="Funded Scaling" />
            </View>
            <View style={{ height: 10 }} />
            <View style={styles.featureRow}>
              <Feature icon="cash" label="Payout Management" color={colors.gold} />
              <Feature icon="rocket" label="Account Growth" color={colors.green} />
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(420).duration(600)}>
          <Pressable
            testID="google-signin-btn"
            onPress={onSignIn}
            disabled={submitting}
            style={[styles.googleBtn, submitting ? { opacity: 0.6 } : null]}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <GoogleIconCircle />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.legal}>
            By continuing, you agree to operate this dashboard responsibly. Your data stays in your account.
          </Text>
        </Animated.View>
      </ScrollView>
    </ScreenBackground>
  );
}

function Feature({ icon, label, color = colors.brand }: { icon: any; label: string; color?: string }) {
  return (
    <View style={[styles.feature, { borderColor: `${color}55` }]}>
      <Ionicons name={icon} color={color} size={16} />
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

function GoogleIconCircle() {
  return (
    <View style={styles.gIconWrap}>
      <Text style={styles.gIconText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bgGlow: { position: "absolute", top: -100, left: -80, right: -80, height: 460 },
  bgGoldGlow: { position: "absolute", bottom: -140, left: -40, right: -40, height: 360 },
  brandRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  brandIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandDim, borderWidth: 1, borderColor: colors.brand },
  brandText: { color: colors.text, marginLeft: 10, fontSize: 16, fontWeight: "800", letterSpacing: 3.4 },

  eyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 2.6, fontWeight: "800" },
  title: { color: colors.text, fontSize: 48, fontWeight: "900", marginTop: 12, lineHeight: 54, letterSpacing: -1 },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: 18, lineHeight: 21, maxWidth: 320 },

  featureRow: { flexDirection: "row", gap: 10 },
  feature: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.surface },
  featureLabel: { color: colors.textMuted, fontSize: 12, marginLeft: 8, fontWeight: "600" },

  googleBtn: {
    height: 56, borderRadius: radius.pill, backgroundColor: "#FFFFFF",
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    shadowColor: "#00E5FF", shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 12,
  },
  googleBtnText: { color: "#000", fontSize: 15, fontWeight: "800", marginLeft: 12, letterSpacing: 0.3 },
  gIconWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#EA4335", alignItems: "center", justifyContent: "center" },
  gIconText: { color: "#fff", fontFamily: fonts.mono, fontSize: 14, fontWeight: "900" },

  legal: { color: colors.textDim, fontSize: 11, textAlign: "center", marginTop: 18, lineHeight: 16 },
});
