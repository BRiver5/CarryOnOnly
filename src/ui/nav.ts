import type { useRouter } from "expo-router";

// "Назад", когда экран открыт без истории (восстановленное состояние, ссылка) —
// тогда на главный, иначе кнопка ничего бы не делала.
export function goBack(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
