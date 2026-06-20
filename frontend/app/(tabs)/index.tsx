import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { StatTile } from "@/src/components/StatTile";
import { ProgressRing } from "@/src/components/ProgressRing";
import { SectionHeader } from "@/src/components/SectionHeader";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { PulseDot } from "@/src/components/PulseDot";
import { AddPayoutSheet } from "@/src/components/AddPayoutSheet";
import { colors, fonts, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const fmtMoney = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addPayoutOpen, setAddPayoutOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.getDashboard();
      setData(d);
    } catch (e) {
      console.warn("dashboard fetch failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !data) {
    return (
      <ScreenBackground>
        <View style={[styles.loading, { paddingTop: insets.top + 200 }]}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingText}>Booting Command Center…</Text>
        </View>
      </ScreenBackground>
    );
  }

  const { kpis, goal, scalingRoadmap, recentPayouts, settings } = data;

  const paceColor =
    kpis.paceStatus === "ahead" ? colors.green :
    kpis.paceStatus === "behind" ? colors.amber :
    kpis.paceStatus === "expired" ? colors.red :
    colors.brand;
  const paceLabel =
    kpis.paceStatus === "ahead" ? "AHEAD OF PACE" :
    kpis.paceStatus === "behind" ? "BEHIND · PUSH HARDER" :
    kpis.paceStatus === "expired" ? "DAYS EXHAUSTED" :
    "ON TRACK";

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 120,
          paddingHorizontal: spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.brand}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandLabel}>FREEZY · COMMAND CENTER</Text>
            <Text style={styles.greeting}>{settings?.traderName || "Trader"}</Text>
          </View>
          <Pressable
            testID="open-goal-btn"
            style={styles.iconBtn}
            onPress={() => router.push("/goal")}
            hitSlop={8}
          >
            <Ionicons name="trophy" color={colors.gold} size={18} />
          </Pressable>
        </View>

        {/* Hero: $50K Progress */}
        <Animated.View entering={FadeIn.duration(420)}>
          <GlassCard glow="gold" style={styles.heroCard} testID="hero-goal-card">
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>MISSION TARGET</Text>
                <Text style={styles.heroAmount}>{fmtMoney(goal.target)}</Text>
                <Text style={styles.heroSub}>{goal.motivation.toUpperCase()}</Text>
                <View style={{ height: 14 }} />
                <View style={styles.heroStatRow}>
                  <View>
                    <Text style={styles.miniLabel}>RECEIVED</Text>
                    <Text style={[styles.miniValue, { color: colors.green }]}>{fmtMoney(goal.current)}</Text>
                  </View>
                  <View>
                    <Text style={styles.miniLabel}>REMAINING</Text>
                    <Text style={[styles.miniValue, { color: colors.gold }]}>
                      {fmtMoney(kpis.remainingPayout)}
                    </Text>
                  </View>
                </View>
              </View>
              <ProgressRing
                progress={goal.progressPct}
                size={140}
                stroke={11}
                title="PROGRESS"
                centerValue={`${goal.progressPct}%`}
                centerSubtitle={goal.motivation}
                testID="goal-progress-ring"
              />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Today's Required R Calculator */}
        <View style={{ height: spacing.lg }} />
        <Animated.View entering={FadeIn.delay(160).duration(420)}>
          <GlassCard glow="brand" style={styles.calcCard} testID="today-r-calc-card">
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="flash" color={colors.brand} size={14} />
                <Text style={[styles.calcLabel, { marginLeft: 6 }]}>TODAY{"\u2019"}S REQUIRED R</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
                <Text style={[styles.calcValue, { color: paceColor }]} testID="today-required-r-value">
                  {kpis.todayRequiredR}
                </Text>
                <Text style={styles.calcSuffix}>R / day</Text>
              </View>
              <View style={[styles.paceTag, { borderColor: paceColor, backgroundColor: `${paceColor}1F` }]}>
                <Text style={[styles.paceText, { color: paceColor }]}>{paceLabel}</Text>
              </View>
              <Text style={styles.calcFormula}>
                {kpis.remainingR}R remaining ÷ {kpis.daysRemaining} days · original target {kpis.originalDailyR}R/day
              </Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Quick Add Payout button */}
        <View style={{ height: spacing.md }} />
        <PrimaryButton
          testID="quick-add-payout-btn"
          label="+ Add Received Payout"
          variant="gold"
          icon={<Ionicons name="add-circle" color="#000" size={18} />}
          onPress={() => setAddPayoutOpen(true)}
        />

        {/* KPI Grid */}
        <View style={{ height: spacing.lg }} />
        <SectionHeader title="Live KPIs" />
        <View style={styles.grid}>
          <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.gridItem}>
            <StatTile testID="kpi-total-payout" label="Total Payout" value={fmtMoney(kpis.totalPayout)} accent={colors.green} glow="green" />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(140).duration(420)} style={styles.gridItem}>
            <StatTile testID="kpi-funded-accounts" label="Funded" value={kpis.fundedAccounts} suffix="acct" accent={colors.gold} glow="gold" />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(200).duration(420)} style={styles.gridItem}>
            <StatTile testID="kpi-total-accounts" label="Total Accounts" value={kpis.totalAccounts} accent={colors.brand} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(260).duration(420)} style={styles.gridItem}>
            <StatTile testID="kpi-eval-accounts" label="In Evaluation" value={kpis.evaluationAccounts} accent={colors.brand} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(320).duration(420)} style={styles.gridItem}>
            <StatTile testID="kpi-days-remaining" label="Days Remaining" value={kpis.daysRemaining} suffix={`/ ${kpis.totalTradingDays}`} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(380).duration(420)} style={styles.gridItem}>
            <StatTile testID="kpi-total-r" label="Total R" value={kpis.totalR} suffix="R" accent={colors.green} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(440).duration(420)} style={styles.gridItem}>
            <StatTile testID="kpi-win-rate" label="Win Rate" value={`${kpis.winRate}`} suffix="%" accent={colors.brand} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(500).duration(420)} style={styles.gridItem}>
            <StatTile testID="kpi-avg-r" label="Avg R / Trade" value={kpis.avgR} accent={kpis.avgR >= 0 ? colors.green : colors.red} />
          </Animated.View>
        </View>

        {/* Scaling Roadmap */}
        <View style={{ height: spacing.xl }} />
        <SectionHeader title="Scaling Engine" action="Open" onAction={() => router.push("/scaling")} testID="scaling-section" />
        <GlassCard style={{ paddingVertical: spacing.lg }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}>
            {scalingRoadmap.map((step: any) => (
              <View
                key={step.step}
                style={[
                  styles.roadNode,
                  step.done ? { borderColor: colors.green, backgroundColor: colors.greenDim } : null,
                ]}
              >
                <Text style={[styles.roadStep, step.done ? { color: colors.green } : null]}>{step.step}</Text>
                <Text style={styles.roadLabel}>{step.label}</Text>
                {step.done ? <Ionicons name="checkmark-circle" color={colors.green} size={14} /> : null}
              </View>
            ))}
          </ScrollView>
        </GlassCard>

        {/* Quick actions */}
        <View style={{ height: spacing.xl }} />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              testID="goto-payouts-btn"
              label="Payouts"
              variant="gold"
              icon={<Ionicons name="cash" color="#000" size={16} />}
              onPress={() => router.push("/payouts")}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <PrimaryButton
              testID="goto-copy-trading-btn"
              label="Copy Trading"
              icon={<Ionicons name="git-network" color="#000" size={16} />}
              onPress={() => router.push("/copy-trading")}
            />
          </View>
        </View>
        <View style={{ height: spacing.md }} />
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              testID="goto-achievements-btn"
              label="Achievements"
              variant="ghost"
              icon={<Ionicons name="ribbon" color={colors.gold} size={16} />}
              onPress={() => router.push("/achievements")}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <PrimaryButton
              testID="goto-settings-btn"
              label="Settings"
              variant="ghost"
              icon={<Ionicons name="settings" color={colors.brand} size={16} />}
              onPress={() => router.push("/settings")}
            />
          </View>
        </View>

        {/* Recent Payouts */}
        <View style={{ height: spacing.xl }} />
        <SectionHeader title="Recent Payouts" action="View All" onAction={() => router.push("/payouts")} testID="recent-payouts-section" />
        {recentPayouts.length === 0 ? (
          <GlassCard style={{ alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>No payouts yet. Pass an evaluation to begin.</Text>
          </GlassCard>
        ) : (
          recentPayouts.slice(0, 4).map((p: any) => (
            <GlassCard key={p.id} style={styles.payoutRow}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <PulseDot color={colors.green} size={6} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.payoutAccount}>{p.accountName} · {p.accountType}</Text>
                  <Text style={styles.payoutMeta}>Payout #{p.payoutNumber} · {new Date(p.date).toLocaleDateString()}</Text>
                </View>
              </View>
              <Text style={[styles.payoutAmount, { color: colors.green }]}>{fmtMoney(p.netReceived)}</Text>
            </GlassCard>
          ))
        )}
      </ScrollView>

      <AddPayoutSheet visible={addPayoutOpen} onClose={() => setAddPayoutOpen(false)} onSaved={load} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: "center" },
  loadingText: { color: colors.textMuted, marginTop: 12, letterSpacing: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brandLabel: { color: colors.brand, fontSize: 10, letterSpacing: 2.2, fontWeight: "700" },
  greeting: { color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  heroCard: { padding: spacing.lg, overflow: "hidden" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroLabel: { color: colors.gold, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  heroAmount: { color: colors.text, fontFamily: fonts.mono, fontSize: 30, fontWeight: "800", marginTop: 6 },
  heroSub: { color: colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginTop: 4 },
  heroStatRow: { flexDirection: "row", gap: 18 },
  miniLabel: { color: colors.textDim, fontSize: 9, letterSpacing: 1.2, fontWeight: "700" },
  miniValue: { fontFamily: fonts.mono, fontSize: 15, fontWeight: "700", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  gridItem: { width: "50%", paddingHorizontal: 6, marginBottom: 12 },
  roadNode: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  roadStep: { color: colors.textDim, fontFamily: fonts.mono, fontSize: 11, fontWeight: "700" },
  roadLabel: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 4, marginBottom: 4 },
  actionsRow: { flexDirection: "row" },
  payoutRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, marginBottom: 10,
  },
  payoutAccount: { color: colors.text, fontWeight: "700", fontSize: 13 },
  payoutMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  payoutAmount: { fontFamily: fonts.mono, fontWeight: "800", fontSize: 16 },
  calcCard: { padding: spacing.lg, flexDirection: "row", alignItems: "center" },
  calcLabel: { color: colors.brand, fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
  calcValue: { fontFamily: fonts.mono, fontSize: 36, fontWeight: "800", letterSpacing: -0.5 },
  calcSuffix: { color: colors.textMuted, fontFamily: fonts.mono, fontSize: 13, marginLeft: 8, marginBottom: 8 },
  paceTag: { alignSelf: "flex-start", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 8 },
  paceText: { fontSize: 9, letterSpacing: 1.3, fontWeight: "800" },
  calcFormula: { color: colors.textDim, fontSize: 10, marginTop: 8, letterSpacing: 0.3 },
});
