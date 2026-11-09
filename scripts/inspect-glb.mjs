#!/usr/bin/env node
/**
 * Prints what the mascot needs to know about a GLB: animation clips (and which act
 * each would serve), key bones, accessory nodes, size.
 *   node scripts/inspect-glb.mjs public/mascot/rajesh.glb
 */
import { readFileSync, statSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/inspect-glb.mjs <file.glb>");
  process.exit(1);
}
const buf = readFileSync(file);
if (buf.readUInt32LE(0) !== 0x46546c67) {
  console.error("not a binary glTF (.glb) file");
  process.exit(1);
}
const len = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + len).toString("utf8"));
const nodes = json.nodes ?? [];
const sanitize = (n = "") => n.replace(/\s/g, "_").replace(/[[\]./:]/g, ""); // same as three.js

const CANDIDATES = {
  idle: ["idle", "breathing"], sleep: ["sleeping", "sleep", "lying", "laying"],
  wake: ["waking", "wake", "getting up", "stand up", "get up"], greet: ["waving", "wave", "greeting", "salute"],
  jump: ["jump"], swing: ["swing", "hanging", "rope"], hang: ["hanging idle", "hanging", "hang"],
  fall: ["falling", "fall"], land: ["hard landing", "landing", "land"], crawl: ["crawl"],
  cook: ["mixing", "stirring", "cooking", "typing", "working"], proud: ["victory", "proud", "arms crossed", "standing arms", "cheer"],
  walk: ["walk"], takeoff: ["jump", "takeoff", "take off"], fly: ["flying", "fly", "superhero"],
  touchdown: ["landing", "land", "hard landing"],
};

console.log(`\n${file}  (${(statSync(file).size / 1048576).toFixed(2)} MB)`);
const clips = (json.animations ?? []).map((a) => a.name ?? "(unnamed)");
console.log(`\nAnimations (${clips.length}):`);
for (const c of clips) console.log(`  - ${c}`);
console.log("\nAct → clip it would use (from CLIP_CANDIDATES):");
for (const [act, cands] of Object.entries(CANDIDATES)) {
  let hit = null;
  for (const cand of cands) {
    hit = clips.find((c) => c.toLowerCase().includes(cand));
    if (hit) break;
  }
  console.log(`  ${act.padEnd(10)} ${hit ?? "— none (falls back; add a clip or edit CLIP_CANDIDATES / animationUrls)"}`);
}
const want = { head: [/head$/i], spine: [/spine2$/i, /spine1$/i, /chest$/i], handR: [/righthand$/i], handL: [/lefthand$/i], footR: [/rightfoot$/i], footL: [/leftfoot$/i] };
console.log("\nBones used for accessories / silk line:");
for (const [k, res] of Object.entries(want)) {
  let n = null;
  for (const re of res) {
    n = nodes.find((x) => re.test(sanitize(x.name)));
    if (n) break;
  }
  console.log(`  ${k.padEnd(6)} ${n ? n.name : "NOT FOUND — rename or adjust core/accessories.ts findRig()"}`);
}
const acc = nodes.filter((n) => /^acc_/i.test(n.name ?? "")).map((n) => n.name);
console.log(`\nAccessory nodes (acc_*): ${acc.length ? acc.join(", ") : "none — built-in proxy accessories will be used"}`);
console.log(`Meshes: ${(json.meshes ?? []).length}, skins: ${(json.skins ?? []).length}, textures: ${(json.textures ?? []).length}`);
console.log(`Extensions: ${(json.extensionsUsed ?? []).join(", ") || "none"}\n`);
