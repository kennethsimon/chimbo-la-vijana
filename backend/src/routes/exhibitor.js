import { Router } from "express";
import { pool } from "../db.js";
import { hasRole, requireAuth, requireRole } from "../auth.js";
import { normalizeAttendeePhoneSearch } from "../attendeeSearch.js";
import { attendeeSearchSchema, checkinSchema, EVENT_DAYS, foodSchema, lookupSchema, validate, visitSchema } from "../validators.js";
import { buildVisitSurveyAnswers, isTrainingCentre, servicesForBooth, TRAINING_INSTITUTIONS } from "../boothSurvey.js";

export const exhibitorRouter = Router();

const REQUIRED_FOOD_BOOTHS = 3;

exhibitorRouter.use(requireAuth, requireRole("admin", "exhibitor", "food", "checkin"));

exhibitorRouter.post("/scans/search", validate(attendeeSearchSchema), async (req, res, next) => {
  try {
    const query = req.validated.query;
    const phoneDigits = normalizeAttendeePhoneSearch(query);
    const { rows } = await pool.query(
      `SELECT id, ticket_code, name, phone, attendance_days
       FROM attendees
       WHERE upper(ticket_code) = upper($1)
          OR ($2::text IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') = $2)
          OR position(' ' || lower($1) in ' ' || lower(name)) > 0
       ORDER BY
         CASE
           WHEN upper(ticket_code) = upper($1) THEN 0
           WHEN $2::text IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') = $2 THEN 1
           WHEN lower(name) = lower($1) THEN 2
           WHEN left(lower(name), length($1)) = lower($1) THEN 3
           ELSE 4
         END,
         name ASC
       LIMIT 12`,
      [query, phoneDigits]
    );
    res.json({
      attendees: rows.map((row) => ({
        id: row.id,
        ticketCode: row.ticket_code,
        name: row.name,
        phone: row.phone,
        attendanceDays: normalizeAttendanceDays(row.attendance_days)
      }))
    });
  } catch (error) {
    next(error);
  }
});

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
      `SELECT visits.created_at, visits.purpose, visits.service, visits.satisfaction, visits.question, visits.new_info,
              visits.training_institution, visits.survey_status, visits.survey_answers, booths.name AS booth_name,
              visits.scanned_by_user_id, visits.booth_id, visits.scan_day
       FROM visits
       JOIN booths ON booths.id = visits.booth_id
       WHERE visits.attendee_id = $1
       ORDER BY visits.created_at DESC`,
      [attendee.id]
    );
    const { rows: checkinRows } = await pool.query(
      "SELECT scan_day, created_at FROM attendance_checkins WHERE attendee_id = $1 ORDER BY scan_day",
      [attendee.id]
    );

    const boothEligibility = buildBoothEligibility(visitRows, scanDay);

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
      attendanceCheckin: checkinRows.find((row) => formatScanDay(row.scan_day) === scanDay)
        ? {
            scanDay,
            checkedInAt: checkinRows.find((row) => formatScanDay(row.scan_day) === scanDay).created_at
          }
        : null,
      attendanceCheckins: checkinRows.map((row) => ({
        scanDay: formatScanDay(row.scan_day),
        checkedInAt: row.created_at
      })),
      boothEligibility,
      visits: visitRows.map((row) => ({
        boothName: row.booth_name,
        boothId: row.booth_id,
        scanDay: formatScanDay(row.scan_day),
        scannedByUserId: row.scanned_by_user_id,
        service: row.service,
        purpose: row.purpose,
        satisfaction: row.satisfaction,
        question: row.question,
        newInfo: row.new_info,
        trainingInstitution: row.training_institution,
        surveyStatus: row.survey_status,
        surveyAnswers: row.survey_answers || [],
        createdAt: row.created_at
      })),
      permissions: {
        canScanBooth: hasRole(req.user, "admin") || hasRole(req.user, "exhibitor"),
        canScanFood: hasRole(req.user, "admin") || hasRole(req.user, "food"),
        canCheckIn: hasRole(req.user, "admin") || hasRole(req.user, "checkin")
      },
      currentBoothVisit: boothIdForCurrentVisit
        ? visitRows.find((row) => row.booth_id === boothIdForCurrentVisit && formatScanDay(row.scan_day) === scanDay) || null
        : null
    });
  } catch (error) {
    next(error);
  }
});

