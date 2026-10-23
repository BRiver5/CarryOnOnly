// Палитра приложения. Это единственный файл, где должны жить цветовые значения —
// компоненты и экраны берут цвета только отсюда, магические hex-коды в JSX запрещены.
//
// Carry On Only: "кожа чемодана" #7A4529 (tools/palette-search.js, сектор 21°,
// дистанция 16.5) на льняном фоне; бирка багажа — горчичный, перевес — красный.

export const light = {
  background: "#F7F4EE",
  backgroundAlt: "#ECE7DD",
  surface: "#FFFFFF",
  surfaceAlt: "#F3EFE7",
  border: "#E3DCCF",
  ink: "#2A221C",
  inkMuted: "#6A6058",
  inkFaint: "#A79E95",
  onAccent: "#FFFFFF",
  accent: "#7A4529",
  accentSoft: "#F0E1D6",
  accentDeep: "#4E2A17",
  tag: "#C9971E",
  tagSoft: "#F6EBCB",
  danger: "#B83A2F",
  dangerSoft: "#F5DCD8",
  success: "#3F7A4A",
  successSoft: "#DFEEDF",
  // Предупреждение/второе свайп-действие (SwipeRow, бейдж Segmented) — тёмный
  // янтарь, белый текст на нём ≥ 4.5:1.
  signal: "#93590E",
  // statusDimmed = background × 0.55 + ink × 0.45.
  scrim: "rgba(42,34,28,0.45)",
  statusDimmed: "#9C958F",
  weather: { hot: "#D07A1E", mild: "#5E8C55", cold: "#3F6EA8", rain: "#5B6B7E" } as Record<string, string>,
  kind: { wear: "#7A4529", gear: "#3F6EA8", toiletry: "#5E8C55" } as Record<string, string>,
};

export const dark = {
  background: "#14110E",
  backgroundAlt: "#1B1713",
  surface: "#211C17",
  surfaceAlt: "#2A241E",
  border: "#362E26",
  ink: "#F2ECE5",
  inkMuted: "#B3A99F",
  inkFaint: "#776D63",
  onAccent: "#FFFFFF",
  accent: "#C98A62",
  accentSoft: "#3A2A1F",
  accentDeep: "#ECC5A8",
  tag: "#E3B23C",
  tagSoft: "#3A3018",
  danger: "#EB6B5F",
  dangerSoft: "#3A1C19",
  success: "#6FB27A",
  successSoft: "#1C3320",
  signal: "#E0A040",
  scrim: "rgba(0,0,0,0.6)",
  statusDimmed: "#090807",
  weather: { hot: "#E8963E", mild: "#82B278", cold: "#6B95D2", rain: "#8B9BAE" } as Record<string, string>,
  kind: { wear: "#C98A62", gear: "#6B95D2", toiletry: "#82B278" } as Record<string, string>,
};

export type Palette = typeof light;
