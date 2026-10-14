import assert from "node:assert/strict";
import test from "node:test";

import { csvCell } from "../src/routes/admin.js";

test("csvCell escapes quotes and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('=HYPERLINK("https://example.test")'), '"\'=HYPERLINK(""https://example.test"")"');
  assert.equal(csvCell("+SUM(1,2)"), '"\'+SUM(1,2)"');
  assert.equal(csvCell("-10"), '"\'-10"');
  assert.equal(csvCell("@cmd"), '"\'@cmd"');
  assert.equal(csvCell("\t=cmd"), '"\'\t=cmd"');
  assert.equal(csvCell("normal value"), '"normal value"');
});
