import type { AuthUser } from "../modules/auth/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      authToken?: string;
    }
  }
}

export {};
