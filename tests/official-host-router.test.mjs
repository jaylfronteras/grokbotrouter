import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("official-host patcher is reversible and fail-closed", async () => {
  const src=await readFile(new URL("../scripts/patch-official-host.mjs",import.meta.url),"utf8");
  assert.match(src,/createCursorInferencePromptSession/);
  assert.match(src,/external-router\.bak/);
  assert.match(src,/node:child_process/);
  assert.match(src,/SAND_INFERENCE_PROXY_URL/);
  assert.doesNotMatch(src,/createCursorSandInference\(/);
  assert.doesNotMatch(src,/fallback.*cursor/i);
});
test("official-host router documentation requires residual inference audit", async () => {
  const src=await readFile(new URL("../docs/OFFICIAL-HOST-ROUTER.md",import.meta.url),"utf8");
  assert.match(src,/summarization inference requests/);
  assert.match(src,/residual requests to Cursor\/Grok endpoints/);
  assert.match(src,/fail-closed/);
});
