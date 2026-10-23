import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowRight, ChevronLeft } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { useApp } from "../src/store/appStore";
import { Segmented } from "../src/components/Segmented";
import { Chip, IconButton, SectionTitle } from "../src/components/Bits";
import { DayStrip } from "../src/components/DayStrip";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { SuccessBurst } from "../src/components/SuccessBurst";
import { goBack } from "../src/ui/nav";
import { kg } from "../src/ui/icons";
import { whatIf, describeChange, type Change } from "../src/lib/changes";
import { shortTotal } from "../src/lib/pack";
import { haptics } from "../src/services/haptics";

type Mode = "laundry" | "bag" | "plans";
const BAGS = [7000, 8000, 10000, 12000, 23000];

export default function WhatIf() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const trip = app.trips.find((x) => x.id === id);
  const [mode, setMode] = useState<Mode>("laundry");
  const [day, setDay] = useState<number | null>(null);
  const [limit, setLimit] = useState(trip ? (BAGS.find((b) => b > trip.limit) ?? trip.limit) : 10000);
  const acts = trip ? [...new Set(trip.days.flatMap((d) => d.activities))].filter((a) => a !== "city") : [];
  const [act, setAct] = useState(acts[0] ?? null);
  const [burst, setBurst] = useState(false);

  const change: Change | null = !trip ? null : mode === "laundry" ? (day === null ? null : { kind: "laundry", day, on: !trip.days[day].laundry }) : mode === "bag" ? { kind: "limit", grams: limit } : act ? { kind: "dropActivity", activity: act } : null;
  const cmp = useMemo(() => (trip && change ? whatIf(trip, app.items, app.model, [change], app.packings[trip.id]) : null), [app.version, JSON.stringify(change)]);
  if (!trip) return null;
  const name = (iid: string) => app.items.find((i) => i.id === iid)?.name ?? "item";
  const changed = cmp ? cmp.after.lines.filter((a) => (cmp.before.lines.find((b) => b.item.id === a.item.id)?.count ?? 0) !== a.count) : [];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconButton label="Back" onPress={() => goBack(router)}>
          <ChevronLeft size={20} color={t.colors.ink} />
        </IconButton>
        <View>
          <Text style={{ ...t.typography.subtitle, color: t.colors.ink }}>What if… · {trip.name}</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>Re-packs the whole bag with one change</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, gap: 14 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <Segmented
            items={[
              { key: "laundry", label: "Laundry" },
              { key: "bag", label: "Bag" },
              { key: "plans", label: "Plans" },
            ]}
            value={mode}
            onChange={(k) => setMode(k as Mode)}
          />
        </View>
        {mode === "laundry" ? (
          <View style={{ gap: 6 }}>
            <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, paddingHorizontal: 16 }}>Tap a day to {day !== null && trip.days[day].laundry ? "drop" : "add"} a wash at its end.</Text>
            <DayStrip days={trip.days} start={trip.start} selected={day} onSelect={setDay} />
          </View>
        ) : mode === "bag" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 }}>
            {BAGS.map((b) => (
              <Chip key={b} label={kg(b)} active={limit === b} onPress={() => setLimit(b)} />
            ))}
          </View>
        ) : acts.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 }}>
            {acts.map((a) => (
              <Chip key={a} label={`Skip ${a}`} active={act === a} onPress={() => setAct(a)} />
            ))}
          </View>
        ) : (
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, paddingHorizontal: 16 }}>This trip has no special plans to skip.</Text>
        )}

        {cmp ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Col title="Now" grams={cmp.before.total} short={shortTotal(cmp.before)} cuts={cmp.before.trimmed.length} />
              <View style={{ justifyContent: "center" }}>
                <ArrowRight size={18} color={t.colors.inkFaint} />
              </View>
              <Col title="If" grams={cmp.after.total} short={shortTotal(cmp.after)} cuts={cmp.after.trimmed.length} base={cmp.before.total} />
            </View>
            <SectionTitle title={changed.length ? `${changed.length} items change` : "The list stays the same"} />
            {changed.map((a, i) => {
              const b = cmp.before.lines.find((x) => x.item.id === a.item.id);
              return (
                <Animated.View key={a.item.id} entering={FadeInDown.delay(staggerDelay(i)).duration(300)} style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                  <Text style={{ ...t.typography.label, color: t.colors.ink, flex: 1 }}>{a.item.name}</Text>
                  <Text style={{ ...t.typography.label, color: t.colors.inkMuted }}>
                    ×{b?.count ?? 0} → <Text style={{ color: t.colors.ink, fontWeight: "800" }}>×{a.count}</Text>
                  </Text>
                  <Text style={{ ...t.typography.caption, color: a.count < (b?.count ?? 0) ? t.colors.success : t.colors.signal, width: 64, textAlign: "right" }}>
                    {a.grams - (b?.grams ?? 0) > 0 ? "+" : ""}
                    {a.grams - (b?.grams ?? 0)} g
                  </Text>
                </Animated.View>
              );
            })}
            {change ? (
              <PrimaryButton
                label={`Apply: ${describeChange(change, name)}`}
                onPress={async () => {
                  await app.applyChange(trip.id, change);
                  setDay(null);
                  haptics.success();
                  setBurst(true);
                }}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      {burst ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <SuccessBurst visible size={100} onDone={() => setTimeout(() => setBurst(false), 200)} />
        </View>
      ) : null}
    </View>
  );
}

function Col({ title, grams, short, cuts, base }: { title: string; grams: number; short: number; cuts: number; base?: number }) {
  const t = useTheme();
  const d = base !== undefined ? grams - base : 0;
  return (
    <View style={[styles.card, { flex: 1, backgroundColor: base !== undefined ? t.colors.surface : t.colors.surfaceAlt, borderColor: t.colors.border, gap: 3 }]}>
      <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>{title}</Text>
      <Text style={{ fontSize: 24, fontWeight: "800", color: t.colors.ink }}>{kg(grams)}</Text>
      {base !== undefined && Math.abs(d) >= 50 ? <Text style={{ ...t.typography.label, color: d < 0 ? t.colors.success : t.colors.signal }}>{d > 0 ? "+" : "−"}{kg(Math.abs(d))}</Text> : null}
      <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, marginTop: 4 }}>{cuts ? `${cuts} ${cuts === 1 ? "item" : "items"} cut · ${short.toFixed(1)} short days` : "nothing cut"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 20, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
});
