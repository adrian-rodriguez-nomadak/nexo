import { z } from "zod";

const password = z.string().min(8).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password,
  device_name: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password,
  device_name: z.string().trim().max(100).optional(),
});

export const refreshSchema = z.object({ refresh_token: z.string().min(40) });
