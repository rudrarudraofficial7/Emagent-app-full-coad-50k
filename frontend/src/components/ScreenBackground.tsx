import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/src/theme";

export function ScreenBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,229,255,0.10)", "transparent"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.5 }}
        style={styles.glowTop}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(212,175,55,0.06)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowBottom}
      />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glowTop: { position: "absolute", top: -80, left: -40, right: -40, height: 360 },
  glowBottom: { position: "absolute", bottom: -120, left: -40, right: -40, height: 320 },
});
