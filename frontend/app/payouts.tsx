import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { ProgressRing } from "@/src/components/ProgressRing";
import { SectionHeader } from "@/src/components/SectionHeader";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { AddPayoutSheet } from "@/src/components/AddPayoutSheet";
import { colors, fonts, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

export default function PayoutsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.getDashboard();
      setData(d);
    } catch (e) { console.warn(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <ScreenBackground><ActivityIndicator color={colors.brand} style={{ marginTop: 200 }} /></ScreenBackground>;

  const { goal, kpis, payoutCurve, recentPayouts } = data;
  const chart = payoutCurve.length > 0
    ? payoutCurve.map((p: any, i: number) => ({ value: p.value, label: i % 3 === 0 ? `#${i + 1}` : "" }))
    : [{ value: 0 }];

  return (
    <ScreenBackground>
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="arrow-back" color={colors.text} size={20} /></Pressable>
        <Text style={styles.topTitle}>PAYOUT COMMAND</Text>
        <Pressable testID="payouts-add-btn" onPress={() => setAddOpen(true)} style={[styles.iconBtn, { backgroundColor: colors.gold, borderColor: colors.gold }]}>
          <Ionicons name="add" color="#000" size={20} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
        <GlassCard glow="gold" style={{ alignItems: "center", padding: 22 }}>
          <ProgressRing
            progress={goal.progressPct}
            size={200}
            title="GOAL"
            centerValue={`$${(goal.current / 1000).toFixed(1)}K`}
            centerSubtitle={`of $${(goal.target / 1000).toFixed(0)}K`}
            testID="payout-progress-ring"
          />
          <Text style={[styles.heroSub, { marginTop: 14 }]}>{goal.motivation.toUpperCase()}</Text>
        </GlassCard>

        <View style={{ height: spacing.lg }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stat label="Received" value={`$${kpis.totalPayout.toFixed(0)}`} color={colors.green} />
          <Stat label="Remaining" value={`$${kpis.remainingPayout.toFixed(0)}`} color={colors.gold} />
          <Stat label="Split" value={`${Math.round((data.settings?.profitSplit || 0.9) * 100)}%`} color={colors.brand} />
        </View>

        <View style={{ height: spacing.xl }} />
        <SectionHeader title="Payout Growth" />
        <GlassCard style={{ padding: 12 }}>
          {payoutCurve.length === 0 ? (
            <View style={{ height: 160, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.textDim, fontSize: 12 }}>Record your first payout to see growth</Text>
            </View>
          ) : (
            <LineChart
              data={chart}
              areaChart curved
              color={colors.gold}
              startFillColor={colors.gold}
              startOpacity={0.4}
              endOpacity={0.05}
              thickness={2}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              xAxisLabelTextStyle={{ color: colors.textDim, fontSize: 9 }}
              yAxisTextStyle={{ color: colors.textDim, fontSize: 9 }}
              hideRules
              adjustToWidth
            />
          )}
        </GlassCard>

        <View style={{ height: spacing.xl }} />
        <SectionHeader title="Payout History" />
        {recentPayouts.length === 0 ? (
          <GlassCard style={{ alignItems: "center", padding: 24 }}>
            <Text style={{ color: colors.textDim, fontSize: 12 }}>No payouts yet</Text>
          </GlassCard>
        ) : recentPayouts.map((p: any) => (
          <GlassCard key={p.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.acc}>{p.accountName} · {p.accountType}</Text>
              <Text style={styles.meta}>Payout #{p.payoutNumber} · {new Date(p.date).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.amount, { color: colors.green }]}>${p.netReceived.toFixed(0)}</Text>
              <Text style={styles.gross}>gross ${p.grossProfit.toFixed(0)}</Text>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
      <AddPayoutSheet visible={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
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
  heroSub: { color: colors.gold, fontSize: 12, letterSpacing: 1.6, fontWeight: "700" },
  row: { flexDirection: "row", padding: 14, marginBottom: 10, alignItems: "center" },
  acc: { color: colors.text, fontSize: 13, fontWeight: "700" },
  meta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  amount: { fontFamily: fonts.mono, fontSize: 16, fontWeight: "800" },
  gross: { color: colors.textDim, fontSize: 10, marginTop: 2 },
});
