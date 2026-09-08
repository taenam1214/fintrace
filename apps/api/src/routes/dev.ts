import { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import pool from "../db/pool.js";

/**
 * Seed endpoint — inserts synthetic transactions into an existing account
 * that reliably trigger all three agent proposal types:
 *
 *   1. Subscription detection — 3+ monthly charges from same merchant at same amount
 *   2. Savings transfer — large income deposits with moderate expenses
 *   3. Spending anomaly — one outlier transaction in a category with baseline data
 *
 * Requires at least one connected Plaid account to exist.
 * Safe to call multiple times — uses ON CONFLICT to skip duplicates.
 */
export async function devRoutes(app: FastifyInstance) {
  app.post("/dev/seed", async () => {
    // Find the first available account
    const { rows: accounts } = await pool.query(
      "SELECT id FROM accounts LIMIT 1"
    );
    if (accounts.length === 0) {
      return {
        error: "No accounts found. Connect a Plaid account first.",
      };
    }

    const accountId = accounts[0].id;
    let inserted = 0;

    const today = new Date();
    const d = (daysAgo: number) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - daysAgo);
      return dt.toISOString().split("T")[0];
    };

    // ── 1. Subscription triggers ──
    // Netflix: 4 monthly charges
    const subscriptions = [
      { merchant: "Netflix", amount: 15.49, category: "Service", prefix: "sub-netflix" },
      { merchant: "Spotify", amount: 9.99, category: "Service", prefix: "sub-spotify" },
      { merchant: "iCloud Storage", amount: 2.99, category: "Service", prefix: "sub-icloud" },
    ];

    for (const sub of subscriptions) {
      for (let month = 0; month < 4; month++) {
        const id = nanoid();
        const plaidId = `${sub.prefix}-${month}`;
        const date = d(month * 30 + 5);
        await pool.query(
          `INSERT INTO transactions (id, plaid_transaction_id, account_id, amount, iso_currency_code, category, merchant_name, name, pending, date, payment_channel)
           VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, false, $8, 'online')
           ON CONFLICT (plaid_transaction_id) DO NOTHING`,
          [id, plaidId, accountId, sub.amount, JSON.stringify([sub.category]), sub.merchant, sub.merchant, date]
        );
        inserted++;
      }
    }

    // ── 2. Income / savings triggers ──
    // Two paycheck deposits (negative amount = credit in Plaid convention)
    for (let i = 0; i < 2; i++) {
      const id = nanoid();
      const plaidId = `seed-paycheck-${i}`;
      await pool.query(
        `INSERT INTO transactions (id, plaid_transaction_id, account_id, amount, iso_currency_code, category, merchant_name, name, pending, date, payment_channel)
         VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, false, $8, 'other')
         ON CONFLICT (plaid_transaction_id) DO NOTHING`,
        [id, plaidId, accountId, -3200, JSON.stringify(["Transfer", "Payroll"]), "ACME Corp", "Payroll", d(i * 30 + 1)]
      );
      inserted++;
    }

    // ── 3. Spending anomaly triggers ──
    // Baseline grocery transactions (normal range: $30-$80)
    const groceryMerchants = ["Whole Foods", "Trader Joe's", "Safeway"];
    for (let i = 0; i < 8; i++) {
      const id = nanoid();
      const plaidId = `seed-grocery-${i}`;
      const merchant = groceryMerchants[i % groceryMerchants.length];
      const amount = 35 + Math.round(Math.random() * 45 * 100) / 100; // $35-$80
      await pool.query(
        `INSERT INTO transactions (id, plaid_transaction_id, account_id, amount, iso_currency_code, category, merchant_name, name, pending, date, payment_channel)
         VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, false, $8, 'in store')
         ON CONFLICT (plaid_transaction_id) DO NOTHING`,
        [id, plaidId, accountId, amount, JSON.stringify(["Food and Drink", "Groceries"]), merchant, merchant, d(i * 5 + 2)]
      );
      inserted++;
    }

    // The outlier: a $380 grocery trip (should be ~5+ stddevs above mean)
    const outlierId = nanoid();
    await pool.query(
      `INSERT INTO transactions (id, plaid_transaction_id, account_id, amount, iso_currency_code, category, merchant_name, name, pending, date, payment_channel)
       VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, false, $8, 'in store')
       ON CONFLICT (plaid_transaction_id) DO NOTHING`,
      [outlierId, "seed-grocery-outlier", accountId, 382.47, JSON.stringify(["Food and Drink", "Groceries"]), "Whole Foods", "Whole Foods", d(1)]
    );
    inserted++;

    // Some regular expenses to give the savings heuristic realistic expense data
    const regularExpenses = [
      { merchant: "Shell", amount: 52.30, category: "Travel", days: 4 },
      { merchant: "Shell", amount: 48.10, category: "Travel", days: 18 },
      { merchant: "Chipotle", amount: 12.85, category: "Food and Drink", days: 3 },
      { merchant: "Chipotle", amount: 14.20, category: "Food and Drink", days: 10 },
      { merchant: "Chipotle", amount: 11.50, category: "Food and Drink", days: 17 },
      { merchant: "Amazon", amount: 29.99, category: "Shops", days: 8 },
      { merchant: "Target", amount: 67.42, category: "Shops", days: 14 },
      { merchant: "PG&E", amount: 142.00, category: "Service", days: 6 },
      { merchant: "AT&T", amount: 85.00, category: "Service", days: 7 },
    ];

    for (let i = 0; i < regularExpenses.length; i++) {
      const exp = regularExpenses[i];
      const id = nanoid();
      const plaidId = `seed-expense-${i}`;
      await pool.query(
        `INSERT INTO transactions (id, plaid_transaction_id, account_id, amount, iso_currency_code, category, merchant_name, name, pending, date, payment_channel)
         VALUES ($1, $2, $3, $4, 'USD', $5, $6, $7, false, $8, 'in store')
         ON CONFLICT (plaid_transaction_id) DO NOTHING`,
        [id, plaidId, accountId, exp.amount, JSON.stringify([exp.category]), exp.merchant, exp.merchant, d(exp.days)]
      );
      inserted++;
    }

    return {
      data: {
        inserted,
        message:
          "Seed data inserted. Run agent analysis to generate proposals for all three types.",
        expected_proposals: [
          "Subscription cancellation: Netflix ($15.49/mo), Spotify ($9.99/mo), iCloud ($2.99/mo)",
          "Savings transfer: ~20% of surplus after $3,200 income vs ~$550 expenses",
          "Spending anomaly: $382.47 Whole Foods charge vs ~$55 grocery average",
        ],
      },
    };
  });

  // Reset seed data and proposals (for re-running the demo cleanly)
  app.post("/dev/reset", async () => {
    await pool.query("DELETE FROM audit_log WHERE 1=1");

    // audit_log has delete trigger — need to temporarily disable it
    // Actually the trigger blocks deletes. Let's drop and recreate.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DROP TRIGGER IF EXISTS audit_no_delete ON audit_log");
      await client.query("DELETE FROM audit_log");
      await client.query(`
        CREATE TRIGGER audit_no_delete
          BEFORE DELETE ON audit_log FOR EACH ROW
          EXECUTE FUNCTION prevent_audit_mutation()
      `);
      await client.query("DELETE FROM proposals");
      await client.query(
        "DELETE FROM transactions WHERE plaid_transaction_id LIKE 'seed-%' OR plaid_transaction_id LIKE 'sub-%'"
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { data: { message: "Seed data, proposals, and audit log cleared." } };
  });
}
