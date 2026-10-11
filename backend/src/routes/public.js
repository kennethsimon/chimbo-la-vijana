import { Router } from "express";
import rateLimit from "express-rate-limit";
import { generateTicketCode } from "../codegen.js";
import { pool, withTransaction } from "../db.js";
import { sendTicketEmail } from "../email.js";
import { registrationSchema, validate } from "../validators.js";

export const publicRouter = Router();

publicRouter.post(
  "/registrations",
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }),
  validate(registrationSchema),
  async (req, res, next) => {
    try {
      const attendee = await createAttendee(req.validated);
      const emailResult = await sendTicketEmail({ attendee, ticketCode: attendee.ticket_code });

      await pool.query(
        `INSERT INTO email_logs (attendee_id, to_email, template, resend_message_id, status, error)
         VALUES ($1, $2, 'registration_ticket', $3, $4, $5)`,
        [attendee.id, attendee.email, emailResult.resendMessageId, emailResult.status, emailResult.error]
      );

      res.status(201).json({
        ok: true,
        attendee: publicAttendee(attendee),
        email: { status: emailResult.status }
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
          `INSERT INTO attendees (ticket_code, name, phone, email, age, gender, region, district, activity)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            ticketCode,
            data.name,
            data.phone,
            data.email.toLowerCase(),
            data.age,
            data.gender,
            data.region,
            data.district,
            data.activity
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
    createdAt: row.created_at
  };
}

