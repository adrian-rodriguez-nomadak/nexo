import { randomUUID } from "node:crypto";

import { query } from "../../shared/db/database.js";
import type {
  BiologicalSex,
  BloodType,
} from "./health.validation.js";

export type HealthProfile = {
  heightCm: number | null;
  birthDate: string | null;
  biologicalSex: BiologicalSex | null;
  bloodType: BloodType | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  targetWeightKg: number | null;
  notes: string | null;
  updatedAt: string;
};

export type HealthEntry = {
  id: string;
  measuredAt: string;
  weightKg: number | null;
  sleepHours: number | null;
  waterMl: number | null;
  heartRateBpm: number | null;
  systolicMmHg: number | null;
  diastolicMmHg: number | null;
  glucoseMgDl: number | null;
  oxygenPercent: number | null;
  temperatureC: number | null;
  mood: number | null;
  symptoms: string[];
  notes: string | null;
  createdAt: string;
};

type HealthProfileRow = {
  height_cm: string | null;
  birth_date: string | Date | null;
  biological_sex: BiologicalSex | null;
  blood_type: BloodType | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  target_weight_kg: string | null;
  notes: string | null;
  updated_at: Date;
};

type HealthEntryRow = {
  id: string;
  measured_at: Date;
  weight_kg: string | null;
  sleep_hours: string | null;
  water_ml: number | null;
  heart_rate_bpm: number | null;
  systolic_mm_hg: number | null;
  diastolic_mm_hg: number | null;
  glucose_mg_dl: string | null;
  oxygen_percent: string | null;
  temperature_c: string | null;
  mood: number | null;
  symptoms: string[];
  notes: string | null;
  created_at: Date;
};

function numberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function mapProfile(row: HealthProfileRow): HealthProfile {
  return {
    heightCm: numberOrNull(row.height_cm),
    birthDate:
      row.birth_date instanceof Date
        ? row.birth_date.toISOString().slice(0, 10)
        : row.birth_date,
    biologicalSex: row.biological_sex,
    bloodType: row.blood_type,
    allergies: row.allergies,
    conditions: row.conditions,
    medications: row.medications,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    targetWeightKg: numberOrNull(row.target_weight_kg),
    notes: row.notes,
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapEntry(row: HealthEntryRow): HealthEntry {
  return {
    id: row.id,
    measuredAt: row.measured_at.toISOString(),
    weightKg: numberOrNull(row.weight_kg),
    sleepHours: numberOrNull(row.sleep_hours),
    waterMl: row.water_ml,
    heartRateBpm: row.heart_rate_bpm,
    systolicMmHg: row.systolic_mm_hg,
    diastolicMmHg: row.diastolic_mm_hg,
    glucoseMgDl: numberOrNull(row.glucose_mg_dl),
    oxygenPercent: numberOrNull(row.oxygen_percent),
    temperatureC: numberOrNull(row.temperature_c),
    mood: row.mood,
    symptoms: row.symptoms,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

const profileColumns = `
  height_cm,
  birth_date,
  biological_sex,
  blood_type,
  allergies,
  conditions,
  medications,
  emergency_contact_name,
  emergency_contact_phone,
  target_weight_kg,
  notes,
  updated_at
`;

const entryColumns = `
  id,
  measured_at,
  weight_kg,
  sleep_hours,
  water_ml,
  heart_rate_bpm,
  systolic_mm_hg,
  diastolic_mm_hg,
  glucose_mg_dl,
  oxygen_percent,
  temperature_c,
  mood,
  symptoms,
  notes,
  created_at
`;

export async function getHealthData(userId: string): Promise<{
  profile: HealthProfile | null;
  entries: HealthEntry[];
}> {
  const [profileResult, entriesResult] = await Promise.all([
    query<HealthProfileRow>(
      `SELECT ${profileColumns}
       FROM nexo_health_profiles
       WHERE nexo_user_id = $1`,
      [userId],
    ),
    query<HealthEntryRow>(
      `SELECT ${entryColumns}
       FROM nexo_health_entries
       WHERE nexo_user_id = $1
       ORDER BY measured_at DESC, created_at DESC
       LIMIT 500`,
      [userId],
    ),
  ]);

  return {
    profile: profileResult.rows[0] ? mapProfile(profileResult.rows[0]) : null,
    entries: entriesResult.rows.map(mapEntry),
  };
}

export async function saveHealthProfile(input: {
  userId: string;
  heightCm: number | null;
  birthDate: string | null;
  biologicalSex: BiologicalSex | null;
  bloodType: BloodType | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  targetWeightKg: number | null;
  notes: string | null;
}): Promise<HealthProfile> {
  const result = await query<HealthProfileRow>(
    `INSERT INTO nexo_health_profiles (
       nexo_user_id,
       height_cm,
       birth_date,
       biological_sex,
       blood_type,
       allergies,
       conditions,
       medications,
       emergency_contact_name,
       emergency_contact_phone,
       target_weight_kg,
       notes,
       updated_at
     ) VALUES (
       $1, $2::NUMERIC, $3::DATE, $4, $5, $6::TEXT[], $7::TEXT[], $8::TEXT[],
       $9, $10, $11::NUMERIC, $12, NOW()
     )
     ON CONFLICT (nexo_user_id) DO UPDATE SET
       height_cm = EXCLUDED.height_cm,
       birth_date = EXCLUDED.birth_date,
       biological_sex = EXCLUDED.biological_sex,
       blood_type = EXCLUDED.blood_type,
       allergies = EXCLUDED.allergies,
       conditions = EXCLUDED.conditions,
       medications = EXCLUDED.medications,
       emergency_contact_name = EXCLUDED.emergency_contact_name,
       emergency_contact_phone = EXCLUDED.emergency_contact_phone,
       target_weight_kg = EXCLUDED.target_weight_kg,
       notes = EXCLUDED.notes,
       updated_at = NOW()
     RETURNING ${profileColumns}`,
    [
      input.userId,
      input.heightCm,
      input.birthDate,
      input.biologicalSex,
      input.bloodType,
      input.allergies,
      input.conditions,
      input.medications,
      input.emergencyContactName,
      input.emergencyContactPhone,
      input.targetWeightKg,
      input.notes,
    ],
  );
  return mapProfile(result.rows[0]!);
}

export async function createHealthEntry(input: {
  userId: string;
  measuredAt: string;
  weightKg: number | null;
  sleepHours: number | null;
  waterMl: number | null;
  heartRateBpm: number | null;
  systolicMmHg: number | null;
  diastolicMmHg: number | null;
  glucoseMgDl: number | null;
  oxygenPercent: number | null;
  temperatureC: number | null;
  mood: number | null;
  symptoms: string[];
  notes: string | null;
}): Promise<HealthEntry> {
  const result = await query<HealthEntryRow>(
    `INSERT INTO nexo_health_entries (
       id,
       nexo_user_id,
       measured_at,
       weight_kg,
       sleep_hours,
       water_ml,
       heart_rate_bpm,
       systolic_mm_hg,
       diastolic_mm_hg,
       glucose_mg_dl,
       oxygen_percent,
       temperature_c,
       mood,
       symptoms,
       notes,
       created_at
     ) VALUES (
       $1, $2, $3::TIMESTAMPTZ, $4::NUMERIC, $5::NUMERIC, $6::INTEGER,
       $7::INTEGER, $8::INTEGER, $9::INTEGER, $10::NUMERIC, $11::NUMERIC,
       $12::NUMERIC, $13::INTEGER, $14::TEXT[], $15, NOW()
     )
     RETURNING ${entryColumns}`,
    [
      randomUUID(),
      input.userId,
      input.measuredAt,
      input.weightKg,
      input.sleepHours,
      input.waterMl,
      input.heartRateBpm,
      input.systolicMmHg,
      input.diastolicMmHg,
      input.glucoseMgDl,
      input.oxygenPercent,
      input.temperatureC,
      input.mood,
      input.symptoms,
      input.notes,
    ],
  );
  return mapEntry(result.rows[0]!);
}

export async function deleteHealthEntry(
  userId: string,
  id: string,
): Promise<boolean> {
  const result = await query(
    "DELETE FROM nexo_health_entries WHERE id = $1 AND nexo_user_id = $2",
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