exhibitorRouter.post("/scans/checkin", validate(checkinSchema), async (req, res, next) => {
  try {
    if (!hasRole(req.user, "admin") && !hasRole(req.user, "checkin")) {
      return res.status(403).json({ error: "forbidden", message: "Only entrance users can confirm attendance" });
    }
    const attendee = await findAttendee(req.validated.ticketCode);
    if (!attendee) return res.status(404).json({ error: "not_found", message: "Ticket code was not found" });
    if (!isAllowedScanDay(attendee, req.validated.scanDay)) {
      return res.status(400).json({ error: "invalid_scan_day", message: "Tiketi hii haijachagua siku hii ya kuhudhuria." });
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO attendance_checkins (attendee_id, checked_in_by_user_id, scan_day)
         VALUES ($1, $2, $3)
         RETURNING created_at`,
        [attendee.id, req.user.id, req.validated.scanDay]
      );
      res.status(201).json({ ok: true, checkedInAt: rows[0].created_at });
    } catch (error) {
      if (error.code === "23505") {
        const { rows } = await pool.query(
          "SELECT created_at FROM attendance_checkins WHERE attendee_id = $1 AND scan_day = $2",
          [attendee.id, req.validated.scanDay]
        );
        return res.status(409).json({
          error: "already_checked_in",
          message: "Attendance has already been confirmed for this ticket on this day",
          scanDay: req.validated.scanDay,
          checkedInAt: rows[0]?.created_at
        });
      }
      throw error;
    }
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
    const boothResult = await pool.query("SELECT id, name, is_active FROM booths WHERE id = $1", [boothId]);
    const booth = boothResult.rows[0];
    if (!booth?.is_active) return res.status(400).json({ error: "invalid_booth", message: "Selected booth is not active" });
    const attendee = await findAttendee(req.validated.ticketCode);
    if (!attendee) return res.status(404).json({ error: "not_found", message: "Ticket code was not found" });
    if (!isAllowedScanDay(attendee, req.validated.scanDay)) {
      return res.status(400).json({ error: "invalid_scan_day", message: "Tiketi hii haijachagua siku hii ya kuhudhuria." });
    }

    const surveyValidation = validateBoothSurvey(booth.name, req.validated);
    if (surveyValidation) {
      return res.status(400).json({ error: "validation_error", message: surveyValidation });
    }

    const question = req.validated.purpose === "question" ? req.validated.question || null : null;
    const surveyAnswers = buildVisitSurveyAnswers({ ...req.validated, question });

    try {
      const { rows } = await pool.query(
        `INSERT INTO visits (
           attendee_id, booth_id, scanned_by_user_id, scan_day, purpose, service, satisfaction,
           question, new_info, training_institution, survey_status, survey_answers
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          attendee.id,
          boothId,
          req.user.id,
          req.validated.scanDay,
          req.validated.purpose || null,
          req.validated.service || null,
          req.validated.satisfaction || null,
          question,
          req.validated.newInfo || null,
          req.validated.trainingInstitution || null,
          req.validated.surveyStatus,
          JSON.stringify(surveyAnswers)
        ]
      );
      res.status(201).json({
        ok: true,
        visit: { id: rows[0].id, surveyStatus: rows[0].survey_status, createdAt: rows[0].created_at }
      });
    } catch (error) {
      if (error.code === "23505") {
        const { rows } = await pool.query(
          `SELECT visits.created_at, COALESCE(users.name, 'Deleted user') AS scanned_by
           FROM visits
           LEFT JOIN users ON users.id = visits.scanned_by_user_id
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
  const client = await pool.connect();
  try {
    if (!hasRole(req.user, "admin") && !hasRole(req.user, "food")) {
      return res.status(403).json({ error: "forbidden", message: "Only food users can confirm food claims" });
    }
    const attendee = await findAttendee(req.validated.ticketCode);
    if (!attendee) return res.status(404).json({ error: "not_found", message: "Ticket code was not found" });
    if (!isAllowedScanDay(attendee, req.validated.scanDay)) {
      return res.status(400).json({ error: "invalid_scan_day", message: "Tiketi hii haijachagua siku hii ya kuhudhuria." });
    }

    await client.query("BEGIN");
    const eligibilityResult = await client.query(
      `SELECT count(DISTINCT visits.booth_id)::int AS visited
       FROM visits
       JOIN booths ON booths.id = visits.booth_id
       WHERE visits.attendee_id = $1
         AND visits.scan_day = $2
         AND upper(booths.name) <> 'FOOD DESK'`,
      [attendee.id, req.validated.scanDay]
    );
    const visited = eligibilityResult.rows[0].visited;
    if (visited < REQUIRED_FOOD_BOOTHS) {
      await client.query("ROLLBACK");
      return res.status(422).json({
        error: "insufficient_booth_visits",
        message: `Mshiriki lazima atembelee angalau mabanda ${REQUIRED_FOOD_BOOTHS} tofauti kabla ya kupata chakula.`,
        required: REQUIRED_FOOD_BOOTHS,
        visited,
        remaining: REQUIRED_FOOD_BOOTHS - visited
      });
    }

    try {
      const { rows } = await client.query(
        `INSERT INTO food_claims (attendee_id, claimed_by_user_id, scan_day)
         VALUES ($1, $2, $3)
         RETURNING created_at`,
        [attendee.id, req.user.id, req.validated.scanDay]
      );
      await client.query("COMMIT");
      res.status(201).json({ ok: true, claimedAt: rows[0].created_at });
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") {
        const { rows } = await client.query(
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
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

exhibitorRouter.get("/scans/history", async (req, res, next) => {
  try {
    const params = [];
    const visitWhere = hasRole(req.user, "admin") ? "" : "WHERE visits.scanned_by_user_id = $1";
    const foodWhere = hasRole(req.user, "admin") ? "" : "WHERE food_claims.claimed_by_user_id = $1";
    const checkinWhere = hasRole(req.user, "admin") ? "" : "WHERE attendance_checkins.checked_in_by_user_id = $1";
    if (!hasRole(req.user, "admin")) params.push(req.user.id);

    const { rows } = await pool.query(
      `SELECT 'booth' AS type, visits.id, visits.created_at, visits.scan_day,
              attendees.name AS attendee_name, attendees.ticket_code,
              booths.name AS booth_name,
              COALESCE(users.name, 'Deleted user') AS scanned_by,
              visits.purpose, visits.service, visits.satisfaction, visits.question, visits.new_info,
              visits.training_institution, visits.survey_status, visits.survey_answers
       FROM visits
       JOIN attendees ON attendees.id = visits.attendee_id
       JOIN booths ON booths.id = visits.booth_id
       LEFT JOIN users ON users.id = visits.scanned_by_user_id
       ${visitWhere}
       UNION ALL
       SELECT 'food' AS type, food_claims.id, food_claims.created_at, food_claims.scan_day,
              attendees.name AS attendee_name, attendees.ticket_code,
              'Food desk' AS booth_name,
              COALESCE(users.name, 'Deleted user') AS scanned_by,
              NULL AS purpose, NULL AS service, NULL AS satisfaction, NULL AS question, NULL AS new_info,
              NULL AS training_institution, NULL AS survey_status, '[]'::jsonb AS survey_answers
       FROM food_claims
       JOIN attendees ON attendees.id = food_claims.attendee_id
       LEFT JOIN users ON users.id = food_claims.claimed_by_user_id
       ${foodWhere}
       UNION ALL
       SELECT 'checkin' AS type, attendance_checkins.id, attendance_checkins.created_at, attendance_checkins.scan_day,
              attendees.name AS attendee_name, attendees.ticket_code,
              'Entrance' AS booth_name,
              COALESCE(users.name, 'Deleted user') AS scanned_by,
              NULL AS purpose, NULL AS service, NULL AS satisfaction, NULL AS question, NULL AS new_info,
              NULL AS training_institution, NULL AS survey_status, '[]'::jsonb AS survey_answers
       FROM attendance_checkins
       JOIN attendees ON attendees.id = attendance_checkins.attendee_id
       LEFT JOIN users ON users.id = attendance_checkins.checked_in_by_user_id
       ${checkinWhere}
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

function buildBoothEligibility(visits, scanDay) {
  const sameDayVisits = visits.filter((row) => (
    formatScanDay(row.scan_day) === scanDay && row.booth_name?.toUpperCase() !== "FOOD DESK"
  ));
  const uniqueBooths = [...new Map(sameDayVisits.map((row) => [row.booth_id, row.booth_name])).values()];
  return {
    required: REQUIRED_FOOD_BOOTHS,
    visited: uniqueBooths.length,
    remaining: Math.max(0, REQUIRED_FOOD_BOOTHS - uniqueBooths.length),
    eligible: uniqueBooths.length >= REQUIRED_FOOD_BOOTHS,
    booths: uniqueBooths
  };
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

function validateBoothSurvey(boothName, survey) {
  const isSkipped = survey.surveyStatus === "skipped";
  const availableServices = servicesForBooth(boothName);

  if (!isSkipped && (!survey.purpose || !survey.service || !survey.satisfaction)) {
    return "Jaza alichokuja kufanya, huduma aliyopata na kiwango cha kuridhika.";
  }
  if (survey.service && availableServices.length && !availableServices.includes(survey.service)) {
    return "Huduma iliyochaguliwa haipatikani kwenye banda hili.";
  }
  if (isTrainingCentre(boothName)) {
    if (!isSkipped && !survey.trainingInstitution) return "Chagua taasisi iliyotoa mafunzo.";
    if (survey.trainingInstitution && !TRAINING_INSTITUTIONS.includes(survey.trainingInstitution)) {
      return "Taasisi iliyotoa mafunzo haijatambulika.";
    }
  } else if (survey.trainingInstitution) {
    return "Taasisi ya mafunzo inaruhusiwa kwenye Training Centre pekee.";
  }
  return null;
}

