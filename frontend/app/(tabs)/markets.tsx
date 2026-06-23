import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, Animated, Dimensions, StatusBar,
  SafeAreaView, ScrollView, Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  bg: '#050505', surface: '#0d0d0f', card: '#121214',
  brand: '#00E5FF', brandDim: 'rgba(0,229,255,0.12)',
  green: '#00FF66', red: '#FF4444',
  text: '#FFFFFF', textMuted: '#A1A1A8', textDim: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.06)', borderBrand: 'rgba(0,229,255,0.2)',
};

const CATEGORIES = [
  { id: 'all',         label: 'All',         color: '#94a3b8' },
  { id: 'crypto',      label: 'Crypto',      color: '#f7931a' },
  { id: 'forex',       label: 'Forex',       color: '#00E5FF' },
  { id: 'indices',     label: 'Indices',     color: '#e74c3c' },
  { id: 'commodities', label: 'Commodities', color: '#f1c40f' },
  { id: 'stocks',      label: 'Stocks',      color: '#9b59b6' },
];

const SYMBOLS = [
  // CRYPTO
  { base:'BTCUSD',  name:'Bitcoin / USD',        category:'crypto',      feed:'BTCUSD' },
  { base:'ETHUSD',  name:'Ethereum / USD',        category:'crypto',      feed:'ETHUSD' },
  { base:'BNBUSD',  name:'BNB / USD',             category:'crypto',      feed:'BNBUSD' },
  { base:'SOLUSD',  name:'Solana / USD',          category:'crypto',      feed:'SOLUSD' },
  { base:'XRPUSD',  name:'XRP / USD',             category:'crypto',      feed:'XRPUSD' },
  { base:'ADAUSD',  name:'Cardano / USD',         category:'crypto',      feed:'ADAUSD' },
  { base:'DOGEUSD', name:'Dogecoin / USD',        category:'crypto',      feed:'DOGEUSD' },
  { base:'TONUSD',  name:'Toncoin / USD',         category:'crypto',      feed:'TONUSD' },
  // FOREX
  { base:'EURUSD',  name:'Euro / US Dollar',      category:'forex',       feed:'FX:EURUSD' },
  { base:'GBPUSD',  name:'British Pound / USD',   category:'forex',       feed:'FX:GBPUSD' },
  { base:'USDJPY',  name:'USD / Japanese Yen',    category:'forex',       feed:'FX:USDJPY' },
  { base:'USDCHF',  name:'USD / Swiss Franc',     category:'forex',       feed:'FX:USDCHF' },
  { base:'USDCAD',  name:'USD / Canadian Dollar', category:'forex',       feed:'FX:USDCAD' },
  { base:'AUDUSD',  name:'Australian / USD',      category:'forex',       feed:'FX:AUDUSD' },
  { base:'NZDUSD',  name:'New Zealand / USD',     category:'forex',       feed:'FX:NZDUSD' },
  { base:'EURJPY',  name:'Euro / Japanese Yen',   category:'forex',       feed:'FX:EURJPY' },
  { base:'GBPJPY',  name:'GBP / Japanese Yen',   category:'forex',       feed:'FX:GBPJPY' },
  { base:'EURGBP',  name:'Euro / British Pound',  category:'forex',       feed:'FX:EURGBP' },
  // INDICES
  { base:'NAS100',  name:'NASDAQ 100',            category:'indices',     feed:'NASDAQ:NDX' },
  { base:'SPX500',  name:'S&P 500',               category:'indices',     feed:'SP:SPX' },
  { base:'US30',    name:'Dow Jones',             category:'indices',     feed:'TVC:DJI' },
  { base:'MNQ1!',   name:'Micro NQ Futures',      category:'indices',     feed:'CME_MINI:MNQ1!' },
  { base:'ES1!',    name:'S&P Futures',           category:'indices',     feed:'CME_MINI:ES1!' },
  { base:'UK100',   name:'FTSE 100',              category:'indices',     feed:'TVC:UKX' },
  { base:'GER40',   name:'DAX 40',               category:'indices',     feed:'XETR:DAX' },
  // COMMODITIES
  { base:'XAUUSD',  name:'Gold / US Dollar',      category:'commodities', feed:'TVC:GOLD' },
  { base:'XAGUSD',  name:'Silver / US Dollar',    category:'commodities', feed:'TVC:SILVER' },
  { base:'USOIL',   name:'Crude Oil WTI',         category:'commodities', feed:'NYMEX:CL1!' },
  { base:'UKOIL',   name:'Brent Crude',           category:'commodities', feed:'TVC:UKOIL' },
  { base:'NATGAS',  name:'Natural Gas',           category:'commodities', feed:'NYMEX:NG1!' },
  // STOCKS
  { base:'AAPL',    name:'Apple Inc.',            category:'stocks',      feed:'NASDAQ:AAPL' },
  { base:'MSFT',    name:'Microsoft',             category:'stocks',      feed:'NASDAQ:MSFT' },
  { base:'NVDA',    name:'NVIDIA',               category:'stocks',      feed:'NASDAQ:NVDA' },
  { base:'TSLA',    name:'Tesla Inc.',            category:'stocks',      feed:'NASDAQ:TSLA' },
  { base:'GOOGL',   name:'Alphabet Inc.',         category:'stocks',      feed:'NASDAQ:GOOGL' },
  { base:'AMZN',    name:'Amazon',               category:'stocks',      feed:'NASDAQ:AMZN' },
  { base:'META',    name:'Meta Platforms',        category:'stocks',      feed:'NASDAQ:META' },
];

