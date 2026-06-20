import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radius, fonts } from "@/src/theme";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  testID?: string;
  compact?: boolean;
};

export function Pill({ label, active, onPress, color, testID, compact }: Props) {
  const accent = color ?? colors.brand;
  const Comp: any = onPress ? Pressable : View;
  return (
    <Comp
      testID={testID}
      onPress={onPress}
      style={[
        styles.pill,
        compact && styles.compact,
        {
          borderColor: active ? accent : colors.border,
          backgroundColor: active ? `${accent}22` : colors.surface,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? accent : colors.textMuted, fontFamily: fonts.body },
        ]}
      >
        {label}
      </Text>
    </Comp>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  compact: { paddingHorizontal: 10, height: 28 },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
});
