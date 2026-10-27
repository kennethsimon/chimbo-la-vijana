import { Router } from "express";
import rateLimit from "express-rate-limit";
import { generateTicketCode } from "../codegen.js";
import { config } from "../config.js";
import { pool, withTransaction } from "../db.js";
import { sendTicketEmail } from "../email.js";
import { sendRegistrationSms } from "../sms.js";
import { recordRegistrationSmsAttempt } from "../sms-retries.js";
import { registrationSchema, validate } from "../validators.js";

export const publicRouter = Router();

publicRouter.post(
  "/registrations",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }),
  (req, res, next) => {
    if (!config.registrationsOpen) {
      return res.status(410).json({
        error: "registration_closed",
        message: "Usajili wa Chimbo La Vijana Brunch umefungwa kwa sababu tukio limekamilika."
      });
    }
    next();
  },
  validate(registrationSchema),
  async (req, res, next) => {
    try {
      const attendee = await createAttendee(req.validated);
      const emailResult = attendee.email
        ? await sendTicketEmail({ attendee, ticketCode: attendee.ticket_code })
        : { status: "not_provided", resendMessageId: null, error: null };
      const smsResult = await sendRegistrationSms({ attendee, ticketCode: attendee.ticket_code });

      if (attendee.email) {
        await pool.query(
          `INSERT INTO email_logs (attendee_id, to_email, template, resend_message_id, status, error)
           VALUES ($1, $2, 'registration_ticket', $3, $4, $5)`,
          [attendee.id, attendee.email, emailResult.resendMessageId, emailResult.status, emailResult.error]
        );
      }

      await recordRegistrationSmsAttempt({ attendee, result: smsResult });

      res.status(201).json({
        ok: true,
        attendee: publicAttendee(attendee),
        email: { status: emailResult.status },
        sms: { status: smsResult.status }
      });
    } catch (error) {
      next(error);
    }
  }
);

async function createAttendee(data) {
  return withTransaction(async (client) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const ticketCode = generateTicketCode();
      try {
        const { rows } = await client.query(
          `INSERT INTO attendees (ticket_code, name, phone, email, age, gender, region, district, activity, attendance_days)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            ticketCode,
            data.name,
            data.phone,
            data.email ? data.email.toLowerCase() : null,
            data.age,
            data.gender,
            data.region,
            data.district,
            data.activity,
            data.attendanceDays
          ]
        );
        return rows[0];
      } catch (error) {
        if (error.code === "23505" && error.constraint === "idx_attendees_email_unique") {
          throw conflictError("Email hii tayari imesajiliwa.");
        }
        if (error.code === "23505" && error.constraint === "idx_attendees_phone_unique") {
          throw conflictError("Namba hii ya simu tayari imesajiliwa.");
        }
        if (error.code !== "23505" || attempt === 7) throw error;
      }
    }
  });
}

function conflictError(message) {
  const error = new Error(message);
  error.status = 409;
  error.error = "duplicate_attendee";
  error.publicMessage = message;
  return error;
}

function publicAttendee(row) {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    name: row.name,
    email: row.email,
    attendanceDays: row.attendance_days,
    createdAt: row.created_at
  };
}

