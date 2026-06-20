import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { ProgressRing } from "@/src/components/ProgressRing";
import { colors, fonts, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const TIERS = [
  { min: 0, max: 25, label: "ROOKIE", color: "#7A7A85" },
  { min: 25, max: 50, label: "BUILDER", color: "#00E5FF" },
  { min: 50, max: 75, label: "SCALER", color: "#D4AF37" },
  { min: 75, max: 100, label: "ELITE", color: "#00FF66" },
];

export default function GoalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    try { setData(await api.getDashboard()); } catch (e) { console.warn(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <ScreenBackground><ActivityIndicator color={colors.brand} style={{ marginTop: 200 }} /></ScreenBackground>;

  const { goal, kpis } = data;
  const forecast = data.forecast || { available: false };
  const etaText = forecast.etaDate
    ? new Date(forecast.etaDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <ScreenBackground>
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="arrow-back" color={colors.text} size={20} /></Pressable>
        <Text style={styles.topTitle}>FINAL GOAL</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
        <LinearGradient
          colors={["rgba(212,175,55,0.18)", "rgba(0,229,255,0.12)"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>MISSION TARGET</Text>
          <Text style={styles.heroAmount}>${(goal.target / 1000).toFixed(0)}K</Text>
          <Text style={styles.heroSub}>{goal.motivation.toUpperCase()}</Text>
          <View style={{ height: 16 }} />
          <ProgressRing
            progress={goal.progressPct}
            size={220}
            stroke={16}
            title="PROGRESS"
            centerValue={`${goal.progressPct}%`}
            centerSubtitle={goal.motivation}
          />
          <View style={{ height: 16 }} />
          <Text style={styles.heroProgress}>
            ${goal.current.toFixed(0)} <Text style={{ color: colors.textDim }}>/ ${goal.target.toFixed(0)}</Text>
          </Text>
        </LinearGradient>

        {/* ETA Forecast */}
        <View style={{ height: spacing.lg }} />
        <Text style={styles.sectionTitle}>ETA FORECAST</Text>
        <GlassCard glow={forecast.available ? "brand" : "none"} style={{ padding: 18 }} testID="eta-forecast-card">
          {forecast.available ? (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.forecastLabel}>PROJECTED COMPLETION</Text>
                  <Text style={[styles.forecastValue, { color: colors.brand }]} testID="eta-date-value">
                    {forecast.daysToGoal === 0 ? "TODAY" : etaText}
                  </Text>
                  <Text style={styles.forecastHint}>
                    {forecast.daysToGoal === 0 ? "Goal reached!" : `${forecast.daysToGoal} days from now`}
                  </Text>
                </View>
                <View style={[styles.iconWrap, { backgroundColor: colors.brandDim }]}>
                  <Ionicons name="rocket" color={colors.brand} size={22} />
                </View>
              </View>
              <View style={styles.divider} />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.forecastLabel}>PROJECTED MONTHLY</Text>
                  <Text style={[styles.forecastSmallValue, { color: colors.gold }]} testID="projected-monthly-value">
                    ${(forecast.projectedMonthly || 0).toFixed(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.forecastLabel}>DAILY VELOCITY</Text>
                  <Text style={[styles.forecastSmallValue, { color: colors.green }]}>
                    ${(forecast.dailyVelocity || 0).toFixed(2)}
                  </Text>
                </View>
              </View>
              <Text style={styles.forecastFormula}>
                Based on your current payout pace · improves as you record more payouts
              </Text>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <Ionicons name="time" color={colors.textDim} size={28} />
              <Text style={[styles.forecastValue, { fontSize: 14, color: colors.textMuted, marginTop: 8 }]}>
                Forecast Locked
              </Text>
              <Text style={[styles.forecastHint, { textAlign: "center" }]}>
                Record your first payout to unlock ETA prediction.
              </Text>
            </View>
          )}
        </GlassCard>

        <View style={{ height: spacing.lg }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stat label="Remaining" value={`$${kpis.remainingPayout.toFixed(0)}`} color={colors.gold} />
          <Stat label="Accounts Needed" value={String(data.goal.accountsNeeded)} color={colors.brand} />
          <Stat label="Days Left" value={String(kpis.daysRemaining)} color={colors.green} />
        </View>

        <View style={{ height: spacing.xl }} />
        <Text style={styles.sectionTitle}>MOTIVATION LEVEL</Text>
        {TIERS.map((t) => {
          const active = goal.progressPct >= t.min;
          const current = goal.progressPct >= t.min && goal.progressPct < t.max;
          return (
            <GlassCard
              key={t.label}
              style={[styles.tier, current ? { borderColor: t.color } : null]}
              glow={current ? (t.label === "ELITE" ? "green" : t.label === "SCALER" ? "gold" : "brand") : "none"}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[styles.tierDot, { backgroundColor: active ? t.color : colors.surface2, borderColor: t.color }]}>
                  {current ? <Ionicons name="flash" color="#000" size={14} /> : active ? <Ionicons name="checkmark" color="#000" size={14} /> : null}
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={[styles.tierTitle, { color: active ? colors.text : colors.textMuted }]}>{t.label}</Text>
                  <Text style={styles.tierRange}>{t.min}% – {t.max}%</Text>
                </View>
                {current ? <Text style={[styles.tierBadge, { color: t.color }]}>YOU</Text> : null}
              </View>
            </GlassCard>
          );
        })}
      </ScrollView>
    </ScreenBackground>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <GlassCard style={{ flex: 1, padding: 12 }}>
      <Text style={{ color: colors.textDim, fontSize: 9, fontWeight: "700", letterSpacing: 1.2 }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontFamily: fonts.mono, fontSize: 18, fontWeight: "800", marginTop: 4 }}>{value}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  topTitle: { color: colors.text, fontSize: 12, letterSpacing: 2, fontWeight: "800" },
  hero: { borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: colors.borderStrong },
  heroEyebrow: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: "700" },
  heroAmount: { color: colors.text, fontFamily: fonts.mono, fontSize: 42, fontWeight: "800", marginTop: 4 },
  heroSub: { color: colors.textMuted, fontSize: 11, letterSpacing: 1.6, marginTop: 4 },
  heroProgress: { color: colors.text, fontFamily: fonts.mono, fontSize: 16, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 13, letterSpacing: 1.8, fontWeight: "800", marginBottom: 12 },
  tier: { padding: 14, marginBottom: 10 },
  tierDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  tierTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 1.2 },
  tierRange: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  tierBadge: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  forecastLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  forecastValue: { color: colors.text, fontFamily: fonts.mono, fontSize: 22, fontWeight: "800", marginTop: 6 },
  forecastSmallValue: { fontFamily: fonts.mono, fontSize: 17, fontWeight: "800", marginTop: 6 },
  forecastHint: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  forecastFormula: { color: colors.textDim, fontSize: 10, marginTop: 12, lineHeight: 15 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
});
