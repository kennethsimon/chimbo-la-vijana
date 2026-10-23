import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../migrations");
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
const legacyBaseline = "012_attendance_checkins.sql";

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const appliedResult = await pool.query("SELECT filename FROM schema_migrations");
const applied = new Set(appliedResult.rows.map((row) => row.filename));

if (applied.size === 0) {
  const legacyResult = await pool.query("SELECT to_regclass('public.users') AS users_table");
  if (legacyResult.rows[0].users_table) {
    const baselineFiles = files.filter((file) => file <= legacyBaseline);
    for (const file of baselineFiles) {
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING", [file]);
      applied.add(file);
    }
    console.log(`Recorded legacy migration baseline through ${legacyBaseline}`);
  }
}

for (const file of files) {
  if (applied.has(file)) {
    console.log(`Skipped ${file} (already applied)`);
    continue;
  }
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  console.log(`Applied ${file}`);
}
await pool.end();
console.log("Database migration complete.");
