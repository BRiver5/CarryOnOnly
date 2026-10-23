import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../../src/theme";
import { staggerDelay } from "../../src/theme/motion";
import { useApp } from "../../src/store/appStore";
import { IconButton, Stepper } from "../../src/components/Bits";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SuccessBurst } from "../../src/components/SuccessBurst";
import { goBack } from "../../src/ui/nav";
import { kg } from "../../src/ui/icons";
import { emptyModel, factorFor, learnTrip } from "../../src/lib/model";
import { haptics } from "../../src/services/haptics";

// Разбор: сколько каждой вещи реально понадобилось. Сверху — живое превью,
// как изменится план следующей похожей поездки (модель учится сразу).
export default function Debrief() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  // Снимок на входе: после сохранения поездка закрывается, её укладка уходит
  // из стора — без снимка экран "Learned" не успевал бы показаться.
  const [trip] = useState(() => app.trips.find((x) => x.id === id));
  const [lines] = useState(() => {
    const p = trip ? app.packings[trip.id] : undefined;
    return p ? p.lines.filter((l) => l.count > 0 && l.item.wears > 0) : [];
  });
  const [used, setUsed] = useState<Record<string, number>>(() => Object.fromEntries(lines.map((l) => [l.item.id, l.count])));
  const [done, setDone] = useState(false);
  if (!trip) return null;

  const preview = learnTrip(
    JSON.parse(JSON.stringify(app.model ?? emptyModel())),
    lines.map((l) => ({ tripId: trip.id, itemId: l.item.id, packed: l.count, used: used[l.item.id] ?? l.count, planned: l.count })),
    app.items,
  );
  const idleGrams = lines.reduce((s, l) => s + (l.count - (used[l.item.id] ?? l.count)) * l.item.grams, 0);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconButton label="Back" onPress={() => goBack(router)}>
          <ChevronLeft size={20} color={t.colors.ink} />
        </IconButton>
        <View style={{ flex: 1 }}>
          <Text style={{ ...t.typography.subtitle, color: t.colors.ink }}>Unpack {trip.name}</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>How many of each did you actually wear?</Text>
        </View>
      </View>
      {done ? (
        <View style={{ alignItems: "center", padding: 24, gap: 12 }}>
          <SuccessBurst visible size={110} />
          <Text style={{ ...t.typography.title, color: t.colors.ink }}>Learned</Text>
          <Text style={{ ...t.typography.body, color: t.colors.inkMuted, textAlign: "center" }}>Next trips will pack to how you actually travel.</Text>
          <View style={{ alignSelf: "stretch" }}>
            <PrimaryButton label="Done" onPress={() => router.replace("/")} />
          </View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100, gap: 8 }}>
            <View style={[styles.card, { backgroundColor: t.colors.tagSoft, borderColor: t.colors.tagSoft }]}>
              <Text style={{ ...t.typography.label, color: t.colors.ink }}>{idleGrams > 0 ? `${kg(idleGrams)} came along for nothing` : "Everything packed got worn"}</Text>
              <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>Older trips count less; one trip never flips the plan on its own.</Text>
            </View>
            {lines.map((l, i) => {
              const before = factorFor(app.model, l.item).factor;
              const after = factorFor(preview, l.item).factor;
              return (
                <Animated.View key={l.item.id} entering={FadeInDown.delay(staggerDelay(i, 30)).duration(280)} style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...t.typography.label, color: t.colors.ink }}>
                      {l.item.name} <Text style={{ color: t.colors.inkFaint, fontWeight: "400" }}>· packed {l.count}</Text>
                    </Text>
                    <Text style={{ ...t.typography.caption, color: Math.abs(after - before) >= 0.02 ? t.colors.signal : t.colors.inkMuted }}>
                      days per wash ×{before.toFixed(2)} → ×{after.toFixed(2)}
                    </Text>
                  </View>
                  <Stepper value={used[l.item.id] ?? l.count} min={0} max={l.count} onChange={(v) => setUsed({ ...used, [l.item.id]: v })} />
                </Animated.View>
              );
            })}
          </ScrollView>
          <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
            <PrimaryButton
              label="Save and learn"
              onPress={async () => {
                await app.debrief(trip.id, used);
                haptics.success();
                setDone(true);
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 18, borderWidth: 1, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1 },
});
