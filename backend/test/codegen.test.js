import test from "node:test";
import assert from "node:assert/strict";
import { generateTicketCode } from "../src/codegen.js";

test("generateTicketCode creates readable CLV ticket codes", () => {
  const code = generateTicketCode();
  assert.match(code, /^CLV-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
});

