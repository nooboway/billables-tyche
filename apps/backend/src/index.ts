import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/auth.middleware";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import clientRoutes from "./routes/client.routes";
import productRoutes from "./routes/product.routes";
import expenseRoutes from "./routes/expense.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Billables API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #111; border: 1px solid #2a2a2a; border-radius: 16px; padding: 40px 48px; max-width: 480px; width: 90%; }
    h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; }
    .dot { display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; margin-right: 8px; }
    .status { color: #22c55e; font-size: 14px; margin-bottom: 32px; display: flex; align-items: center; }
    .routes { list-style: none; }
    .routes li { padding: 10px 0; border-bottom: 1px solid #2a2a2a; font-size: 14px; color: #6b7280; display: flex; gap: 12px; }
    .routes li:last-child { border-bottom: none; }
    .method { color: #0066FF; font-weight: 700; font-size: 12px; width: 48px; flex-shrink: 0; padding-top: 1px; }
    .path { color: #fff; font-family: monospace; }
    h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Billables</h1>
    <div class="status"><span class="dot"></span> API is running (Supabase)</div>
    <h2>Endpoints</h2>
    <ul class="routes">
      <li><span class="method">POST</span><span class="path">/api/v1/auth/register</span></li>
      <li><span class="method">POST</span><span class="path">/api/v1/auth/login</span></li>
      <li><span class="method">GET</span><span class="path">/api/v1/documents</span></li>
      <li><span class="method">GET</span><span class="path">/api/v1/clients</span></li>
      <li><span class="method">GET</span><span class="path">/api/v1/products</span></li>
      <li><span class="method">GET</span><span class="path">/api/v1/expenses</span></li>
      <li><span class="method">GET</span><span class="path">/api/v1/health</span></li>
    </ul>
  </div>
</body>
</html>`);
});

app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));

// Public routes
app.use("/api/v1/auth", authRoutes);

// Protected routes — require a valid Supabase access token
app.use("/api/v1/documents", requireAuth, documentRoutes);
app.use("/api/v1/clients", requireAuth, clientRoutes);
app.use("/api/v1/products", requireAuth, productRoutes);
app.use("/api/v1/expenses", requireAuth, expenseRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

export default app;

if (require.main === module) {
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => console.log(`Billables API running on port ${PORT}`));
}
