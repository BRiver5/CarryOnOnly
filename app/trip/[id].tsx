import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Check, ChevronLeft, GitCompareArrows, Pencil, Shirt, TriangleAlert, Wand } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { staggerDelay } from "../../src/theme/motion";
import { useApp } from "../../src/store/appStore";
import { DayStrip } from "../../src/components/DayStrip";
import { IconButton, SectionTitle } from "../../src/components/Bits";
import { PressableScale } from "../../src/components/PressableScale";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Sheet } from "../../src/components/Sheet";
import { TripSheet } from "../../src/components/TripSheet";
import { SuccessBurst } from "../../src/components/SuccessBurst";
import { kg } from "../../src/ui/icons";
import { goBack } from "../../src/ui/nav";
import { cycles } from "../../src/lib/need";
import { factorFor } from "../../src/lib/model";
import { importance, type Line } from "../../src/lib/pack";
import type { Fix } from "../../src/lib/conflicts";
import { addDays, dayLabel } from "../../src/lib/time";
import { haptics } from "../../src/services/haptics";

const GROUPS: { kind: "wear" | "gear" | "toiletry"; title: string }[] = [
  { kind: "wear", title: "Clothes" },
  { kind: "gear", title: "Gear" },
  { kind: "toiletry", title: "Toiletries" },
];

