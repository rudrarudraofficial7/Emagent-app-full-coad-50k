import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { ScreenBackground } from "@/src/components/ScreenBackground";
import { GlassCard } from "@/src/components/GlassCard";
import { PulseDot } from "@/src/components/PulseDot";
import { PrimaryButton } from "@/src/components/PrimaryButton";
import { colors, fonts, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

export default function CopyTradingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [ct, accs] = await Promise.all([api.getCopyTrading(), api.listAccounts()]);
      setData(ct);
      setAccounts(accs.filter((a: any) => a.status === "funded_active"));
    } catch (e) { console.warn(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data) return <ScreenBackground><ActivityIndicator color={colors.brand} style={{ marginTop: 200 }} /></ScreenBackground>;

  const setMaster = async (id: string) => { await api.setMaster(id); load(); };

  return (
    <ScreenBackground>
      <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}><Ionicons name="arrow-back" color={colors.text} size={20} /></Pressable>
        <Text style={styles.topTitle}>COPY TRADING</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}>
        {accounts.length < 2 ? (
          <GlassCard style={{ alignItems: "center", padding: 28 }}>
            <Ionicons name="git-network" color={colors.textDim} size={42} />
            <Text style={styles.emptyTitle}>Copy Trading Locked</Text>
            <Text style={styles.emptySub}>You need at least 2 funded accounts to enable copy trading.</Text>
            <View style={{ height: 14 }} />
            <PrimaryButton testID="goto-accounts-btn" label="Manage Accounts" variant="ghost" onPress={() => router.push("/(tabs)/accounts")} />
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionTitle}>MASTER ACCOUNT</Text>
            {data.master ? (
              <GlassCard glow="green" style={styles.masterCard}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <PulseDot color={colors.green} size={8} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.accName}>{data.master.name}</Text>
                    <Text style={styles.accMeta}>{data.master.accountType} · ${data.master.accountSize.toLocaleString()}</Text>
                  </View>
                  <View style={styles.masterBadge}>
                    <Text style={styles.masterBadgeText}>MASTER</Text>
                  </View>
                </View>
              </GlassCard>
            ) : null}

            <View style={{ height: spacing.lg }} />
            <Text style={styles.sectionTitle}>SLAVE ACCOUNTS · {data.slaves.length}</Text>
            {data.slaves.map((s: any, i: number) => (
              <GlassCard key={s.id} style={styles.slaveCard}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.slaveIdx}><Text style={styles.slaveIdxText}>{i + 1}</Text></View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.accName}>{s.name}</Text>
                    <Text style={styles.accMeta}>{s.accountType} · ${s.accountSize.toLocaleString()}</Text>
                  </View>
                  <Pressable testID={`set-master-${s.id}`} onPress={() => setMaster(s.id)} style={styles.makeMasterBtn}>
                    <Text style={styles.makeMasterText}>Make Master</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}

            <View style={{ height: spacing.lg }} />
            <GlassCard style={{ padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={styles.sectionTitle}>COPY STATUS</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                    {data.enabled ? `Active · ${data.slaves.length} slaves following master` : "Inactive"}
                  </Text>
                </View>
                <View style={[styles.statusPill, data.enabled ? { backgroundColor: colors.greenDim, borderColor: colors.green } : { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <Text style={[styles.statusText, { color: data.enabled ? colors.green : colors.textMuted }]}>
                    {data.enabled ? "ENABLED" : "DISABLED"}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  topTitle: { color: colors.text, fontSize: 12, letterSpacing: 2, fontWeight: "800" },
  sectionTitle: { color: colors.text, fontSize: 11, letterSpacing: 1.8, fontWeight: "800", marginBottom: 10 },
  masterCard: { padding: 16, marginBottom: 6 },
  slaveCard: { padding: 14, marginBottom: 8 },
  accName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  accMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  masterBadge: { backgroundColor: colors.greenDim, borderColor: colors.green, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  masterBadgeText: { color: colors.green, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  slaveIdx: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  slaveIdxText: { color: colors.brand, fontFamily: fonts.mono, fontSize: 12, fontWeight: "800" },
  makeMasterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  makeMasterText: { color: colors.brand, fontSize: 11, fontWeight: "700" },
  statusPill: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 12 },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: "center" },
});
