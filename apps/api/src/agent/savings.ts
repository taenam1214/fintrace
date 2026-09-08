import pool from "../db/pool.js";
import { nanoid } from "nanoid";

/**
 * Detect income deposits (negative amounts in Plaid = money coming in)
 * and propose a savings transfer based on surplus after average recurring expenses.
 *
 * Plaid convention: negative amount = credit/income, positive = debit/expense.
 */
export async function createSavingsProposals() {
  // Find recent income deposits (last 60 days, amount < -500 suggests paycheck)
  const { rows: incomeTransactions } = await pool.query(`
    SELECT t.*, a.name as account_name
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE t.amount < -500
      AND t.pending = false
      AND t.date >= CURRENT_DATE - INTERVAL '60 days'
    ORDER BY t.date DESC
  `);

  if (incomeTransactions.length === 0) return [];

  // Calculate average monthly income
  const totalIncome = incomeTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount)),
    0
  );
  const monthsSpan = Math.max(1, incomeTransactions.length > 1 ? 2 : 1);
  const avgMonthlyIncome = totalIncome / monthsSpan;

  // Calculate average monthly expenses (positive amounts, recurring-ish)
  const { rows: expenseRows } = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as count
    FROM transactions
    WHERE amount > 0
      AND pending = false
      AND date >= CURRENT_DATE - INTERVAL '60 days'
  `);

  const totalExpenses = Number(expenseRows[0].total_expenses);
  const avgMonthlyExpenses = totalExpenses / monthsSpan;

  const surplus = avgMonthlyIncome - avgMonthlyExpenses;

  if (surplus <= 0) return [];

  // Propose saving 20% of surplus
  const savingsRate = 0.2;
  const proposedAmount = Math.round(surplus * savingsRate * 100) / 100;

  if (proposedAmount < 10) return [];

  // Check if there's already a pending savings proposal
  const { rows: existing } = await pool.query(
    `SELECT id FROM proposals
     WHERE type = 'savings_transfer'
       AND status = 'pending'`
  );
  if (existing.length > 0) return [];

  const latestIncome = incomeTransactions[0];
  const id = nanoid();
  const title = `Transfer $${proposedAmount.toFixed(2)} to savings`;
  const explanation =
    `Based on your recent income of ~$${avgMonthlyIncome.toFixed(2)}/month ` +
    `and recurring expenses of ~$${avgMonthlyExpenses.toFixed(2)}/month, ` +
    `you have an estimated surplus of $${surplus.toFixed(2)}. ` +
    `Transferring 20% ($${proposedAmount.toFixed(2)}) to savings ` +
    `would build toward your financial goals without impacting daily spending.`;

  await pool.query(
    `INSERT INTO proposals (id, type, status, title, explanation, details, estimated_savings)
     VALUES ($1, 'savings_transfer', 'pending', $2, $3, $4, $5)`,
    [
      id,
      title,
      explanation,
      JSON.stringify({
        avg_monthly_income: avgMonthlyIncome,
        avg_monthly_expenses: avgMonthlyExpenses,
        surplus,
        savings_rate: savingsRate,
        transfer_amount: proposedAmount,
        triggered_by_transaction: latestIncome.plaid_transaction_id,
        account_id: latestIncome.account_id,
      }),
      proposedAmount,
    ]
  );

  await pool.query(
    `INSERT INTO audit_log (id, proposal_id, action, actor, after_state)
     VALUES ($1, $2, 'proposal_created', 'agent', $3)`,
    [
      nanoid(),
      id,
      JSON.stringify({ type: "savings_transfer", title, amount: proposedAmount }),
    ]
  );

  return [{ id, title }];
}
