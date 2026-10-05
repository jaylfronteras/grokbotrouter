#!/usr/bin/env node
import { copyFile, access } from "node:fs/promises";
import path from "node:path";
const target=process.argv[2]||process.env.SAND_HOST_MAIN;
if(!target) throw new Error("Pass the path to host-main.cjs or set SAND_HOST_MAIN.");
const absolute=path.resolve(target), backup=absolute+".external-router.bak";
await access(backup);
await copyFile(backup,absolute);
console.log("Restored original Grok Bot host:",absolute);
