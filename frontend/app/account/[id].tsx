import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { Pill } from "@/src/components/Pill";
import { SectionHeader } from "@/src/components/SectionHeader";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { PulseDot } from "@/src/components/PulseDot";
import { colors, fonts, radius, spacing, statusColor, statusLabel } from "@/src/theme";
import { api } from "@/src/lib/api";

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [acc, setAcc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profitInput, setProfitInput] = useState("");
  const [consistencyInput, setConsistencyInput] = useState("");
  const [fundedDayNum, setFundedDayNum] = useState("");
  const [fundedDayProfit, setFundedDayProfit] = useState("");
  const [payoutGross, setPayoutGross] = useState("");
  const [payoutOpen, setPayoutOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const a = await api.getAccount(id);
      setAcc(a);
      setProfitInput(String(a.currentProfitPct ?? 0));
      setConsistencyInput(String(a.consistencyPct ?? 0));
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !acc) {
    return <ScreenBackground><ActivityIndicator color={colors.brand} style={{ marginTop: 200 }} /></ScreenBackground>;
  }

  const updateStatus = async (status: string) => {
    await api.updateAccount(acc.id, { status });
    load();
  };
  const saveProfit = async () => {
    await api.updateAccount(acc.id, {
      currentProfitPct: parseFloat(profitInput) || 0,
      consistencyPct: parseFloat(consistencyInput) || 0,
    });
    load();
  };
  const addFundedDay = async () => {
    const n = parseInt(fundedDayNum, 10);
    const p = parseFloat(fundedDayProfit);
    if (!n || isNaN(p)) return;
    await api.addFundedDay(acc.id, { dayNumber: n, profit: p });
    setFundedDayNum(""); setFundedDayProfit("");
    load();
  };
  const recordPayout = async () => {
    const g = parseFloat(payoutGross);
    if (!g) return;
    await api.addPayout(acc.id, { grossProfit: g });
    setPayoutGross("");
    setPayoutOpen(false);
    load();
  };
  const removeAcc = async () => {
    await api.deleteAccount(acc.id);
    router.back();
  };

  const fundedCounted = (acc.fundedDays || []).filter((d: any) => d.counts).length;
  const cumPayout = (acc.payouts || []).reduce((s: number, p: any) => s + p.netReceived, 0);

  return (
    <ScreenBackground>
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable testID="back-btn" hitSlop={10} onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" color={colors.text} size={20} />
        </Pressable>
        <Pressable testID="delete-account-btn" hitSlop={10} onPress={removeAcc} style={styles.iconBtn}>
          <Ionicons name="trash" color={colors.red} size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        <Text style={styles.eyebrow}>{acc.accountType} · ${acc.accountSize.toLocaleString()}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
          {acc.status === "funded_active" ? <PulseDot color={colors.green} size={6} /> : null}
          <Text style={[styles.title, acc.status === "funded_active" ? { marginLeft: 8 } : null]}>{acc.name}</Text>
        </View>

        <View style={[styles.statusTag, { borderColor: statusColor(acc.status), backgroundColor: `${statusColor(acc.status)}1F`, alignSelf: "flex-start", marginTop: 10 }]}>
          <Text style={[styles.statusTagText, { color: statusColor(acc.status) }]}>{statusLabel(acc.status)}</Text>
        </View>

        <View style={{ height: spacing.xl }} />
        <SectionHeader title="Set Status" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pill label="Eval" active={acc.status === "evaluation_running"} onPress={() => updateStatus("evaluation_running")} testID="set-status-eval" />
          <Pill label="Passed" active={acc.status === "evaluation_passed"} onPress={() => updateStatus("evaluation_passed")} color={colors.gold} testID="set-status-passed" />
          <Pill label="Funded" active={acc.status === "funded_active"} onPress={() => updateStatus("funded_active")} color={colors.green} testID="set-status-funded" />
          <Pill label="Blown" active={acc.status === "blown"} onPress={() => updateStatus("blown")} color={colors.red} testID="set-status-blown" />
        </View>

        <View style={{ height: spacing.xl }} />
        <SectionHeader title="Evaluation Metrics" />
        <GlassCard style={{ padding: 16 }}>
          <Text style={styles.modalLabel}>CURRENT PROFIT %</Text>
          <TextInput testID="profit-input" value={profitInput} onChangeText={setProfitInput} keyboardType="decimal-pad" style={styles.input} />
          <View style={{ height: 10 }} />
          <Text style={styles.modalLabel}>CONSISTENCY %</Text>
          <TextInput testID="consistency-input" value={consistencyInput} onChangeText={setConsistencyInput} keyboardType="decimal-pad" style={styles.input} />
          <View style={{ height: 14 }} />
          <PrimaryButton label="Save Metrics" onPress={saveProfit} testID="save-metrics-btn" />
          <View style={{ height: 10 }} />
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((acc.currentProfitPct / 6) * 100, 100)}%`, backgroundColor: acc.currentProfitPct >= 6 ? colors.green : colors.brand }]} />
          </View>
          <Text style={styles.evalHint}>{Math.min((acc.currentProfitPct / 6) * 100, 100).toFixed(0)}% of 6% target</Text>
        </GlassCard>

        <View style={{ height: spacing.xl }} />
        <SectionHeader title="Funded Days Tracker" />
        <GlassCard style={{ padding: 16 }}>
          <Text style={styles.hintTop}>Need 5 days with profit ≥ $150 each</Text>
          <View style={styles.daysRow}>
            {[1,2,3,4,5].map((n) => {
              const day = (acc.fundedDays || []).find((d: any) => d.dayNumber === n);
              const ok = day?.counts;
              return (
                <View key={n} style={[styles.dayBubble, ok ? { borderColor: colors.green, backgroundColor: colors.greenDim } : null]}>
                  <Text style={[styles.dayLabel, ok ? { color: colors.green } : null]}>D{n}</Text>
                  <Text style={styles.dayProfit}>${day?.profit?.toFixed(0) ?? "—"}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(fundedCounted / 5) * 100}%`, backgroundColor: colors.green }]} />
          </View>
          <Text style={styles.evalHint}>{fundedCounted} / 5 qualifying days</Text>

          <View style={{ height: 14 }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalLabel}>DAY #</Text>
              <TextInput testID="funded-day-num" value={fundedDayNum} onChangeText={setFundedDayNum} keyboardType="number-pad" placeholder="1-5" placeholderTextColor={colors.textDim} style={styles.input} />
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={styles.modalLabel}>PROFIT $</Text>
              <TextInput testID="funded-day-profit" value={fundedDayProfit} onChangeText={setFundedDayProfit} keyboardType="decimal-pad" placeholder="200" placeholderTextColor={colors.textDim} style={styles.input} />
            </View>
          </View>
          <View style={{ height: 10 }} />
          <PrimaryButton label="Log Funded Day" onPress={addFundedDay} testID="add-funded-day-btn" />
        </GlassCard>

        <View style={{ height: spacing.xl }} />
        <SectionHeader title="Payouts" action="+ New" onAction={() => setPayoutOpen(true)} testID="payout-section" />
        <GlassCard style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={styles.modalLabel}>CUMULATIVE PAYOUT</Text>
              <Text style={{ color: colors.gold, fontFamily: fonts.mono, fontSize: 24, fontWeight: "800" }}>${cumPayout.toFixed(0)}</Text>
            </View>
            <View>
              <Text style={[styles.modalLabel, { textAlign: "right" }]}>MAX PAYOUT</Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: 14 }}>${acc.maxPayout}</Text>
            </View>
          </View>
          {acc.payouts && acc.payouts.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              {acc.payouts.map((p: any) => (
                <View key={p.id} style={styles.payoutRow}>
                  <View>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>Payout #{p.payoutNumber}</Text>
                    <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>{new Date(p.date).toLocaleDateString()} · Split {Math.round(p.splitPct * 100)}%</Text>
                  </View>
                  <Text style={{ color: colors.green, fontFamily: fonts.mono, fontWeight: "800", fontSize: 15 }}>${p.netReceived.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          ) : <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 12 }}>No payouts recorded.</Text>}
        </GlassCard>
      </ScrollView>

      <Modal visible={payoutOpen} transparent animationType="fade" onRequestClose={() => setPayoutOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>RECORD PAYOUT</Text>
            <Text style={styles.modalLabel}>Gross Profit ($)</Text>
            <TextInput testID="payout-gross-input" value={payoutGross} onChangeText={setPayoutGross} keyboardType="decimal-pad" placeholder="1000" placeholderTextColor={colors.textDim} style={styles.input} />
            <View style={{ height: 14 }} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><PrimaryButton label="Cancel" variant="ghost" onPress={() => setPayoutOpen(false)} testID="cancel-payout-btn" /></View>
              <View style={{ flex: 1 }}><PrimaryButton label="Save" variant="gold" onPress={recordPayout} testID="confirm-payout-btn" /></View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.brand, fontSize: 11, letterSpacing: 1.6, fontWeight: "700" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  statusTag: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  statusTagText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  modalLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  input: { marginTop: 8, color: colors.text, fontSize: 15, paddingHorizontal: 14, height: 44, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 12, overflow: "hidden" },
  progressFill: { height: "100%" },
  evalHint: { color: colors.textDim, fontSize: 11, marginTop: 6 },
  hintTop: { color: colors.textMuted, fontSize: 11, marginBottom: 12 },
  daysRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  dayBubble: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: "center" },
  dayLabel: { color: colors.textMuted, fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  dayProfit: { color: colors.text, fontFamily: fonts.mono, fontSize: 13, fontWeight: "700", marginTop: 4 },
  payoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, padding: 20 },
  modalTitle: { color: colors.text, fontSize: 14, fontWeight: "800", letterSpacing: 1.8, marginBottom: 14 },
});
