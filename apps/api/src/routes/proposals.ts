import { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import pool from "../db/pool.js";

export async function proposalsRoutes(app: FastifyInstance) {
  // List proposals, optionally filtered by status
  app.get<{ Querystring: { status?: string } }>("/proposals", async (req) => {
    const { status } = req.query;
    if (status) {
      const { rows } = await pool.query(
        "SELECT * FROM proposals WHERE status = $1 ORDER BY created_at DESC",
        [status]
      );
      return { data: rows };
    }
    const { rows } = await pool.query(
      "SELECT * FROM proposals ORDER BY created_at DESC"
    );
    return { data: rows };
  });

  // Approve a proposal
  app.post<{ Params: { id: string } }>(
    "/proposals/:id/approve",
    async (req) => {
      const { id } = req.params;

      const { rows } = await pool.query(
        "SELECT * FROM proposals WHERE id = $1",
        [id]
      );
      if (rows.length === 0)
        throw { statusCode: 404, message: "Proposal not found" };

      const proposal = rows[0];
      if (proposal.status !== "pending")
        throw { statusCode: 400, message: "Proposal is not pending" };

      const beforeState = { status: proposal.status };

      await pool.query(
        "UPDATE proposals SET status = 'approved', updated_at = NOW() WHERE id = $1",
        [id]
      );

      await pool.query(
        `INSERT INTO audit_log (id, proposal_id, action, actor, before_state, after_state)
         VALUES ($1, $2, 'proposal_approved', 'user', $3, $4)`,
        [
          nanoid(),
          id,
          JSON.stringify(beforeState),
          JSON.stringify({ status: "approved" }),
        ]
      );

      return { data: { id, status: "approved" } };
    }
  );

  // Reject a proposal
  app.post<{ Params: { id: string } }>(
    "/proposals/:id/reject",
    async (req) => {
      const { id } = req.params;

      const { rows } = await pool.query(
        "SELECT * FROM proposals WHERE id = $1",
        [id]
      );
      if (rows.length === 0)
        throw { statusCode: 404, message: "Proposal not found" };

      const proposal = rows[0];
      if (proposal.status !== "pending")
        throw { statusCode: 400, message: "Proposal is not pending" };

      const beforeState = { status: proposal.status };

      await pool.query(
        "UPDATE proposals SET status = 'rejected', updated_at = NOW() WHERE id = $1",
        [id]
      );

      await pool.query(
        `INSERT INTO audit_log (id, proposal_id, action, actor, before_state, after_state)
         VALUES ($1, $2, 'proposal_rejected', 'user', $3, $4)`,
        [
          nanoid(),
          id,
          JSON.stringify(beforeState),
          JSON.stringify({ status: "rejected" }),
        ]
      );

      return { data: { id, status: "rejected" } };
    }
  );

  // Simulate execution of an approved proposal
  app.post<{ Params: { id: string } }>(
    "/proposals/:id/execute",
    async (req) => {
      const { id } = req.params;

      const { rows } = await pool.query(
        "SELECT * FROM proposals WHERE id = $1",
        [id]
      );
      if (rows.length === 0)
        throw { statusCode: 404, message: "Proposal not found" };

      const proposal = rows[0];
      if (proposal.status !== "approved")
        throw {
          statusCode: 400,
          message: "Proposal must be approved before execution",
        };

      const beforeState = { status: proposal.status };

      await pool.query(
        "UPDATE proposals SET status = 'executed', updated_at = NOW() WHERE id = $1",
        [id]
      );

      // Simulated execution result
      const executionResult = {
        status: "executed",
        simulated: true,
        message: `Simulated execution of: ${proposal.title}`,
        executed_at: new Date().toISOString(),
      };

      await pool.query(
        `INSERT INTO audit_log (id, proposal_id, action, actor, before_state, after_state, metadata)
         VALUES ($1, $2, 'proposal_executed', 'agent', $3, $4, $5)`,
        [
          nanoid(),
          id,
          JSON.stringify(beforeState),
          JSON.stringify({ status: "executed" }),
          JSON.stringify(executionResult),
        ]
      );

      return { data: { id, ...executionResult } };
    }
  );
}
