import pg from "pg";
import { config } from "./config.js";

// Keep PostgreSQL DATE values as calendar-date strings. Converting them to
// JavaScript Date objects can shift an event day when the server timezone is
// ahead of UTC.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({
  connectionString: config.databaseUrl
});

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

