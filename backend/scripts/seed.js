import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";

const booths = [
  "Wizara ya Vijana",
  "TISEZA",
  "NSSF",
  "NHIF",
  "TBS",
  "TCRA",
  "NHC",
  "BODI YA MIKOPO",
  "HESLB",
  "HALMASHAURI",
  "IMMIGRATION",
  "Traffic Police",
  "RITA",
  "BRELA",
  "TRA",
  "TIRA",
  "UTT AMIS",
  "PPRA",
  "NIDA",
  "Training Centre",
  "DSE",
  "FOOD DESK"
];

const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const name of booths) {
    await client.query(
      "INSERT INTO booths (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [name]
    );
  }

  const name = process.env.SEED_ADMIN_NAME || "System Admin";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  await client.query(
    `INSERT INTO users (name, email, password_hash, role, roles)
     VALUES ($1, $2, $3, 'admin', ARRAY['admin']::TEXT[])
     ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'admin', roles = ARRAY['admin']::TEXT[], is_active = true`,
    [name, email.toLowerCase(), passwordHash]
  );

  await client.query("COMMIT");
  console.log(`Seed complete. Admin: ${email}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
