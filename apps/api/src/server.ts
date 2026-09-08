import Fastify from "fastify";
import cors from "@fastify/cors";
import "dotenv/config";
import { plaidRoutes } from "./routes/plaid.js";
import { accountsRoutes } from "./routes/accounts.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: "http://localhost:5173" });

app.register(plaidRoutes);
app.register(accountsRoutes);

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT) || 3001;
app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
