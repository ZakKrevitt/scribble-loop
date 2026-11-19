// UIDraw serializer. Run through the Figma MCP use_figma tool (figma-use rules: top-level await, `return` sends data back).
// Set FRAME_IDS before each run. Keep this file identical between push (baseline) and pull (current), or the diff is noise.
// use_figma returns at most ~48 KB: snapshot big frames in separate runs, then `node .uidraw/merge.mjs out.json part1.json part2.json`.
// Instances record only their overrides (instance.overrides) and nested swaps, not a copy of the main component's tree.
// `hash` is FNV-1a over JSON.stringify(snapshot); merge.mjs checks it, so a mis-copied part fails loudly instead of diffing as noise.
const FRAME_IDS = [/* screen frameIds + component nodeIds from manifest */];
const WITH_VARIABLES = true;
const r = v => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
const c3 = v => Math.round(v * 1000) / 1000;
const M = v => (v === figma.mixed ? 'mixed' : v);
const cache = new Map();
async function vname(id) {
  if (!cache.has(id)) { const v = await figma.variables.getVariableByIdAsync(id); cache.set(id, v ? v.name : id); }
  return cache.get(id);
}
async function sname(id) {
  if (!id || id === figma.mixed) return id === figma.mixed ? 'mixed' : null;
  if (!cache.has(id)) { const s = await figma.getStyleByIdAsync(id); cache.set(id, s ? s.name : id); }
  return cache.get(id);
}
async function paints(ps) {
  if (ps === figma.mixed) return 'mixed';
  const out = [];
  for (const p of ps) {
    const o = { t: p.type };
    if (p.visible === false) o.hidden = true;
    if (p.type === 'SOLID') {
      if (p.boundVariables && p.boundVariables.color) o.var = await vname(p.boundVariables.color.id);
      else o.rgb = [c3(p.color.r), c3(p.color.g), c3(p.color.b)];
      if ((p.opacity ?? 1) !== 1) o.a = r(p.opacity);
    } else if (p.type === 'IMAGE') o.img = p.imageHash;
    out.push(o);
  }
  return out;
}
async function ser(n, shallow = false) {
  const o = { id: n.id, name: n.name, type: n.type };
  if (n.visible === false) o.hidden = true;
  const sz = 'layoutSizingHorizontal' in n ? [n.layoutSizingHorizontal, n.layoutSizingVertical] : null;
  if (sz && !(sz[0] === 'FIXED' && sz[1] === 'FIXED')) o.sizing = sz;
  if (!sz || sz[0] === 'FIXED') o.w = r(n.width);
  if (!sz || sz[1] === 'FIXED') o.h = r(n.height);
  const p = n.parent;
  if (p && p.type !== 'PAGE' && 'layoutMode' in p && p.layoutMode === 'NONE') { o.x = r(n.x); o.y = r(n.y); }
  if ('layoutPositioning' in n && n.layoutPositioning === 'ABSOLUTE') { o.abs = true; o.x = r(n.x); o.y = r(n.y); }
  if ('fills' in n && n.fills !== figma.mixed && n.fills.length) o.fills = await paints(n.fills);
  if ('strokes' in n && n.strokes.length) { o.strokes = await paints(n.strokes); o.strokeW = r(M(n.strokeWeight)); }
  if ('cornerRadius' in n && n.cornerRadius) o.radius = r(M(n.cornerRadius));
  if ('opacity' in n && n.opacity !== 1) o.opacity = r(n.opacity);
  if ('effectStyleId' in n && n.effectStyleId) o.effect = await sname(n.effectStyleId);
  else if ('effects' in n && n.effects.length) o.effects = n.effects.map(e => e.type);
  if ('layoutMode' in n && n.layoutMode !== 'NONE') {
    o.layout = [n.layoutMode, r(n.itemSpacing), [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(r), n.primaryAxisAlignItems, n.counterAxisAlignItems];
    if (n.layoutWrap === 'WRAP') o.layout.push('WRAP');
  }
  if (n.boundVariables) {
    const bv = {};
    for (const [k, v] of Object.entries(n.boundVariables)) if (v && !Array.isArray(v) && v.id) bv[k] = await vname(v.id);
    if (Object.keys(bv).length) o.vars = bv;
  }
  if (n.type === 'TEXT') {
    o.text = n.characters;
    const st = await sname(n.textStyleId);
    if (st) o.style = st; else { o.font = M(n.fontName); o.size = r(M(n.fontSize)); o.lh = M(n.lineHeight); }
    if (n.textAlignHorizontal !== 'LEFT') o.align = n.textAlignHorizontal;
  }
  if (shallow) return o;
  if (n.type === 'INSTANCE') {
    const mc = await n.getMainComponentAsync();
    o.component = mc ? (mc.parent && mc.parent.type === 'COMPONENT_SET' ? mc.parent.name + '/' + mc.name : mc.name) : null;
    const props = Object.entries(n.componentProperties).filter(([, v]) => v.type !== 'VARIANT');
    if (props.length) o.props = Object.fromEntries(props.map(([k, v]) => [k.split('#')[0], v.value]));
    const ov = [];
    for (const { id, overriddenFields } of n.overrides) {
      if (id === n.id) continue;
      const c = await figma.getNodeByIdAsync(id);
      if (!c) continue;
      const s = await ser(c, true);
      s.fields = [...overriddenFields].filter(f => f !== 'characters' || !o.props).sort();
      ov.push(s);
    }
    if (ov.length) o.ov = ov.sort((a, b) => (a.id < b.id ? -1 : 1));
    // Nested instance swaps (e.g. Orb On=false -> On=true) are not listed in instance.overrides; record them explicitly.
    const swaps = [];
    for (const d of n.findAllWithCriteria({ types: ['INSTANCE'] })) {
      const orig = await figma.getNodeByIdAsync(d.id.split(';').pop());
      if (!orig || orig.type !== 'INSTANCE') continue;
      const [a, b] = await Promise.all([d.getMainComponentAsync(), orig.getMainComponentAsync()]);
      if (a && b && a.id !== b.id) swaps.push({ id: d.id, name: d.name, component: a.parent && a.parent.type === 'COMPONENT_SET' ? a.parent.name + '/' + a.name : a.name });
    }
    if (swaps.length) o.swaps = swaps.sort((x, y) => (x.id < y.id ? -1 : 1));
    return o;
  }
  if ('children' in n) o.children = await Promise.all(n.children.map(c => ser(c)));
  return o;
}
const frames = [];
for (const id of FRAME_IDS) {
  const n = await figma.getNodeByIdAsync(id);
  frames.push(n ? await ser(n) : { id, missing: true });
}
const snapshot = { frames };
if (WITH_VARIABLES) snapshot.variables = (await figma.variables.getLocalVariablesAsync())
  .map(v => ({ id: v.id, name: v.name, type: v.resolvedType, values: v.valuesByMode }));
const s = JSON.stringify(snapshot);
let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
return { capturedAt: new Date().toISOString(), hash: h.toString(16), bytes: s.length, snapshot };
