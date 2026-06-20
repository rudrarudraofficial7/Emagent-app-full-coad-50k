import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard } from "./GlassCard";
import { Pill } from "./Pill";
import { PrimaryButton } from "./PrimaryButton";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export function AddPayoutSheet({ visible, onClose, onSaved }: Props) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gross, setGross] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const list = await api.listAccounts();
        const funded = list.filter((a: any) => a.status === "funded_active" || a.status === "evaluation_passed");
        setAccounts(funded);
        if (funded.length > 0 && !selectedId) setSelectedId(funded[0].id);
      } catch (e) { console.warn(e); }
    })();
  }, [visible, selectedId]);

  const reset = () => { setGross(""); setDate(""); };

  const submit = async () => {
    if (!selectedId || !gross) return;
    const g = parseFloat(gross);
    if (isNaN(g) || g <= 0) return;
    setSubmitting(true);
    try {
      await api.addPayout(selectedId, { grossProfit: g, date: date || undefined });
      reset();
      onSaved?.();
      onClose();
    } catch (e) { console.warn(e); }
    finally { setSubmitting(false); }
  };

  const split = 0.9;
  const net = (parseFloat(gross) || 0) * split;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.eyebrow}>RECORD A PAYOUT</Text>
              <Text style={styles.title}>Add Received Payout</Text>
              <Text style={styles.sub}>Log a payout you{"\u2019"}ve already received. Net = Gross × 90% (your split).</Text>

              <View style={{ height: 18 }} />
              <Text style={styles.label}>SELECT ACCOUNT</Text>
              {accounts.length === 0 ? (
                <GlassCard style={{ marginTop: 8, padding: 14 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    No funded/passed accounts yet. First mark an account as Passed or Funded from the Accounts tab.
                  </Text>
                </GlassCard>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
                  {accounts.map((a) => (
                    <Pill
                      key={a.id}
                      label={`${a.name} · ${a.accountType}`}
                      active={selectedId === a.id}
                      onPress={() => setSelectedId(a.id)}
                      color={a.status === "funded_active" ? colors.green : colors.gold}
                      testID={`payout-account-${a.id}`}
                    />
                  ))}
                </ScrollView>
              )}

              <View style={{ height: 14 }} />
              <Text style={styles.label}>GROSS PROFIT ($)</Text>
              <TextInput
                testID="quick-payout-gross"
                value={gross}
                onChangeText={setGross}
                keyboardType="decimal-pad"
                placeholder="1000"
                placeholderTextColor={colors.textDim}
                style={styles.input}
              />

              <View style={{ height: 14 }} />
              <Text style={styles.label}>DATE (OPTIONAL)</Text>
              <TextInput
                testID="quick-payout-date"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD (leave blank for today)"
                placeholderTextColor={colors.textDim}
                style={styles.input}
              />

              <View style={{ height: 16 }} />
              <GlassCard glow="gold" style={styles.netCard}>
                <View>
                  <Text style={styles.label}>YOU RECEIVE (90% SPLIT)</Text>
                  <Text style={styles.netValue}>${net.toFixed(2)}</Text>
                </View>
                <Ionicons name="cash" color={colors.gold} size={28} />
              </GlassCard>

              <View style={{ height: 18 }} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton testID="quick-payout-cancel" label="Cancel" variant="ghost" onPress={() => { reset(); onClose(); }} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    testID="quick-payout-save"
                    label="Save Payout"
                    variant="gold"
                    loading={submitting}
                    disabled={!selectedId || !gross}
                    onPress={submit}
                  />
                </View>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.borderStrong, padding: 20, maxHeight: "92%" },
  handle: { width: 40, height: 4, backgroundColor: colors.borderStrong, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  eyebrow: { color: colors.gold, fontSize: 10, letterSpacing: 1.6, fontWeight: "700" },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  label: { color: colors.textDim, fontSize: 10, letterSpacing: 1.2, fontWeight: "700" },
  input: { marginTop: 8, color: colors.text, fontSize: 15, paddingHorizontal: 14, height: 46, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  netCard: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  netValue: { color: colors.gold, fontFamily: fonts.mono, fontSize: 26, fontWeight: "800", marginTop: 4 },
});