export default function TripScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const [why, setWhy] = useState<Line | null>(null);
  const [edit, setEdit] = useState(false);
  const [burst, setBurst] = useState(false);
  const trip = app.trips.find((x) => x.id === id);
  if (!trip) return null;
  const p = app.packings[trip.id];
  const conflicts = app.conflicts[trip.id] ?? [];
  const packed = app.packed[trip.id] ?? [];
  const lines = p ? p.lines.filter((l) => l.count > 0 || l.ideal > 0) : [];
  const done = lines.filter((l) => l.count > 0 && packed.includes(l.item.id)).length;
  const toPack = lines.filter((l) => l.count > 0).length;
  const started = trip.start <= app.today;
  const cs = cycles(trip);

  const applyFix = async (f: Fix) => {
    await app.applyChange(trip.id, f.change);
    haptics.success();
    setBurst(true);
  };

  // Липкие индексы: 0 — шапка-карточка, затем пары (заголовок группы, строки).
  const groups = GROUPS.map((g) => ({ ...g, lines: lines.filter((l) => l.item.kind === g.kind) })).filter((g) => g.lines.length);
  const sticky = groups.map((_, i) => 1 + i * 2);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconButton label="Back" onPress={() => goBack(router)}>
          <ChevronLeft size={20} color={t.colors.ink} />
        </IconButton>
        <View style={{ flex: 1 }}>
          <Text style={{ ...t.typography.subtitle, color: t.colors.ink }}>{trip.name}</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
            {dayLabel(trip.start)}–{dayLabel(addDays(trip.start, trip.days.length - 1))} · {cs.length === 1 ? "no laundry" : `${cs.length - 1} ${cs.length === 2 ? "wash" : "washes"}`}
          </Text>
        </View>
        {!trip.closed ? (
          <>
            <IconButton label="Edit trip" onPress={() => setEdit(true)}>
              <Pencil size={16} color={t.colors.ink} />
            </IconButton>
            <IconButton label="What if" onPress={() => router.push({ pathname: "/whatif", params: { id: trip.id } })}>
              <GitCompareArrows size={16} color={t.colors.ink} />
            </IconButton>
          </>
        ) : null}
      </View>

      {trip.closed ? (
        <View style={{ padding: 16 }}>
          <Text style={{ ...t.typography.body, color: t.colors.inkMuted }}>This trip is unpacked — what you wore has been learned. Its numbers are in Stats.</Text>
        </View>
      ) : (
        <ScrollView stickyHeaderIndices={sticky} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          {/* 0: дни + вес + конфликты */}
          <View style={{ gap: 12 }}>
            <DayStrip days={trip.days} start={trip.start} onChange={(i, d) => app.saveTrip({ ...trip, days: trip.days.map((x, k) => (k === i ? d : x)) })} />
            <Text style={{ ...t.typography.caption, color: t.colors.inkFaint, paddingHorizontal: 16 }}>Tap a day to change weather · hold to add or remove laundry</Text>
            {p ? (
              <Animated.View entering={FadeInDown.duration(360)} style={[styles.card, { marginHorizontal: 16, backgroundColor: t.colors.surface, borderColor: t.colors.border, gap: 8 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ ...t.typography.label, color: t.colors.ink }}>
                    {kg(p.total)} of {kg(p.limit)}
                  </Text>
                  <Text style={{ ...t.typography.label, color: p.over ? t.colors.danger : t.colors.success }}>{p.over ? `${kg(p.over)} cut to fit` : `${kg(p.limit - p.total)} spare`}</Text>
                </View>
                <View style={{ height: 12, borderRadius: 6, backgroundColor: t.colors.backgroundAlt, overflow: "hidden", flexDirection: "row" }}>
                  <View style={{ width: `${(trip.bag / Math.max(p.limit, p.total)) * 100}%`, backgroundColor: t.colors.accentDeep }} />
                  {GROUPS.map((g) => {
                    const w = p.lines.filter((l) => l.item.kind === g.kind).reduce((s, l) => s + l.grams, 0);
                    return <View key={g.kind} style={{ width: `${(w / Math.max(p.limit, p.total)) * 100}%`, backgroundColor: t.colors.kind[g.kind] }} />;
                  })}
                </View>
                <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                  Bag {kg(trip.bag)} · clothes · gear · toiletries · {p.lines.filter((l) => l.worn).map((l) => l.item.name).join(", ") || "nothing"} worn on the way
                </Text>
              </Animated.View>
            ) : null}
            {conflicts.map((c, i) => (
              <Animated.View key={c.id} entering={FadeInDown.delay(staggerDelay(i)).duration(340)} style={[styles.card, { marginHorizontal: 16, backgroundColor: t.colors.surface, borderColor: t.colors.dangerSoft }]}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TriangleAlert size={18} color={c.kind === "longStretch" ? t.colors.signal : t.colors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...t.typography.body, fontWeight: "700", color: t.colors.ink }}>{c.title}</Text>
                    <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, marginTop: 2 }}>{c.reason}</Text>
                  </View>
                </View>
                {c.fixes.length ? (
                  <View style={{ marginTop: 10, gap: 6 }}>
                    <Text style={{ ...t.typography.overline, color: t.colors.inkFaint }}>Ways out, checked by re-packing</Text>
                    {c.fixes.map((f, j) => (
                      <PressableScale key={j} onPress={() => applyFix(f)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: j === 0 ? t.colors.accentSoft : t.colors.surfaceAlt }}>
                        <Wand size={15} color={j === 0 ? t.colors.accent : t.colors.inkMuted} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...t.typography.label, color: t.colors.ink }}>{f.label}</Text>
                          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>{f.effect}</Text>
                        </View>
                      </PressableScale>
                    ))}
                  </View>
                ) : null}
              </Animated.View>
            ))}
            <View style={{ paddingHorizontal: 16 }}>
              <SectionTitle title={`Packing list · ${done}/${toPack} in the bag`} />
            </View>
          </View>

          {groups.flatMap((g, gi) => [
            <View key={`h${g.kind}`} style={{ backgroundColor: t.colors.background, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
              <SectionTitle title={g.title} right={<Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>{kg(g.lines.reduce((s, l) => s + l.grams, 0))}</Text>} />
            </View>,
            <View key={`b${g.kind}`} style={{ paddingHorizontal: 16, gap: 6 }}>
              {g.lines.map((l, i) => {
                const on = packed.includes(l.item.id);
                const cut = l.count < l.ideal;
                return (
                  <Animated.View key={l.item.id} entering={FadeInDown.delay(staggerDelay(gi * 3 + i, 25)).duration(260)}>
                    <PressableScale
                      onPress={() => {
                        if (l.count === 0) return setWhy(l);
                        haptics.tick();
                        app.togglePacked(trip.id, l.item.id);
                      }}
                      onLongPress={() => {
                        haptics.press();
                        setWhy(l);
                      }}
                      style={[styles.row, { backgroundColor: on ? t.colors.successSoft : t.colors.surface, borderColor: cut ? t.colors.danger : on ? t.colors.successSoft : t.colors.border }]}
                    >
                      <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? t.colors.success : t.colors.border, backgroundColor: on ? t.colors.success : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {on ? <Check size={16} color={t.colors.onAccent} strokeWidth={3} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...t.typography.label, color: l.count === 0 ? t.colors.inkFaint : t.colors.ink, textDecorationLine: on ? "line-through" : "none" }}>{l.item.name}</Text>
                        <Text style={{ ...t.typography.caption, color: cut ? t.colors.danger : t.colors.inkMuted }}>
                          {cut ? `${l.ideal} wanted · cut to fit · ${l.short.toFixed(1)} short ${l.short === 1 ? "day" : "days"}` : l.worn ? "1 worn on the way" : `${l.need.daysUsed} ${l.need.daysUsed === 1 ? "day" : "days"} of use`}
                        </Text>
                      </View>
                      {l.worn ? <Shirt size={14} color={t.colors.tag} /> : null}
                      <Text style={{ fontSize: 18, fontWeight: "800", color: l.count === 0 ? t.colors.inkFaint : t.colors.ink }}>×{l.count}</Text>
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </View>,
          ])}
          <Text style={{ ...t.typography.caption, color: t.colors.inkFaint, textAlign: "center", marginTop: 12 }}>Tap to tick off · hold for why this many</Text>
        </ScrollView>
      )}

      {!trip.closed && started ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
          <PrimaryButton label="Back home? Unpack and tell what you wore" onPress={() => router.push({ pathname: "/debrief/[id]", params: { id: trip.id } })} />
        </View>
      ) : null}

      {burst ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <SuccessBurst visible size={100} onDone={() => setTimeout(() => setBurst(false), 200)} />
        </View>
      ) : null}

      <Sheet visible={!!why} onClose={() => setWhy(null)} title={why ? `${why.item.name} ×${why.count}` : ""} subtitle="Why this many">
        {why ? <WhyBody l={why} cyclesCount={cs.length} longest={Math.max(...cs.map((c) => c.length))} /> : null}
      </Sheet>
      <TripSheet
        visible={edit}
        initial={trip}
        today={app.today}
        onClose={() => setEdit(false)}
        onSave={async (d) => {
          setEdit(false);
          await app.saveTrip({ ...trip, ...d });
        }}
      />
    </View>
  );
}

