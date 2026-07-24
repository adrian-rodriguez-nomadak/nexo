export type ExerciseCatalogItem = {
  id: string;
  name: string;
  category: string | null;
  source: "wger";
};

type WgerTranslation = {
  language?: number;
  name?: string;
};

type WgerExercise = {
  id?: number;
  category?: {
    name?: string;
  };
  translations?: WgerTranslation[];
};

type WgerResponse = {
  results?: WgerExercise[];
};

const exerciseCache = new Map<
  string,
  { expiresAt: number; items: ExerciseCatalogItem[] }
>();

export async function searchExerciseCatalog(
  query: string,
): Promise<ExerciseCatalogItem[]> {
  const cacheKey = query.trim().toLocaleLowerCase("es-MX");
  const cached = exerciseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const url = new URL("https://wger.de/api/v2/exerciseinfo/");
  url.searchParams.set("name__search", query);
  url.searchParams.set("limit", "8");

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent":
        "Nexo/0.1 (https://github.com/adrian-rodriguez-nomadak/nexo)",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`WGER_${response.status}`);
  }

  const data = (await response.json()) as WgerResponse;
  const items = (data.results ?? [])
    .map((exercise): ExerciseCatalogItem | null => {
      const translations = exercise.translations ?? [];
      const translation =
        translations.find((item) => item.language === 4 && item.name) ??
        translations.find((item) => item.language === 2 && item.name) ??
        translations.find((item) => item.name);
      if (!exercise.id || !translation?.name) return null;

      return {
        id: `wger-${exercise.id}`,
        name: translation.name.trim(),
        category: exercise.category?.name?.trim() || null,
        source: "wger",
      };
    })
    .filter((item): item is ExerciseCatalogItem => item !== null);
  if (exerciseCache.size >= 100) exerciseCache.clear();
  exerciseCache.set(cacheKey, {
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    items,
  });
  return items;
}
