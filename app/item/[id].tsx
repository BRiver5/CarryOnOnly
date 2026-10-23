import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { useApp } from "../../src/store/appStore";
import { IconButton, SectionTitle, Stepper } from "../../src/components/Bits";
import { Toggle } from "../../src/components/Toggle";
import { goBack } from "../../src/ui/nav";
import { factorFor } from "../../src/lib/model";
import { dayLabel } from "../../src/lib/time";

export default function ItemDetail() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const it = app.items.find((x) => x.id === id);
  const [name, setName] = useState<string | null>(null);
  if (!it) return null;
  const f = factorFor(app.model, it);
  const hist = app.usages.filter((u) => u.itemId === it.id).map((u) => ({ u, trip: app.trips.find((x) => x.id === u.tripId) })).filter((x) => x.trip).sort((a, b) => (a.trip!.start < b.trip!.start ? 1 : -1));
  const save = (patch: Partial<typeof it>) => app.saveItem({ ...it, ...patch });
  const maxPacked = Math.max(1, ...hist.map((h) => h.u.packed));

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconButton label="Back" onPress={() => goBack(router)}>
          <ChevronLeft size={20} color={t.colors.ink} />
        </IconButton>
        <TextInput
          value={name ?? it.name}
          onChangeText={setName}
          onBlur={() => {
            if (name && name.trim() && name.trim() !== it.name) save({ name: name.trim() });
            setName(null);
          }}
          accessibilityLabel="Item name"
          style={{ flex: 1, fontSize: 22, fontWeight: "800", color: t.colors.ink, padding: 0 }}
          maxLength={28}
        />
      </View>
      <ScrollView stickyHeaderIndices={[1, 3]} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* 0 */}
        <Animated.View entering={FadeInDown.duration(340)} style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, gap: 12 }]}>
          <Row label="Weight" right={<Stepper value={it.grams} min={10} max={3000} step={it.grams >= 500 ? 50 : 10} onChange={(grams) => save({ grams })} format={(v) => `${v} g`} />} />
          {it.wears > 0 ? <Row label="Days per wash" right={<Stepper value={it.wears} min={1} max={10} onChange={(wears) => save({ wears })} />} /> : null}
          <Row label="Must come" right={<Toggle value={it.essential} onValueChange={(essential) => save({ essential })} />} />
          <Row label="Can wear on the way" right={<Toggle value={it.wearable} onValueChange={(wearable) => save({ wearable })} />} />
        </Animated.View>
        {/* 1 */}
        <Sticky title="What the app learned" />
        {/* 2 */}
        <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border, gap: 6 }]}>
          {it.wears === 0 ? (
            <Text style={{ ...t.typography.body, color: t.colors.inkMuted }}>Not washed on a trip — one is always enough, nothing to learn.</Text>
          ) : (
            <>
              <Text style={{ fontSize: 30, fontWeight: "800", color: t.colors.ink }}>×{f.factor.toFixed(2)}</Text>
              <Text style={{ ...t.typography.body, color: t.colors.ink }}>
                You wear it about {(it.wears * f.factor).toFixed(1)} days per wash, against {it.wears} set.
              </Text>
              <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                {f.source === "item"
                  ? `From ${f.trips} unpacked ${f.trips === 1 ? "trip" : "trips"} (older count less), pulled toward your ${it.kind === "wear" ? "clothes" : it.kind} overall (×${Math.exp(f.fromKind).toFixed(2)}).`
                  : f.source === "kind"
                    ? `Not unpacked yet — borrowed from your other ${it.kind === "wear" ? "clothes" : it.kind} (×${Math.exp(f.fromKind).toFixed(2)}).`
                    : "Nothing learned yet. Unpack a trip to teach the app."}
              </Text>
            </>
          )}
        </View>
        {/* 3 */}
        <Sticky title={`Trips · ${hist.length}`} />
        {/* 4 */}
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {hist.length === 0 ? <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>No unpacked trips with this item yet.</Text> : null}
          {hist.map(({ u, trip }) => (
            <View key={u.tripId} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ ...t.typography.label, color: t.colors.ink }}>
                  {trip!.name} · {dayLabel(trip!.start)}
                </Text>
                <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                  wore {u.used} of {u.packed}
                </Text>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: t.colors.backgroundAlt, flexDirection: "row", overflow: "hidden" }}>
                <View style={{ width: `${(u.used / maxPacked) * 100}%`, backgroundColor: t.colors.accent }} />
                <View style={{ width: `${((u.packed - u.used) / maxPacked) * 100}%`, backgroundColor: t.colors.tagSoft }} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, right }: { label: string; right: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ ...t.typography.body, color: t.colors.ink }}>{label}</Text>
      {right}
    </View>
  );
}

function Sticky({ title }: { title: string }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.colors.background, paddingHorizontal: 16, paddingTop: t.spacing.xl, paddingBottom: 8 }}>
      <SectionTitle title={title} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 4, padding: 16, borderRadius: 22, borderWidth: 1 },
});
