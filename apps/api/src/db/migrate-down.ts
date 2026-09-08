import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../../migrations");

async function migrateDown() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT name FROM _migrations ORDER BY id DESC LIMIT 1"
    );
    if (rows.length === 0) {
      console.log("No migrations to revert.");
      return;
    }

    const lastMigration = rows[0].name;
    const downFile = lastMigration.replace(".up.sql", ".down.sql");
    const sql = await readFile(join(MIGRATIONS_DIR, downFile), "utf-8");

    console.log(`Reverting ${lastMigration}...`);
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("DELETE FROM _migrations WHERE name = $1", [
      lastMigration,
    ]);
    await client.query("COMMIT");
    console.log(`  ✓ Reverted ${lastMigration}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateDown().catch((err) => {
  console.error("Migration rollback failed:", err);
  process.exit(1);
});
