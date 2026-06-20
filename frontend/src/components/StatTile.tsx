import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, spacing } from "@/src/theme";
import { GlassCard } from "./GlassCard";

type Props = {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: string;
  hint?: string;
  glow?: "green" | "gold" | "brand" | "red" | "none";
  testID?: string;
};

export function StatTile({ label, value, suffix, accent, hint, glow, testID }: Props) {
  return (
    <GlassCard glow={glow} style={styles.tile} testID={testID}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, accent ? { color: accent } : null]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  tile: { padding: spacing.lg, minHeight: 96, justifyContent: "space-between" },
  label: { color: colors.textDim, fontSize: 10, letterSpacing: 1.4, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "flex-end", marginTop: 6 },
  value: { color: colors.text, fontFamily: fonts.mono, fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  suffix: { color: colors.textMuted, fontFamily: fonts.mono, fontSize: 12, marginLeft: 4, marginBottom: 4 },
  hint: { color: colors.textDim, fontSize: 11, marginTop: 4 },
});
