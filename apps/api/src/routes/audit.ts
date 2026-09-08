import { FastifyInstance } from "fastify";
import pool from "../db/pool.js";

export async function auditRoutes(app: FastifyInstance) {
  // Query audit log, optionally filtered by action type
  app.get<{ Querystring: { action?: string; limit?: string } }>(
    "/audit",
    async (req) => {
      const { action, limit } = req.query;
      const maxRows = Math.min(Number(limit) || 100, 500);

      if (action) {
        const { rows } = await pool.query(
          "SELECT * FROM audit_log WHERE action = $1 ORDER BY created_at DESC LIMIT $2",
          [action, maxRows]
        );
        return { data: rows };
      }

      const { rows } = await pool.query(
        "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1",
        [maxRows]
      );
      return { data: rows };
    }
  );
}