const SYMBOL_MAP = Object.fromEntries(SYMBOLS.map(s => [s.base, s]));

const DEFAULT_WATCHLIST = ['XAUUSD','NAS100','MNQ1!','BTCUSD','ETHUSD','EURUSD','GBPUSD','USDJPY'];

function randPrice(base: string) {
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  const r = (h % 1000) / 1000;
  const map: Record<string,number> = {
    EURUSD:1.08+r*0.04, GBPUSD:1.27+r*0.05, USDJPY:150+r*8,
    USDCHF:0.88+r*0.04, USDCAD:1.36+r*0.05, AUDUSD:0.66+r*0.04,
    NZDUSD:0.60+r*0.03, EURJPY:162+r*8, GBPJPY:192+r*12, EURGBP:0.85+r*0.02,
  };
  let p = map[base] ?? (
    base.startsWith('BTC') ? 104000+r*2000 :
    base.startsWith('ETH') ? 3800+r*200 :
    base.startsWith('SOL') ? 170+r*20 :
    base.startsWith('XAU') ? 4200+r*60 :
    base.startsWith('XAG') ? 33+r*2 :
    base.startsWith('NAS')||base==='MNQ1!' ? 22000+r*300 :
    base.startsWith('SPX')||base==='ES1!' ? 5900+r*80 :
    base.startsWith('US30') ? 42500+r*300 :
    base==='USOIL'||base==='UKOIL' ? 72+r*6 :
    base==='NATGAS' ? 3.5+r*0.5 :
    base==='AAPL' ? 225+r*10 :
    base==='NVDA' ? 135+r*10 :
    base==='TSLA' ? 280+r*20 : 50+r*100
  );
  const pct = (r - 0.5) * 3;
  return { price: +p.toFixed(p>100?2:5), pct: +pct.toFixed(2) };
}

function fmtPrice(p: number) {
  if (!p) return '—';
  if (p > 10000) return p.toLocaleString('en', { maximumFractionDigits: 0 });
  if (p > 100)   return p.toFixed(2);
  if (p > 10)    return p.toFixed(3);
  return p.toFixed(5);
}

