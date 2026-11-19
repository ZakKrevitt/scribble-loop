// node .uidraw/merge.mjs <out.json> <part1.json> [part2.json ...]
// Each part is the raw object serialize.js returned ({capturedAt, hash, bytes, snapshot}). Verifies every part's
// FNV-1a hash and byte count before merging, so a part that was copied wrong is rejected instead of turning into a fake diff.
import fs from 'node:fs';
const [out, ...parts] = process.argv.slice(2);
if (!out || !parts.length) { console.error('usage: merge.mjs out.json part.json [...]'); process.exit(2); }
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
const merged = { capturedAt: null, frames: [], variables: [] };
let bad = 0;
for (const f of parts) {
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  const s = JSON.stringify(p.snapshot);
  const h = fnv(s);
  if (h !== p.hash || s.length !== p.bytes) { console.error(`${f}: hash ${h}/${s.length} != ${p.hash}/${p.bytes}`); bad++; continue; }
  merged.capturedAt = merged.capturedAt && merged.capturedAt > p.capturedAt ? merged.capturedAt : p.capturedAt;
  merged.frames.push(...p.snapshot.frames);
  if (p.snapshot.variables) merged.variables = p.snapshot.variables;
}
if (bad) { console.error(`${bad} part(s) failed verification; nothing written`); process.exit(1); }
const ids = merged.frames.map(f => f.id);
if (new Set(ids).size !== ids.length) { console.error('duplicate frame ids across parts'); process.exit(1); }
fs.writeFileSync(out, JSON.stringify(merged, null, 1) + '\n');
console.log(`wrote ${out}: ${merged.frames.length} frames, ${merged.variables.length} variables`);
