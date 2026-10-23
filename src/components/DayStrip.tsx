import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { WashingMachine } from "lucide-react-native";
import { useTheme } from "../theme";
import { staggerDelay } from "../theme/motion";
import { PressableScale } from "./PressableScale";
import { ActivityIcon, WeatherIcon } from "../ui/icons";
import { WEATHER, type TripDay } from "../lib/types";
import { addDays, weekdayLabel } from "../lib/time";
import { haptics } from "../services/haptics";

// Полоса дней поездки: тап по дню — следующая погода, удержание — стирка в
// конце этого дня (значок машинки между днями режет поездку на циклы).
export function DayStrip({ days, start, onChange, selected, onSelect }: { days: TripDay[]; start: string; onChange?: (i: number, d: TripDay) => void; selected?: number | null; onSelect?: (i: number) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center" }}>
      {days.map((d, i) => (
        <Animated.View key={i} entering={FadeInRight.delay(staggerDelay(i, 30)).duration(300)} style={{ flexDirection: "row", alignItems: "center" }}>
          <PressableScale
            accessibilityLabel={`day ${i + 1}`}
            onPress={() => {
              haptics.tick();
              if (onSelect) onSelect(i);
              else if (onChange) onChange(i, { ...d, weather: WEATHER[(WEATHER.indexOf(d.weather) + 1) % WEATHER.length] });
            }}
            onLongPress={() => {
              if (!onChange) return;
              haptics.press();
              onChange(i, { ...d, laundry: !d.laundry });
            }}
            style={{ width: 54, paddingVertical: 8, borderRadius: 16, alignItems: "center", gap: 4, backgroundColor: selected === i ? t.colors.accent : t.colors.surface, borderWidth: 1, borderColor: selected === i ? t.colors.accent : t.colors.border }}
          >
            <Text style={{ fontSize: 10, fontWeight: "800", color: selected === i ? t.colors.onAccent : t.colors.inkMuted }}>{weekdayLabel(addDays(start, i)).toUpperCase()}</Text>
            <Text style={{ fontSize: 15, fontWeight: "800", color: selected === i ? t.colors.onAccent : t.colors.ink }}>{i + 1}</Text>
            <WeatherIcon w={d.weather} size={18} color={selected === i ? t.colors.onAccent : t.colors.weather[d.weather]} />
            <View style={{ flexDirection: "row", gap: 2, minHeight: 12 }}>
              {d.activities
                .filter((a) => a !== "city")
                .slice(0, 2)
                .map((a) => (
                  <ActivityIcon key={a} a={a} size={11} color={selected === i ? t.colors.onAccent : t.colors.inkMuted} />
                ))}
            </View>
          </PressableScale>
          {i < days.length - 1 ? (
            <View style={{ width: 18, alignItems: "center" }}>{d.laundry ? <WashingMachine size={15} color={t.colors.tag} /> : <View style={{ width: 8, height: 2, backgroundColor: t.colors.border }} />}</View>
          ) : null}
        </Animated.View>
      ))}
    </ScrollView>
  );
}
