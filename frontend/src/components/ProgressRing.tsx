import { View, Text, StyleSheet } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import { colors, fonts } from "@/src/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  progress: number; // 0-100
  size?: number;
  stroke?: number;
  title?: string;
  centerValue?: string;
  centerSubtitle?: string;
  testID?: string;
};

export function ProgressRing({
  progress,
  size = 220,
  stroke = 14,
  title,
  centerValue,
  centerSubtitle,
  testID,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progressSv = useSharedValue(0);

  useEffect(() => {
    progressSv.value = withTiming(Math.max(0, Math.min(100, progress)), {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, progressSv]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c - (c * progressSv.value) / 100,
  }));

  // Derived shown progress for label (avoid re-creating circle nodes)
  useDerivedValue(() => progressSv.value, [progressSv]);

  return (
    <View testID={testID} style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.brand} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.gold} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surface2}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {centerValue ? <Text style={styles.value}>{centerValue}</Text> : null}
        {centerSubtitle ? <Text style={styles.sub}>{centerSubtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  title: { color: colors.textDim, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  value: { color: colors.text, fontFamily: fonts.mono, fontSize: 30, fontWeight: "700", marginTop: 4 },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
