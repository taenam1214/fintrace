import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../../migrations");

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query(
      "SELECT name FROM _migrations ORDER BY id"
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".up.sql"))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf-8");
      console.log(`Applying ${file}...`);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`  ✓ ${file}`);
    }

    console.log("All migrations applied.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
