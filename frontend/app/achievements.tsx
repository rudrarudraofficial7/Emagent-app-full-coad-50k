import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { colors, fonts, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  first_eval_pass: "checkmark-done-circle",
  first_funded: "rocket",
  first_payout: "cash",
  payout_5k: "star",
  payout_10k: "ribbon",
  payout_25k: "trophy",
  payout_50k: "diamond",
};

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    try { setData(await api.getDashboard()); } catch (e) { console.warn(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <ScreenBackground><ActivityIndicator color={colors.brand} style={{ marginTop: 200 }} /></ScreenBackground>;

  const unlocked = data.achievements.filter((a: any) => a.unlocked).length;

  return (
    <ScreenBackground>
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="arrow-back" color={colors.text} size={20} /></Pressable>
        <Text style={styles.topTitle}>ACHIEVEMENTS</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
        <GlassCard style={{ alignItems: "center", padding: 22 }} glow="gold">
          <Ionicons name="ribbon" color={colors.gold} size={42} />
          <Text style={{ color: colors.text, fontFamily: fonts.mono, fontSize: 32, fontWeight: "800", marginTop: 10 }}>
            {unlocked} / {data.achievements.length}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, letterSpacing: 1.4, marginTop: 4 }}>UNLOCKED</Text>
        </GlassCard>

        <View style={{ height: spacing.xl }} />
        <View style={styles.grid}>
          {data.achievements.map((a: any, i: number) => (
            <Animated.View key={a.id} entering={FadeInUp.delay(i * 60).duration(380)} style={styles.gridItem}>
              <GlassCard
                glow={a.unlocked ? "gold" : "none"}
                style={[styles.badge, !a.unlocked ? { opacity: 0.5 } : null]}
              >
                <View style={[styles.iconWrap, { backgroundColor: a.unlocked ? colors.goldDim : colors.surface2 }]}>
                  <Ionicons name={ICONS[a.id] || "ribbon"} color={a.unlocked ? colors.gold : colors.textDim} size={24} />
                </View>
                <Text style={[styles.badgeTitle, a.unlocked ? null : { color: colors.textMuted }]}>{a.title}</Text>
                <Text style={styles.badgeDesc}>{a.desc}</Text>
                {a.unlocked ? (
                  <View style={styles.unlockedTag}>
                    <Ionicons name="checkmark" color={colors.green} size={10} />
                    <Text style={styles.unlockedText}>UNLOCKED</Text>
                  </View>
                ) : null}
              </GlassCard>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  topTitle: { color: colors.text, fontSize: 12, letterSpacing: 2, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  gridItem: { width: "50%", paddingHorizontal: 6, marginBottom: 12 },
  badge: { padding: 16, minHeight: 170 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  badgeTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 12 },
  badgeDesc: { color: colors.textDim, fontSize: 11, marginTop: 4, lineHeight: 15 },
  unlockedTag: { flexDirection: "row", alignItems: "center", marginTop: 10, alignSelf: "flex-start", backgroundColor: colors.greenDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  unlockedText: { color: colors.green, fontSize: 9, fontWeight: "800", letterSpacing: 1, marginLeft: 4 },
});
