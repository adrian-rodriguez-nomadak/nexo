import { apiFetch } from "./api-client";

export type ProgressDays = 7 | 30;

export type ProgressData = {
  days: ProgressDays;
  overview: {
    totalRecords: number;
    activeDays: number;
    activeModules: number;
  };
  finances: {
    balanceCents: number;
    incomeCents: number;
    expenseCents: number;
    netCents: number;
    transactionCount: number;
  };
  events: {
    totalCount: number;
    periodCount: number;
    upcomingCount: number;
  };
  notes: {
    totalCount: number;
    periodCount: number;
    pinnedCount: number;
  };
  bets: {
    count: number;
    stakedCents: number;
    wonCount: number;
    lostCount: number;
    profitCents: number;
  };
  meals: {
    count: number;
    averageCalories: number | null;
    proteinGrams: number;
    costCents: number;
  };
  gym: {
    workoutCount: number;
    durationMinutes: number;
    volumeKg: number;
  };
  health: {
    entryCount: number;
    averageSleepHours: number | null;
    averageWaterMl: number | null;
    latestWeightKg: number | null;
    weightChangeKg: number | null;
  };
  daily: Array<{ date: string; count: number }>;
  welcome: {
    todayRecords: number;
    upcomingEvent: {
      title: string;
      startsAt: string;
      location: string | null;
    } | null;
    setup: {
      finances: boolean;
      events: boolean;
      notes: boolean;
      meals: boolean;
      health: boolean;
      gym: boolean;
    };
  };
};

export async function loadProgress(
  sessionToken: string,
  days: ProgressDays,
): Promise<ProgressData> {
  const response = await apiFetch(`/api/progress?days=${days}`, sessionToken);
  const data = (await response.json()) as ProgressData & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "No fue posible cargar tu progreso.");
  }
  return data;
}
