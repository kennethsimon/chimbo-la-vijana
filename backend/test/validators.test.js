import test from "node:test";
import assert from "node:assert/strict";
import { registrationSchema, visitSchema } from "../src/validators.js";

test("registrationSchema accepts complete attendee registration data", () => {
  const result = registrationSchema.safeParse({
    name: "Asha Juma",
    phone: "0712345678",
    email: "asha@example.com",
    age: 23,
    gender: "Mwanamke",
    region: "Dar es Salaam",
    district: "Kinondoni",
    activity: "Mwanafunzi"
  });
  assert.equal(result.success, true);
});

test("registrationSchema rejects invalid email", () => {
  const result = registrationSchema.safeParse({
    name: "Asha Juma",
    phone: "0712345678",
    email: "not-an-email",
    age: 23,
    gender: "Mwanamke",
    region: "Dar es Salaam",
    district: "Kinondoni",
    activity: "Mwanafunzi"
  });
  assert.equal(result.success, false);
});

test("registrationSchema accepts a registration without email", () => {
  const result = registrationSchema.safeParse({
    name: "Asha Juma",
    phone: "0712345678",
    age: 23,
    gender: "Mwanamke",
    region: "Dar es Salaam",
    district: "Kinondoni",
    activity: "Mwanafunzi"
  });
  assert.equal(result.success, true);
  assert.equal(result.data.email, null);
});

test("registrationSchema treats a blank email as not provided", () => {
  const result = registrationSchema.safeParse({
    name: "Asha Juma",
    phone: "0712345678",
    email: "   ",
    age: 23,
    gender: "Mwanamke",
    region: "Dar es Salaam",
    district: "Kinondoni",
    activity: "Mwanafunzi"
  });
  assert.equal(result.success, true);
  assert.equal(result.data.email, null);
});

test("visitSchema enforces satisfaction range", () => {
  const result = visitSchema.safeParse({
    ticketCode: "CLV-ABC234",
    service: "Taarifa/Elimu",
    satisfaction: 5
  });
  assert.equal(result.success, false);
});

test("visitSchema requires the core fields for a completed booth survey", () => {
  const result = visitSchema.safeParse({
    ticketCode: "CLV-ABC234",
    scanDay: "2026-10-24",
    surveyStatus: "completed",
    purpose: "service"
  });
  assert.equal(result.success, false);
  assert.ok(result.error.flatten().fieldErrors.service);
  assert.ok(result.error.flatten().fieldErrors.satisfaction);
});

test("visitSchema accepts a skipped booth survey without answers", () => {
  const result = visitSchema.safeParse({
    ticketCode: "CLV-ABC234",
    scanDay: "2026-10-24",
    surveyStatus: "skipped"
  });
  assert.equal(result.success, true);
});

test("visitSchema accepts a complete structured booth survey", () => {
  const result = visitSchema.safeParse({
    ticketCode: "CLV-ABC234",
    scanDay: "2026-10-24",
    surveyStatus: "completed",
    purpose: "question",
    service: "Usajili wa TIN",
    satisfaction: 3,
    question: "Ninawezaje kupata TIN?",
    newInfo: "Usajili unaweza kufanyika mtandaoni"
  });
  assert.equal(result.success, true);
});

