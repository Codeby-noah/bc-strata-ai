import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/lib/strata/membership-status.ts", import.meta.url),
  "utf8",
);

test("handles missing workspace tables without crashing the signed-in page", () => {
  assert.match(source, /error\.code === "PGRST205"/);
  assert.match(source, /error\.code === "42P01"/);
  assert.match(source, /"schema_not_ready"/);
});

test("keeps other membership lookup failures distinct from missing setup", () => {
  assert.match(source, /"temporarily_unavailable"/);
  assert.match(source, /return "temporarily_unavailable"/);
});
