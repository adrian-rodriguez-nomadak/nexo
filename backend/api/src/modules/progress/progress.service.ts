import { query } from "../../shared/db/database.js";
import type { ProgressDays } from "./progress.validation.js";

type CountRow = {
  total_count: string;
  period_count: string;
  secondary_count: string;
};

type FinanceRow = {
  balance_cents: string;
  income_cents: string;
  expense_cents: string;
  transaction_count: string;
};

type BetRow = {
  bet_count: string;
  staked_cents: string;
  won_count: string;
  lost_count: string;
  profit_cents: string;
};

type MealRow = {
  meal_count: string;
  average_calories: string | null;
  protein_grams: string;
  cost_cents: string;
};

type GymRow = {
  workout_count: string;
  duration_minutes: string;
  volume_kg: string;
};

type HealthRow = {
  entry_count: string;
  average_sleep_hours: string | null;
  average_water_ml: string | null;
  latest_weight_kg: string | null;
  first_weight_kg: string | null;
};

type DailyRow = {
  activity_date: string | Date;
  record_count: string;
};

type OnboardingRow = {
  finance_count: string;
  events_count: string;
  notes_count: string;
  meals_count: string;
  health_count: string;
  gym_count: string;
};

type UpcomingEventRow = {
  title: string;
  starts_at: Date;
  location: string | null;
};

function number(value: string | null | undefined): number {
  return Number(value ?? 0);
}

