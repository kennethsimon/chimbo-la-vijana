import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { authRouter } from "./routes/authRoutes.js";
import { publicRouter } from "./routes/public.js";
import { exhibitorRouter } from "./routes/exhibitor.js";
import { adminRouter } from "./routes/admin.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/public", publicRouter);
app.use("/api/auth", authRouter);
app.use("/api/exhibitor", exhibitorRouter);
app.use("/api/admin", adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", message: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (error.status) {
    return res.status(error.status).json({ error: error.error || "request_error", message: error.publicMessage || error.message });
  }
  if (error.code === "23505") {
    return res.status(409).json({ error: "conflict", message: "A record with those details already exists" });
  }
  res.status(500).json({ error: "server_error", message: "Something went wrong" });
});

app.listen(config.port, () => {
  console.log(`Chimbo API running on http://localhost:${config.port}`);
});

