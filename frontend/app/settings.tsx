import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [traderName, setTraderName] = useState("");
  const [days, setDays] = useState("");
  const [expR, setExpR] = useState("");
  const [split, setSplit] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setTraderName(s.traderName ?? "");
      setDays(String(s.tradingDaysAvailable ?? 90));
      setExpR(String(s.expectedR ?? 210));
      setSplit(String(Math.round((s.profitSplit ?? 0.9) * 100)));
      setGoal(String(s.goalAmount ?? 50000));
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        traderName,
        tradingDaysAvailable: parseInt(days) || 90,
        expectedR: parseFloat(expR) || 210,
        profitSplit: Math.min(1, Math.max(0, (parseFloat(split) || 90) / 100)),
        goalAmount: parseFloat(goal) || 50000,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) { console.warn(e); }
    finally { setSaving(false); }
  };

  if (loading) return <ScreenBackground><ActivityIndicator color={colors.brand} style={{ marginTop: 200 }} /></ScreenBackground>;

  return (
    <ScreenBackground>
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="arrow-back" color={colors.text} size={20} /></Pressable>
        <Text style={styles.topTitle}>SETTINGS</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
          <Text style={styles.eyebrow}>TRADER PROFILE</Text>
          <Text style={styles.title}>Configuration</Text>
          <Text style={styles.sub}>Tune your scaling protocol parameters.</Text>

          <View style={{ height: spacing.xl }} />
          <GlassCard style={{ padding: 16 }}>
            <Field label="Trader Name" value={traderName} onChange={setTraderName} testID="settings-name" />
            <Field label="Trading Days Available" value={days} onChange={setDays} keyboard="number-pad" testID="settings-days" />
            <Field label="Expected R (90 Days)" value={expR} onChange={setExpR} keyboard="decimal-pad" testID="settings-r" />
            <Field label="Profit Split %" value={split} onChange={setSplit} keyboard="number-pad" testID="settings-split" />
            <Field label="Goal Amount $" value={goal} onChange={setGoal} keyboard="decimal-pad" testID="settings-goal" />
            <View style={{ height: 14 }} />
            <PrimaryButton testID="save-settings-btn" label={saved ? "Saved ✓" : "Save Settings"} loading={saving} variant={saved ? "gold" : "primary"} onPress={save} />
          </GlassCard>

          <View style={{ height: spacing.xl }} />
          <GlassCard style={{ padding: 16 }}>
            <Text style={styles.sectionTitle}>SCALING RULES</Text>
            <RuleItem label="25K Account" value="$60 · 6% target · $1,000 max payout" />
            <RuleItem label="50K Account" value="$80 · 6% target · $2,000 max payout" />
            <RuleItem label="Funded Day Threshold" value="≥ $150 profit · 5 days required" />
            <RuleItem label="Scaling Rule" value="+1 new 50K after each payout" />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

function Field({ label, value, onChange, keyboard, testID }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard ?? "default"}
        style={styles.input}
        placeholderTextColor={colors.textDim}
      />
    </View>
  );
}

function RuleItem({ label, value }: any) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={styles.ruleValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  topTitle: { color: colors.text, fontSize: 12, letterSpacing: 2, fontWeight: "800" },
  eyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 1.8, fontWeight: "700" },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  label: { color: colors.textDim, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  input: { marginTop: 8, color: colors.text, fontSize: 15, paddingHorizontal: 14, height: 44, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 11, letterSpacing: 1.8, fontWeight: "800", marginBottom: 8 },
  ruleRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1, fontWeight: "700" },
  ruleValue: { color: colors.text, fontSize: 13, marginTop: 4 },
});
