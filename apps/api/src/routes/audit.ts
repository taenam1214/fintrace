import { FastifyInstance } from "fastify";
import pool from "../db/pool.js";

export async function auditRoutes(app: FastifyInstance) {
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

  // Export audit log as JSON
  app.get<{ Querystring: { action?: string } }>(
    "/audit/export/json",
    async (req, reply) => {
      const { action } = req.query;
      const { rows } = action
        ? await pool.query(
            "SELECT * FROM audit_log WHERE action = $1 ORDER BY created_at DESC",
            [action]
          )
        : await pool.query(
            "SELECT * FROM audit_log ORDER BY created_at DESC"
          );

      reply
        .header("Content-Type", "application/json")
        .header(
          "Content-Disposition",
          `attachment; filename="fintrace-audit-${Date.now()}.json"`
        );
      return rows;
    }
  );

  // Export audit log as CSV
  app.get<{ Querystring: { action?: string } }>(
    "/audit/export/csv",
    async (req, reply) => {
      const { action } = req.query;
      const { rows } = action
        ? await pool.query(
            "SELECT * FROM audit_log WHERE action = $1 ORDER BY created_at DESC",
            [action]
          )
        : await pool.query(
            "SELECT * FROM audit_log ORDER BY created_at DESC"
          );

      const header =
        "id,proposal_id,action,actor,before_state,after_state,metadata,created_at";
      const csvRows = rows.map((r: any) =>
        [
          r.id,
          r.proposal_id || "",
          r.action,
          r.actor,
          JSON.stringify(r.before_state || "").replace(/"/g, '""'),
          JSON.stringify(r.after_state || "").replace(/"/g, '""'),
          JSON.stringify(r.metadata || "").replace(/"/g, '""'),
          r.created_at,
        ]
          .map((v) => `"${v}"`)
          .join(",")
      );

      const csv = [header, ...csvRows].join("\n");

      reply
        .header("Content-Type", "text/csv")
        .header(
          "Content-Disposition",
          `attachment; filename="fintrace-audit-${Date.now()}.csv"`
        );
      return csv;
    }
  );
}
