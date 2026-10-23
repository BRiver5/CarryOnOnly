import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme";
import { Field, Sheet, inputStyle } from "./Sheet";
import { Chip, Stepper } from "./Bits";
import { PrimaryButton } from "./PrimaryButton";
import { ACTIVITIES, WEATHER, type Activity, type Trip, type TripDay, type Weather } from "../lib/types";
import { addDays, dayLabel, weekdayLabel } from "../lib/time";
import { kg } from "../ui/icons";

// Новая поездка. Дни создаются из общей погоды/занятий и правила стирки;
// потом каждый день правится на полосе дней (тап — погода, удержание — стирка).
const LIMITS: { label: string; limit: number; bag: number }[] = [
  { label: "Cabin 7 kg", limit: 7000, bag: 1800 },
  { label: "Cabin 10 kg", limit: 10000, bag: 2200 },
  { label: "Backpack 8 kg", limit: 8000, bag: 1200 },
  { label: "Checked 23 kg", limit: 23000, bag: 3500 },
];
const LAUNDRY: { label: string; every: number }[] = [
  { label: "None", every: 0 },
  { label: "Every 4 days", every: 4 },
  { label: "Every week", every: 7 },
];

export type TripDraft = { name: string; start: string; days: TripDay[]; limit: number; bag: number };

export function buildDays(nights: number, weather: Weather, acts: Activity[], every: number): TripDay[] {
  return Array.from({ length: nights + 1 }, (_, i) => ({ weather, activities: ["city", ...acts.filter((a) => a !== "city")], laundry: every > 0 && (i + 1) % every === 0 && i < nights }));
}

export function TripSheet({ visible, onClose, onSave, today, initial }: { visible: boolean; onClose: () => void; onSave: (d: TripDraft) => void; today: string; initial?: Trip | null }) {
  const t = useTheme();
  const [name, setName] = useState("");
  const [start, setStart] = useState(addDays(today, 1));
  const [nights, setNights] = useState(6);
  const [weather, setWeather] = useState<Weather>("mild");
  const [acts, setActs] = useState<Activity[]>([]);
  const [every, setEvery] = useState(0);
  const [limitIdx, setLimitIdx] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? "");
    setStart(initial?.start ?? addDays(today, 1));
    setNights(initial ? initial.days.length - 1 : 6);
    setWeather(initial?.days[0]?.weather ?? "mild");
    setActs(initial ? [...new Set(initial.days.flatMap((d) => d.activities))].filter((a) => a !== "city") : []);
    setEvery(0);
    const li = LIMITS.findIndex((l) => l.limit === initial?.limit);
    setLimitIdx(li >= 0 ? li : 0);
  }, [visible]);

  const starts = Array.from({ length: 21 }, (_, i) => addDays(today, i));
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={initial ? "Edit trip" : "New trip"}
      subtitle={`${nights + 1} days · ${LIMITS[limitIdx].label}`}
      footer={
        <PrimaryButton
          label={initial ? "Save trip" : "Plan this trip"}
          disabled={!name.trim()}
          onPress={() =>
            onSave({
              name: name.trim(),
              start,
              // Правка поездки не затирает дни, если их число не изменилось.
              days: initial && initial.days.length === nights + 1 ? initial.days : buildDays(nights, weather, acts, every),
              limit: LIMITS[limitIdx].limit,
              bag: LIMITS[limitIdx].bag,
            })
          }
        />
      }
    >
      <Field label="Where to">
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Lisbon" placeholderTextColor={t.colors.inkFaint} style={inputStyle(t)} maxLength={30} />
      </Field>
      <Field label="First day">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {starts.map((d, i) => (
            <Chip key={d} label={i === 0 ? "Today" : `${weekdayLabel(d)} ${dayLabel(d)}`} active={start === d} onPress={() => setStart(d)} />
          ))}
        </ScrollView>
      </Field>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...t.typography.overline, color: t.colors.inkMuted }}>Nights</Text>
        <Stepper value={nights} min={1} max={30} onChange={setNights} />
      </View>
      {!initial || initial.days.length !== nights + 1 ? (
        <>
          <Field label="Weather, mostly" hint="Change single days later on the day strip.">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {WEATHER.map((w) => (
                <Chip key={w} label={w} color={t.colors.weather[w]} active={weather === w} onPress={() => setWeather(w)} />
              ))}
            </View>
          </Field>
          <Field label="Plans">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ACTIVITIES.filter((a) => a !== "city").map((a) => (
                <Chip key={a} label={a} active={acts.includes(a)} onPress={() => setActs(acts.includes(a) ? acts.filter((x) => x !== a) : [...acts, a])} />
              ))}
            </View>
          </Field>
          <Field label="Laundry">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LAUNDRY.map((l) => (
                <Chip key={l.label} label={l.label} active={every === l.every} onPress={() => setEvery(l.every)} />
              ))}
            </View>
          </Field>
        </>
      ) : null}
      <Field label="Bag" hint={`Empty bag counts too: ${kg(LIMITS[limitIdx].bag)}.`}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {LIMITS.map((l, i) => (
            <Chip key={l.label} label={l.label} active={limitIdx === i} onPress={() => setLimitIdx(i)} />
          ))}
        </View>
      </Field>
    </Sheet>
  );
}
