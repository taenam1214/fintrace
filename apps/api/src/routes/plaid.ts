import { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import pool from "../db/pool.js";
import {
  createLinkToken,
  exchangePublicToken,
  getAccounts,
  syncTransactions,
} from "../services/plaid.js";

export async function plaidRoutes(app: FastifyInstance) {
  // Create a Plaid Link token for the frontend
  app.post("/plaid/link-token", async () => {
    const linkToken = await createLinkToken();
    return { data: { link_token: linkToken } };
  });

  // Exchange a public token after Link completes
  app.post<{ Body: { public_token: string } }>(
    "/plaid/exchange",
    async (req) => {
      const { public_token } = req.body;
      const { accessToken, itemId } = await exchangePublicToken(public_token);

      const plaidItemId = nanoid();

      // Store the item
      await pool.query(
        `INSERT INTO plaid_items (id, access_token, item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (item_id) DO NOTHING`,
        [plaidItemId, accessToken, itemId]
      );

      // Fetch and store accounts
      const accounts = await getAccounts(accessToken);
      for (const acct of accounts) {
        const accountId = nanoid();
        await pool.query(
          `INSERT INTO accounts (id, plaid_account_id, plaid_item_id, name, official_name, type, subtype, mask, current_balance, available_balance, iso_currency_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (plaid_account_id) DO UPDATE SET
           current_balance = EXCLUDED.current_balance,
           available_balance = EXCLUDED.available_balance,
           updated_at = NOW()`,
          [
            accountId,
            acct.account_id,
            plaidItemId,
            acct.name,
            acct.official_name,
            acct.type,
            acct.subtype,
            acct.mask,
            acct.balances.current,
            acct.balances.available,
            acct.balances.iso_currency_code,
          ]
        );
      }

      // Initial transaction sync
      await syncAndStoreTransactions(plaidItemId, accessToken);

      return { data: { item_id: itemId, accounts_synced: accounts.length } };
    }
  );

  // Manually trigger a transaction sync
  app.post("/plaid/sync", async () => {
    const { rows: items } = await pool.query("SELECT * FROM plaid_items");
    let totalSynced = 0;

    for (const item of items) {
      totalSynced += await syncAndStoreTransactions(
        item.id,
        item.access_token,
        item.cursor
      );
    }

    return { data: { transactions_synced: totalSynced } };
  });
}

async function syncAndStoreTransactions(
  plaidItemId: string,
  accessToken: string,
  cursor?: string | null
): Promise<number> {
  let currentCursor = cursor || null;
  let totalAdded = 0;

  // Paginate through all available transactions
  let hasMore = true;
  while (hasMore) {
    const result = await syncTransactions(accessToken, currentCursor);

    for (const txn of result.added) {
      // Resolve our internal account ID from the plaid account ID
      const { rows } = await pool.query(
        "SELECT id FROM accounts WHERE plaid_account_id = $1",
        [txn.account_id]
      );
      if (rows.length === 0) continue;

      const txnId = nanoid();
      await pool.query(
        `INSERT INTO transactions (id, plaid_transaction_id, account_id, amount, iso_currency_code, category, merchant_name, name, pending, date, authorized_date, payment_channel)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (plaid_transaction_id) DO UPDATE SET
         amount = EXCLUDED.amount,
         pending = EXCLUDED.pending,
         name = EXCLUDED.name`,
        [
          txnId,
          txn.transaction_id,
          rows[0].id,
          txn.amount,
          txn.iso_currency_code,
          JSON.stringify(txn.category || []),
          txn.merchant_name,
          txn.name,
          txn.pending,
          txn.date,
          txn.authorized_date,
          txn.payment_channel,
        ]
      );
      totalAdded++;
    }

    // Handle removed transactions
    for (const removed of result.removed) {
      if (removed.transaction_id) {
        await pool.query(
          "DELETE FROM transactions WHERE plaid_transaction_id = $1",
          [removed.transaction_id]
        );
      }
    }

    currentCursor = result.nextCursor;
    hasMore = result.hasMore;
  }

  // Persist the cursor for next sync
  await pool.query("UPDATE plaid_items SET cursor = $1 WHERE id = $2", [
    currentCursor,
    plaidItemId,
  ]);

  return totalAdded;
}
