import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  createHealthEntry,
  deleteHealthEntry,
  getHealthData,
  saveHealthProfile,
} from "./health.service.js";
import {
  hasHealthValue,
  isBiologicalSex,
  isBloodType,
  normalizeHealthDate,
  normalizeHealthDateTime,
  normalizeHealthDecimal,
  normalizeHealthInteger,
  normalizeHealthList,
  normalizeOptionalHealthText,
} from "./health.validation.js";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    response.json(await getHealthData(request.authUser!.id));
  }),
);

healthRouter.put(
  "/profile",
  asyncHandler(async (request, response) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const heightCm = normalizeHealthDecimal(body.heightCm, 50, 250);
    const birthDate =
      body.birthDate === null || body.birthDate === ""
        ? null
        : normalizeHealthDate(body.birthDate);
    const biologicalSex =
      body.biologicalSex === null || body.biologicalSex === ""
        ? null
        : isBiologicalSex(body.biologicalSex)
          ? body.biologicalSex
          : null;
    const bloodType =
      body.bloodType === null || body.bloodType === ""
        ? null
        : isBloodType(body.bloodType)
          ? body.bloodType
          : null;
    const allergies = normalizeHealthList(body.allergies);
    const conditions = normalizeHealthList(body.conditions);
    const medications = normalizeHealthList(body.medications);
    const emergencyContactName = normalizeOptionalHealthText(
      body.emergencyContactName,
      120,
    );
    const emergencyContactPhone = normalizeOptionalHealthText(
      body.emergencyContactPhone,
      40,
    );
    const targetWeightKg = normalizeHealthDecimal(
      body.targetWeightKg,
      20,
      500,
    );
    const notes = normalizeOptionalHealthText(body.notes, 2_000);

    const invalid =
      (hasHealthValue(body.heightCm) && heightCm === null) ||
      (hasHealthValue(body.birthDate) && birthDate === null) ||
      (hasHealthValue(body.biologicalSex) && biologicalSex === null) ||
      (hasHealthValue(body.bloodType) && bloodType === null) ||
      allergies === null ||
      conditions === null ||
      medications === null ||
      (hasHealthValue(body.emergencyContactName) &&
        emergencyContactName === null) ||
      (hasHealthValue(body.emergencyContactPhone) &&
        emergencyContactPhone === null) ||
      (hasHealthValue(body.targetWeightKg) && targetWeightKg === null) ||
      (hasHealthValue(body.notes) && notes === null);

    if (invalid) {
      response.status(400).json({
        error: "Revisa los datos del perfil de salud.",
      });
      return;
    }

    const profile = await saveHealthProfile({
      userId: request.authUser!.id,
      heightCm,
      birthDate,
      biologicalSex,
      bloodType,
      allergies,
      conditions,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      targetWeightKg,
      notes,
    });
    response.json({ profile });
  }),
);

healthRouter.post(
  "/entries",
  asyncHandler(async (request, response) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const measuredAt = normalizeHealthDateTime(body.measuredAt);
    const weightKg = normalizeHealthDecimal(body.weightKg, 20, 500);
    const sleepHours = normalizeHealthDecimal(body.sleepHours, 0, 24);
    const waterMl = normalizeHealthInteger(body.waterMl, 0, 20_000);
    const heartRateBpm = normalizeHealthInteger(body.heartRateBpm, 20, 300);
    const systolicMmHg = normalizeHealthInteger(body.systolicMmHg, 50, 300);
    const diastolicMmHg = normalizeHealthInteger(
      body.diastolicMmHg,
      30,
      200,
    );
    const glucoseMgDl = normalizeHealthDecimal(body.glucoseMgDl, 20, 1_000);
    const oxygenPercent = normalizeHealthDecimal(
      body.oxygenPercent,
      50,
      100,
    );
    const temperatureC = normalizeHealthDecimal(body.temperatureC, 30, 45);
    const mood = normalizeHealthInteger(body.mood, 1, 5);
    const symptoms = normalizeHealthList(body.symptoms);
    const notes = normalizeOptionalHealthText(body.notes, 2_000);

    const numericValues = [
      [body.weightKg, weightKg],
      [body.sleepHours, sleepHours],
      [body.waterMl, waterMl],
      [body.heartRateBpm, heartRateBpm],
      [body.systolicMmHg, systolicMmHg],
      [body.diastolicMmHg, diastolicMmHg],
      [body.glucoseMgDl, glucoseMgDl],
      [body.oxygenPercent, oxygenPercent],
      [body.temperatureC, temperatureC],
      [body.mood, mood],
    ] as const;
    const hasInvalidNumber = numericValues.some(
      ([original, normalized]) =>
        hasHealthValue(original) && normalized === null,
    );
    const hasPressure =
      systolicMmHg !== null || diastolicMmHg !== null;
    const completePressure =
      systolicMmHg !== null && diastolicMmHg !== null;
    const hasContent =
      numericValues.some(([, value]) => value !== null) ||
      (symptoms?.length ?? 0) > 0 ||
      notes !== null;

    if (
      !measuredAt ||
      hasInvalidNumber ||
      symptoms === null ||
      (hasHealthValue(body.notes) && notes === null) ||
      (hasPressure && !completePressure) ||
      !hasContent
    ) {
      response.status(400).json({
        error:
          "Registra al menos una medición y revisa sus valores. La presión requiere ambos números.",
      });
      return;
    }

    const entry = await createHealthEntry({
      userId: request.authUser!.id,
      measuredAt,
      weightKg,
      sleepHours,
      waterMl,
      heartRateBpm,
      systolicMmHg,
      diastolicMmHg,
      glucoseMgDl,
      oxygenPercent,
      temperatureC,
      mood,
      symptoms,
      notes,
    });
    response.status(201).json({ entry });
  }),
);

healthRouter.delete(
  "/entries/:id",
  asyncHandler(async (request, response) => {
    const idParam = request.params.id;
    const id = Array.isArray(idParam) ? undefined : idParam;
    if (!id || id.length > 100) {
      response.status(400).json({ error: "El identificador no es válido." });
      return;
    }

    const deleted = await deleteHealthEntry(request.authUser!.id, id);
    if (!deleted) {
      response.status(404).json({ error: "La medición ya no existe." });
      return;
    }
    response.json({ deleted: true });
  }),
);
