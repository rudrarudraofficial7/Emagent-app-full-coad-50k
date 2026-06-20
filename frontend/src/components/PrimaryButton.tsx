import { Pressable, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, fonts } from "@/src/theme";

type Props = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger" | "gold";
  disabled?: boolean;
  testID?: string;
  icon?: React.ReactNode;
};

export function PrimaryButton({ label, onPress, loading, variant = "primary", disabled, testID, icon }: Props) {
  const opacity = disabled || loading ? 0.5 : 1;
  if (variant === "ghost") {
    return (
      <Pressable testID={testID} disabled={disabled || loading} onPress={onPress} style={[styles.ghost, { opacity }]}>
        {icon}
        <Text style={[styles.ghostLabel, icon ? { marginLeft: 8 } : null]}>{label}</Text>
      </Pressable>
    );
  }
  if (variant === "danger") {
    return (
      <Pressable testID={testID} disabled={disabled || loading} onPress={onPress} style={[styles.danger, { opacity }]}>
        <Text style={styles.dangerLabel}>{label}</Text>
      </Pressable>
    );
  }
  const grad = variant === "gold"
    ? [colors.gold, "#9C7A1E"] as const
    : [colors.brand, "#0099B8"] as const;
  return (
    <Pressable testID={testID} disabled={disabled || loading} onPress={onPress} style={{ opacity }}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text style={[styles.primaryLabel, icon ? { marginLeft: 8 } : null]}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  primaryLabel: { color: "#000", fontWeight: "800", fontSize: 14, letterSpacing: 0.5, fontFamily: fonts.body },
  ghost: {
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ghostLabel: { color: colors.text, fontWeight: "600", fontSize: 14, fontFamily: fonts.body },
  danger: {
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.redDim,
    borderWidth: 1,
    borderColor: colors.red,
  },
  dangerLabel: { color: colors.red, fontWeight: "700", fontSize: 14, fontFamily: fonts.body },
});
