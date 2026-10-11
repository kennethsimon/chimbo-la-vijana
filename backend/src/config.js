import "dotenv/config";

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "development-only-change-me",
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "chimbo_session",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  corsOrigins,
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "Chimbo Events <tickets@example.com>",
  eventName: process.env.EVENT_NAME || "Chimbo La Vijana Brunch"
};

if (!config.databaseUrl) {
  console.warn("DATABASE_URL is not set. Database calls will fail until it is configured.");
}

