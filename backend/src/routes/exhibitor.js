import { Router } from "express";
import { pool } from "../db.js";
import { hasRole, requireAuth, requireRole } from "../auth.js";
import { foodSchema, lookupSchema, validate, visitSchema } from "../validators.js";

export const exhibitorRouter = Router();

exhibitorRouter.use(requireAuth, requireRole("admin", "exhibitor", "food"));

exhibitorRouter.post("/scans/lookup", validate(lookupSchema), async (req, res, next) => {
  try {
    const attendee = await findAttendee(req.validated.ticketCode);
    if (!attendee) return res.status(404).json({ error: "not_found", message: "Ticket code was not found" });

    const { rows: foodRows } = await pool.query(
      "SELECT created_at FROM food_claims WHERE attendee_id = $1",
      [attendee.id]
    );
    const { rows: visitRows } = await pool.query(
      `SELECT visits.created_at, visits.service, visits.satisfaction, visits.question, booths.name AS booth_name,
              visits.scanned_by_user_id, visits.booth_id
       FROM visits
       JOIN booths ON booths.id = visits.booth_id
       WHERE visits.attendee_id = $1
       ORDER BY visits.created_at DESC`,
      [attendee.id]
    );

    const boothIdForCurrentVisit = getRequestedBoothId(req);
    res.json({
      attendee: mapAttendee(attendee),
      foodClaim: foodRows[0] ? { claimedAt: foodRows[0].created_at } : null,
      visits: visitRows.map((row) => ({
        boothName: row.booth_name,
        boothId: row.booth_id,
        scannedByUserId: row.scanned_by_user_id,
        service: row.service,
        satisfaction: row.satisfaction,
        question: row.question,
        createdAt: row.created_at
      })),
      permissions: {
        canScanBooth: hasRole(req.user, "admin") || hasRole(req.user, "exhibitor"),
        canScanFood: hasRole(req.user, "admin") || hasRole(req.user, "food")
      },
      currentBoothVisit: boothIdForCurrentVisit ? visitRows.find((row) => row.booth_id === boothIdForCurrentVisit) || null : null
    });
  } catch (error) {
    next(error);
  }
});

exhibitorRouter.post("/scans/visit", validate(visitSchema), async (req, res, next) => {
  try {
    if (!hasRole(req.user, "admin") && !hasRole(req.user, "exhibitor")) {
      return res.status(403).json({ error: "forbidden", message: "Only booth users can save booth scans" });
    }
    const boothId = getRequestedBoothId(req);
    if (!boothId) {
      return res.status(400).json({ error: "missing_booth", message: "Choose a booth before saving this booth scan" });
    }
    if (hasRole(req.user, "admin") && req.validated.boothId) {
      const booth = await pool.query("SELECT id FROM booths WHERE id = $1 AND is_active = true", [req.validated.boothId]);
      if (!booth.rows[0]) return res.status(400).json({ error: "invalid_booth", message: "Selected booth is not active" });
    }
    const attendee = await findAttendee(req.validated.ticketCode);
    if (!attendee) return res.status(404).json({ error: "not_found", message: "Ticket code was not found" });

    try {
      const { rows } = await pool.query(
        `INSERT INTO visits (attendee_id, booth_id, scanned_by_user_id, service, satisfaction, question)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          attendee.id,
          boothId,
          req.user.id,
          req.validated.service || null,
          req.validated.satisfaction || null,
          req.validated.question || null
        ]
      );
      res.status(201).json({ ok: true, visit: { id: rows[0].id, createdAt: rows[0].created_at } });
    } catch (error) {
      if (error.code === "23505") {
        const { rows } = await pool.query(
          `SELECT visits.created_at, users.name AS scanned_by
           FROM visits
           JOIN users ON users.id = visits.scanned_by_user_id
           WHERE visits.attendee_id = $1 AND visits.booth_id = $2`,
          [attendee.id, boothId]
        );
        return res.status(409).json({
          error: "already_scanned",
          message: "This ticket has already been scanned for this booth",
          scannedAt: rows[0]?.created_at,
          scannedBy: rows[0]?.scanned_by
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

exhibitorRouter.post("/scans/food", validate(foodSchema), async (req, res, next) => {
  try {
    if (!hasRole(req.user, "admin") && !hasRole(req.user, "food")) {
      return res.status(403).json({ error: "forbidden", message: "Only food users can confirm food claims" });
    }
    const attendee = await findAttendee(req.validated.ticketCode);
    if (!attendee) return res.status(404).json({ error: "not_found", message: "Ticket code was not found" });

    try {
      const { rows } = await pool.query(
        `INSERT INTO food_claims (attendee_id, claimed_by_user_id)
         VALUES ($1, $2)
         RETURNING created_at`,
        [attendee.id, req.user.id]
      );
      res.status(201).json({ ok: true, claimedAt: rows[0].created_at });
    } catch (error) {
      if (error.code === "23505") {
        const { rows } = await pool.query(
          "SELECT created_at FROM food_claims WHERE attendee_id = $1",
          [attendee.id]
        );
        return res.status(409).json({
          error: "already_claimed",
          message: "Food has already been claimed for this ticket",
          claimedAt: rows[0]?.created_at
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

exhibitorRouter.get("/scans/history", async (req, res, next) => {
  try {
    const params = [];
    const visitWhere = hasRole(req.user, "admin") ? "" : "WHERE visits.scanned_by_user_id = $1";
    const foodWhere = hasRole(req.user, "admin") ? "" : "WHERE food_claims.claimed_by_user_id = $1";
    if (!hasRole(req.user, "admin")) params.push(req.user.id);

    const { rows } = await pool.query(
      `SELECT 'booth' AS type, visits.id, visits.created_at,
              attendees.name AS attendee_name, attendees.ticket_code,
              booths.name AS booth_name,
              users.name AS scanned_by,
              visits.service, visits.satisfaction, visits.question
       FROM visits
       JOIN attendees ON attendees.id = visits.attendee_id
       JOIN booths ON booths.id = visits.booth_id
       JOIN users ON users.id = visits.scanned_by_user_id
       ${visitWhere}
       UNION ALL
       SELECT 'food' AS type, food_claims.id, food_claims.created_at,
              attendees.name AS attendee_name, attendees.ticket_code,
              'Food desk' AS booth_name,
              users.name AS scanned_by,
              NULL AS service, NULL AS satisfaction, NULL AS question
       FROM food_claims
       JOIN attendees ON attendees.id = food_claims.attendee_id
       JOIN users ON users.id = food_claims.claimed_by_user_id
       ${foodWhere}
       ORDER BY created_at DESC
       LIMIT 250`,
      params
    );
    res.json({ scans: rows });
  } catch (error) {
    next(error);
  }
});

async function findAttendee(ticketCode) {
  const { rows } = await pool.query(
    "SELECT * FROM attendees WHERE upper(ticket_code) = upper($1)",
    [ticketCode.trim()]
  );
  return rows[0] || null;
}

function mapAttendee(row) {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    name: row.name,
    phone: row.phone,
    email: row.email,
    age: row.age,
    gender: row.gender,
    region: row.region,
    district: row.district,
    activity: row.activity,
    createdAt: row.created_at
  };
}

function getRequestedBoothId(req) {
  if (hasRole(req.user, "admin") && req.validated?.boothId) return req.validated.boothId;
  return req.user.booth_id;
}

