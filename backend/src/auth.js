import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { pool } from "./db.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: config.nodeEnv === "production" ? "none" : "lax",
  secure: config.nodeEnv === "production",
  path: "/",
  maxAge: 1000 * 60 * 60 * 12
};

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function setSessionCookie(res, user) {
  const token = jwt.sign(
    { sub: user.id, roles: normalizeRoles(user) },
    config.jwtSecret,
    { expiresIn: "12h" }
  );
  res.cookie(config.sessionCookieName, token, cookieOptions);
}

export function clearSessionCookie(res) {
  res.clearCookie(config.sessionCookieName, { ...cookieOptions, maxAge: undefined });
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[config.sessionCookieName];
    if (!token) return res.status(401).json({ error: "unauthenticated", message: "Login required" });

    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await pool.query(
      `SELECT users.id, users.name, users.email, users.role, users.roles, users.booth_id, users.is_active,
              booths.name AS booth_name
       FROM users
       LEFT JOIN booths ON booths.id = users.booth_id
       WHERE users.id = $1`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      clearSessionCookie(res);
      return res.status(401).json({ error: "unauthenticated", message: "Session is no longer valid" });
    }
    req.user = user;
    next();
  } catch {
    clearSessionCookie(res);
    return res.status(401).json({ error: "unauthenticated", message: "Session is invalid" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.some((role) => hasRole(req.user, role))) {
      return res.status(403).json({ error: "forbidden", message: "You do not have access to this action" });
    }
    next();
  };
}

export function hasRole(user, role) {
  return normalizeRoles(user).includes(role);
}

export function normalizeRoles(user) {
  const roles = Array.isArray(user?.roles) && user.roles.length ? user.roles : user?.role ? [user.role] : [];
  return [...new Set(roles.filter(Boolean))];
}

export function publicUser(user) {
  if (!user) return null;
  const roles = normalizeRoles(user);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: roles[0] || user.role,
    roles,
    boothId: user.booth_id,
    boothName: user.booth_name,
    isActive: user.is_active
  };
}

