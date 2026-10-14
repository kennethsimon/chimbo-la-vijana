import "dotenv/config";

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || "development";
const developmentJwtSecret = "development-only-change-me";
const jwtSecret = process.env.JWT_SECRET || developmentJwtSecret;

if (nodeEnv === "production" && jwtSecret === developmentJwtSecret) {
  throw new Error("JWT_SECRET must be set to a strong unique value in production.");
}

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "chimbo_session",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  corsOrigins,
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "Chimbo Events <tickets@example.com>",
  eventName: process.env.EVENT_NAME || "Chimbo La Vijana Brunch",
  smsApiBaseUrl: process.env.SMS_API_BASE_URL || "https://messaging-service.co.tz",
  smsApiToken: process.env.SMS_API_TOKEN || "",
  smsSenderId: process.env.SMS_SENDER_ID || ""
};

if (!config.databaseUrl) {
  console.warn("DATABASE_URL is not set. Database calls will fail until it is configured.");
}

