import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString });
  const sql = readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf-8");

  try {
    await pool.query(sql);
    console.log("Migration complete.");
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
