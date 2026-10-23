import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { ChartColumn, ChevronRight, Luggage, Pencil, Search, Settings2, Trash, TriangleAlert } from "lucide-react-native";
import { useTheme } from "../src/theme";
import { staggerDelay } from "../src/theme/motion";
import { useApp } from "../src/store/appStore";
import { Segmented } from "../src/components/Segmented";
import { BagGauge } from "../src/components/BagGauge";
import { DayStrip } from "../src/components/DayStrip";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { PressableScale } from "../src/components/PressableScale";
import { SwipeRow } from "../src/components/SwipeRow";
import { IconButton, SectionTitle } from "../src/components/Bits";
import { Sheet } from "../src/components/Sheet";
import { Toggle } from "../src/components/Toggle";
import { TripSheet } from "../src/components/TripSheet";
import { ItemSheet } from "../src/components/ItemSheet";
import { SuccessBurst } from "../src/components/SuccessBurst";
import { kg, WeatherIcon } from "../src/ui/icons";
import { addDays, dayLabel, daysBetween } from "../src/lib/time";
import { factorFor } from "../src/lib/model";
import { haptics } from "../src/services/haptics";
import type { Item } from "../src/lib/types";

type Tab = "next" | "trips" | "wardrobe";

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const app = useApp();
  const [tab, setTab] = useState<Tab>("next");
  const [sheet, setSheet] = useState<"trip" | "item" | "settings" | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [query, setQuery] = useState("");
  const [burst, setBurst] = useState(false);

  const open = app.trips.filter((x) => !x.closed).sort((a, b) => (a.start < b.start ? -1 : 1));
  const next = open[0];
  const p = next ? app.packings[next.id] : undefined;
  const conflicts = next ? (app.conflicts[next.id] ?? []) : [];
  const packedCount = next && p ? p.lines.filter((l) => l.count > 0 && (app.packed[next.id] ?? []).includes(l.item.id)).length : 0;
  const toPack = p ? p.lines.filter((l) => l.count > 0).length : 0;
  const q = query.trim().toLowerCase();
  const items = app.items.filter((i) => !q || i.name.toLowerCase().includes(q));

  const pay = () => {
    haptics.success();
    setBurst(true);
  };
  const bottom = tab === "wardrobe" ? { label: "Add item", go: () => { setEditItem(null); setSheet("item"); } } : tab === "trips" || !next ? { label: "Plan a trip", go: () => setSheet("trip") } : { label: `Open packing list · ${packedCount}/${toPack}`, go: () => router.push({ pathname: "/trip/[id]", params: { id: next.id } }) };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top + t.spacing.sm, paddingHorizontal: 16, paddingBottom: 10, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "800", color: t.colors.ink, letterSpacing: -0.4 }}>Carry On Only</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton label="Stats" onPress={() => router.push("/stats")}>
              <ChartColumn size={18} color={t.colors.ink} />
            </IconButton>
            <IconButton label="Settings" onPress={() => setSheet("settings")}>
              <Settings2 size={18} color={t.colors.ink} />
            </IconButton>
          </View>
        </View>
        <Segmented
          items={[
            { key: "next", label: "Next trip" },
            { key: "trips", label: "Trips", badge: open.length > 1 ? open.length : undefined },
            { key: "wardrobe", label: "Wardrobe" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        {tab === "next" ? (
          next && p ? (
            <Animated.View key="next" entering={FadeIn.duration(250)} style={{ gap: 12 }}>
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={{ ...t.typography.overline, color: t.colors.accent }}>
                  {daysBetween(app.today, next.start) > 0 ? `In ${daysBetween(app.today, next.start)} days` : daysBetween(app.today, next.start) === 0 ? "Today" : "Under way"} · {dayLabel(next.start)}–{dayLabel(addDays(next.start, next.days.length - 1))}
                </Text>
                <Text style={{ fontSize: 30, fontWeight: "800", color: t.colors.ink }}>{next.name}</Text>
              </View>
              <Animated.View entering={FadeInDown.duration(400)} style={[styles.card, { marginHorizontal: 16, backgroundColor: t.colors.surface, borderColor: t.colors.border, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                <BagGauge total={p.total} ideal={p.idealTotal} limit={p.limit} bag={next.bag} />
                <View style={{ flex: 1, gap: 10 }}>
                  <Big label="In the bag" value={kg(p.total)} color={p.total > p.limit ? t.colors.danger : t.colors.ink} />
                  <Big label="Limit" value={kg(p.limit)} color={t.colors.inkMuted} />
                  <Big label="On you" value={kg(p.wornGrams)} color={t.colors.inkMuted} />
                  <Big label="Everything you'd want" value={kg(p.idealTotal)} color={p.over ? t.colors.danger : t.colors.success} />
                </View>
              </Animated.View>
              {conflicts.length ? (
                <PressableScale onPress={() => router.push({ pathname: "/trip/[id]", params: { id: next.id } })} style={[styles.card, { marginHorizontal: 16, backgroundColor: t.colors.dangerSoft, borderColor: t.colors.dangerSoft, flexDirection: "row", gap: 10, alignItems: "center" }]}>
                  <TriangleAlert size={17} color={t.colors.danger} />
                  <Text numberOfLines={2} style={{ ...t.typography.label, color: t.colors.danger, flex: 1 }}>
                    {conflicts[0].title}
                  </Text>
                  <ChevronRight size={16} color={t.colors.danger} />
                </PressableScale>
              ) : null}
              <View style={{ gap: 8 }}>
                <View style={{ paddingHorizontal: 16 }}>
                  <SectionTitle title="Days · tap for weather, hold for laundry" />
                </View>
                <DayStrip days={next.days} start={next.start} onChange={(i, d) => app.saveTrip({ ...next, days: next.days.map((x, k) => (k === i ? d : x)) })} />
              </View>
              <View style={{ paddingHorizontal: 16, gap: 6 }}>
                <SectionTitle title="Most of the weight" />
                {[...p.lines]
                  .filter((l) => l.grams > 0)
                  .sort((a, b) => b.grams - a.grams)
                  .slice(0, 4)
                  .map((l, i) => (
                    <Animated.View key={l.item.id} entering={FadeInDown.delay(staggerDelay(i)).duration(300)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text numberOfLines={1} style={{ ...t.typography.label, color: t.colors.ink, width: 110 }}>
                        {l.item.name} ×{l.count - (l.worn ? 1 : 0)}
                      </Text>
                      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: t.colors.backgroundAlt }}>
                        <View style={{ width: `${(l.grams / Math.max(1, p.total - next.bag)) * 100}%`, height: 8, borderRadius: 4, backgroundColor: t.colors.kind[l.item.kind] }} />
                      </View>
                      <Text style={{ ...t.typography.caption, color: t.colors.inkMuted, width: 52, textAlign: "right" }}>{kg(l.grams)}</Text>
                    </Animated.View>
                  ))}
              </View>
            </Animated.View>
          ) : (
            <StartCard hasItems={app.items.length > 0} onStarter={async () => { await app.addStarter(); pay(); }} onTrip={() => setSheet("trip")} />
          )
        ) : tab === "trips" ? (
          <Animated.View key="trips" entering={FadeIn.duration(250)} style={{ paddingHorizontal: 16, gap: 8 }}>
            {app.trips.length === 0 ? <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>No trips yet.</Text> : null}
            {app.trips.map((tr, i) => {
              const pk = app.packings[tr.id];
              return (
                <Animated.View key={tr.id} entering={FadeInDown.delay(staggerDelay(i)).duration(300)}>
                  <SwipeRow left={{ label: "Delete", icon: <Trash size={16} color={t.colors.onAccent} />, onTrigger: () => Alert.alert("Delete trip?", tr.name, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => app.deleteTrip(tr.id) }]) }}>
                    <PressableScale onPress={() => router.push({ pathname: "/trip/[id]", params: { id: tr.id } })} style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: tr.closed ? 0.7 : 1 }]}>
                      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tr.closed ? t.colors.surfaceAlt : t.colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
                        <Luggage size={20} color={tr.closed ? t.colors.inkMuted : t.colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...t.typography.label, color: t.colors.ink }}>{tr.name}</Text>
                        <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                          {dayLabel(tr.start)} · {tr.days.length} days · {tr.closed ? "unpacked" : pk ? `${kg(pk.total)} of ${kg(tr.limit)}` : ""}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 2 }}>
                        {[...new Set(tr.days.map((d) => d.weather))].map((w) => (
                          <WeatherIcon key={w} w={w} size={14} color={t.colors.weather[w]} />
                        ))}
                      </View>
                    </PressableScale>
                  </SwipeRow>
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : (
          <Animated.View key="wardrobe" entering={FadeIn.duration(250)} style={{ paddingHorizontal: 16, gap: 8 }}>
            {app.items.length > 6 ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.colors.surface, borderRadius: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: t.colors.border }}>
                <Search size={15} color={t.colors.inkFaint} />
                <TextInput value={query} onChangeText={setQuery} placeholder="Search items" placeholderTextColor={t.colors.inkFaint} style={{ flex: 1, paddingVertical: 8, color: t.colors.ink }} />
              </View>
            ) : null}
            {app.items.length === 0 ? <StartCard hasItems={false} onStarter={async () => { await app.addStarter(); pay(); }} onTrip={() => setSheet("trip")} /> : null}
            {items.map((it, i) => {
              const f = factorFor(app.model, it);
              return (
                <Animated.View key={it.id} entering={FadeInDown.delay(staggerDelay(i, 30)).duration(280)}>
                  <SwipeRow
                    right={{ label: "Edit", icon: <Pencil size={16} color={t.colors.onAccent} />, onTrigger: () => { setEditItem(it); setSheet("item"); } }}
                    left={{ label: "Delete", icon: <Trash size={16} color={t.colors.onAccent} />, onTrigger: () => Alert.alert("Delete item?", it.name, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => app.deleteItem(it.id) }]) }}
                  >
                    <PressableScale onPress={() => router.push({ pathname: "/item/[id]", params: { id: it.id } })} style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                      <View style={{ width: 6, alignSelf: "stretch", borderRadius: 3, backgroundColor: t.colors.kind[it.kind] }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...t.typography.label, color: t.colors.ink }}>{it.name}</Text>
                        <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>
                          {it.grams} g{it.wears > 0 ? ` · ${it.wears} ${it.wears === 1 ? "day" : "days"} per wash` : ""}
                          {it.activity ? ` · ${it.activity}` : ""}
                          {it.essential ? " · must come" : ""}
                        </Text>
                      </View>
                      {f.trips > 0 && Math.abs(f.factor - 1) >= 0.05 ? (
                        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: t.colors.tagSoft }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: t.colors.signal }}>×{f.factor.toFixed(1)}</Text>
                        </View>
                      ) : null}
                    </PressableScale>
                  </SwipeRow>
                </Animated.View>
              );
            })}
            {app.items.length ? <Text style={{ ...t.typography.caption, color: t.colors.inkFaint, textAlign: "center" }}>×1.6 = you wear it 1.6× longer than set, learned from trips</Text> : null}
          </Animated.View>
        )}
      </ScrollView>

      {/* Прилипшая кнопка основного действия */}
      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <PrimaryButton label={bottom.label} onPress={bottom.go} />
      </View>

      {burst ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <SuccessBurst visible size={100} onDone={() => setTimeout(() => setBurst(false), 200)} />
        </View>
      ) : null}

      <TripSheet
        visible={sheet === "trip"}
        onClose={() => setSheet(null)}
        today={app.today}
        onSave={async (d) => {
          setSheet(null);
          const id = await app.saveTrip(d);
          pay();
          router.push({ pathname: "/trip/[id]", params: { id } });
        }}
      />
      <ItemSheet
        visible={sheet === "item"}
        initial={editItem}
        onClose={() => setSheet(null)}
        onSave={async (d) => {
          setSheet(null);
          await app.saveItem({ ...d, id: editItem?.id, createdAt: editItem?.createdAt });
          pay();
        }}
      />
      <Sheet visible={sheet === "settings"} onClose={() => setSheet(null)} title="Settings" subtitle="Everything stays on this phone.">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ ...t.typography.body, color: t.colors.ink }}>Vibration</Text>
          <Toggle value={app.haptics} onValueChange={(v) => app.setHaptics(v)} />
        </View>
        <PrimaryButton label="Add the starter wardrobe" onPress={async () => { setSheet(null); await app.addStarter(); pay(); }} />
        <PressableScale
          onPress={() =>
            Alert.alert("Erase everything?", "Items, trips and what the app learned about how you pack will be deleted.", [
              { text: "Cancel", style: "cancel" },
              { text: "Erase", style: "destructive", onPress: () => { setSheet(null); app.wipe(); } },
            ])
          }
          style={{ paddingVertical: 10 }}
        >
          <Text style={{ ...t.typography.body, color: t.colors.danger, fontWeight: "600" }}>Erase all data</Text>
        </PressableScale>
      </Sheet>
    </View>
  );
}

