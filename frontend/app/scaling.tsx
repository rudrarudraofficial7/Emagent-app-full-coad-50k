import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { colors, fonts, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const STEPS = [
  { label: "1× 25K Eval", target: 1, color: "#00E5FF" },
  { label: "1st Payout", target: 1, color: "#D4AF37" },
  { label: "Add 50K", target: 1, color: "#00E5FF" },
  { label: "2 Funded", target: 2, color: "#00FF66" },
  { label: "3 Funded", target: 3, color: "#00FF66" },
  { label: "5 Funded", target: 5, color: "#00FF66" },
  { label: "$50K Goal", target: 1, color: "#D4AF37" },
];

export default function ScalingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    try { setData(await api.getDashboard()); } catch (e) { console.warn(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <ScreenBackground><ActivityIndicator color={colors.brand} style={{ marginTop: 200 }} /></ScreenBackground>;

  return (
    <ScreenBackground>
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="arrow-back" color={colors.text} size={20} /></Pressable>
        <Text style={styles.topTitle}>SCALING ENGINE</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
        <Text style={styles.eyebrow}>ROADMAP</Text>
        <Text style={styles.title}>Path to $50K</Text>
        <Text style={styles.sub}>Pass evaluation → Get funded → Take payout → Scale up. Repeat until you cross the mission target.</Text>

        <View style={{ height: spacing.xl }} />

        {data.scalingRoadmap.map((step: any, i: number) => {
          const isLast = i === data.scalingRoadmap.length - 1;
          const c = STEPS[i]?.color ?? colors.brand;
          return (
            <View key={step.step} style={styles.row}>
              <View style={styles.timeline}>
                <View style={[styles.node, step.done ? { backgroundColor: c, borderColor: c } : { borderColor: colors.borderStrong }]}>
                  {step.done ? <Ionicons name="checkmark" color="#000" size={16} /> : <Text style={styles.nodeNum}>{step.step}</Text>}
                </View>
                {!isLast ? <View style={[styles.line, step.done ? { backgroundColor: c } : null]} /> : null}
              </View>
              <GlassCard
                glow={step.done ? (c === colors.green ? "green" : c === colors.gold ? "gold" : "brand") : "none"}
                style={styles.stepCard}
              >
                <Text style={[styles.stepLabel, step.done ? { color: colors.text } : null]}>{step.label}</Text>
                <Text style={styles.stepStatus}>{step.done ? "COMPLETED" : "PENDING"}</Text>
              </GlassCard>
            </View>
          );
        })}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  topTitle: { color: colors.text, fontSize: 12, letterSpacing: 2, fontWeight: "800" },
  eyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 1.8, fontWeight: "700" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 4 },
  sub: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "stretch" },
  timeline: { width: 44, alignItems: "center" },
  node: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  nodeNum: { color: colors.textDim, fontFamily: fonts.mono, fontWeight: "800", fontSize: 12 },
  line: { width: 2, flex: 1, backgroundColor: colors.borderStrong, marginTop: 4, marginBottom: -4, alignSelf: "center" },
  stepCard: { flex: 1, padding: 14, marginLeft: 6, marginBottom: 10 },
  stepLabel: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  stepStatus: { color: colors.textDim, fontSize: 10, letterSpacing: 1.4, marginTop: 4, fontWeight: "700" },
});
