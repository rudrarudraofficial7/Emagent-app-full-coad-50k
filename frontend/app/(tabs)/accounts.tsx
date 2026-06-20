import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, TextInput, Modal,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { Pill } from "@/src/components/Pill";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { PulseDot } from "@/src/components/PulseDot";
import { colors, fonts, radius, spacing, statusColor, statusLabel } from "@/src/theme";
import { api } from "@/src/lib/api";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "evaluation_running", label: "Evaluation" },
  { key: "evaluation_passed", label: "Passed" },
  { key: "funded_active", label: "Funded" },
  { key: "blown", label: "Blown" },
];

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"25K" | "50K">("50K");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listAccounts();
      setAccounts(list);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === "all" ? accounts : accounts.filter((a) => a.status === filter);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await api.createAccount({ name: newName.trim(), accountType: newType });
      setModalOpen(false);
      setNewName("");
      setNewType("50K");
      await load();
    } catch (e) {
      console.warn(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.brandLabel}>ACCOUNT CONTROL CENTER</Text>
          <Text style={styles.title}>Accounts</Text>
        </View>
        <Pressable
          testID="add-account-btn"
          style={styles.addBtn}
          onPress={() => setModalOpen(true)}
          hitSlop={8}
        >
          <Ionicons name="add" color="#000" size={22} />
        </Pressable>
      </View>

      {/* Filter row — sticky chrome */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg }}
        >
          {FILTERS.map((f) => (
            <Pill
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
              testID={`filter-${f.key}`}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140, paddingTop: 12 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />
          }
        >
          {filtered.length === 0 ? (
            <GlassCard style={{ alignItems: "center", padding: 28 }}>
              <Ionicons name="layers-outline" color={colors.textDim} size={40} />
              <Text style={styles.emptyTitle}>No accounts</Text>
              <Text style={styles.emptySub}>Add your first account to begin scaling.</Text>
            </GlassCard>
          ) : (
            filtered.map((a, idx) => (
              <Animated.View key={a.id} entering={FadeInDown.delay(idx * 60).duration(360)}>
                <Pressable testID={`account-row-${a.id}`} onPress={() => router.push(`/account/${a.id}`)}>
                  <GlassCard
                    glow={
                      a.status === "funded_active" ? "green" :
                      a.status === "evaluation_passed" ? "gold" :
                      a.status === "blown" ? "red" : "none"
                    }
                    style={styles.accCard}
                  >
                    <View style={styles.accTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          {a.status === "funded_active" ? <PulseDot color={colors.green} size={6} /> : null}
                          <Text style={[styles.accName, a.status === "funded_active" ? { marginLeft: 8 } : null]}>
                            {a.name}
                          </Text>
                        </View>
                        <Text style={styles.accMeta}>
                          ${a.accountSize.toLocaleString()} · {a.accountType}
                        </Text>
                      </View>
                      <View style={[styles.statusTag, { borderColor: statusColor(a.status), backgroundColor: `${statusColor(a.status)}1F` }]}>
                        <Text style={[styles.statusTagText, { color: statusColor(a.status) }]}>{statusLabel(a.status)}</Text>
                      </View>
                    </View>

                    <View style={styles.metricsRow}>
                      <Metric label="Profit" value={`${a.currentProfitPct.toFixed(1)}%`} highlight={a.currentProfitPct >= 6 ? colors.green : undefined} />
                      <Metric label="Consistency" value={`${a.consistencyPct.toFixed(0)}%`} highlight={a.consistencyPct <= 40 ? undefined : colors.amber} />
                      <Metric label="Funded Days" value={String((a.fundedDays || []).filter((d: any) => d.counts).length)} />
                      <Metric label="Payouts" value={`$${(a.payouts || []).reduce((s: number, p: any) => s + p.netReceived, 0).toFixed(0)}`} highlight={colors.gold} />
                    </View>
                  </GlassCard>
                </Pressable>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create modal */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>NEW ACCOUNT</Text>
            <Text style={styles.modalLabel}>Account Name</Text>
            <TextInput
              testID="new-account-name"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. FTMO 50K #1"
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
            <Text style={[styles.modalLabel, { marginTop: 14 }]}>Account Type</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Pill label="25K · $60" active={newType === "25K"} onPress={() => setNewType("25K")} testID="select-25K" />
              <Pill label="50K · $80" active={newType === "50K"} onPress={() => setNewType("50K")} testID="select-50K" />
            </View>
            <View style={{ height: 18 }} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Cancel" variant="ghost" onPress={() => setModalOpen(false)} testID="cancel-create-account" />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Create" loading={submitting} onPress={handleCreate} testID="confirm-create-account" />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.metricValue, highlight ? { color: highlight } : null]}>{value}</Text>
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
  addBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand,
    alignItems: "center", justifyContent: "center",
  },
  filterWrap: { height: 56, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  accCard: { marginBottom: 12, padding: 16 },
  accTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  accName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  accMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4, letterSpacing: 0.4 },
  statusTag: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusTagText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  metricsRow: { flexDirection: "row", marginTop: 14, gap: 10 },
  metric: { flex: 1 },
  metricLabel: { color: colors.textDim, fontSize: 9, letterSpacing: 1.2, fontWeight: "700" },
  metricValue: { color: colors.text, fontFamily: fonts.mono, fontSize: 14, fontWeight: "700", marginTop: 4 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 12 },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: spacing.lg },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderStrong, padding: 20,
  },
  modalTitle: { color: colors.text, fontSize: 14, fontWeight: "800", letterSpacing: 1.8, marginBottom: 18 },
  modalLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  input: {
    marginTop: 8, color: colors.text, fontSize: 15, paddingHorizontal: 14, height: 46,
    backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
});
