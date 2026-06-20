import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, fonts } from "@/src/theme";

type Props = {
  title: string;
  action?: string;
  onAction?: () => void;
  testID?: string;
};

export function SectionHeader({ title, action, onAction, testID }: Props) {
  return (
    <View testID={testID} style={styles.row}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} testID={`${testID}-action`}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: colors.text, fontSize: 13, letterSpacing: 1.8, fontWeight: "800", fontFamily: fonts.body },
  action: { color: colors.brand, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
});
