import pool from "../db/pool.js";
import { nanoid } from "nanoid";

interface RecurringCharge {
  merchant_name: string;
  amount: number;
  occurrences: number;
  avg_interval_days: number;
  dates: string[];
  account_id: string;
}

/**
 * Detect recurring charges by grouping transactions with the same merchant
 * and similar amount (within 5%), then checking if they occur at regular intervals.
 */
export async function detectSubscriptions(): Promise<RecurringCharge[]> {
  const { rows: transactions } = await pool.query(`
    SELECT merchant_name, amount, date, account_id
    FROM transactions
    WHERE merchant_name IS NOT NULL
      AND amount > 0
      AND pending = false
    ORDER BY merchant_name, date
  `);

  // Group by merchant
  const byMerchant = new Map<string, typeof transactions>();
  for (const txn of transactions) {
    const key = txn.merchant_name.toLowerCase().trim();
    if (!byMerchant.has(key)) byMerchant.set(key, []);
    byMerchant.get(key)!.push(txn);
  }

  const recurring: RecurringCharge[] = [];

  for (const [, txns] of byMerchant) {
    if (txns.length < 2) continue;

    // Group by similar amount (within 5%)
    const amountGroups: (typeof txns)[] = [];
    for (const txn of txns) {
      let placed = false;
      for (const group of amountGroups) {
        const ref = group[0].amount;
        if (Math.abs(txn.amount - ref) / ref < 0.05) {
          group.push(txn);
          placed = true;
          break;
        }
      }
      if (!placed) amountGroups.push([txn]);
    }

    for (const group of amountGroups) {
      if (group.length < 2) continue;

      // Sort by date and compute intervals
      group.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const intervals: number[] = [];
      for (let i = 1; i < group.length; i++) {
        const diff =
          (new Date(group[i].date).getTime() -
            new Date(group[i - 1].date).getTime()) /
          (1000 * 60 * 60 * 24);
        intervals.push(diff);
      }

      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;

      // Consider it recurring if avg interval is roughly weekly (5-9), biweekly (12-18),
      // monthly (25-35), or quarterly (80-100)
      const isRecurring =
        (avgInterval >= 5 && avgInterval <= 9) ||
        (avgInterval >= 12 && avgInterval <= 18) ||
        (avgInterval >= 25 && avgInterval <= 35) ||
        (avgInterval >= 80 && avgInterval <= 100);

      if (isRecurring) {
        const avgAmount =
          group.reduce((s, t) => s + Number(t.amount), 0) / group.length;

        recurring.push({
          merchant_name: group[0].merchant_name,
          amount: Math.round(avgAmount * 100) / 100,
          occurrences: group.length,
          avg_interval_days: Math.round(avgInterval),
          dates: group.map((t) => t.date),
          account_id: group[0].account_id,
        });
      }
    }
  }

  return recurring;
}

/**
 * Create proposals for detected subscriptions.
 * Flags all recurring charges — the user decides which to cancel.
 */
export async function createSubscriptionProposals() {
  const subscriptions = await detectSubscriptions();
  const proposals: { id: string; title: string }[] = [];

  for (const sub of subscriptions) {
    // Check if we already have a pending proposal for this merchant
    const { rows: existing } = await pool.query(
      `SELECT id FROM proposals
       WHERE type = 'subscription_cancellation'
         AND status = 'pending'
         AND details->>'merchant_name' = $1`,
      [sub.merchant_name]
    );
    if (existing.length > 0) continue;

    const monthlyCost =
      sub.avg_interval_days <= 9
        ? sub.amount * 4
        : sub.avg_interval_days <= 18
          ? sub.amount * 2
          : sub.amount;

    const intervalLabel =
      sub.avg_interval_days <= 9
        ? "weekly"
        : sub.avg_interval_days <= 18
          ? "biweekly"
          : sub.avg_interval_days <= 35
            ? "monthly"
            : "quarterly";

    const id = nanoid();
    const title = `Cancel ${sub.merchant_name} subscription`;
    const explanation =
      `Detected ${sub.occurrences} ${intervalLabel} charges of $${sub.amount.toFixed(2)} ` +
      `to ${sub.merchant_name}. ` +
      `Cancelling would save approximately $${monthlyCost.toFixed(2)}/month.`;

    await pool.query(
      `INSERT INTO proposals (id, type, status, title, explanation, details, estimated_savings)
       VALUES ($1, 'subscription_cancellation', 'pending', $2, $3, $4, $5)`,
      [
        id,
        title,
        explanation,
        JSON.stringify({
          merchant_name: sub.merchant_name,
          charge_amount: sub.amount,
          interval: intervalLabel,
          interval_days: sub.avg_interval_days,
          occurrences: sub.occurrences,
          dates: sub.dates,
          account_id: sub.account_id,
        }),
        monthlyCost,
      ]
    );

    // Write audit log entry
    await pool.query(
      `INSERT INTO audit_log (id, proposal_id, action, actor, after_state)
       VALUES ($1, $2, 'proposal_created', 'agent', $3)`,
      [
        nanoid(),
        id,
        JSON.stringify({ type: "subscription_cancellation", title }),
      ]
    );

    proposals.push({ id, title });
  }

  return proposals;
}
