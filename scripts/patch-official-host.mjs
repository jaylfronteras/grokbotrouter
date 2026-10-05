#!/usr/bin/env node
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const MARKER = "GROK_BOT_EXTERNAL_INFERENCE_ROUTER_V1";
const target = process.argv[2] || process.env.SAND_HOST_MAIN;
const proxyUrl = process.env.SAND_INFERENCE_PROXY_URL || "http://127.0.0.1:8788";

if (!target) throw new Error("Pass the path to host-main.cjs or set SAND_HOST_MAIN.");
const absolute = path.resolve(target);
const backup = absolute + ".external-router.bak";
const original = await readFile(absolute, "utf8");

if (original.includes(MARKER)) {
  console.log("Host is already patched for the external inference router.");
  process.exit(0);
}

const signature = /function\s+createCursorInferencePromptSession\s*\(([^)]*)\)\s*\{/;
const match = signature.exec(original);
if (!match || match.index == null) throw new Error("Refusing to patch: expected createCursorInferencePromptSession hook was not found.");

function matchingBrace(source, open) {
  let depth = 1, quote = null, line = false, block = false;
  for (let i = open + 1; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (line) { if (c === "\n") line = false; continue; }
    if (block) { if (c === "*" && n === "/") { block = false; i++; } continue; }
    if (quote) { if (c === "\\") { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === "/" && n === "/") { line = true; i++; continue; }
    if (c === "/" && n === "*") { block = true; i++; continue; }
    if (c === "\"" || c === "'" || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    if (c === "}" && --depth === 0) return i;
  }
  return -1;
}

const open = match.index + match[0].length - 1;
const close = matchingBrace(original, open);
if (close < 0) throw new Error("Refusing to patch: inference hook body could not be parsed.");
const params = match[1];
const replacement = `function createCursorInferencePromptSession(${params}) {
  /* ${MARKER} */
  const proxyUrl = process.env.SAND_INFERENCE_PROXY_URL || ${JSON.stringify(proxyUrl)};
  if (!proxyUrl) throw new Error("External inference router URL is not configured");
  const transport = createConnectTransport({
    baseUrl: proxyUrl,
    httpVersion: "1.1",
    useBinaryFormat: false
  });
  const client = createClient(InferenceService, transport);
  return createProtoSessionProvider(
    client,
    options2.requestedModel,
    void 0,
    options2.inferenceReason
  ).getSession(imageResizingMiddleware);
}`;

const patched = original.slice(0, match.index) + replacement + original.slice(close + 1);
await copyFile(absolute, backup);
await writeFile(absolute, patched, "utf8");

const check = spawnSync(process.execPath, ["--check", absolute], { encoding: "utf8" });
if (check.status !== 0) {
  await copyFile(backup, absolute);
  throw new Error("Patched host failed syntax validation and was restored.\n" + (check.stderr || ""));
}
console.log("Patched Grok Bot inference transport.");
console.log("Backup:", backup);
console.log("Router:", proxyUrl);