function WhyBody({ l, cyclesCount, longest }: { l: Line; cyclesCount: number; longest: number }) {
  const t = useTheme();
  const app = useApp();
  const f = factorFor(app.model, l.item);
  const rows: [string, string][] = [];
  rows.push(["Needed on", `${l.need.daysUsed} of the trip's days${l.item.weather.length ? ` (${l.item.weather.join("/")} weather)` : ""}${l.item.activity ? ` with ${l.item.activity} plans` : ""}`]);
  if (l.item.wears > 0) {
    rows.push(["Longest stretch between washes", `${l.need.worstCycle} uses (${cyclesCount} ${cyclesCount === 1 ? "stretch" : "stretches"}, longest ${longest} days)`]);
    rows.push(["Days per wash", `${l.item.wears} set × ${f.factor.toFixed(2)} learned = ${l.need.effWears.toFixed(1)}`]);
    rows.push(["So you'd want", `⌈${l.need.worstCycle} ÷ ${l.need.effWears.toFixed(1)}⌉ = ${l.ideal}`]);
  } else rows.push(["Not washed", "one is enough for the whole trip"]);
  if (l.worn) rows.push(["On the way", "one is worn, not packed — it's among the heaviest you can wear"]);
  if (l.count < l.ideal) rows.push(["Cut to fit", `${l.ideal} → ${l.count}: costs ${l.short.toFixed(1)} short days × importance ${importance(l.item)} — the cheapest cut that fits the limit`]);
  return (
    <View style={{ gap: 10 }}>
      {rows.map(([k, v]) => (
        <View key={k} style={{ gap: 2 }}>
          <Text style={{ ...t.typography.overline, color: t.colors.inkFaint }}>{k}</Text>
          <Text style={{ ...t.typography.body, color: t.colors.ink }}>{v}</Text>
        </View>
      ))}
      <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
        {f.source === "item" ? `Learned from ${f.trips} ${f.trips === 1 ? "trip" : "trips"} where you unpacked this item.` : f.source === "kind" ? "No trips with this item yet — borrowed from your other items of this kind." : "No trips yet — using the days per wash you set."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 20, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 16, borderWidth: 1 },
});
