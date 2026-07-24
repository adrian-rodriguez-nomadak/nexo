export type FoodCatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  source: "open-food-facts" | "wger";
};

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
};

type OpenFoodFactsResponse = {
  products?: OpenFoodFactsProduct[];
};

type WgerIngredient = {
  id?: number;
  name?: string;
  energy?: number;
  protein?: string | number;
  carbohydrates?: string | number;
  fat?: string | number;
  source_name?: string;
};

type WgerIngredientResponse = {
  results?: WgerIngredient[];
};

const foodCache = new Map<
  string,
  { expiresAt: number; items: FoodCatalogItem[] }
>();

function nutrient(
  nutriments: Record<string, unknown> | undefined,
  key: string,
  fallbackKey?: string,
): number | null {
  const value =
    nutriments?.[key] ?? (fallbackKey ? nutriments?.[fallbackKey] : null);
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value * 10) / 10
    : null;
}

async function searchOpenFoodFacts(
  query: string,
): Promise<FoodCatalogItem[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "8");
  url.searchParams.set(
    "fields",
    "code,product_name,brands,nutriments",
  );

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent":
        "Nexo/0.1 (https://github.com/adrian-rodriguez-nomadak/nexo)",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new Error(`OPEN_FOOD_FACTS_${response.status}`);
  }

  const data = (await response.json()) as OpenFoodFactsResponse;
  return (data.products ?? [])
    .map((product): FoodCatalogItem | null => {
      const name = product.product_name?.trim();
      if (!name) return null;

      return {
        id: product.code?.trim() || `off-${name}`,
        name,
        brand: product.brands?.trim() || null,
        caloriesPer100g: nutrient(
          product.nutriments,
          "energy-kcal_100g",
          "energy-kcal_prepared_100g",
        ),
        proteinPer100g: nutrient(
          product.nutriments,
          "proteins_100g",
          "proteins_prepared_100g",
        ),
        carbsPer100g: nutrient(
          product.nutriments,
          "carbohydrates_100g",
          "carbohydrates_prepared_100g",
        ),
        fatPer100g: nutrient(
          product.nutriments,
          "fat_100g",
          "fat_prepared_100g",
        ),
        source: "open-food-facts",
      };
    })
    .filter((item): item is FoodCatalogItem => item !== null);
}

function decimal(value: string | number | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 10) / 10 : null;
}

async function searchWgerIngredients(
  query: string,
): Promise<FoodCatalogItem[]> {
  const url = new URL("https://wger.de/api/v2/ingredient/");
  url.searchParams.set("name__search", query);
  url.searchParams.set("language__code", "en");
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
    throw new Error(`WGER_INGREDIENTS_${response.status}`);
  }

  const data = (await response.json()) as WgerIngredientResponse;
  return (data.results ?? [])
    .map((ingredient): FoodCatalogItem | null => {
      const name = ingredient.name?.trim();
      if (!ingredient.id || !name) return null;
      return {
        id: `wger-${ingredient.id}`,
        name,
        brand: ingredient.source_name?.trim() || null,
        caloriesPer100g: decimal(ingredient.energy),
        proteinPer100g: decimal(ingredient.protein),
        carbsPer100g: decimal(ingredient.carbohydrates),
        fatPer100g: decimal(ingredient.fat),
        source: "wger",
      };
    })
    .filter((item): item is FoodCatalogItem => item !== null);
}

export async function searchFoodCatalog(
  query: string,
): Promise<FoodCatalogItem[]> {
  const cacheKey = query.trim().toLocaleLowerCase("es-MX");
  const cached = foodCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  let items: FoodCatalogItem[] = [];
  try {
    items = await searchOpenFoodFacts(query);
  } catch {
    items = await searchWgerIngredients(query);
  }
  if (items.length === 0) {
    items = await searchWgerIngredients(query);
  }

  if (foodCache.size >= 100) foodCache.clear();
  foodCache.set(cacheKey, {
    expiresAt: Date.now() + 10 * 60 * 1000,
    items,
  });
  return items;
}
