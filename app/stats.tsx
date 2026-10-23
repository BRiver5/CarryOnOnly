import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { useApp } from "../src/store/appStore";
import { IconButton, Legend, SectionTitle } from "../src/components/Bits";
import { AnimatedRing } from "../src/components/AnimatedRing";
import { AnimatedCounter } from "../src/components/AnimatedCounter";
import { DonutChart } from "../src/components/DonutChart";
import { BarChart } from "../src/components/BarChart";
import { EmptyState } from "../src/components/EmptyState";
import { goBack } from "../src/ui/nav";
import { kg } from "../src/ui/icons";
import { idleItems, overpack, tripDeadWeight } from "../src/lib/history";
import { factorFor } from "../src/lib/model";
import { dayLabel } from "../src/lib/time";
import { haptics } from "../src/services/haptics";

export default function Stats() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const app = useApp();
  const [sel, setSel] = useState<string | null>(null);
  const closed = app.trips.filter((x) => x.closed).sort((a, b) => (a.start < b.start ? -1 : 1));
  if (app.items.length === 0)
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <IconButton label="Back" onPress={() => goBack(router)}>
          <ChevronLeft size={20} color={t.colors.ink} />
        </IconButton>
        <EmptyState title="Nothing to count yet" description="Add your wardrobe and unpack a trip — how much you overpack and what you never wear show up here." />
      </View>
    );

  const us = sel ? app.usages.filter((u) => u.tripId === sel) : app.usages;
  const op = overpack(us);
  const idle = idleItems(us, app.items, 5);
  const dead = closed.map((tr) => ({ tr, g: tripDeadWeight(tr, app.usages, app.items) }));
  const maxDead = Math.max(1, ...dead.map((d) => d.g));
  const byKind = (["wear", "gear", "toiletry"] as const).map((k) => ({ k, g: app.items.filter((i) => i.kind === k).reduce((s, i) => s + i.grams, 0) }));
  const learned = app.items.filter((i) => i.wears > 0).map((i) => ({ i, f: factorFor(app.model, i) })).filter((x) => x.f.trips > 0).sort((a, b) => b.f.factor - a.f.factor);
  const heaviest = [...app.items].sort((a, b) => b.grams - a.grams).slice(0, 6);
  const nextTrip = app.trips.filter((x) => !x.closed).sort((a, b) => (a.start < b.start ? -1 : 1))[0];
  const np = nextTrip ? app.packings[nextTrip.id] : null;

  const sections = [
    <View key="cards" style={{ flexDirection: "row", gap: 10 }}>
      <View style={[styles.card, { flex: 1, backgroundColor: t.colors.surface, borderColor: t.colors.border, alignItems: "center" }]}>
        <AnimatedRing progress={op.packed ? 1 - op.ratio : 0} size={92} strokeWidth={10} color={t.colors.accent} trackColor={t.colors.tagSoft}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: t.colors.ink }}>{op.packed ? `${Math.round((1 - op.ratio) * 100)}%` : "—"}</Text>
        </AnimatedRing>
        <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, textAlign: "center", marginTop: 6 }}>of packed clothes got worn{sel ? " on this trip" : ""}</Text>
      </View>
      <View style={{ flex: 1, gap: 10 }}>
        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, paddingVertical: 10 }]}>
          <AnimatedCounter value={closed.length} style={{ fontSize: 24, fontWeight: "800", color: t.colors.ink, padding: 0 }} />
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>trips unpacked</Text>
        </View>
        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, paddingVertical: 10 }]}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: t.colors.ink }}>{kg(app.items.reduce((s, i) => s + i.grams, 0))}</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>whole wardrobe, one of each</Text>
        </View>
      </View>
    </View>,

    <View key="dead" style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, gap: 8 }]}>
      <SectionTitle title="Carried for nothing, per trip" right={sel ? <Text onPress={() => setSel(null)} style={{ ...t.typography.label, color: t.colors.accent }}>All trips</Text> : undefined} />
      {dead.length === 0 ? <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>Unpack a trip to see this.</Text> : null}
      {dead.map(({ tr, g }) => (
        <Pressable
          key={tr.id}
          accessibilityLabel={`trip ${tr.name}`}
          onPress={() => {
            haptics.tick();
            setSel(sel === tr.id ? null : tr.id);
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: sel && sel !== tr.id ? 0.4 : 1 }}
        >
          <Text numberOfLines={1} style={{ ...t.typography.label, color: t.colors.ink, width: 110 }}>
            {tr.name}
          </Text>
          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: t.colors.backgroundAlt }}>
            <View style={{ width: `${(g / maxDead) * 100}%`, height: 10, borderRadius: 5, backgroundColor: t.colors.tag }} />
          </View>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, width: 52, textAlign: "right" }}>{kg(g)}</Text>
        </Pressable>
      ))}
      {dead.length ? <Text style={{ ...t.typography.caption, color: t.colors.inkFaint }}>Tap a trip — the sections below switch to it. Earlier trips first: the bars should shrink as the app learns.</Text> : null}
    </View>,

    <View key="idle" style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, gap: 8 }]}>
      <SectionTitle title="Most often unworn" />
      {idle.length === 0 ? <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>Nothing came back unworn{sel ? " from this trip" : ""}.</Text> : null}
      {idle.map((x) => (
        <View key={x.item.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ ...t.typography.label, color: t.colors.ink }}>{x.item.name}</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
            {x.idle} of {x.packed} unworn
          </Text>
        </View>
      ))}
    </View>,

    <View key="learned" style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
      <SectionTitle title="Learned: days per wash vs what you set" />
      {learned.length ? (
        <>
          <View style={{ height: 10 }} />
          <BarChart data={learned.slice(0, 7).map((x) => ({ label: x.i.name.slice(0, 6), value: Math.round(x.f.factor * 100) }))} color={t.colors.accent} height={100} />
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, marginTop: 8 }}>100 = as set. 150 = you wear it 1.5× longer, so the plan packs fewer.</Text>
        </>
      ) : (
        <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, marginTop: 6 }}>Nothing learned yet.</Text>
      )}
    </View>,

    <View key="kind" style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, flexDirection: "row", gap: 16, alignItems: "center" }]}>
      <DonutChart segments={byKind.map((x) => ({ value: x.g, color: t.colors.kind[x.k] }))} size={100} strokeWidth={15} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Wardrobe weight</Text>
        <Legend rows={byKind.map((x) => ({ color: t.colors.kind[x.k], label: x.k === "wear" ? "Clothes" : x.k === "gear" ? "Gear" : "Toiletries", value: kg(x.g) }))} />
      </View>
    </View>,

    <View key="heavy" style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, gap: 6 }]}>
      <SectionTitle title="Heaviest single items" />
      {heaviest.map((i) => (
        <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text numberOfLines={1} style={{ ...t.typography.label, color: t.colors.ink, width: 110 }}>
            {i.name}
          </Text>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: t.colors.backgroundAlt }}>
            <View style={{ width: `${(i.grams / heaviest[0].grams) * 100}%`, height: 8, borderRadius: 4, backgroundColor: t.colors.kind[i.kind] }} />
          </View>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, width: 52, textAlign: "right" }}>{kg(i.grams)}</Text>
        </View>
      ))}
      <Text style={{ ...t.typography.caption, color: t.colors.inkFaint }}>Mark heavy items "can wear on the way" — up to three go on you.</Text>
    </View>,

    np && nextTrip ? (
      <View key="next" style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, gap: 6 }]}>
        <SectionTitle title={`Next: ${nextTrip.name} · ${dayLabel(nextTrip.start)}`} />
        <Text style={{ ...t.typography.body, color: t.colors.ink }}>
          {kg(np.total)} in the bag, {kg(np.wornGrams)} on you — {np.trimmed.length ? `${np.trimmed.length} cut to fit` : `${kg(np.limit - np.total)} spare`}.
        </Text>
      </View>
    ) : null,
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton label="Back" onPress={() => goBack(router)}>
          <ChevronLeft size={20} color={t.colors.ink} />
        </IconButton>
        <View>
          <Text style={{ ...t.typography.subtitle, color: t.colors.ink }}>Stats</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>{sel ? app.trips.find((x) => x.id === sel)?.name : "All trips"}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 12 }}>
        {sections.map((s, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(staggerDelay(i, 60)).duration(380)}>
            {s}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 22, borderWidth: 1 },
});
