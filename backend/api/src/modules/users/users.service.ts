import { moduleHealth } from "../../shared/utils/api-response.js";
import { QueryTypes } from "sequelize";

import { requireUserId } from "../../shared/auth/user-context.js";
import { sequelize } from "../../shared/db/sequelize.js";
import type { UpdateProfileInput } from "./users.schemas.js";

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  currency: string;
  preferred_name: string | null;
  occupation: string | null;
  city: string | null;
  timezone: string | null;
  life_stage: string | null;
  priorities: string[] | null;
  routines: string[] | null;
  goals: string[] | null;
  support_preferences: string[] | null;
  additional_context: string | null;
  onboarding_completed_at: Date | null;
};

function shape(row: ProfileRow) {
  return {
    user: { id: row.id, name: row.name, email: row.email, currency: row.currency },
    profile: {
      preferred_name: row.preferred_name ?? "",
      occupation: row.occupation ?? "",
      city: row.city ?? "",
      timezone: row.timezone ?? "",
      life_stage: row.life_stage ?? "",
      priorities: row.priorities ?? [],
      routines: row.routines ?? [],
      goals: row.goals ?? [],
      support_preferences: row.support_preferences ?? [],
      additional_context: row.additional_context ?? "",
    },
    onboarding_completed: row.onboarding_completed_at !== null,
  };
}

async function load(userId: string) {
  const rows = await sequelize.query<ProfileRow>(
    `SELECT u.id, u.name, u.email, u.currency,
      p.preferred_name, p.occupation, p.city, p.timezone, p.life_stage,
      p.priorities, p.routines, p.goals, p.support_preferences,
      p.additional_context, p.onboarding_completed_at
     FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = :userId LIMIT 1`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );
  if (!rows[0]) throw new Error("User not found");
  return shape(rows[0]);
}

export const usersService = {
  health() {
    return moduleHealth("users");
  },
  async me() {
    return load(requireUserId());
  },
  async updateProfile(input: UpdateProfileInput) {
    const userId = requireUserId();
    await sequelize.query(
      `INSERT INTO user_profiles (
        user_id, preferred_name, occupation, city, timezone, life_stage,
        priorities, routines, goals, support_preferences, additional_context,
        onboarding_completed_at
      ) VALUES (
        :userId, :preferredName, :occupation, :city, :timezone, :lifeStage,
        CAST(:priorities AS jsonb), CAST(:routines AS jsonb), CAST(:goals AS jsonb),
        CAST(:supportPreferences AS jsonb), :additionalContext,
        CASE WHEN :completeOnboarding THEN now() ELSE NULL END
      ) ON CONFLICT (user_id) DO UPDATE SET
        preferred_name = EXCLUDED.preferred_name,
        occupation = EXCLUDED.occupation,
        city = EXCLUDED.city,
        timezone = EXCLUDED.timezone,
        life_stage = EXCLUDED.life_stage,
        priorities = EXCLUDED.priorities,
        routines = EXCLUDED.routines,
        goals = EXCLUDED.goals,
        support_preferences = EXCLUDED.support_preferences,
        additional_context = EXCLUDED.additional_context,
        onboarding_completed_at = CASE WHEN :completeOnboarding
          THEN COALESCE(user_profiles.onboarding_completed_at, now())
          ELSE user_profiles.onboarding_completed_at END,
        updated_at = now()`,
      {
        replacements: {
          userId,
          preferredName: input.preferred_name,
          occupation: input.occupation,
          city: input.city,
          timezone: input.timezone,
          lifeStage: input.life_stage,
          priorities: JSON.stringify(input.priorities),
          routines: JSON.stringify(input.routines),
          goals: JSON.stringify(input.goals),
          supportPreferences: JSON.stringify(input.support_preferences),
          additionalContext: input.additional_context,
          completeOnboarding: input.complete_onboarding,
        },
      },
    );
    return load(userId);
  },
};
