import { pool } from "./db.js";
import { sendRegistrationSms } from "./sms.js";

const SMS_RETRY_LOCK = 2481025;

export async function recordRegistrationSmsAttempt({ client = pool, attendee, result, retryOf = null }) {
  const { rows } = await client.query(
    `INSERT INTO sms_logs (
       attendee_id, to_phone, template, provider_message_id, provider_reference,
       provider_status_name, provider_status_group, status, error, response, retry_of
     )
     VALUES ($1, $2, 'registration_ticket_sms', $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      attendee.id,
      attendee.phone,
      result.messageId,
      result.providerReference,
      result.providerStatusName,
      result.providerStatusGroup,
      result.status,
      result.error,
      result.response,
      retryOf
    ]
  );
  return rows[0];
}

export async function retryFailedRegistrationSms({ attendeeId = null, limit = 500 } = {}) {
  const client = await pool.connect();
  let locked = false;
  try {
    const lockResult = await client.query("SELECT pg_try_advisory_lock($1) AS locked", [SMS_RETRY_LOCK]);
    locked = lockResult.rows[0].locked;
    if (!locked) {
      const error = new Error("Another SMS retry is already running.");
      error.status = 409;
      error.error = "sms_retry_in_progress";
      throw error;
    }

    const params = [];
    let attendeeFilter = "";
    if (attendeeId) {
      params.push(attendeeId);
      attendeeFilter = `AND latest.attendee_id = $${params.length}`;
    }
    params.push(Math.min(Math.max(Number(limit) || 500, 1), 1000));

    const { rows: attempts } = await client.query(
      `WITH ranked AS (
         SELECT sms_logs.*,
                row_number() OVER (PARTITION BY attendee_id ORDER BY created_at DESC, id DESC) AS row_number
         FROM sms_logs
         WHERE template = 'registration_ticket_sms' AND attendee_id IS NOT NULL
       ), latest AS (
         SELECT * FROM ranked WHERE row_number = 1
       )
       SELECT attendees.id, attendees.phone, attendees.ticket_code, latest.id AS retry_of
       FROM latest
       JOIN attendees ON attendees.id = latest.attendee_id
       WHERE (
         latest.status IN ('failed', 'skipped')
         OR latest.provider_status_group = 'REJECTED'
         OR coalesce(latest.delivery_status_name, latest.delivery_status, '') IN
            ('REJECTED', 'UNDELIVERABLE', 'EXPIRED', 'DELETED')
       )
       ${attendeeFilter}
       ORDER BY latest.created_at ASC
       LIMIT $${params.length}`,
      params
    );

    const results = [];
    for (const attendee of attempts) {
      const result = await sendRegistrationSms({ attendee, ticketCode: attendee.ticket_code });
      const log = await recordRegistrationSmsAttempt({ client, attendee, result, retryOf: attendee.retry_of });
      results.push({
        attendeeId: attendee.id,
        logId: log.id,
        status: result.status,
        providerStatusName: result.providerStatusName,
        error: result.error
      });
      await delay(75);
    }

    return {
      attempted: results.length,
      sent: results.filter((result) => result.status === "sent").length,
      failed: results.filter((result) => result.status === "failed").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      results
    };
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock($1)", [SMS_RETRY_LOCK]).catch(() => {});
    client.release();
  }
}

export async function retrySmsLog(logId) {
  const { rows } = await pool.query("SELECT attendee_id FROM sms_logs WHERE id = $1", [logId]);
  if (!rows[0]?.attendee_id) {
    const error = new Error("SMS log or attendee was not found.");
    error.status = 404;
    error.error = "sms_log_not_found";
    throw error;
  }
  return retryFailedRegistrationSms({ attendeeId: rows[0].attendee_id, limit: 1 });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
