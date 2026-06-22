import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  Modal,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';

const COLORS = {
  bg: '#050505',
  surface: '#121214',
  brand: '#00E5FF',
  text: '#FFFFFF',
  textMuted: '#A1A1A8',
  border: '#1E1E24',
  green: '#00FF66',
  red: '#FF4444',
};

interface WatchlistItem {
  id: string;
  symbol: string;
  fullName: string;
  price: number;
  change: number;
  changePercent: number;
}

interface WatchlistSection {
  title: string;
  data: WatchlistItem[];
  collapsed?: boolean;
}

const INITIAL_SECTIONS: WatchlistSection[] = [
  {
    title: 'MY WATCHLIST',
    data: [
      { id: '1', symbol: 'XAUUSD', fullName: 'Gold/USD', price: 2345.50, change: 15.25, changePercent: 0.66 },
      { id: '2', symbol: 'NAS100', fullName: 'Nasdaq 100', price: 18234.75, change: -45.50, changePercent: -0.25 },
      { id: '3', symbol: 'USOIL', fullName: 'Crude Oil', price: 78.45, change: 2.15, changePercent: 2.81 },
      { id: '4', symbol: 'MNQ1!', fullName: 'Micro Nasdaq', price: 18250.25, change: -30.75, changePercent: -0.17 },
      { id: '5', symbol: 'US30', fullName: 'US 30', price: 40125.50, change: 125.50, changePercent: 0.31 },
    ],
    collapsed: false,
  },
  {
    title: 'FOREX',
    data: [
      { id: '6', symbol: 'GBPUSD', fullName: 'GBP/USD', price: 1.2745, change: 0.0025, changePercent: 0.20 },
      { id: '7', symbol: 'EURUSD', fullName: 'EUR/USD', price: 1.0950, change: -0.0035, changePercent: -0.32 },
      { id: '8', symbol: 'USDJPY', fullName: 'USD/JPY', price: 149.85, change: 0.45, changePercent: 0.30 },
      { id: '9', symbol: 'GBPJPY', fullName: 'GBP/JPY', price: 191.25, change: -1.75, changePercent: -0.91 },
      { id: '10', symbol: 'USDCAD', fullName: 'USD/CAD', price: 1.3625, change: 0.0015, changePercent: 0.11 },
      { id: '11', symbol: 'USDCHF', fullName: 'USD/CHF', price: 0.8845, change: -0.0020, changePercent: -0.23 },
    ],
    collapsed: false,
  },
  {
    title: 'CRYPTO',
    data: [
      { id: '12', symbol: 'BTCUSD', fullName: 'Bitcoin/USD', price: 67850.00, change: 1250.00, changePercent: 1.87 },
      { id: '13', symbol: 'ETHUSD', fullName: 'Ethereum/USD', price: 3456.75, change: -85.50, changePercent: -2.41 },
    ],
    collapsed: false,
  },
];

