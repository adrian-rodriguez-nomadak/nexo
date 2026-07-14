import bcrypt from "bcrypt";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { moduleHealth } from "../../shared/utils/api-response.js";
import { User } from "../users/user.model.js";
import { Session } from "./session.model.js";

type Credentials = { email: string; password: string; device_name?: string };
type Registration = Credentials & { name: string };

const refreshHash = (token: string) => createHash("sha256").update(token).digest("hex");

function accessToken(userId: string) {
  return jwt.sign({ sub: userId, type: "access" }, env.jwtSecret, {
    expiresIn: env.accessTokenTtl as jwt.SignOptions["expiresIn"],
  });
}

async function createSession(userId: string, deviceName?: string, family: string = randomUUID()) {
  const refreshToken = randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + env.refreshTokenDays * 86_400_000);
  await Session.create({
    user_id: userId,
    refresh_token_hash: refreshHash(refreshToken),
    token_family: family,
    device_name: deviceName,
    expires_at: expiresAt,
  });
  return { access_token: accessToken(userId), refresh_token: refreshToken, expires_in: 900 };
}

export const authService = {
  health() {
    return moduleHealth("auth");
  },

  async register(input: Registration) {
    const existing = await User.findOne({ where: { email: input.email } });
    if (existing) return null;
    const user = await User.create({
      name: input.name,
      email: input.email,
      password_hash: await bcrypt.hash(input.password, 12),
    });
    return { user: { id: user.get("id"), name: user.get("name"), email: user.get("email") }, tokens: await createSession(String(user.get("id")), input.device_name) };
  },

  async login(input: Credentials) {
    const user = await User.findOne({ where: { email: input.email } });
    const hash = user?.get("password_hash");
    if (!user || typeof hash !== "string" || !(await bcrypt.compare(input.password, hash))) return null;
    return { user: { id: user.get("id"), name: user.get("name"), email: user.get("email") }, tokens: await createSession(String(user.get("id")), input.device_name) };
  },

  async refresh(token: string) {
    const session = await Session.findOne({ where: { refresh_token_hash: refreshHash(token) } });
    if (!session || session.revoked_at || session.expires_at <= new Date()) return null;
    await session.update({ revoked_at: new Date(), last_used_at: new Date() });
    return createSession(session.user_id, undefined, session.token_family);
  },

  async logout(token: string) {
    const session = await Session.findOne({ where: { refresh_token_hash: refreshHash(token) } });
    if (session && !session.revoked_at) await session.update({ revoked_at: new Date() });
  },

  async logoutAll(userId: string) {
    await Session.update({ revoked_at: new Date() }, { where: { user_id: userId, revoked_at: null } });
  },
};
