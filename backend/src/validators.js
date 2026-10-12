import { z } from "zod";

export const EVENT_DAYS = ["2026-10-24", "2026-10-25"];
const eventDaySchema = z.enum(EVENT_DAYS);

const tanzaniaPhoneSchema = z.string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .refine((value) => /^(\+255|255|0)(6|7)\d{8}$/.test(value), {
    message: "Enter a valid Tanzanian phone number, for example 0687615616, 255687615616, or +255687615616"
  })
  .transform((value) => {
    if (value.startsWith("+255")) return value;
    if (value.startsWith("255")) return `+${value}`;
    return `+255${value.slice(1)}`;
  });

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: tanzaniaPhoneSchema,
  email: z.string().trim().email().max(160),
  age: z.coerce.number().int().min(1).max(119),
  gender: z.string().trim().min(1).max(40),
  region: z.string().trim().min(1).max(120),
  district: z.string().trim().min(1).max(120),
  activity: z.string().trim().min(1).max(160),
  attendanceDays: z.array(eventDaySchema).min(1).max(2).default(EVENT_DAYS)
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(200),
  newPassword: z.string().min(8).max(200)
});

export const lookupSchema = z.object({
  ticketCode: z.string().trim().min(4).max(80),
  boothId: z.string().uuid().optional().nullable(),
  scanDay: eventDaySchema.optional()
});

export const visitSchema = z.object({
  ticketCode: z.string().trim().min(4).max(80),
  boothId: z.string().uuid().optional().nullable(),
  scanDay: eventDaySchema,
  service: z.string().trim().max(160).optional().nullable(),
  satisfaction: z.coerce.number().int().min(1).max(3).optional().nullable(),
  question: z.string().trim().max(1000).optional().nullable(),
  surveyAnswers: z.array(z.object({
    id: z.string().trim().min(1).max(80),
    question: z.string().trim().min(1).max(240),
    answer: z.string().trim().max(800)
  })).max(12).optional().default([])
});

export const foodSchema = z.object({
  ticketCode: z.string().trim().min(4).max(80),
  scanDay: eventDaySchema
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(200).optional(),
  role: z.enum(["admin", "exhibitor", "food"]).optional(),
  roles: z.array(z.enum(["admin", "exhibitor", "food"])).min(1).max(3).optional(),
  boothId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional()
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  password: z.string().min(8).max(200).optional(),
  role: z.enum(["admin", "exhibitor", "food"]).optional(),
  roles: z.array(z.enum(["admin", "exhibitor", "food"])).min(1).max(3).optional(),
  boothId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional()
});

export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "validation_error",
        message: "Invalid request data",
        details: result.error.flatten()
      });
    }
    req.validated = result.data;
    next();
  };
}

