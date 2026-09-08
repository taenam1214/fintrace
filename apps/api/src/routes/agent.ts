import { FastifyInstance } from "fastify";
import { createSubscriptionProposals } from "../agent/subscriptions.js";
import { createSavingsProposals } from "../agent/savings.js";
import { createAnomalyProposals } from "../agent/anomalies.js";

export async function agentRoutes(app: FastifyInstance) {
  // Run all agent heuristics and return new proposals
  app.post("/agent/analyze", async () => {
    const subscriptions = await createSubscriptionProposals();
    const savings = await createSavingsProposals();
    const anomalies = await createAnomalyProposals();

    return {
      data: {
        proposals_created: {
          subscriptions,
          savings,
          anomalies,
        },
        total: subscriptions.length + savings.length + anomalies.length,
      },
    };
  });
}
