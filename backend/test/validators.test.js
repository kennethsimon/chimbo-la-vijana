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

test("visitSchema enforces satisfaction range", () => {
  const result = visitSchema.safeParse({
    ticketCode: "CLV-ABC234",
    service: "Taarifa/Elimu",
    satisfaction: 5
  });
  assert.equal(result.success, false);
});

