import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

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

const WEEKDAY_LABEL = ["MON", "TUE", "WED", "THU", "FRI"];

function isToday(iso: string): boolean {
  try {
    const d = new Date(iso);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  } catch { return false; }
}

function fmtDay(iso: string): string {
  try { return String(new Date(iso).getDate()); } catch { return "—"; }
}

function fmtMonth(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short" }).toUpperCase();
  } catch { return ""; }
}

function fmtRange(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sMon = s.toLocaleString(undefined, { month: "short" });
    const eMon = e.toLocaleString(undefined, { month: "short" });
    if (sMon === eMon) return `${sMon} ${s.getDate()} – ${e.getDate()}`;
    return `${sMon} ${s.getDate()} – ${eMon} ${e.getDate()}`;
  } catch { return ""; }
}

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const [calendar, setCalendar] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [r, setR] = useState("0");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const c = await api.getCalendar();
      setCalendar(c);
      // Auto-expand the week containing today (or first incomplete week)
      if (c?.weeks?.length && expandedWeek === null) {
        const todayWeek = c.weeks.find((w: any) =>
          w.days.some((d: any) => isToday(d.date))
        );
        const firstActive = c.weeks.find((w: any) =>
          w.days.some((d: any) => d.status !== "completed")
        );
        setExpandedWeek(todayWeek?.weekNumber ?? firstActive?.weekNumber ?? c.weeks[0].weekNumber);
      }
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const summary = useMemo(() => {
    const days: any[] = calendar?.days ?? [];
    return {
      completed: days.filter((d) => d.status === "completed").length,
      missed: days.filter((d) => d.status === "missed").length,
      inProgress: days.filter((d) => d.status === "in_progress").length,
      pending: days.filter((d) => d.status === "pending").length,
      totalR: Math.round(days.reduce((s, d) => s + (d.rEarned || 0), 0) * 100) / 100,
      totalTrades: days.reduce((s, d) => s + (d.tradeCount || 0), 0),
    };
  }, [calendar]);

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.brandLabel}>90 DAY EXECUTION PROTOCOL</Text>
          <Text style={styles.title}>Planner</Text>
        </View>
      </View>

      {loading || !calendar ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.lg }}>
            <SummaryPill label="Completed" value={summary.completed} color={colors.green} />
            <SummaryPill label="Active" value={summary.inProgress} color={colors.brand} />
            <SummaryPill label="R Earned" value={`${summary.totalR}`} color={colors.gold} />
            <SummaryPill label="Trades" value={summary.totalTrades} color={colors.textMuted} />
          </View>

          <SectionHeader title="Weekly Calendar · Mon–Fri" />

          {(calendar.weeks || []).map((w: any, idx: number) => {
            const expanded = expandedWeek === w.weekNumber;
            const winRate = (w.wins + w.losses) > 0 ? Math.round((w.wins / (w.wins + w.losses)) * 100) : 0;
            const rDelta = (w.rEarned || 0) - (w.plannedR || 0);
            const rColor = rDelta >= 0 ? colors.green : colors.red;
            return (
              <Animated.View key={w.weekNumber} entering={FadeInDown.delay(idx * 40).duration(360)}>
                <GlassCard
                  style={styles.weekCard}
                  glow={w.completed >= 5 ? "green" : "none"}
                  testID={`week-card-${w.weekNumber}`}
                >
                  <Pressable
                    onPress={() => setExpandedWeek(expanded ? null : w.weekNumber)}
                    style={styles.weekHeader}
                    testID={`week-toggle-${w.weekNumber}`}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.weekTitle}>WEEK {w.weekNumber}</Text>
                        <Text style={styles.weekRange}>· {fmtRange(w.startDate, w.endDate)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", marginTop: 10, gap: 14, flexWrap: "wrap" }}>
                        <MiniMetric label="R EARNED" value={`${w.rEarned}R`} color={rColor} />
                        <MiniMetric label="TARGET" value={`${w.plannedR}R`} color={colors.textMuted} />
                        <MiniMetric label="TRADES" value={String(w.tradeCount)} color={colors.brand} />
                        <MiniMetric label="W/L" value={`${w.wins}/${w.losses}`} color={colors.gold} />
                        {(w.wins + w.losses) > 0 ? (
                          <MiniMetric label="WIN%" value={`${winRate}%`} color={colors.green} />
                        ) : null}
                      </View>
                    </View>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      color={colors.textMuted}
                      size={20}
                    />
                  </Pressable>

                  {expanded ? (
                    <View style={styles.weekBody}>
                      <View style={styles.dowRow}>
                        {WEEKDAY_LABEL.map((l) => (
                          <Text key={l} style={styles.dowLabel}>{l}</Text>
                        ))}
                      </View>
                      <View style={styles.weekGrid}>
                        {w.days.map((d: any) => {
                          const today = isToday(d.date);
                          return (
                            <Pressable
                              key={d.dayNumber}
                              testID={`day-cell-${d.dayNumber}`}
                              style={[
                                styles.dayCell,
                                {
                                  backgroundColor: STATUS_COLORS[d.status],
                                  borderColor: today ? colors.brand : STATUS_BORDER[d.status],
                                  borderWidth: today ? 2 : 1,
                                },
                              ]}
                              onPress={() => openDay(d)}
                            >
                              <Text style={styles.dayMonth}>{fmtMonth(d.date)}</Text>
                              <Text style={[styles.dayDate, d.status === "completed" ? { color: colors.green } : null]}>{fmtDay(d.date)}</Text>
                              <Text style={styles.dayNum}>D{d.dayNumber}</Text>
                              {d.tradeCount > 0 ? (
                                <View style={styles.tradeDot}>
                                  <Text style={styles.tradeDotText}>{d.tradeCount}</Text>
                                </View>
                              ) : null}
                              {d.rEarned ? (
                                <Text style={[styles.dayR, d.rEarned > 0 ? { color: colors.green } : { color: colors.red }]}>
                                  {d.rEarned > 0 ? "+" : ""}{d.rEarned}R
                                </Text>
                              ) : (
                                <Text style={styles.dayTarget}>{d.targetR}R</Text>
                              )}
                              {today ? <View style={styles.todayPin} /> : null}
                            </Pressable>
                          );
                        })}
                        {/* Fill missing trailing cells to align grid */}
                        {Array.from({ length: Math.max(0, 5 - w.days.length) }).map((_, i) => (
                          <View key={`pad-${i}`} style={[styles.dayCell, styles.dayCellEmpty]} />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </GlassCard>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selected ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetEyebrow}>
                  DAY {selected.dayNumber} · {new Date(selected.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                </Text>
                <Text style={styles.sheetTitle}>Today{"\u2019"}s Mission</Text>
                <View style={{ flexDirection: "row", gap: 14, marginTop: 6 }}>
                  <Text style={styles.sheetSub}>Target: {selected.targetR}R</Text>
                  {selected.tradeCount > 0 ? (
                    <Text style={[styles.sheetSub, { color: colors.brand }]}>
                      · {selected.tradeCount} trade{selected.tradeCount === 1 ? "" : "s"} logged
                    </Text>
                  ) : null}
                </View>

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

function SummaryPill({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <GlassCard style={{ flex: 1, padding: 12 }}>
      <Text style={{ color: colors.textDim, fontSize: 9, fontWeight: "700", letterSpacing: 1.2 }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontFamily: fonts.mono, fontSize: 18, fontWeight: "800", marginTop: 4 }}>{value}</Text>
    </GlassCard>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
    paddingHorizontal: spacing.lg, paddingBottom: 12,
  },
  brandLabel: { color: colors.brand, fontSize: 10, letterSpacing: 2.2, fontWeight: "700" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 4 },

  weekCard: { padding: 14, marginBottom: 14 },
  weekHeader: { flexDirection: "row", alignItems: "center" },
  weekTitle: { color: colors.text, fontSize: 13, letterSpacing: 1.6, fontWeight: "800" },
  weekRange: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  miniLabel: { color: colors.textDim, fontSize: 9, letterSpacing: 1, fontWeight: "700" },
  miniValue: { fontFamily: fonts.mono, fontSize: 13, fontWeight: "800", marginTop: 2 },

  weekBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  dowRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  dowLabel: { flex: 1, textAlign: "center", color: colors.textDim, fontSize: 9, letterSpacing: 1.4, fontWeight: "700" },
  weekGrid: { flexDirection: "row", gap: 6 },
  dayCell: {
    flex: 1, aspectRatio: 0.78, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "flex-start", paddingTop: 6, position: "relative",
  },
  dayCellEmpty: { backgroundColor: "transparent", borderStyle: "dashed", borderColor: colors.border, opacity: 0.4 },
  dayMonth: { color: colors.textDim, fontSize: 8, letterSpacing: 1, fontWeight: "700" },
  dayDate: { color: colors.text, fontFamily: fonts.mono, fontSize: 18, fontWeight: "800", marginTop: 1 },
  dayNum: { color: colors.textMuted, fontSize: 8, fontWeight: "700", marginTop: 1 },
  dayTarget: { color: colors.textDim, fontSize: 9, marginTop: 4, fontFamily: fonts.mono },
  dayR: { fontSize: 10, fontFamily: fonts.mono, fontWeight: "800", marginTop: 4 },
  tradeDot: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: colors.brand, width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  tradeDotText: { color: "#000", fontSize: 9, fontWeight: "800" },
  todayPin: {
    position: "absolute", bottom: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: colors.borderStrong, padding: 20, maxHeight: "85%",
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetEyebrow: { color: colors.brand, fontSize: 10, letterSpacing: 1.6, fontWeight: "700" },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  sheetSub: { color: colors.gold, fontFamily: fonts.mono, fontSize: 13 },
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