function Big({ label, value, color }: { label: string; value: string; color: string }) {
  const t = useTheme();
  return (
    <View>
      <Text style={{ ...t.typography.overline, color: t.colors.inkFaint }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: "800", color }}>{value}</Text>
    </View>
  );
}

// Пустое состояние — карточка-чеклист.
function StartCard({ hasItems, onStarter, onTrip }: { hasItems: boolean; onStarter: () => void; onTrip: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { marginHorizontal: 16, backgroundColor: t.colors.accentSoft, borderColor: t.colors.accentSoft, gap: 10 }]}>
      <Text style={{ ...t.typography.title, color: t.colors.accentDeep }}>One bag, nothing extra</Text>
      {["Add your clothes and gear with real weights — or start from the starter wardrobe.", "Plan a trip: days, weather, plans, laundry and the bag limit.", "After the trip, tell the app what you actually wore. Next time it packs less."].map((s, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10 }}>
          <Text style={{ fontWeight: "800", color: t.colors.accent, width: 14 }}>{i + 1}</Text>
          <Text style={{ ...t.typography.caption, color: t.colors.ink, flex: 1 }}>{s}</Text>
        </View>
      ))}
      {!hasItems ? (
        <Text onPress={onStarter} style={{ ...t.typography.label, color: t.colors.accent }}>
          Add the starter wardrobe →
        </Text>
      ) : (
        <Text onPress={onTrip} style={{ ...t.typography.label, color: t.colors.accent }}>
          Plan the first trip →
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 22, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 16, borderWidth: 1 },
});
