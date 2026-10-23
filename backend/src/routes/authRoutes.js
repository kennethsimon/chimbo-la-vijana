import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "../db.js";
import { clearSessionCookie, hashPassword, publicUser, requireAuth, setSessionCookie, verifyPassword } from "../auth.js";
import { changePasswordSchema, loginSchema, validate } from "../validators.js";

export const authRouter = Router();

authRouter.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

authRouter.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }),
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.validated;
      const { rows } = await pool.query(
        `SELECT users.*, booths.name AS booth_name
         FROM users
         LEFT JOIN booths ON booths.id = users.booth_id
         WHERE users.email = $1`,
        [email.toLowerCase()]
      );
      const user = rows[0];
      if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
        return res.status(401).json({ error: "invalid_credentials", message: "Email or password is incorrect" });
      }
      setSessionCookie(res, user);
      res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

authRouter.post("/change-password", requireAuth, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.validated;
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    const user = rows[0];
    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
      return res.status(400).json({ error: "invalid_password", message: "Current password is incorrect" });
    }
    const passwordHash = await hashPassword(newPassword);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [passwordHash, req.user.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

