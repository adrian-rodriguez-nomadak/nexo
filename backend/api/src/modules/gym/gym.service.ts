import { randomUUID } from "node:crypto";

import { pool, query } from "../../shared/db/database.js";
import type {
  ExerciseKind,
  NormalizedExercise,
} from "./gym.validation.js";

export type GymExercise = NormalizedExercise & {
  id: string;
};

export type GymWorkout = {
  id: string;
  title: string;
  notes: string | null;
  durationMinutes: number;
  exercises: GymExercise[];
  trainedAt: string;
  createdAt: string;
};

type WorkoutRow = {
  id: string;
  title: string;
  notes: string | null;
  duration_minutes: number;
  trained_at: Date;
  created_at: Date;
};

type ExerciseRow = {
  id: string;
  workout_id: string;
  name: string;
  exercise_kind: ExerciseKind;
  sets: number | null;
  reps: number | null;
  weight_kg: string | null;
  distance_km: string | null;
  duration_minutes: number | null;
  notes: string | null;
};

function mapExercise(row: ExerciseRow): GymExercise {
  return {
    id: row.id,
    name: row.name,
    kind: row.exercise_kind,
    sets: row.sets,
    reps: row.reps,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    distanceKm:
      row.distance_km === null ? null : Number(row.distance_km),
    durationMinutes: row.duration_minutes,
    notes: row.notes,
  };
}

function mapWorkout(
  row: WorkoutRow,
  exercises: GymExercise[],
): GymWorkout {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    durationMinutes: row.duration_minutes,
    exercises,
    trainedAt: row.trained_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

export async function listWorkouts(userId: string): Promise<GymWorkout[]> {
  const [workoutsResult, exercisesResult] = await Promise.all([
    query<WorkoutRow>(
      `SELECT
         id,
         title,
         notes,
         duration_minutes,
         trained_at,
         created_at
       FROM nexo_workouts
       WHERE nexo_user_id = $1
       ORDER BY trained_at DESC, created_at DESC
       LIMIT 300`,
      [userId],
    ),
    query<ExerciseRow>(
      `SELECT
         e.id,
         e.workout_id,
         e.name,
         e.exercise_kind,
         e.sets,
         e.reps,
         e.weight_kg,
         e.distance_km,
         e.duration_minutes,
         e.notes
       FROM nexo_workout_exercises e
       INNER JOIN nexo_workouts w ON w.id = e.workout_id
       WHERE w.nexo_user_id = $1
       ORDER BY e.workout_id, e.position`,
      [userId],
    ),
  ]);

  const exercisesByWorkout = new Map<string, GymExercise[]>();
  for (const row of exercisesResult.rows) {
    const exercises = exercisesByWorkout.get(row.workout_id) ?? [];
    exercises.push(mapExercise(row));
    exercisesByWorkout.set(row.workout_id, exercises);
  }

  return workoutsResult.rows.map((row) =>
    mapWorkout(row, exercisesByWorkout.get(row.id) ?? []),
  );
}

export async function createWorkout(input: {
  userId: string;
  title: string;
  notes: string | null;
  durationMinutes: number;
  exercises: NormalizedExercise[];
  trainedAt: string;
}): Promise<GymWorkout> {
  const client = await pool.connect();
  const workoutId = randomUUID();

  try {
    await client.query("BEGIN");
    const workoutResult = await client.query<WorkoutRow>(
      `INSERT INTO nexo_workouts (
         id,
         nexo_user_id,
         title,
         notes,
         duration_minutes,
         trained_at,
         created_at
       ) VALUES ($1, $2, $3, $4, $5::INTEGER, $6::TIMESTAMPTZ, NOW())
       RETURNING
         id,
         title,
         notes,
         duration_minutes,
         trained_at,
         created_at`,
      [
        workoutId,
        input.userId,
        input.title,
        input.notes,
        input.durationMinutes,
        input.trainedAt,
      ],
    );

    const savedExercises: GymExercise[] = [];
    for (const [position, exercise] of input.exercises.entries()) {
      const exerciseId = randomUUID();
      const result = await client.query<ExerciseRow>(
        `INSERT INTO nexo_workout_exercises (
           id,
           workout_id,
           name,
           exercise_kind,
           sets,
           reps,
           weight_kg,
           distance_km,
           duration_minutes,
           notes,
           position,
           created_at
         ) VALUES (
           $1, $2, $3, $4, $5::INTEGER, $6::INTEGER, $7::NUMERIC,
           $8::NUMERIC, $9::INTEGER, $10, $11::INTEGER, NOW()
         )
         RETURNING
           id,
           workout_id,
           name,
           exercise_kind,
           sets,
           reps,
           weight_kg,
           distance_km,
           duration_minutes,
           notes`,
        [
          exerciseId,
          workoutId,
          exercise.name,
          exercise.kind,
          exercise.sets,
          exercise.reps,
          exercise.weightKg,
          exercise.distanceKm,
          exercise.durationMinutes,
          exercise.notes,
          position,
        ],
      );
      savedExercises.push(mapExercise(result.rows[0]!));
    }

    await client.query("COMMIT");
    return mapWorkout(workoutResult.rows[0]!, savedExercises);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteWorkout(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await query(
    "DELETE FROM nexo_workouts WHERE id = $1 AND nexo_user_id = $2",
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

