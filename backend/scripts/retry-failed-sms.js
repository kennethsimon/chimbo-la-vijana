import { retryFailedRegistrationSms } from "../src/sms-retries.js";
import { pool } from "../src/db.js";

try {
  const result = await retryFailedRegistrationSms({ limit: 1000 });
  console.log(JSON.stringify({
    attempted: result.attempted,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped
  }, null, 2));
  process.exitCode = result.failed || result.skipped ? 1 : 0;
} finally {
  await pool.end();
}
