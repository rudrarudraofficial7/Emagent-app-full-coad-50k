import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors, radius, shadow } from "@/src/theme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: "green" | "gold" | "brand" | "red" | "none";
  testID?: string;
};

export function GlassCard({ children, style, glow = "none", testID }: Props) {
  const glowStyle =
    glow === "green" ? shadow.glow(colors.green, 0.25) :
    glow === "gold" ? shadow.glow(colors.gold, 0.25) :
    glow === "brand" ? shadow.glow(colors.brand, 0.22) :
    glow === "red" ? shadow.glow(colors.red, 0.22) :
    shadow.card;
  const borderColor =
    glow === "green" ? "rgba(0,255,102,0.35)" :
    glow === "gold" ? "rgba(212,175,55,0.35)" :
    glow === "brand" ? "rgba(0,229,255,0.30)" :
    glow === "red" ? "rgba(255,68,68,0.30)" :
    colors.border;
  return (
    <View testID={testID} style={[styles.card, { borderColor }, glowStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
  },
});
