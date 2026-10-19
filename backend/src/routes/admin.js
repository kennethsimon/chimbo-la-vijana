import { Router } from "express";
import { randomBytes } from "node:crypto";
import { hashPassword, hasRole, normalizeRoles, requireAuth, requireRole } from "../auth.js";
import { pool } from "../db.js";
import { buildTicketEmailTemplate, sendStaffCredentialsEmail } from "../email.js";
import { getSmsDeliveryReport } from "../sms.js";
import { createUserSchema, updateUserSchema, validate } from "../validators.js";

export const adminRouter = Router();

adminRouter.get("/scans", requireAuth, requireRole("admin", "exhibitor", "food"), async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = getPagination(req);
    const params = [];
    const visitWhere = hasRole(req.user, "admin") ? "" : "WHERE visits.scanned_by_user_id = $1";
    const foodWhere = hasRole(req.user, "admin") ? "" : "WHERE food_claims.claimed_by_user_id = $1";
    if (!hasRole(req.user, "admin")) params.push(req.user.id);
    params.push(limit, offset);

    const { rows } = await pool.query(
      `WITH scan_rows AS (
        SELECT 'booth' AS type, visits.id, visits.service, visits.satisfaction, visits.question, visits.survey_answers, visits.created_at, visits.scan_day,
                attendees.name AS attendee_name, attendees.ticket_code,
                booths.name AS booth_name,
                users.name AS scanned_by
         FROM visits
         JOIN attendees ON attendees.id = visits.attendee_id
         JOIN booths ON booths.id = visits.booth_id
         JOIN users ON users.id = visits.scanned_by_user_id
         ${visitWhere}
         UNION ALL
         SELECT 'food' AS type, food_claims.id, NULL AS service, NULL AS satisfaction, NULL AS question, '[]'::jsonb AS survey_answers, food_claims.created_at, food_claims.scan_day,
                attendees.name AS attendee_name, attendees.ticket_code,
                'Food desk' AS booth_name,
                users.name AS scanned_by
         FROM food_claims
         JOIN attendees ON attendees.id = food_claims.attendee_id
         JOIN users ON users.id = food_claims.claimed_by_user_id
         ${foodWhere}
       )
       SELECT *, count(*) OVER()::int AS total_count
       FROM scan_rows
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ scans: rows.map(stripTotalCount), pagination: paginationMeta({ page, pageSize, total: rows[0]?.total_count || 0 }) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/scans/export", requireAuth, requireRole("admin", "exhibitor", "food"), async (req, res, next) => {
  try {
    const params = [];
    const visitWhere = hasRole(req.user, "admin") ? "" : "WHERE visits.scanned_by_user_id = $1";
    const foodWhere = hasRole(req.user, "admin") ? "" : "WHERE food_claims.claimed_by_user_id = $1";
    if (!hasRole(req.user, "admin")) params.push(req.user.id);
    const { rows } = await pool.query(
      `SELECT 'booth' AS type, visits.created_at, visits.scan_day, attendees.name AS attendee_name, attendees.ticket_code,
              booths.name AS booth_name, users.name AS scanned_by, visits.service, visits.satisfaction, visits.question, visits.survey_answers
       FROM visits
       JOIN attendees ON attendees.id = visits.attendee_id
       JOIN booths ON booths.id = visits.booth_id
       JOIN users ON users.id = visits.scanned_by_user_id
       ${visitWhere}
       UNION ALL
       SELECT 'food' AS type, food_claims.created_at, food_claims.scan_day, attendees.name AS attendee_name, attendees.ticket_code,
              'Food desk' AS booth_name, users.name AS scanned_by, NULL AS service, NULL AS satisfaction, NULL AS question, '[]'::jsonb AS survey_answers
       FROM food_claims
       JOIN attendees ON attendees.id = food_claims.attendee_id
       JOIN users ON users.id = food_claims.claimed_by_user_id
       ${foodWhere}
       ORDER BY created_at DESC`,
      params
    );
    sendCsv(res, "scans.csv", ["type", "scan_day", "created_at", "attendee_name", "ticket_code", "booth_name", "scanned_by", "service", "satisfaction", "question", "survey_answers"], rows.map((row) => ({
      ...row,
      survey_answers: JSON.stringify(row.survey_answers || [])
    })));
  } catch (error) {
    next(error);
  }
});

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/dashboard", async (req, res, next) => {
  try {
    const [
      totalAttendees,
      totalFoodClaims,
      totalVisits,
      totalExhibitors,
      totalFoodUsers,
      smsSentAttendees,
      attendeesWithEmail,
      emailSentAttendees,
      topBooths,
      recentActivity,
      satisfaction,
      services,
      districts,
      genderBreakdown,
      activityBreakdown,
      regionBreakdown,
      ageGroups,
      attendanceDays,
      registrationTrend,
      smsStatus,
      smsDeliveryStatus,
      emailStatus
    ] = await Promise.all([
      pool.query("SELECT count(*)::int AS n FROM attendees"),
      pool.query("SELECT count(*)::int AS n FROM food_claims"),
      pool.query("SELECT count(*)::int AS n FROM visits"),
      pool.query("SELECT count(*)::int AS n FROM users WHERE roles @> ARRAY['exhibitor']::TEXT[] AND is_active = true"),
      pool.query("SELECT count(*)::int AS n FROM users WHERE roles @> ARRAY['food']::TEXT[] AND is_active = true"),
      pool.query("SELECT count(DISTINCT attendee_id)::int AS n FROM sms_logs WHERE template = 'registration_ticket_sms' AND status = 'sent'"),
      pool.query("SELECT count(*)::int AS n FROM attendees WHERE email IS NOT NULL"),
      pool.query("SELECT count(DISTINCT attendee_id)::int AS n FROM email_logs WHERE template = 'registration_ticket' AND status = 'sent'"),
      pool.query(
        `SELECT booths.name, count(visits.id)::int AS visits
         FROM booths
         LEFT JOIN visits ON visits.booth_id = booths.id
         GROUP BY booths.id
         ORDER BY visits DESC, booths.name
         LIMIT 10`
      ),
      pool.query(
        `SELECT 'registration' AS type, attendees.name AS actor, attendees.ticket_code AS detail, attendees.created_at
         FROM attendees
         UNION ALL
         SELECT 'visit' AS type, attendees.name AS actor, booths.name AS detail, visits.created_at
         FROM visits
         JOIN attendees ON attendees.id = visits.attendee_id
         JOIN booths ON booths.id = visits.booth_id
         UNION ALL
         SELECT 'food' AS type, attendees.name AS actor, 'Food claimed' AS detail, food_claims.created_at
         FROM food_claims
         JOIN attendees ON attendees.id = food_claims.attendee_id
         ORDER BY created_at DESC
         LIMIT 15`
      ),
      pool.query(
        `SELECT satisfaction, count(*)::int AS count
         FROM visits
         WHERE satisfaction IS NOT NULL
         GROUP BY satisfaction
         ORDER BY satisfaction`
      ),
      pool.query(
        `SELECT service, count(*)::int AS count
         FROM visits
         WHERE service IS NOT NULL AND service <> ''
         GROUP BY service
         ORDER BY count DESC`
      ),
      pool.query(
        `SELECT district, region, count(*)::int AS count
         FROM attendees
         GROUP BY district, region
         ORDER BY count DESC
         LIMIT 5`
      ),
      pool.query(
        `SELECT gender AS label, count(*)::int AS count
         FROM attendees
         GROUP BY gender
         ORDER BY count DESC, gender`
      ),
      pool.query(
        `SELECT activity AS label, count(*)::int AS count
         FROM attendees
         GROUP BY activity
         ORDER BY count DESC, activity
         LIMIT 8`
      ),
      pool.query(
        `SELECT region AS label, count(*)::int AS count
         FROM attendees
         GROUP BY region
         ORDER BY count DESC, region
         LIMIT 8`
      ),
      pool.query(
        `SELECT label, count(*)::int AS count
         FROM (
           SELECT CASE
             WHEN age < 18 THEN 'Under 18'
             WHEN age BETWEEN 18 AND 24 THEN '18-24'
             WHEN age BETWEEN 25 AND 34 THEN '25-34'
             WHEN age BETWEEN 35 AND 44 THEN '35-44'
             ELSE '45+'
           END AS label,
           CASE
             WHEN age < 18 THEN 1
             WHEN age BETWEEN 18 AND 24 THEN 2
             WHEN age BETWEEN 25 AND 34 THEN 3
             WHEN age BETWEEN 35 AND 44 THEN 4
             ELSE 5
           END AS sort_order
           FROM attendees
         ) grouped
         GROUP BY label, sort_order
         ORDER BY sort_order`
      ),
      pool.query(
        `SELECT CASE
           WHEN attendance_days @> ARRAY['2026-10-24','2026-10-25']::TEXT[] THEN 'Both days'
           WHEN attendance_days @> ARRAY['2026-10-25']::TEXT[] THEN '25 Oct only'
           ELSE '24 Oct only'
         END AS label,
         count(*)::int AS count
         FROM attendees
         GROUP BY label
         ORDER BY label`
      ),
      pool.query(
        `SELECT label, count
         FROM (
           SELECT to_char(date_trunc('day', created_at), 'DD Mon') AS label,
                  count(*)::int AS count,
                  date_trunc('day', created_at) AS sort_date
           FROM attendees
           GROUP BY date_trunc('day', created_at)
           ORDER BY sort_date DESC
           LIMIT 14
         ) trend
         ORDER BY sort_date ASC`
      ),
      pool.query(
        `SELECT status AS label, count(*)::int AS count
         FROM sms_logs
         WHERE template = 'registration_ticket_sms'
         GROUP BY status
         ORDER BY count DESC, status`
      ),
      pool.query(
        `SELECT coalesce(delivery_status_name, delivery_status, 'Pending report') AS label, count(*)::int AS count
         FROM sms_logs
         WHERE template = 'registration_ticket_sms' AND status = 'sent'
         GROUP BY label
         ORDER BY count DESC, label`
      ),
      pool.query(
        `SELECT status AS label, count(*)::int AS count
         FROM email_logs
         WHERE template = 'registration_ticket'
         GROUP BY status
         ORDER BY count DESC, status`
      )
    ]);

    const attendeeCount = totalAttendees.rows[0].n;
    const foodClaimCount = totalFoodClaims.rows[0].n;
    res.json({
      totals: {
        attendees: attendeeCount,
        foodClaims: foodClaimCount,
        unclaimedFood: Math.max(0, attendeeCount - foodClaimCount),
        visits: totalVisits.rows[0].n,
        exhibitors: totalExhibitors.rows[0].n,
        foodUsers: totalFoodUsers.rows[0].n,
        smsSentAttendees: smsSentAttendees.rows[0].n,
        attendeesWithEmail: attendeesWithEmail.rows[0].n,
        emailSentAttendees: emailSentAttendees.rows[0].n
      },
      topBooths: topBooths.rows,
      recentActivity: recentActivity.rows,
      satisfaction: satisfaction.rows,
      services: services.rows,
      districts: districts.rows.map((row) => ({ label: `${row.district}, ${row.region}`, count: row.count })),
      demographics: {
        gender: genderBreakdown.rows,
        activity: activityBreakdown.rows,
        region: regionBreakdown.rows,
        ageGroups: ageGroups.rows,
        attendanceDays: attendanceDays.rows
      },
      communications: {
        smsStatus: smsStatus.rows,
        smsDeliveryStatus: smsDeliveryStatus.rows,
        emailStatus: emailStatus.rows
      },
      operations: {
        registrationTrend: registrationTrend.rows,
        foodClaims: [
          { label: "Claimed", count: foodClaimCount },
          { label: "Not claimed", count: Math.max(0, attendeeCount - foodClaimCount) }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/sms-logs", async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = getPagination(req);
    const { rows } = await pool.query(
      `SELECT sms_logs.id, sms_logs.to_phone, sms_logs.template, sms_logs.provider_message_id, sms_logs.status, sms_logs.error,
              sms_logs.delivery_status, sms_logs.delivery_status_name, sms_logs.delivery_group_name,
              sms_logs.provider_done_at, sms_logs.created_at,
              attendees.name AS attendee_name, attendees.ticket_code
       FROM sms_logs
       LEFT JOIN attendees ON attendees.id = sms_logs.attendee_id
       ORDER BY sms_logs.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = await pool.query("SELECT count(*)::int AS n FROM sms_logs");
    res.json({
      smsLogs: rows.map(mapSmsLog),
      pagination: paginationMeta({ page, pageSize, total: total.rows[0].n })
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/sms-logs/refresh", async (req, res, next) => {
  try {
    const { rows: logs } = await pool.query(
      `SELECT id, provider_message_id
       FROM sms_logs
       WHERE provider_message_id IS NOT NULL
         AND status = 'sent'
         AND coalesce(delivery_status_name, '') NOT IN ('DELIVERED', 'READ', 'REJECTED', 'UNDELIVERABLE', 'EXPIRED', 'DELETED')
       ORDER BY created_at DESC
       LIMIT 100`
    );

    const results = [];
    for (const log of logs) {
      const reportResult = await getSmsDeliveryReport(log.provider_message_id);
      const report = reportResult.report;
      if (report) {
        await pool.query(
          `UPDATE sms_logs
           SET delivery_status = $1,
               delivery_status_name = $2,
               delivery_group_name = $3,
               provider_done_at = nullif($4, '')::timestamptz,
               delivery_response = $5
           WHERE id = $6`,
          [
            report.delivery || null,
            report.status?.name || report.delivery || null,
            report.status?.groupName || null,
            report.doneAt || null,
            reportResult.response || report,
            log.id
          ]
        );
      }
      results.push({
        id: log.id,
        messageId: log.provider_message_id,
        refreshed: Boolean(report),
        status: report?.status?.name || report?.delivery || reportResult.status,
        error: reportResult.error
      });
    }

    res.json({
      refreshed: results.filter((result) => result.refreshed).length,
      checked: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/attendees/export", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const params = [];
    let where = "";
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where = `WHERE lower(attendees.name) LIKE $1
        OR lower(attendees.phone) LIKE $1
        OR lower(attendees.email) LIKE $1
        OR lower(attendees.ticket_code) LIKE $1`;
    }
    const { rows } = await pool.query(
      `SELECT attendees.ticket_code, attendees.name, attendees.phone, attendees.email, attendees.age, attendees.gender,
              attendees.region, attendees.district, attendees.activity, attendees.attendance_days, attendees.created_at,
              count(visits.id)::int AS visit_count,
              count(DISTINCT food_claims.id)::int AS food_claim_count
       FROM attendees
       LEFT JOIN visits ON visits.attendee_id = attendees.id
       LEFT JOIN food_claims ON food_claims.attendee_id = attendees.id
       ${where}
       GROUP BY attendees.id
       ORDER BY attendees.created_at DESC`,
      params
    );
    sendCsv(res, "attendees.csv", ["ticket_code", "name", "phone", "email", "age", "gender", "region", "district", "activity", "attendance_days", "visit_count", "food_claim_count", "created_at"], rows);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/attendees", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const { page, pageSize, limit, offset } = getPagination(req);
    const params = [];
    let where = "";
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where = `WHERE lower(attendees.name) LIKE $1
        OR lower(attendees.phone) LIKE $1
        OR lower(attendees.email) LIKE $1
        OR lower(attendees.ticket_code) LIKE $1`;
    }
    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT attendees.*,
              count(DISTINCT visits.id)::int AS visit_count,
              count(DISTINCT food_claims.id)::int AS food_claim_count,
              count(*) OVER()::int AS total_count
       FROM attendees
       LEFT JOIN visits ON visits.attendee_id = attendees.id
       LEFT JOIN food_claims ON food_claims.attendee_id = attendees.id
       ${where}
       GROUP BY attendees.id
       ORDER BY attendees.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ attendees: rows.map(mapAttendeeListRow), pagination: paginationMeta({ page, pageSize, total: rows[0]?.total_count || 0 }) });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/attendees/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const attendeeResult = await pool.query(
      `SELECT attendees.*,
              count(DISTINCT visits.id)::int AS visit_count,
              count(DISTINCT food_claims.id)::int AS food_claim_count
       FROM attendees
       LEFT JOIN visits ON visits.attendee_id = attendees.id
       LEFT JOIN food_claims ON food_claims.attendee_id = attendees.id
       WHERE attendees.id = $1
       GROUP BY attendees.id`,
      [req.params.id]
    );
    const attendee = attendeeResult.rows[0];
    if (!attendee) return res.status(404).json({ error: "not_found", message: "Attendee not found" });

    const [visits, foodClaims, emails] = await Promise.all([
      pool.query(
        `SELECT visits.id, visits.scan_day, visits.service, visits.satisfaction, visits.question, visits.survey_answers, visits.created_at,
                booths.name AS booth_name,
                users.name AS scanned_by
         FROM visits
         JOIN booths ON booths.id = visits.booth_id
         JOIN users ON users.id = visits.scanned_by_user_id
         WHERE visits.attendee_id = $1
         ORDER BY visits.created_at DESC`,
        [attendee.id]
      ),
      pool.query(
        `SELECT food_claims.id, food_claims.scan_day, food_claims.created_at,
                users.name AS claimed_by
         FROM food_claims
         JOIN users ON users.id = food_claims.claimed_by_user_id
         WHERE food_claims.attendee_id = $1
         ORDER BY food_claims.created_at DESC`,
        [attendee.id]
      ),
      pool.query(
        `SELECT id, to_email, template, resend_message_id, status, error, created_at
         FROM email_logs
         WHERE attendee_id = $1
         ORDER BY created_at DESC`,
        [attendee.id]
      )
    ]);

    const ticket = await buildTicketEmailTemplate({
      attendee,
      ticketCode: attendee.ticket_code,
      inlineImages: true
    });

    res.json({
      attendee: mapAttendeeListRow(attendee),
      visits: visits.rows,
      foodClaims: foodClaims.rows,
      emails: emails.rows,
      ticketEmail: {
        html: ticket.html,
        ticketSvg: ticket.ticketSvg,
        filename: `${attendee.ticket_code}-ticket.svg`,
        subject: `${ticket.eventName} ticket: ${attendee.ticket_code}`
      }
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/booths", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, description, is_active FROM booths ORDER BY name"
    );
    res.json({ booths: rows });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/users", async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = getPagination(req);
    const { rows } = await pool.query(
      `SELECT users.id, users.name, users.email, users.role, users.roles, users.booth_id, users.is_active, users.created_at,
              booths.name AS booth_name,
              count(*) OVER()::int AS total_count
       FROM users
       LEFT JOIN booths ON booths.id = users.booth_id
       ORDER BY users.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ users: rows.map(mapUser), pagination: paginationMeta({ page, pageSize, total: rows[0]?.total_count || 0 }) });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users", validate(createUserSchema), async (req, res, next) => {
  try {
    const data = req.validated;
    const roles = normalizeInputRoles(data);
    if (roles.includes("exhibitor") && !data.boothId) {
      return res.status(400).json({ error: "validation_error", message: "Exhibitors require a booth" });
    }
    const temporaryPassword = data.password || generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, roles, booth_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, roles, booth_id, is_active, created_at`,
      [
        data.name,
        data.email.toLowerCase(),
        passwordHash,
        roles[0],
        roles,
        data.boothId || null,
        data.isActive ?? true
      ]
    );
    const user = mapUser(rows[0]);
    const boothName = data.boothId
      ? (await pool.query("SELECT name FROM booths WHERE id = $1", [data.boothId])).rows[0]?.name
      : "";
    const emailResult = await sendStaffCredentialsEmail({
      user: { ...user, boothName, booth_name: boothName },
      password: temporaryPassword,
      roles
    });
    res.status(201).json({ user: { ...user, boothName: boothName || user.boothName }, credentialEmail: emailResult });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/:id/resend-credentials", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT users.id, users.name, users.email, users.role, users.roles, users.booth_id, users.is_active, users.created_at,
              booths.name AS booth_name
       FROM users
       LEFT JOIN booths ON booths.id = users.booth_id
       WHERE users.id = $1`,
      [req.params.id]
    );
    const current = rows[0];
    if (!current) return res.status(404).json({ error: "not_found", message: "User not found" });
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await pool.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [passwordHash, req.params.id]);
    const user = mapUser(current);
    const emailResult = await sendStaffCredentialsEmail({
      user,
      password: temporaryPassword,
      roles: user.roles
    });
    res.json({ ok: true, credentialEmail: emailResult });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/users/:id", validate(updateUserSchema), async (req, res, next) => {
  try {
    const current = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: "not_found", message: "User not found" });

    const data = req.validated;
    const nextRoles = normalizeInputRoles({ role: data.role, roles: data.roles || normalizeRoles(current.rows[0]) });
    const nextBoothId = Object.prototype.hasOwnProperty.call(data, "boothId")
      ? data.boothId
      : current.rows[0].booth_id;
    if (nextRoles.includes("exhibitor") && !nextBoothId) {
      return res.status(400).json({ error: "validation_error", message: "Exhibitors require a booth" });
    }

    const passwordHash = data.password ? await hashPassword(data.password) : current.rows[0].password_hash;
    const { rows } = await pool.query(
      `UPDATE users
       SET name = $1,
           password_hash = $2,
           role = $3,
           roles = $4,
           booth_id = $5,
           is_active = $6,
           updated_at = now()
       WHERE id = $7
       RETURNING id, name, email, role, roles, booth_id, is_active, created_at`,
      [
        data.name || current.rows[0].name,
        passwordHash,
        nextRoles[0],
        nextRoles,
        nextBoothId || null,
        data.isActive ?? current.rows[0].is_active,
        req.params.id
      ]
    );
    res.json({ user: mapUser(rows[0]) });
  } catch (error) {
    next(error);
  }
});

function mapUser(row) {
  const roles = normalizeRoles(row);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: roles[0] || row.role,
    roles,
    boothId: row.booth_id,
    boothName: row.booth_name,
    isActive: row.is_active,
    createdAt: row.created_at
  };
}

function mapSmsLog(row) {
  return {
    id: row.id,
    toPhone: row.to_phone,
    template: row.template,
    providerMessageId: row.provider_message_id,
    status: row.status,
    error: row.error,
    deliveryStatus: row.delivery_status,
    deliveryStatusName: row.delivery_status_name,
    deliveryGroupName: row.delivery_group_name,
    providerDoneAt: row.provider_done_at,
    createdAt: row.created_at,
    attendeeName: row.attendee_name,
    ticketCode: row.ticket_code
  };
}

function normalizeInputRoles(data) {
  return [...new Set((data.roles?.length ? data.roles : [data.role || "exhibitor"]).filter(Boolean))];
}

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(14);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function mapAttendeeListRow(row) {
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
    attendanceDays: row.attendance_days,
    visitCount: row.visit_count,
    foodClaimCount: row.food_claim_count,
    foodClaimedAt: row.food_claim_count > 0 ? row.food_claim_count : null,
    createdAt: row.created_at
  };
}

function getPagination(req) {
  const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, Number.parseInt(String(req.query.pageSize || "10"), 10) || 10));
  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize
  };
}

function paginationMeta({ page, pageSize, total }) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

function stripTotalCount(row) {
  const { total_count, ...rest } = row;
  return rest;
}

function sendCsv(res, filename, columns, rows) {
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))
  ].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

const CSV_FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

export function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  const safeText = CSV_FORMULA_PREFIX_RE.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

