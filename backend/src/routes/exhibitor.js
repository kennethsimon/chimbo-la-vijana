import { Router } from "express";
import { pool } from "../db.js";
import { hasRole, requireAuth, requireRole } from "../auth.js";
import { EVENT_DAYS, foodSchema, lookupSchema, validate, visitSchema } from "../validators.js";

export const exhibitorRouter = Router();

exhibitorRouter.use(requireAuth, requireRole("admin", "exhibitor", "food"));

exhibitorRouter.post("/scans/lookup", validate(lookupSchema), async (req, res, next) => {
  try {
    const attendee = await findAttendee(req.validated.ticketCode);
    if (!attendee) return res.status(404).json({ error: "not_found", message: "Ticket code was not found" });
    const scanDay = req.validated.scanDay || defaultScanDay(attendee);

    const { rows: foodRows } = await pool.query(
      "SELECT scan_day, created_at FROM food_claims WHERE attendee_id = $1 ORDER BY scan_day",
      [attendee.id]
    );
    const { rows: visitRows } = await pool.query(
      `SELECT visits.created_at, visits.service, visits.satisfaction, visits.question, visits.survey_answers, booths.name AS booth_name,
              visits.scanned_by_user_id, visits.booth_id, visits.scan_day
       FROM visits
       JOIN booths ON booths.id = visits.booth_id
       WHERE visits.attendee_id = $1
       ORDER BY visits.created_at DESC`,
      [attendee.id]
    );

    const boothIdForCurrentVisit = getRequestedBoothId(req);
    res.json({
      attendee: mapAttendee(attendee),
      scanDay,
      foodClaim: foodRows.find((row) => formatScanDay(row.scan_day) === scanDay)
        ? { scanDay, claimedAt: foodRows.find((row) => formatScanDay(row.scan_day) === scanDay).created_at }
        : null,
      foodClaims: foodRows.map((row) => ({
        scanDay: formatScanDay(row.scan_day),
        claimedAt: row.created_at
      })),
      visits: visitRows.map((row) => ({
        boothName: row.booth_name,
        boothId: row.booth_id,
        scanDay: formatScanDay(row.scan_day),
        scannedByUserId: row.scanned_by_user_id,
        service: row.service,
        satisfaction: row.satisfaction,
        question: row.question,
        surveyAnswers: row.survey_answers || [],
        createdAt: row.created_at
      })),
      permissions: {
        canScanBooth: hasRole(req.user, "admin") || hasRole(req.user, "exhibitor"),
        canScanFood: hasRole(req.user, "admin") || hasRole(req.user, "food")
      },
      currentBoothVisit: boothIdForCurrentVisit
        ? visitRows.find((row) => row.booth_id === boothIdForCurrentVisit && formatScanDay(row.scan_day) === scanDay) || null
        : null
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
    if (!isAllowedScanDay(attendee, req.validated.scanDay)) {
      return res.status(400).json({ error: "invalid_scan_day", message: "Tiketi hii haijachagua siku hii ya kuhudhuria." });
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO visits (attendee_id, booth_id, scanned_by_user_id, scan_day, service, satisfaction, question, survey_answers)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          attendee.id,
          boothId,
          req.user.id,
          req.validated.scanDay,
          req.validated.service || null,
          req.validated.satisfaction || null,
          req.validated.question || null,
          JSON.stringify(req.validated.surveyAnswers || [])
        ]
      );
      res.status(201).json({ ok: true, visit: { id: rows[0].id, createdAt: rows[0].created_at } });
    } catch (error) {
      if (error.code === "23505") {
        const { rows } = await pool.query(
          `SELECT visits.created_at, users.name AS scanned_by
           FROM visits
           JOIN users ON users.id = visits.scanned_by_user_id
           WHERE visits.attendee_id = $1 AND visits.booth_id = $2 AND visits.scan_day = $3`,
          [attendee.id, boothId, req.validated.scanDay]
        );
        return res.status(409).json({
          error: "already_scanned",
          message: "This ticket has already been scanned for this booth on this day",
          scanDay: req.validated.scanDay,
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
    if (!isAllowedScanDay(attendee, req.validated.scanDay)) {
      return res.status(400).json({ error: "invalid_scan_day", message: "Tiketi hii haijachagua siku hii ya kuhudhuria." });
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO food_claims (attendee_id, claimed_by_user_id, scan_day)
         VALUES ($1, $2, $3)
         RETURNING created_at`,
        [attendee.id, req.user.id, req.validated.scanDay]
      );
      res.status(201).json({ ok: true, claimedAt: rows[0].created_at });
    } catch (error) {
      if (error.code === "23505") {
        const { rows } = await pool.query(
          "SELECT created_at FROM food_claims WHERE attendee_id = $1 AND scan_day = $2",
          [attendee.id, req.validated.scanDay]
        );
        return res.status(409).json({
          error: "already_claimed",
          message: "Food has already been claimed for this ticket on this day",
          scanDay: req.validated.scanDay,
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
      `SELECT 'booth' AS type, visits.id, visits.created_at, visits.scan_day,
              attendees.name AS attendee_name, attendees.ticket_code,
              booths.name AS booth_name,
              users.name AS scanned_by,
              visits.service, visits.satisfaction, visits.question, visits.survey_answers
       FROM visits
       JOIN attendees ON attendees.id = visits.attendee_id
       JOIN booths ON booths.id = visits.booth_id
       JOIN users ON users.id = visits.scanned_by_user_id
       ${visitWhere}
       UNION ALL
       SELECT 'food' AS type, food_claims.id, food_claims.created_at, food_claims.scan_day,
              attendees.name AS attendee_name, attendees.ticket_code,
              'Food desk' AS booth_name,
              users.name AS scanned_by,
              NULL AS service, NULL AS satisfaction, NULL AS question, '[]'::jsonb AS survey_answers
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
    attendanceDays: normalizeAttendanceDays(row.attendance_days),
    createdAt: row.created_at
  };
}

function getRequestedBoothId(req) {
  if (hasRole(req.user, "admin") && req.validated?.boothId) return req.validated.boothId;
  return req.user.booth_id;
}

function normalizeAttendanceDays(days) {
  return Array.isArray(days) && days.length ? days : EVENT_DAYS;
}

function defaultScanDay(attendee) {
  const days = normalizeAttendanceDays(attendee.attendance_days);
  return days.includes(currentEventDay()) ? currentEventDay() : days[0];
}

function currentEventDay() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  return EVENT_DAYS.includes(today) ? today : EVENT_DAYS[0];
}

function isAllowedScanDay(attendee, scanDay) {
  return normalizeAttendanceDays(attendee.attendance_days).includes(scanDay);
}

function formatScanDay(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

