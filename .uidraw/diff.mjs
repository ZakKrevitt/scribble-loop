// node .uidraw/diff.mjs .uidraw/baseline.json .uidraw/current.json > .uidraw/changes.json
// Matches nodes by Figma id. Instance internals appear only as overrides (`ov`), reported with via: "override".
import fs from 'node:fs';
const [A, B] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
function index(snap) {
  const m = new Map();
  const walk = (n, parent, via) => {
    m.set(n.id, { n, parent, via });
    (n.children || []).forEach(c => walk(c, n.id));
    (n.ov || []).forEach(c => walk(c, n.id, 'override'));
  };
  snap.frames.forEach(f => walk(f, null));
  return m;
}
const a = index(A), b = index(B), out = [];
const own = ({ children, ov, id, ...rest }) => rest;
const tag = (o, via) => (via ? { ...o, via } : o);
for (const [id, { n, parent, via }] of b) {
  const old = a.get(id);
  if (!old) {
    if (!parent || a.has(parent)) out.push(tag({ op: 'added', id, parent, name: n.name, type: n.type }, via));
    continue;
  }
  if (old.parent !== parent) out.push({ op: 'moved', id, name: n.name, from: old.parent, to: parent });
  const x = own(old.n), y = own(n);
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)]))
    if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) out.push(tag({ op: 'changed', id, name: n.name, prop: k, from: x[k], to: y[k] }, via));
  const oldKids = (old.n.children || []).map(c => c.id);
  const before = oldKids.filter(i => b.has(i) && b.get(i).parent === id);
  const after = (n.children || []).map(c => c.id).filter(i => oldKids.includes(i));
  if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ op: 'reordered', id, name: n.name, from: before, to: after });
}
for (const [id, { n, parent, via }] of a)
  if (!b.has(id) && (!parent || b.has(parent))) out.push(tag({ op: 'removed', id, name: n.name, parent }, via));
const va = new Map((A.variables || []).map(v => [v.id, v])), vb = new Map((B.variables || []).map(v => [v.id, v]));
for (const [id, v] of vb) {
  const o = va.get(id);
  if (!o) out.push({ op: 'var-added', name: v.name, values: v.values });
  else if (JSON.stringify(o) !== JSON.stringify(v)) out.push({ op: 'var-changed', name: v.name, fromName: o.name, from: o.values, to: v.values });
}
for (const [id, v] of va) if (!vb.has(id)) out.push({ op: 'var-removed', name: v.name });
console.log(JSON.stringify(out, null, 2));
