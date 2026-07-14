import { z } from "zod";

export const interpretInboxSchema = z.object({
  text: z.string().trim().min(1),
});