function getTVHtml(feed: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#050505;overflow:hidden}
#tv{width:100%;height:100%}
.tradingview-widget-container{width:100%!important;height:100%!important}
</style>
</head>
<body>
<div class="tradingview-widget-container" style="height:100vh;width:100%">
  <div id="tv" style="height:100%;width:100%"></div>
  <script src="https://s3.tradingview.com/tv.js"></script>
  <script>
  new TradingView.widget({
    autosize: true,
    symbol: "${feed}",
    interval: "15",
    timezone: "Asia/Kolkata",
    theme: "dark",
    style: "1",
    locale: "en",
    backgroundColor: "#050505",
    gridColor: "rgba(0,229,255,0.04)",
    withdateranges: true,
    hide_side_toolbar: false,
    allow_symbol_change: true,
    save_image: false,
    container_id: "tv"
  });
  </script>
</div>
</body>
</html>`;
}

export default function MarketsScreen() {
  const insets = useSafeAreaInsets();
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [tab, setTab]             = useState('all');
  const [chartSymbol, setChartSymbol] = useState<typeof SYMBOLS[0] | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const [query, setQuery]             = useState('');
  const [prices, setPrices]           = useState<Record<string,{price:number,pct:number,flash:string|null}>>(() => {
    const init: Record<string,any> = {};
    SYMBOLS.forEach(s => { init[s.base] = { ...randPrice(s.base), flash: null }; });
    return init;
  });

  // Live price ticker
  useEffect(() => {
    const t = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const cur = next[k];
          const drift = (Math.random() - 0.49) * cur.price * 0.0006;
          next[k] = {
            price: +(cur.price + drift).toFixed(cur.price > 100 ? 2 : 5),
            pct: +(cur.pct * 0.95 + (drift / cur.price) * 100).toFixed(2),
            flash: drift >= 0 ? 'up' : 'down',
          };
        });
        return next;
      });
      setTimeout(() => setPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = { ...next[k], flash: null }; });
        return next;
      }), 400);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const toggleRotate = async () => {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsLandscape(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
      setIsLandscape(true);
    }
  };

  const closeChart = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    setIsLandscape(false);
    setChartSymbol(null);
  };

  const listData = useMemo(() => {
    if (tab === 'all') return watchlist.map(b => SYMBOL_MAP[b]).filter(Boolean);
    return watchlist.map(b => SYMBOL_MAP[b]).filter(s => s && s.category === tab);
  }, [watchlist, tab]);

  const searchResults = useMemo(() => {
    const q = query.toLowerCase();
    return SYMBOLS.filter(s =>
      s.base.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [query]);

  const catColor = (cat: string) => CATEGORIES.find(c => c.id === cat)?.color ?? '#94a3b8';

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ====== CHART MODAL ====== */}
      {chartSymbol && (
        <View style={StyleSheet.absoluteFill}>
          {/* Top bar */}
          <View style={{ position:'absolute',top:0,left:0,right:0,zIndex:10,
            flexDirection:'row',alignItems:'center',gap:10,
            paddingTop: insets.top + 8, paddingBottom:10, paddingHorizontal:14,
            backgroundColor:'rgba(5,5,5,0.95)',
            borderBottomWidth:1, borderBottomColor: COLORS.borderBrand }}>
            <TouchableOpacity onPress={closeChart}
              style={{ backgroundColor: COLORS.brandDim, borderRadius:8, borderWidth:1,
                borderColor: COLORS.borderBrand, paddingHorizontal:12, paddingVertical:6 }}>
              <Text style={{ color: COLORS.brand, fontWeight:'700', fontSize:13 }}>← Back</Text>
            </TouchableOpacity>
            <View style={{ flex:1 }}>
              <Text style={{ color: COLORS.brand, fontWeight:'800', fontSize:15, letterSpacing:1 }}>
                {chartSymbol.base}
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize:10 }}>{chartSymbol.name}</Text>
            </View>
            {prices[chartSymbol.base] && (
              <View style={{ alignItems:'flex-end' }}>
                <Text style={{ color: COLORS.text, fontWeight:'700', fontSize:15 }}>
                  {fmtPrice(prices[chartSymbol.base].price)}
                </Text>
                <Text style={{ color: prices[chartSymbol.base].pct >= 0 ? COLORS.green : COLORS.red, fontSize:11 }}>
                  {prices[chartSymbol.base].pct >= 0 ? '+' : ''}{prices[chartSymbol.base].pct.toFixed(2)}%
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={toggleRotate}
              style={{ backgroundColor: COLORS.brandDim, borderRadius:8, borderWidth:1,
                borderColor: COLORS.borderBrand, padding:8 }}>
              <Ionicons name={isLandscape ? 'phone-portrait' : 'phone-landscape'} size={18} color={COLORS.brand} />
            </TouchableOpacity>
          </View>

          {/* WebView */}
          <WebView
            source={{ html: getTVHtml(chartSymbol.feed) }}
            style={{ flex:1, marginTop: insets.top + 54, backgroundColor: COLORS.bg }}
            javaScriptEnabled originWhitelist={['*']} domStorageEnabled
            allowFileAccess allowUniversalAccessFromFileURLs
            mixedContentMode="always"
            startInLoadingState
          />
        </View>
      )}

      {/* ====== MAIN WATCHLIST ====== */}
      {!chartSymbol && (
        <View style={{ flex:1 }}>
          {/* Header */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
            paddingTop: insets.top + 12, paddingBottom:10, paddingHorizontal:20 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
              <View style={{ width:36, height:36, borderRadius:10,
                backgroundColor:'#0a0a0c', borderWidth:1, borderColor:'rgba(0,229,255,0.25)',
                alignItems:'center', justifyContent:'center' }}>
                <Text style={{ fontSize:18 }}>⚡</Text>
              </View>
              <View>
                <Text style={{ color: COLORS.brand, fontWeight:'800', fontSize:15, letterSpacing:3 }}>MARKETS</Text>
                <View style={{ flexDirection:'row', alignItems:'center', gap:5, marginTop:1 }}>
                  <View style={{ width:5, height:5, borderRadius:99, backgroundColor: COLORS.brand }} />
                  <Text style={{ color: COLORS.textDim, fontSize:9, letterSpacing:3 }}>LIVE</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSearchOpen(true)}
              style={{ width:36, height:36, borderRadius:99, borderWidth:1,
                borderColor:'rgba(255,255,255,0.1)', backgroundColor:'rgba(255,255,255,0.05)',
                alignItems:'center', justifyContent:'center' }}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap:8, paddingHorizontal:16, paddingBottom:10 }}>
            {CATEGORIES.map(c => {
              const active = tab === c.id;
              return (
                <TouchableOpacity key={c.id} onPress={() => setTab(c.id)}
                  style={{ paddingHorizontal:14, paddingVertical:5, borderRadius:99,
                    borderWidth:1, borderColor: active ? c.color : 'rgba(255,255,255,0.08)',
                    backgroundColor: active ? `${c.color}18` : 'transparent',
                    flexDirection:'row', alignItems:'center', gap:6 }}>
                  <View style={{ width:6, height:6, borderRadius:99, backgroundColor: c.color }} />
                  <Text style={{ color: active ? c.color : COLORS.textDim, fontSize:11, fontWeight:'700' }}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* List header */}
          <View style={{ flexDirection:'row', justifyContent:'space-between',
            paddingHorizontal:20, paddingBottom:6 }}>
            <Text style={{ color: COLORS.textDim, fontSize:10, letterSpacing:2 }}>SYMBOL</Text>
            <Text style={{ color: COLORS.textDim, fontSize:10, letterSpacing:2 }}>{listData.length} SYMBOLS</Text>
          </View>

          {/* Symbol rows */}
          <FlatList
            data={listData}
            keyExtractor={s => s.base}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item: s }) => {
              const t = prices[s.base];
              const pos = (t?.pct ?? 0) >= 0;
              const cc = catColor(s.category);
              const flashBg = t?.flash === 'up' ? 'rgba(0,255,102,0.06)' :
                              t?.flash === 'down' ? 'rgba(255,68,68,0.06)' : 'transparent';
              return (
                <TouchableOpacity onPress={() => setChartSymbol(s)}
                  style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                    paddingHorizontal:20, paddingVertical:13,
                    borderBottomWidth:1, borderBottomColor: COLORS.border,
                    backgroundColor: flashBg }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                    <View style={{ width:38, height:38, borderRadius:9,
                      backgroundColor:`${cc}18`, alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ color: cc, fontSize:10, fontWeight:'800' }}>
                        {s.base.slice(0,3)}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ color: COLORS.text, fontWeight:'700', fontSize:14, fontVariant:['tabular-nums'] }}>
                        {s.base}
                      </Text>
                      <Text style={{ color: COLORS.textMuted, fontSize:11, marginTop:1 }}>{s.name}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems:'flex-end' }}>
                    <Text style={{ color: COLORS.text, fontWeight:'600', fontSize:14, fontVariant:['tabular-nums'] }}>
                      {fmtPrice(t?.price)}
                    </Text>
                    <Text style={{ color: pos ? COLORS.green : COLORS.red, fontSize:11, marginTop:1, fontVariant:['tabular-nums'] }}>
                      {pos ? '+' : ''}{t?.pct?.toFixed(2)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* FAB */}
          <TouchableOpacity onPress={() => setSearchOpen(true)}
            style={{ position:'absolute', bottom: insets.bottom + 90, right:20,
              width:50, height:50, borderRadius:25,
              backgroundColor: COLORS.brand, alignItems:'center', justifyContent:'center',
              shadowColor: COLORS.brand, shadowOpacity:0.5, shadowRadius:12, elevation:8 }}>
            <Ionicons name="add" size={26} color="#000" />
          </TouchableOpacity>
        </View>
      )}

      {/* ====== SEARCH MODAL ====== */}
      <Modal visible={searchOpen} animationType="slide" transparent onRequestClose={() => setSearchOpen(false)}>
        <View style={{ flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,0.7)' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSearchOpen(false)} />
          <View style={{ backgroundColor:'#0d0d0f', borderTopLeftRadius:20, borderTopRightRadius:20,
            borderWidth:1, borderColor: COLORS.borderBrand, maxHeight:'85%' }}>
            <View style={{ padding:20, borderBottomWidth:1, borderBottomColor: COLORS.border }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:12 }}>
                <Text style={{ color: COLORS.brand, fontWeight:'800', letterSpacing:2, fontSize:13 }}>ADD SYMBOL</Text>
                <TouchableOpacity onPress={() => setSearchOpen(false)}>
                  <Text style={{ color: COLORS.textMuted, fontSize:18 }}>×</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={query} onChangeText={setQuery} placeholder="Search symbol..."
                placeholderTextColor={COLORS.textDim} autoFocus
                style={{ backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1,
                  borderColor: COLORS.borderBrand, borderRadius:10,
                  padding:12, color: COLORS.text, fontSize:14 }}
              />
            </View>
            <FlatList
              data={searchResults.slice(0,50)}
              keyExtractor={s => s.base}
              renderItem={({ item: s }) => {
                const added = watchlist.includes(s.base);
                const cc = catColor(s.category);
                return (
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                    paddingHorizontal:20, paddingVertical:12,
                    borderBottomWidth:1, borderBottomColor: COLORS.border }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
                      <View style={{ width:36, height:36, borderRadius:8,
                        backgroundColor:`${cc}18`, alignItems:'center', justifyContent:'center' }}>
                        <Text style={{ color: cc, fontSize:10, fontWeight:'800' }}>{s.base.slice(0,3)}</Text>
                      </View>
                      <View>
                        <Text style={{ color: COLORS.text, fontWeight:'600', fontSize:14 }}>{s.base}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize:11 }}>{s.name}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        if (added) setWatchlist(prev => prev.filter(b => b !== s.base));
                        else setWatchlist(prev => [...prev, s.base]);
                      }}
                      style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:20,
                        borderWidth:1,
                        borderColor: added ? 'rgba(255,68,68,0.4)' : COLORS.borderBrand,
                        backgroundColor: added ? 'rgba(255,68,68,0.1)' : COLORS.brandDim }}>
                      <Text style={{ color: added ? COLORS.red : COLORS.brand, fontSize:12, fontWeight:'700' }}>
                        {added ? 'Remove' : '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
