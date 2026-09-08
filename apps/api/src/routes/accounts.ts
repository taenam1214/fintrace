import { FastifyInstance } from "fastify";
import pool from "../db/pool.js";

export async function accountsRoutes(app: FastifyInstance) {
  app.get("/accounts", async () => {
    const { rows } = await pool.query(
      "SELECT * FROM accounts ORDER BY created_at DESC"
    );
    return { data: rows };
  });

  app.get<{ Params: { id: string } }>(
    "/accounts/:id/transactions",
    async (req) => {
      const { rows } = await pool.query(
        "SELECT * FROM transactions WHERE account_id = $1 ORDER BY date DESC",
        [req.params.id]
      );
      return { data: rows };
    }
  );

  app.get("/transactions", async () => {
    const { rows } = await pool.query(
      "SELECT * FROM transactions ORDER BY date DESC LIMIT 500"
    );
    return { data: rows };
  });
}
