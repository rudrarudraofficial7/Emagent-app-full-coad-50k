import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BarChart, LineChart } from "react-native-gifted-charts";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { Pill } from "@/src/components/Pill";
import { SectionHeader } from "@/src/components/SectionHeader";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"log" | "analytics">("log");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [market, setMarket] = useState("");
  const [setupType, setSetupType] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [sl, setSL] = useState("");
  const [tp, setTP] = useState("");
  const [risk, setRisk] = useState("");
  const [rEarned, setREarned] = useState("");
  const [result, setResult] = useState<"win" | "loss" | "be">("win");
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listJournal();
      setEntries(list);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    const wins = entries.filter((e) => e.result === "win").length;
    const losses = entries.filter((e) => e.result === "loss").length;
    const total = wins + losses;
    const winRate = total ? Math.round((wins / total) * 100) : 0;
    const avgR = entries.length ? entries.reduce((s, e) => s + (e.rEarned || 0), 0) / entries.length : 0;
    const best = entries.reduce((m, e) => Math.max(m, e.rEarned || 0), 0);
    const worst = entries.reduce((m, e) => Math.min(m, e.rEarned || 0), 0);
    return { wins, losses, winRate, avgR, best, worst };
  }, [entries]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      const b64 = a.base64 ? `data:image/jpeg;base64,${a.base64}` : null;
      setScreenshot(b64);
    }
  };

  const reset = () => {
    setMarket(""); setSetupType(""); setEntryPrice(""); setSL(""); setTP(""); setRisk("");
    setREarned(""); setResult("win"); setNotes(""); setScreenshot(null);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.createJournal({
        market, setupType,
        entry: parseFloat(entryPrice) || 0,
        stopLoss: parseFloat(sl) || 0,
        takeProfit: parseFloat(tp) || 0,
        risk: parseFloat(risk) || 0,
        rEarned: parseFloat(rEarned) || 0,
        result, notes,
        screenshotBase64: screenshot,
      });
      reset();
      setModalOpen(false);
      load();
    } catch (e) { console.warn(e); }
    finally { setSubmitting(false); }
  };

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.brandLabel}>TRADING JOURNAL</Text>
          <Text style={styles.title}>Journal</Text>
        </View>
        <Pressable testID="add-trade-btn" style={styles.addBtn} onPress={() => setModalOpen(true)} hitSlop={8}>
          <Ionicons name="add" color="#000" size={22} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, marginBottom: 12 }}>
        <Pill label="Trades" active={tab === "log"} onPress={() => setTab("log")} testID="tab-trades" />
        <Pill label="Analytics" active={tab === "analytics"} onPress={() => setTab("analytics")} testID="tab-analytics" />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, paddingTop: 4 }}>
          {tab === "log" ? (
            <>
              {entries.length === 0 ? (
                <GlassCard style={{ alignItems: "center", padding: 28 }}>
                  <Ionicons name="book-outline" color={colors.textDim} size={40} />
                  <Text style={styles.emptyTitle}>No trades logged</Text>
                  <Text style={styles.emptySub}>Tap + to log your first trade.</Text>
                </GlassCard>
              ) : entries.map((e) => (
                <GlassCard key={e.id} style={styles.entryCard}
                  glow={e.result === "win" ? "green" : e.result === "loss" ? "red" : "none"}
                >
                  <View style={styles.entryTop}>
                    <View>
                      <Text style={styles.entryMarket}>{e.market || "—"}</Text>
                      <Text style={styles.entryMeta}>{e.setupType || "Setup"} · {new Date(e.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.resultTag, e.result === "win" ? { backgroundColor: colors.greenDim, borderColor: colors.green } : e.result === "loss" ? { backgroundColor: colors.redDim, borderColor: colors.red } : { backgroundColor: colors.surface2, borderColor: colors.borderStrong }]}>
                      <Text style={[styles.resultText, { color: e.result === "win" ? colors.green : e.result === "loss" ? colors.red : colors.textMuted }]}>
                        {e.result.toUpperCase()} · {e.rEarned > 0 ? "+" : ""}{e.rEarned}R
                      </Text>
                    </View>
                  </View>
                  {e.screenshotBase64 ? (
                    <Image source={{ uri: e.screenshotBase64 }} style={styles.thumb} contentFit="cover" />
                  ) : null}
                  {e.notes ? <Text style={styles.entryNotes}>{e.notes}</Text> : null}
                </GlassCard>
              ))}
            </>
          ) : (
            <Analytics entries={entries} stats={stats} />
          )}
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.sheetEyebrow}>LOG TRADE</Text>
                <Text style={styles.sheetTitle}>New Entry</Text>
                <View style={{ height: 16 }} />
                <Row label="Market">
                  <TextInput testID="trade-market" value={market} onChangeText={setMarket} placeholder="EURUSD" placeholderTextColor={colors.textDim} style={styles.input} />
                </Row>
                <Row label="Setup">
                  <TextInput testID="trade-setup" value={setupType} onChangeText={setSetupType} placeholder="Breakout / FVG" placeholderTextColor={colors.textDim} style={styles.input} />
                </Row>
                <View style={styles.duo}>
                  <Row label="Entry"><TextInput testID="trade-entry" value={entryPrice} onChangeText={setEntryPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textDim} style={styles.input} /></Row>
                  <Row label="Risk %"><TextInput testID="trade-risk" value={risk} onChangeText={setRisk} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.textDim} style={styles.input} /></Row>
                </View>
                <View style={styles.duo}>
                  <Row label="SL"><TextInput testID="trade-sl" value={sl} onChangeText={setSL} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textDim} style={styles.input} /></Row>
                  <Row label="TP"><TextInput testID="trade-tp" value={tp} onChangeText={setTP} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textDim} style={styles.input} /></Row>
                </View>
                <Row label="R Earned">
                  <TextInput testID="trade-r-earned" value={rEarned} onChangeText={setREarned} keyboardType="numbers-and-punctuation" placeholder="+2.5" placeholderTextColor={colors.textDim} style={styles.input} />
                </Row>
                <Row label="Result">
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Pill label="Win" active={result === "win"} onPress={() => setResult("win")} color={colors.green} testID="result-win" />
                    <Pill label="Loss" active={result === "loss"} onPress={() => setResult("loss")} color={colors.red} testID="result-loss" />
                    <Pill label="BE" active={result === "be"} onPress={() => setResult("be")} testID="result-be" />
                  </View>
                </Row>
                <Row label="Notes">
                  <TextInput testID="trade-notes" value={notes} onChangeText={setNotes} multiline placeholder="Setup reasoning, mistakes, lessons…" placeholderTextColor={colors.textDim} style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]} />
                </Row>
                <Row label="Screenshot">
                  <Pressable testID="upload-screenshot" onPress={pickImage} style={styles.uploader}>
                    {screenshot ? (
                      <Image source={{ uri: screenshot }} style={styles.uploaderImg} contentFit="cover" />
                    ) : (
                      <>
                        <Ionicons name="image" color={colors.brand} size={22} />
                        <Text style={styles.uploaderText}>Tap to upload chart screenshot</Text>
                      </>
                    )}
                  </Pressable>
                </Row>
                <View style={{ height: 18 }} />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Cancel" variant="ghost" onPress={() => { reset(); setModalOpen(false); }} testID="cancel-trade" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton label="Save Trade" loading={submitting} onPress={submit} testID="save-trade" />
                  </View>
                </View>
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenBackground>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.modalLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Analytics({ entries, stats }: { entries: any[]; stats: any }) {
  const cum = useMemo(() => {
    let c = 0;
    return entries.slice().reverse().map((e, i) => {
      c += e.rEarned || 0;
      return { value: c, label: i % 4 === 0 ? String(i + 1) : "" };
    });
  }, [entries]);

  const distribution = useMemo(() => {
    const buckets = [-5, -3, -1, 0, 1, 3, 5, 10];
    const counts = buckets.map(() => 0);
    entries.forEach((e) => {
      const r = e.rEarned || 0;
      const idx = buckets.findIndex((b, i) => r <= b || i === buckets.length - 1);
      counts[Math.max(0, idx)] += 1;
    });
    return counts.map((c, i) => ({
      value: c,
      label: i === 0 ? "-5" : i === buckets.length - 1 ? "+10" : String(buckets[i]),
      frontColor: buckets[i] >= 0 ? colors.green : colors.red,
    }));
  }, [entries]);

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.lg }}>
        <MiniStat label="Win Rate" value={`${stats.winRate}%`} color={colors.brand} />
        <MiniStat label="Avg R" value={stats.avgR.toFixed(2)} color={stats.avgR >= 0 ? colors.green : colors.red} />
        <MiniStat label="Best" value={`+${stats.best}R`} color={colors.green} />
        <MiniStat label="Worst" value={`${stats.worst}R`} color={colors.red} />
      </View>

      <SectionHeader title="R-Growth Curve" />
      <GlassCard style={{ padding: 12 }}>
        {cum.length === 0 ? <EmptyChart /> : (
          <LineChart
            data={cum.length > 0 ? cum : [{ value: 0 }]}
            areaChart
            color={colors.brand}
            startFillColor={colors.brand}
            startOpacity={0.4}
            endOpacity={0.05}
            thickness={2}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            xAxisLabelTextStyle={{ color: colors.textDim, fontSize: 9 }}
            yAxisTextStyle={{ color: colors.textDim, fontSize: 9 }}
            initialSpacing={10}
            hideRules
            adjustToWidth
            curved
          />
        )}
      </GlassCard>

      <View style={{ height: spacing.xl }} />
      <SectionHeader title="R Distribution" />
      <GlassCard style={{ padding: 12 }}>
        {entries.length === 0 ? <EmptyChart /> : (
          <BarChart
            data={distribution}
            barWidth={20}
            spacing={10}
            roundedTop
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            xAxisLabelTextStyle={{ color: colors.textDim, fontSize: 9 }}
            yAxisTextStyle={{ color: colors.textDim, fontSize: 9 }}
            hideRules
            noOfSections={3}
          />
        )}
      </GlassCard>
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <GlassCard style={{ flex: 1, padding: 12 }}>
      <Text style={{ color: colors.textDim, fontSize: 9, letterSpacing: 1.2, fontWeight: "700" }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontFamily: fonts.mono, fontSize: 16, fontWeight: "800", marginTop: 4 }}>{value}</Text>
    </GlassCard>
  );
}

function EmptyChart() {
  return (
    <View style={{ height: 160, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.textDim, fontSize: 12 }}>Not enough data yet</Text>
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
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  entryCard: { padding: 14, marginBottom: 12 },
  entryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  entryMarket: { color: colors.text, fontSize: 16, fontWeight: "800" },
  entryMeta: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  resultTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  resultText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  thumb: { height: 140, borderRadius: radius.md, marginTop: 12, backgroundColor: colors.surface2 },
  entryNotes: { color: colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 17 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.borderStrong, padding: 20, maxHeight: "92%" },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetEyebrow: { color: colors.brand, fontSize: 10, letterSpacing: 1.6, fontWeight: "700" },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  modalLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  input: {
    marginTop: 8, color: colors.text, fontSize: 15, paddingHorizontal: 14, height: 46,
    backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  duo: { flexDirection: "row", gap: 10 },
  uploader: {
    marginTop: 8, height: 110, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", overflow: "hidden", borderStyle: "dashed",
  },
  uploaderImg: { width: "100%", height: "100%" },
  uploaderText: { color: colors.textMuted, marginTop: 8, fontSize: 12 },
});
