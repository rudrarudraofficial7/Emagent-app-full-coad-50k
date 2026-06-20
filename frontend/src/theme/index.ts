import { Platform } from "react-native";

export const colors = {
  bg: "#050505",
  bgElevated: "#0B0B0E",
  surface: "#121214",
  surface2: "#1A1A1E",
  border: "#1E1E24",
  borderStrong: "#2A2A35",
  text: "#FFFFFF",
  textMuted: "#A1A1A8",
  textDim: "#6E6E78",
  brand: "#00E5FF",
  brandDim: "rgba(0,229,255,0.14)",
  gold: "#D4AF37",
  goldDim: "rgba(212,175,55,0.16)",
  green: "#00FF66",
  greenDim: "rgba(0,255,102,0.14)",
  red: "#FF4444",
  redDim: "rgba(255,68,68,0.16)",
  amber: "#FFB020",
  amberDim: "rgba(255,176,32,0.16)",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const fonts = {
  // Bloomberg-style monospace for numbers
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) as string,
  display: Platform.select({ ios: "Avenir Next", android: "sans-serif-medium", default: "system-ui" }) as string,
  body: Platform.select({ ios: "System", android: "sans-serif", default: "system-ui" }) as string,
};

export const shadow = {
  glow: (color: string, opacity = 0.35) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: opacity,
    shadowRadius: 16,
    elevation: 8,
  }),
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const statusColor = (status: string) => {
  switch (status) {
    case "funded_active": return colors.green;
    case "evaluation_passed": return colors.gold;
    case "evaluation_running": return colors.brand;
    case "blown": return colors.red;
    default: return colors.textMuted;
  }
};

export const statusLabel = (status: string) => {
  switch (status) {
    case "funded_active": return "FUNDED";
    case "evaluation_passed": return "PASSED";
    case "evaluation_running": return "EVAL";
    case "blown": return "BLOWN";
    default: return status.toUpperCase();
  }
};
