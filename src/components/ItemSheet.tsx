import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme";
import { Field, Sheet, inputStyle } from "./Sheet";
import { Chip, Stepper } from "./Bits";
import { Toggle } from "./Toggle";
import { PrimaryButton } from "./PrimaryButton";
import { STARTER, type Preset } from "../lib/wardrobe";
import { ACTIVITIES, SLOTS, WEATHER, type Item } from "../lib/types";
import { SLOT_LABEL } from "../ui/icons";

// Вещь гардероба. Пресеты заполняют всё одним тапом.
export function ItemSheet({ visible, onClose, onSave, initial }: { visible: boolean; onClose: () => void; onSave: (p: Preset) => void; initial?: Item | null }) {
  const t = useTheme();
  const blank: Preset = { name: "", kind: "wear", grams: 200, perDay: 1, wears: 1, weather: [], activity: null, essential: false, slot: null };
  const [d, setD] = useState<Preset>(blank);
  useEffect(() => {
    if (visible) setD(initial ? { ...initial } : blank);
  }, [visible]);
  const row = (label: string, right: React.ReactNode, hint?: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...t.typography.body, color: t.colors.ink }}>{label}</Text>
        {hint ? <Text style={{ ...t.typography.caption, color: t.colors.inkMuted }}>{hint}</Text> : null}
      </View>
      {right}
    </View>
  );
  return (
    <Sheet visible={visible} onClose={onClose} title={initial ? "Edit item" : "New item"} subtitle="Weights are what makes the plan honest." footer={<PrimaryButton label={initial ? "Save item" : "Add item"} disabled={!d.name.trim() || d.grams <= 0} onPress={() => onSave({ ...d, name: d.name.trim() })} />}>
      {!initial ? (
        <Field label="Presets">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {STARTER.map((p) => (
              <Chip key={p.name} label={p.name} active={d.name === p.name} onPress={() => setD({ ...p })} />
            ))}
          </ScrollView>
        </Field>
      ) : null}
      <Field label="Name">
        <TextInput value={d.name} onChangeText={(name) => setD({ ...d, name })} placeholder="e.g. Linen shirt" placeholderTextColor={t.colors.inkFaint} style={inputStyle(t)} maxLength={28} />
      </Field>
      <Field label="Type">
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["wear", "gear", "toiletry"] as const).map((k) => (
            <Chip key={k} label={k === "wear" ? "Clothes" : k === "gear" ? "Gear" : "Toiletries"} color={t.colors.kind[k]} active={d.kind === k} onPress={() => setD({ ...d, kind: k, wears: k === "wear" ? Math.max(1, d.wears) : 0 })} />
          ))}
        </View>
      </Field>
      {row("Weight", <Stepper value={d.grams} min={10} max={3000} step={d.grams >= 500 ? 50 : 10} onChange={(grams) => setD({ ...d, grams })} format={(v) => `${v} g`} />)}
      {d.kind === "wear" ? row("Days per wash", <Stepper value={d.wears} min={1} max={10} onChange={(wears) => setD({ ...d, wears })} />, "1 for socks, 3–4 for jeans") : null}
      <Field label="Weather" hint="None selected — any weather.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {WEATHER.map((w) => (
            <Chip key={w} label={w} color={t.colors.weather[w]} active={d.weather.includes(w)} onPress={() => setD({ ...d, weather: d.weather.includes(w) ? d.weather.filter((x) => x !== w) : [...d.weather, w] })} />
          ))}
        </View>
      </Field>
      <Field label="Only for">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip label="Every day" active={d.activity === null} onPress={() => setD({ ...d, activity: null })} />
          {ACTIVITIES.filter((a) => a !== "city").map((a) => (
            <Chip key={a} label={a} active={d.activity === a} onPress={() => setD({ ...d, activity: a })} />
          ))}
        </View>
      </Field>
      {row("Must come", <Toggle value={d.essential} onValueChange={(essential) => setD({ ...d, essential })} />, "Never cut to fit the bag")}
      <Field label="Wear it on the way?" hint="The heaviest needed item in each slot goes on you, not in the bag.">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip label="No" active={d.slot === null} onPress={() => setD({ ...d, slot: null })} />
          {SLOTS.map((s) => (
            <Chip key={s} label={SLOT_LABEL[s]} active={d.slot === s} onPress={() => setD({ ...d, slot: s })} />
          ))}
        </View>
      </Field>
    </Sheet>
  );
}
