import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useTheme } from "../theme";
import { kg } from "../ui/icons";

// Hero: сумка силуэтом. Заливка снизу — вес по плану, пунктир-призрак — сколько
// весило бы "всё, что хочется", черта сверху — лимит. Перевес — красным.
// Заливка поднимается анимацией при каждом пересчёте.
const H = 170;
const W = 128;

export function BagGauge({ total, ideal, limit, bag }: { total: number; ideal: number; limit: number; bag: number }) {
  const t = useTheme();
  const top = Math.max(limit * 1.15, ideal * 1.02, 1);
  const y = (g: number) => Math.min(H, (g / top) * H);
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(100, withTiming(y(total), { duration: 750, easing: Easing.out(Easing.cubic) }));
  }, [total, top]);
  const fillStyle = useAnimatedStyle(() => ({ height: fill.value }));
  const over = ideal > limit;
  return (
    <View style={{ width: W + 70, height: H + 34, alignItems: "center" }}>
      {/* ручка */}
      <View style={{ width: 54, height: 22, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 5, borderBottomWidth: 0, borderColor: t.colors.accentDeep }} />
      <View style={{ width: W, height: H, borderRadius: 22, borderWidth: 3, borderColor: t.colors.accentDeep, backgroundColor: t.colors.surfaceAlt, overflow: "hidden", justifyContent: "flex-end" }}>
        {over ? <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: y(ideal), borderTopWidth: 2, borderStyle: "dashed", borderColor: t.colors.danger, backgroundColor: t.colors.dangerSoft }} /> : null}
        <Animated.View style={[{ backgroundColor: total > limit ? t.colors.danger : t.colors.accent }, fillStyle]}>
          <View style={{ height: y(bag), position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: t.colors.accentDeep, opacity: 0.35 }} />
        </Animated.View>
        <View style={{ position: "absolute", left: 0, right: 0, bottom: y(limit), height: 3, backgroundColor: t.colors.ink }} />
        {/* ремни */}
        <View style={{ position: "absolute", top: 0, bottom: 0, left: W * 0.28, width: 5, backgroundColor: t.colors.tag, opacity: 0.55 }} />
        <View style={{ position: "absolute", top: 0, bottom: 0, right: W * 0.28, width: 5, backgroundColor: t.colors.tag, opacity: 0.55 }} />
      </View>
      <Text style={{ position: "absolute", right: 0, top: 22 + H - y(limit) - 9, fontSize: 11, fontWeight: "800", color: t.colors.ink }}>{kg(limit)}</Text>
      {over ? <Text style={{ position: "absolute", right: 0, top: Math.max(22, 22 + H - y(ideal) - 9), fontSize: 10, fontWeight: "700", color: t.colors.danger }}>{kg(ideal)}</Text> : null}
    </View>
  );
}
