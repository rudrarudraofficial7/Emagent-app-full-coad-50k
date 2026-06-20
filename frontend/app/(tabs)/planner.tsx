import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { SectionHeader } from "@/src/components/SectionHeader";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "marketAnalysis", label: "Market Analysis" },
  { key: "setupFound", label: "Setup Found" },
  { key: "tradeTaken", label: "Trade Taken" },
  { key: "riskFollowed", label: "Risk Followed" },
  { key: "journalUpdated", label: "Journal Updated" },
  { key: "dayCompleted", label: "Day Completed" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: colors.surface2,
  in_progress: colors.brandDim,
  completed: colors.greenDim,
  missed: colors.redDim,
};
const STATUS_BORDER: Record<string, string> = {
  pending: colors.border,
  in_progress: colors.brand,
  completed: colors.green,
  missed: colors.red,
};

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [r, setR] = useState("0");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const p = await api.getPlan();
      setPlan(p);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openDay = (d: any) => {
    setSelected(d);
    setR(String(d.rEarned ?? 0));
    setNotes(d.notes ?? "");
    setChecklist(d.checklist ?? {});
  };

  const saveDay = async () => {
    if (!selected) return;
    const allChecked = CHECKLIST_ITEMS.every((c) => checklist[c.key]);
    const numericR = parseFloat(r) || 0;
    const status = allChecked ? "completed" : numericR !== 0 ? "in_progress" : selected.status;
    try {
      await api.updatePlanDay(selected.dayNumber, {
        rEarned: numericR, notes, checklist, status,
      });
      await load();
      setSelected(null);
    } catch (e) { console.warn(e); }
  };

  const completed = plan.filter((d) => d.status === "completed").length;
  const missed = plan.filter((d) => d.status === "missed").length;
  const inProgress = plan.filter((d) => d.status === "in_progress").length;

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.brandLabel}>90 DAY EXECUTION PROTOCOL</Text>
          <Text style={styles.title}>Planner</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.lg }}>
            <SummaryPill label="Completed" value={completed} color={colors.green} />
            <SummaryPill label="Active" value={inProgress} color={colors.brand} />
            <SummaryPill label="Pending" value={plan.length - completed - missed - inProgress} color={colors.textMuted} />
            <SummaryPill label="Missed" value={missed} color={colors.red} />
          </View>

          <SectionHeader title="Calendar" />
          <View style={styles.grid}>
            {plan.map((d) => {
              const isCompleted = d.status === "completed";
              return (
                <Pressable
                  key={d.dayNumber}
                  testID={`day-cell-${d.dayNumber}`}
                  style={[
                    styles.cell,
                    { backgroundColor: STATUS_COLORS[d.status], borderColor: STATUS_BORDER[d.status] },
                  ]}
                  onPress={() => openDay(d)}
                >
                  <Text style={[styles.cellDay, isCompleted ? { color: colors.green } : null]}>{d.dayNumber}</Text>
                  <Text style={styles.cellR}>{d.targetR}R</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selected ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetEyebrow}>DAY {selected.dayNumber} · {new Date(selected.date).toLocaleDateString()}</Text>
                <Text style={styles.sheetTitle}>Today{"\u2019"}s Mission</Text>
                <Text style={styles.sheetSub}>Target: {selected.targetR}R</Text>

                <View style={{ height: 18 }} />
                <Text style={styles.modalLabel}>R Earned Today</Text>
                <TextInput
                  testID="day-r-input"
                  value={r}
                  onChangeText={setR}
                  keyboardType="numbers-and-punctuation"
                  placeholder="0"
                  placeholderTextColor={colors.textDim}
                  style={styles.input}
                />

                <View style={{ height: 14 }} />
                <Text style={styles.modalLabel}>Checklist</Text>
                <View style={{ marginTop: 10 }}>
                  {CHECKLIST_ITEMS.map((c) => {
                    const on = !!checklist[c.key];
                    return (
                      <Pressable
                        key={c.key}
                        testID={`checklist-${c.key}`}
                        style={styles.checkRow}
                        onPress={() => setChecklist({ ...checklist, [c.key]: !on })}
                      >
                        <View style={[styles.check, on ? { backgroundColor: colors.green, borderColor: colors.green } : null]}>
                          {on ? <Ionicons name="checkmark" size={14} color="#000" /> : null}
                        </View>
                        <Text style={[styles.checkLabel, on ? { color: colors.text } : null]}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ height: 14 }} />
                <Text style={styles.modalLabel}>Notes</Text>
                <TextInput
                  testID="day-notes-input"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Trade journal notes…"
                  placeholderTextColor={colors.textDim}
                  multiline
                  style={[styles.input, { height: 90, textAlignVertical: "top", paddingTop: 12 }]}
                />

                <View style={{ height: 18 }} />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Cancel" variant="ghost" onPress={() => setSelected(null)} testID="cancel-day-edit" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Save" onPress={saveDay} testID="save-day-edit" />
                  </View>
                </View>
                <View style={{ height: 30 }} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <GlassCard style={{ flex: 1, padding: 12 }}>
      <Text style={{ color: colors.textDim, fontSize: 9, fontWeight: "700", letterSpacing: 1.2 }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontFamily: fonts.mono, fontSize: 22, fontWeight: "800", marginTop: 4 }}>{value}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: spacing.lg, paddingBottom: 12,
  },
  brandLabel: { color: colors.brand, fontSize: 10, letterSpacing: 2.2, fontWeight: "700" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: {
    width: "13.6%", aspectRatio: 1, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  cellDay: { color: colors.text, fontFamily: fonts.mono, fontSize: 13, fontWeight: "700" },
  cellR: { color: colors.textDim, fontSize: 8, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: colors.borderStrong, padding: 20, maxHeight: "85%",
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetEyebrow: { color: colors.brand, fontSize: 10, letterSpacing: 1.6, fontWeight: "700" },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  sheetSub: { color: colors.gold, fontFamily: fonts.mono, fontSize: 13, marginTop: 6 },
  modalLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  input: {
    marginTop: 8, color: colors.text, fontSize: 15, paddingHorizontal: 14, height: 46,
    backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  check: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: colors.borderStrong, marginRight: 12, alignItems: "center", justifyContent: "center",
  },
  checkLabel: { color: colors.textMuted, fontSize: 14 },
});