const TradingViewChart = ({ symbol }: { symbol: string }) => {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#050505; overflow:hidden; }
#tv_chart { width:100vw; height:100vh; }
</style>
</head>
<body>
<div id="tv_chart"></div>
<script src="https://s3.tradingview.com/tv.js"><\/script>
<script>
new TradingView.widget({
  autosize: true,
  symbol: "${symbol}",
  interval: "15",
  timezone: "Asia/Kolkata",
  theme: "dark",
  style: "1",
  locale: "en",
  toolbar_bg: "#050505",
  enable_publishing: false,
  withdateranges: true,
  hide_side_toolbar: false,
  allow_symbol_change: true,
  save_image: false,
  container_id: "tv_chart"
});
<\/script>
</body>
</html>`;

  return (
    <WebView
      source={{ html: htmlContent }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      style={StyleSheet.absoluteFill}
    />
  );
};

const ChartOverlay = ({
  symbol,
  onBack,
  onRotate,
}: {
  symbol: string;
  onBack: () => void;
  onRotate: () => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.chartOverlay,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
      pointerEvents="box-none"
    >
      {/* Top Bar */}
      <View style={styles.chartTopBar}>
        <TouchableOpacity onPress={onBack} style={styles.overlayButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.symbolDisplay}>{symbol}</Text>

        <TouchableOpacity onPress={onRotate} style={styles.overlayButton}>
          <Ionicons name="phone-portrait" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const WatchlistRow = ({
  item,
  onPress,
}: {
  item: WatchlistItem;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
    onPress();
  };

  const changeColor = item.change >= 0 ? COLORS.green : COLORS.red;
  const changeSign = item.change >= 0 ? '+' : '';

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.watchlistRow}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.rowSymbol}>{item.symbol}</Text>
          <Text style={styles.rowFullName}>{item.fullName}</Text>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.rowPrice}>{item.price.toFixed(2)}</Text>
          <Text style={[styles.rowChange, { color: changeColor }]}>
            {changeSign}{item.change.toFixed(2)} ({changeSign}
            {item.changePercent.toFixed(2)}%)
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SectionHeader = ({
  title,
  collapsed,
  onPress,
}: {
  title: string;
  collapsed: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.sectionHeader}
    activeOpacity={0.7}
  >
    <Ionicons
      name={collapsed ? 'chevron-forward' : 'chevron-down'}
      size={20}
      color={COLORS.brand}
    />
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </TouchableOpacity>
);

export default function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<WatchlistSection[]>(INITIAL_SECTIONS);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height))
    .current;

  useEffect(() => {
    if (selectedSymbol) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedSymbol, slideAnim]);

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const handleBackFromChart = async () => {
    setSelectedSymbol(null);
    setIsLandscape(false);
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    );
  };

  const handleRotate = async () => {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
      setIsLandscape(false);
    } else {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
      );
      setIsLandscape(true);
    }
  };

  const handleToggleSection = (index: number) => {
    const newSections = [...sections];
    newSections[index].collapsed = !newSections[index].collapsed;
    setSections(newSections);
  };

  const filterSections = sections.map((section) => ({
    ...section,
    data: section.collapsed ? [] : section.data,
  }));

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Watchlist View */}
      <View style={styles.watchlistContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Markets</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add-circle" size={28} color={COLORS.brand} />
          </TouchableOpacity>
        </View>

        {/* Section List */}
        <SectionList
          sections={filterSections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index, section }) => {
            const sectionIndex = sections.findIndex(
              (s) => s.title === section.title
            );
            const isCollapsed =
              sections[sectionIndex]?.collapsed ?? false;

            if (isCollapsed) return null;

            return (
              <WatchlistRow
                item={item}
                onPress={() => handleSymbolSelect(item.symbol)}
              />
            );
          }}
          renderSectionHeader={({ section: { title }, index }) => (
            <SectionHeader
              title={title}
              collapsed={sections[index]?.collapsed ?? false}
              onPress={() => handleToggleSection(index)}
            />
          )}
          contentContainerStyle={styles.sectionListContent}
          scrollEnabled={true}
        />

        {/* Chart Toggle Button */}
        <TouchableOpacity
          style={styles.chartToggleButton}
          onPress={() => handleSymbolSelect(selectedSymbol || 'XAUUSD')}
        >
          <Ionicons name="stats-chart-outline" size={20} color={COLORS.text} />
          <Text style={styles.chartToggleText}>Open Chart</Text>
        </TouchableOpacity>
      </View>

      {/* Chart Modal */}
      {selectedSymbol && (
        <Modal
          visible={true}
          animationType="none"
          statusBarTranslucent={true}
          onRequestClose={handleBackFromChart}
        >
          <View style={styles.chartContainer}>
            <TradingViewChart symbol={selectedSymbol} />
            <ChartOverlay
              symbol={selectedSymbol}
              onBack={handleBackFromChart}
              onRotate={handleRotate}
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  watchlistContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    padding: 8,
  },
  sectionListContent: {
    paddingHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  sectionHeaderText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  watchlistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  rowLeft: {
    flex: 1,
  },
  rowSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowFullName: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  chartToggleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.brand,
    borderRadius: 8,
    gap: 8,
  },
  chartToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bg,
  },
  chartContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  chartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  chartTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(5, 5, 5, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  overlayButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 30, 36, 0.8)',
  },
  symbolDisplay: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.brand,
  },
});
