import pool from "../db/pool.js";
import { nanoid } from "nanoid";

/**
 * Detect spending anomalies using a modified z-score approach.
 * For each category, compute mean and stddev of transaction amounts.
 * Flag transactions > 2 standard deviations above the mean.
 *
 * Only proposes "flag for review" — no action taken.
 */
export async function createAnomalyProposals() {
  // Get category-level stats (only categories with enough data)
  const { rows: categoryStats } = await pool.query(`
    SELECT
      category->>0 as primary_category,
      AVG(amount) as mean_amount,
      STDDEV_POP(amount) as stddev_amount,
      COUNT(*) as txn_count
    FROM transactions
    WHERE amount > 0
      AND pending = false
      AND category->>0 IS NOT NULL
    GROUP BY category->>0
    HAVING COUNT(*) >= 5 AND STDDEV_POP(amount) > 0
  `);

  if (categoryStats.length === 0) {
    // Fallback: use merchant-level stats
    return await detectByMerchant();
  }

  const proposals: { id: string; title: string }[] = [];

  for (const stat of categoryStats) {
    const mean = Number(stat.mean_amount);
    const stddev = Number(stat.stddev_amount);
    const threshold = mean + 2 * stddev;

    // Find recent outlier transactions in this category
    const { rows: outliers } = await pool.query(
      `SELECT t.*, a.name as account_name
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.amount > $1
         AND t.category->>0 = $2
         AND t.pending = false
         AND t.date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY t.amount DESC
       LIMIT 3`,
      [threshold, stat.primary_category]
    );

    for (const txn of outliers) {
      // Skip if already flagged
      const { rows: existing } = await pool.query(
        `SELECT id FROM proposals
         WHERE type = 'spending_anomaly'
           AND status = 'pending'
           AND details->>'plaid_transaction_id' = $1`,
        [txn.plaid_transaction_id]
      );
      if (existing.length > 0) continue;

      const zScore = stddev > 0 ? (Number(txn.amount) - mean) / stddev : 0;
      const id = nanoid();
      const merchant = txn.merchant_name || txn.name;
      const title = `Unusual spending: $${Number(txn.amount).toFixed(2)} at ${merchant}`;
      const explanation =
        `This transaction of $${Number(txn.amount).toFixed(2)} at ${merchant} ` +
        `is significantly higher than your typical ${stat.primary_category} spending ` +
        `(average: $${mean.toFixed(2)}, z-score: ${zScore.toFixed(1)}). ` +
        `No action is proposed — this is flagged for your review only.`;

      await pool.query(
        `INSERT INTO proposals (id, type, status, title, explanation, details, estimated_savings)
         VALUES ($1, 'spending_anomaly', 'pending', $2, $3, $4, NULL)`,
        [
          id,
          title,
          explanation,
          JSON.stringify({
            plaid_transaction_id: txn.plaid_transaction_id,
            merchant_name: merchant,
            amount: Number(txn.amount),
            category: stat.primary_category,
            category_mean: mean,
            category_stddev: stddev,
            z_score: Math.round(zScore * 10) / 10,
            date: txn.date,
            account_id: txn.account_id,
          }),
        ]
      );

      await pool.query(
        `INSERT INTO audit_log (id, proposal_id, action, actor, after_state)
         VALUES ($1, $2, 'proposal_created', 'agent', $3)`,
        [
          nanoid(),
          id,
          JSON.stringify({ type: "spending_anomaly", title }),
        ]
      );

      proposals.push({ id, title });
    }
  }

  return proposals;
}

/**
 * Fallback: detect anomalies at the merchant level when category data is sparse.
 */
async function detectByMerchant() {
  const { rows: merchantStats } = await pool.query(`
    SELECT
      LOWER(TRIM(merchant_name)) as merchant,
      merchant_name,
      AVG(amount) as mean_amount,
      STDDEV_POP(amount) as stddev_amount,
      COUNT(*) as txn_count
    FROM transactions
    WHERE amount > 0
      AND pending = false
      AND merchant_name IS NOT NULL
    GROUP BY LOWER(TRIM(merchant_name)), merchant_name
    HAVING COUNT(*) >= 3 AND STDDEV_POP(amount) > 0
  `);

  const proposals: { id: string; title: string }[] = [];

  for (const stat of merchantStats) {
    const mean = Number(stat.mean_amount);
    const stddev = Number(stat.stddev_amount);
    const threshold = mean + 2 * stddev;

    const { rows: outliers } = await pool.query(
      `SELECT t.*
       FROM transactions t
       WHERE t.amount > $1
         AND LOWER(TRIM(t.merchant_name)) = $2
         AND t.pending = false
         AND t.date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY t.amount DESC
       LIMIT 2`,
      [threshold, stat.merchant]
    );

    for (const txn of outliers) {
      const { rows: existing } = await pool.query(
        `SELECT id FROM proposals
         WHERE type = 'spending_anomaly'
           AND status = 'pending'
           AND details->>'plaid_transaction_id' = $1`,
        [txn.plaid_transaction_id]
      );
      if (existing.length > 0) continue;

      const zScore = (Number(txn.amount) - mean) / stddev;
      const id = nanoid();
      const title = `Unusual spending: $${Number(txn.amount).toFixed(2)} at ${stat.merchant_name}`;
      const explanation =
        `This charge of $${Number(txn.amount).toFixed(2)} at ${stat.merchant_name} ` +
        `is unusually high compared to your typical spending there ` +
        `(average: $${mean.toFixed(2)}, z-score: ${zScore.toFixed(1)}). ` +
        `Flagged for review — no action proposed.`;

      await pool.query(
        `INSERT INTO proposals (id, type, status, title, explanation, details, estimated_savings)
         VALUES ($1, 'spending_anomaly', 'pending', $2, $3, $4, NULL)`,
        [
          id,
          title,
          explanation,
          JSON.stringify({
            plaid_transaction_id: txn.plaid_transaction_id,
            merchant_name: stat.merchant_name,
            amount: Number(txn.amount),
            merchant_mean: mean,
            merchant_stddev: stddev,
            z_score: Math.round(zScore * 10) / 10,
            date: txn.date,
            account_id: txn.account_id,
          }),
        ]
      );

      await pool.query(
        `INSERT INTO audit_log (id, proposal_id, action, actor, after_state)
         VALUES ($1, $2, 'proposal_created', 'agent', $3)`,
        [
          nanoid(),
          id,
          JSON.stringify({ type: "spending_anomaly", title }),
        ]
      );

      proposals.push({ id, title });
    }
  }

  return proposals;
}
