import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { View, StyleSheet } from "react-native";

export function PulseDot({ color = "#00FF66", size = 8 }: { color?: string; size?: number }) {
  const sv = useSharedValue(1);
  useEffect(() => {
    sv.value = withRepeat(withTiming(2.4, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false);
  }, [sv]);
  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: sv.value }],
    opacity: 1.4 - sv.value * 0.5,
  }));
  return (
    <View style={[styles.wrap, { width: size * 3, height: size * 3 }]}>
      <Animated.View
        style={[
          styles.halo,
          halo,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.dot,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute" },
  dot: {},
});
