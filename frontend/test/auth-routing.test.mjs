import test from "node:test";
import assert from "node:assert/strict";
import { getStaffHome } from "../lib/authRouting.mjs";

test("routes admins to the admin dashboard", () => {
  assert.equal(getStaffHome({ roles: ["admin"] }), "/admin/dashboard");
});

test("routes every scanner role to the scanner", () => {
  for (const role of ["exhibitor", "food", "checkin"]) {
    assert.equal(getStaffHome({ roles: [role] }), "/exhibitor/scan");
  }
});

test("supports legacy users with only a role field", () => {
  assert.equal(getStaffHome({ role: "food" }), "/exhibitor/scan");
});

test("admin wins when a user has multiple roles", () => {
  assert.equal(getStaffHome({ roles: ["food", "admin"] }), "/admin/dashboard");
});

test("unknown staff roles fall back to the profile instead of looping on login", () => {
  assert.equal(getStaffHome({ roles: ["unknown"] }), "/profile");
});
