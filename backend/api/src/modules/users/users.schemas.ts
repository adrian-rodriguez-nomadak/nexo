import { z } from "zod";

const shortList = z.array(z.string().trim().min(1).max(120)).max(12);

export const updateProfileSchema = z.object({
  preferred_name: z.string().trim().max(100),
  occupation: z.string().trim().max(160),
  city: z.string().trim().max(120),
  timezone: z.string().trim().max(80),
  life_stage: z.string().trim().max(120),
  priorities: shortList,
  routines: shortList,
  goals: shortList,
  support_preferences: shortList,
  additional_context: z.string().trim().max(2000),
  complete_onboarding: z.boolean().optional().default(false),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
