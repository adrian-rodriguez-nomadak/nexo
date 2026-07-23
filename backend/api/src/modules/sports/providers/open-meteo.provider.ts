import type { MatchSummary, MatchWeather } from "../sports.types.js";

const weatherLabel = (code: number) => {
  if ([0, 1].includes(code)) return "cielo despejado";
  if ([2, 3].includes(code)) return "cielo nublado";
  if (code >= 51 && code <= 67) return "lluvia";
  if (code >= 80 && code <= 99) return "tormenta";
  return "condiciones variables";
};

export async function getMatchWeather(
  match: MatchSummary,
): Promise<MatchWeather | undefined> {
  if (match.home.latitude == null || match.home.longitude == null)
    return undefined;
  const target = new Date(match.startsAt);
  const now = new Date();
  if (
    target.getTime() - now.getTime() > 16 * 86_400_000 ||
    target < new Date(now.getTime() - 86_400_000)
  )
    return undefined;
  const venueTimezone =
    match.home.city === "Tijuana"
      ? "America/Tijuana"
      : match.home.city === "Ciudad Juárez"
        ? "America/Ciudad_Juarez"
        : "America/Mexico_City";
  const date = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: venueTimezone,
  }).format(target);
  const params = new URLSearchParams({
    latitude: String(match.home.latitude),
    longitude: String(match.home.longitude),
    hourly:
      "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m",
    timezone: venueTimezone,
    start_date: date,
    end_date: date,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      { signal: controller.signal },
    );
    if (!response.ok) return undefined;
    const payload = (await response.json()) as {
      hourly?: {
        time: string[];
        temperature_2m: number[];
        relative_humidity_2m: number[];
        precipitation_probability: number[];
        precipitation: number[];
        weather_code: number[];
        wind_speed_10m: number[];
      };
    };
    const hourly = payload.hourly;
    if (!hourly?.time.length) return undefined;
    const localHour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone: venueTimezone,
      }).format(target),
    );
    const index = hourly.time.findIndex(
      (value) => Number(value.slice(11, 13)) === localHour,
    );
    const selected = index >= 0 ? index : Math.floor(hourly.time.length / 2);
    const precipitation = Number(
      hourly.precipitation_probability[selected] ?? 0,
    );
    const wind = Number(hourly.wind_speed_10m[selected] ?? 0);
    const code = Number(hourly.weather_code[selected] ?? 0);
    const impact =
      precipitation >= 65 || wind >= 35 || code >= 80
        ? "high"
        : precipitation >= 35 || wind >= 24
          ? "medium"
          : "low";
    return {
      temperatureC: Number(hourly.temperature_2m[selected] ?? 0),
      precipitationProbability: precipitation,
      precipitationMm: Number(hourly.precipitation[selected] ?? 0),
      windKmh: wind,
      humidity: Number(hourly.relative_humidity_2m[selected] ?? 0),
      weatherCode: code,
      label: weatherLabel(code),
      impact,
      source: "open-meteo",
    };
  } finally {
    clearTimeout(timeout);
  }
}