export async function getProgress(
  userId: string,
  days: ProgressDays,
): Promise<{
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
}> {
  const [
    financeResult,
    eventsResult,
    notesResult,
    betsResult,
    mealsResult,
    gymResult,
    healthResult,
    dailyResult,
    onboardingResult,
    upcomingResult,
  ] = await Promise.all([
    query<FinanceRow>(
      `SELECT
         COALESCE((
           SELECT SUM(
             a.initial_balance_cents +
             COALESCE((
               SELECT SUM(
                 CASE
                   WHEN t.kind = 'income' THEN t.amount_cents
                   WHEN t.kind = 'expense' THEN -t.amount_cents
                   ELSE 0
                 END
               )
               FROM finance_transactions t
               WHERE t.account_id = a.id
             ), 0)
           )
           FROM finance_accounts a
           WHERE a.nexo_user_id = $1
         ), 0) AS balance_cents,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'income'), 0)
           AS income_cents,
         COALESCE(SUM(t.amount_cents) FILTER (WHERE t.kind = 'expense'), 0)
           AS expense_cents,
         COUNT(t.id) AS transaction_count
       FROM finance_transactions t
       INNER JOIN finance_accounts a ON a.id = t.account_id
       WHERE a.nexo_user_id = $1
         AND t.occurred_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')`,
      [userId, days],
    ),
    query<CountRow>(
      `SELECT
         COUNT(*) AS total_count,
         COUNT(*) FILTER (
           WHERE created_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')
         ) AS period_count,
         COUNT(*) FILTER (WHERE starts_at >= NOW()) AS secondary_count
       FROM nexo_events
       WHERE nexo_user_id = $1`,
      [userId, days],
    ),
    query<CountRow>(
      `SELECT
         COUNT(*) AS total_count,
         COUNT(*) FILTER (
           WHERE created_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')
         ) AS period_count,
         COUNT(*) FILTER (WHERE is_pinned) AS secondary_count
       FROM nexo_notes
       WHERE nexo_user_id = $1`,
      [userId, days],
    ),
    query<BetRow>(
      `SELECT
         COUNT(*) AS bet_count,
         COALESCE(SUM(stake_cents), 0) AS staked_cents,
         COUNT(*) FILTER (WHERE status = 'won') AS won_count,
         COUNT(*) FILTER (WHERE status = 'lost') AS lost_count,
         COALESCE(SUM(
           CASE
             WHEN status = 'won'
               THEN ROUND(stake_cents * decimal_odds) - stake_cents
             WHEN status = 'lost' THEN -stake_cents
             ELSE 0
           END
         ), 0) AS profit_cents
       FROM nexo_bets
       WHERE nexo_user_id = $1
         AND placed_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')`,
      [userId, days],
    ),
    query<MealRow>(
      `SELECT
         COUNT(*) AS meal_count,
         AVG(calories) FILTER (WHERE calories IS NOT NULL)
           AS average_calories,
         COALESCE(SUM(protein_grams), 0) AS protein_grams,
         COALESCE(SUM(cost_cents), 0) AS cost_cents
       FROM nexo_meals
       WHERE nexo_user_id = $1
         AND eaten_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')`,
      [userId, days],
    ),
    query<GymRow>(
      `SELECT
         COUNT(*) AS workout_count,
         COALESCE(SUM(w.duration_minutes), 0) AS duration_minutes,
         COALESCE(SUM((
           SELECT SUM(
             COALESCE(e.sets, 0) *
             COALESCE(e.reps, 0) *
             COALESCE(e.weight_kg, 0)
           )
           FROM nexo_workout_exercises e
           WHERE e.workout_id = w.id AND e.exercise_kind = 'strength'
         )), 0) AS volume_kg
       FROM nexo_workouts w
       WHERE w.nexo_user_id = $1
         AND w.trained_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')`,
      [userId, days],
    ),
    query<HealthRow>(
      `SELECT
         COUNT(*) AS entry_count,
         AVG(sleep_hours) FILTER (WHERE sleep_hours IS NOT NULL)
           AS average_sleep_hours,
         AVG(water_ml) FILTER (WHERE water_ml IS NOT NULL)
           AS average_water_ml,
         (
           SELECT weight_kg
           FROM nexo_health_entries latest
           WHERE latest.nexo_user_id = $1 AND latest.weight_kg IS NOT NULL
           ORDER BY latest.measured_at DESC
           LIMIT 1
         ) AS latest_weight_kg,
         (
           SELECT weight_kg
           FROM nexo_health_entries first_entry
           WHERE first_entry.nexo_user_id = $1
             AND first_entry.weight_kg IS NOT NULL
             AND first_entry.measured_at >=
               NOW() - ($2::INTEGER * INTERVAL '1 day')
           ORDER BY first_entry.measured_at ASC
           LIMIT 1
         ) AS first_weight_kg
       FROM nexo_health_entries
       WHERE nexo_user_id = $1
         AND measured_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')`,
      [userId, days],
    ),
    query<DailyRow>(
      `WITH activity AS (
         SELECT occurred_at AS happened_at
         FROM finance_transactions
         WHERE account_id IN (
           SELECT id FROM finance_accounts WHERE nexo_user_id = $1
         )
         UNION ALL
         SELECT created_at FROM nexo_events WHERE nexo_user_id = $1
         UNION ALL
         SELECT created_at FROM nexo_notes WHERE nexo_user_id = $1
         UNION ALL
         SELECT placed_at FROM nexo_bets WHERE nexo_user_id = $1
         UNION ALL
         SELECT eaten_at FROM nexo_meals WHERE nexo_user_id = $1
         UNION ALL
         SELECT trained_at FROM nexo_workouts WHERE nexo_user_id = $1
         UNION ALL
         SELECT measured_at FROM nexo_health_entries WHERE nexo_user_id = $1
       )
       SELECT happened_at::DATE AS activity_date, COUNT(*) AS record_count
       FROM activity
       WHERE happened_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')
       GROUP BY happened_at::DATE
       ORDER BY activity_date`,
      [userId, days],
    ),
    query<OnboardingRow>(
      `SELECT
         (SELECT COUNT(*) FROM finance_accounts WHERE nexo_user_id = $1)
           AS finance_count,
         (SELECT COUNT(*) FROM nexo_events WHERE nexo_user_id = $1)
           AS events_count,
         (SELECT COUNT(*) FROM nexo_notes WHERE nexo_user_id = $1)
           AS notes_count,
         (SELECT COUNT(*) FROM nexo_meals WHERE nexo_user_id = $1)
           AS meals_count,
         (SELECT COUNT(*) FROM nexo_health_entries WHERE nexo_user_id = $1)
           AS health_count,
         (SELECT COUNT(*) FROM nexo_workouts WHERE nexo_user_id = $1)
           AS gym_count`,
      [userId],
    ),
    query<UpcomingEventRow>(
      `SELECT title, starts_at, location
       FROM nexo_events
       WHERE nexo_user_id = $1 AND starts_at >= NOW()
       ORDER BY starts_at
       LIMIT 1`,
      [userId],
    ),
  ]);

  const finance = financeResult.rows[0]!;
  const events = eventsResult.rows[0]!;
  const notes = notesResult.rows[0]!;
  const bets = betsResult.rows[0]!;
  const meals = mealsResult.rows[0]!;
  const gym = gymResult.rows[0]!;
  const health = healthResult.rows[0]!;
  const onboarding = onboardingResult.rows[0]!;
  const latestWeight = health.latest_weight_kg;
  const firstWeight = health.first_weight_kg;
  const moduleCounts = [
    number(finance.transaction_count),
    number(events.period_count),
    number(notes.period_count),
    number(bets.bet_count),
    number(meals.meal_count),
    number(gym.workout_count),
    number(health.entry_count),
  ];
  const totalRecords = moduleCounts.reduce((total, count) => total + count, 0);
  const upcoming = upcomingResult.rows[0];
  const today = new Date().toISOString().slice(0, 10);

  return {
    days,
    overview: {
      totalRecords,
      activeDays: dailyResult.rows.length,
      activeModules: moduleCounts.filter((count) => count > 0).length,
    },
    finances: {
      balanceCents: number(finance.balance_cents),
      incomeCents: number(finance.income_cents),
      expenseCents: number(finance.expense_cents),
      netCents: number(finance.income_cents) - number(finance.expense_cents),
      transactionCount: number(finance.transaction_count),
    },
    events: {
      totalCount: number(events.total_count),
      periodCount: number(events.period_count),
      upcomingCount: number(events.secondary_count),
    },
    notes: {
      totalCount: number(notes.total_count),
      periodCount: number(notes.period_count),
      pinnedCount: number(notes.secondary_count),
    },
    bets: {
      count: number(bets.bet_count),
      stakedCents: number(bets.staked_cents),
      wonCount: number(bets.won_count),
      lostCount: number(bets.lost_count),
      profitCents: number(bets.profit_cents),
    },
    meals: {
      count: number(meals.meal_count),
      averageCalories:
        meals.average_calories === null
          ? null
          : Math.round(number(meals.average_calories)),
      proteinGrams: Math.round(number(meals.protein_grams) * 10) / 10,
      costCents: number(meals.cost_cents),
    },
    gym: {
      workoutCount: number(gym.workout_count),
      durationMinutes: number(gym.duration_minutes),
      volumeKg: Math.round(number(gym.volume_kg)),
    },
    health: {
      entryCount: number(health.entry_count),
      averageSleepHours:
        health.average_sleep_hours === null
          ? null
          : Math.round(number(health.average_sleep_hours) * 10) / 10,
      averageWaterMl:
        health.average_water_ml === null
          ? null
          : Math.round(number(health.average_water_ml)),
      latestWeightKg: latestWeight === null ? null : number(latestWeight),
      weightChangeKg:
        latestWeight === null || firstWeight === null
          ? null
          : Math.round((number(latestWeight) - number(firstWeight)) * 10) / 10,
    },
    daily: dailyResult.rows.map((row) => ({
      date:
        row.activity_date instanceof Date
          ? row.activity_date.toISOString().slice(0, 10)
          : row.activity_date,
      count: number(row.record_count),
    })),
    welcome: {
      todayRecords: dailyResult.rows
        .filter((row) => {
          const date =
            row.activity_date instanceof Date
              ? row.activity_date.toISOString().slice(0, 10)
              : row.activity_date;
          return date === today;
        })
        .reduce((total, row) => total + number(row.record_count), 0),
      upcomingEvent: upcoming
        ? {
            title: upcoming.title,
            startsAt: upcoming.starts_at.toISOString(),
            location: upcoming.location,
          }
        : null,
      setup: {
        finances: number(onboarding.finance_count) > 0,
        events: number(onboarding.events_count) > 0,
        notes: number(onboarding.notes_count) > 0,
        meals: number(onboarding.meals_count) > 0,
        health: number(onboarding.health_count) > 0,
        gym: number(onboarding.gym_count) > 0,
      },
    },
  };
}
