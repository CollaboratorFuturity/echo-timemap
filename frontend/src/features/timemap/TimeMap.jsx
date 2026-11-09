import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import * as THREE from "three";
import { SOURCES, RECORDS, SITE_RECORDS, POINT_RECORDS, EU_MAP, INSETS } from "./data";

/* ================= DATA =================
   SOURCES (registry), RECORDS, SITE_RECORDS, POINT_RECORDS, EU_MAP and
   INSETS come from ./data, which loads them from the API (/api/v1) before
   this component mounts. Record fields keep the prototype short keys:
     n (name) c (country) ci (city) la/lo (lat/lon, WGS84)
     k kind tag · src source id
   kind:"site"  = time-spanning record. Extra fields:
     sy/ey (active span years, neg = BCE) ap (period text)
     ht (heritage layer -> color) cf (period confidence)
     fl (period parse flag) og (ongoing) ov (overseas -> inset)
     uc/cr/yi/up/ow (UNESCO category, criteria, inscribed, urls)
     Drawn as a stem + marker whose height encodes start year.
   kind:"point" = present-day record, no time span. Extra:
     ot (org type) w (website) gx (geocoding provenance)
     Drawn at ground level with the source's shape + color.
   A new source registered in the database automatically gets a panel
   toggle, a marker shape/color, a legend row and a screen-reader table.
   ========================================================= */
const SHAPE_GEO = {
  sphere: () => new THREE.SphereGeometry(0.3, 12, 10),
  diamond: () => new THREE.OctahedronGeometry(0.32),
  cube: () => new THREE.BoxGeometry(0.42, 0.42, 0.42),
  cone: () => new THREE.ConeGeometry(0.3, 0.58, 8),
  ring: () => new THREE.TorusGeometry(0.26, 0.1, 8, 16),
};

// Heritage-layer marker colors (used for 3D markers in both themes)
const LC = { architecture: "#FF6B3D", art: "#B968D9", commerce: "#F5C518", "food/agriculture": "#3FBF6F", language: "#4AA3E0", military: "#94A0AE", music: "#FF5C8A", "politics/government": "#E84855", religion: "#9B6DD6", technology: "#3E9BD6", urban: "#2DC4A8", natural: "#5FD08A", other: "#A0A6B0" };
// Darkened variants so layer-colored TEXT keeps >=4.5:1 contrast on light panels
function darkenForLight(hex) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = 0.52; r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
const LC_LIGHT = Object.fromEntries(Object.entries(LC).map(([k, v]) => [k, darkenForLight(v)]));
const LI = { architecture: "\u{1F3DB}️", art: "\u{1F3A8}", commerce: "\u{1F4B0}", "food/agriculture": "\u{1F33E}", language: "\u{1F4DC}", military: "⚔️", music: "\u{1F3B5}", "politics/government": "⚖️", religion: "⛪", technology: "⚙️", urban: "\u{1F3D7}️", natural: "\u{1F3DE}️", other: "\u{1F4CD}" };

/* ================= THEMES =================
   Every UI color flows through these tokens; the Three.js
   scene colors live under .scene and are re-applied live
   when the theme switches. */
const THEMES = {
  dark: {
    bg: "#070a12", header: "rgba(7,10,18,0.95)", footer: "rgba(5,7,13,0.9)",
    panel: "rgba(9,12,21,0.6)", panelSolid: "rgba(8,11,19,0.96)", popover: "rgba(8,11,19,0.98)", tooltip: "rgba(10,14,24,0.94)",
    text: "#e8ecf2", body: "#c2cad8", strong: "#aeb6c4", muted: "#9aa3b4", muted2: "#8a93a5", faint: "#7a8498", off: "#6b7488",
    border: "rgba(255,255,255,0.07)", border2: "rgba(255,255,255,0.09)", borderRow: "rgba(255,255,255,0.08)", border3: "rgba(255,255,255,0.12)",
    inputBg: "rgba(255,255,255,0.04)", inputBorder: "rgba(255,255,255,0.32)", btnBg: "rgba(255,255,255,0.05)", chipBg: "rgba(255,255,255,0.06)", barBg: "rgba(255,255,255,0.04)",
    accent: "#6ec6ff", accentDim: "#6ec6ff55", accentBg: "rgba(110,198,255,0.1)", hot: "#FF6B3D", hotBorder: "rgba(255,107,61,0.35)", danger: "#E84855",
    histA: "rgba(110,198,255,0.35)", histB: "rgba(185,104,217,0.25)", thumbBorder: "#fff", optionBg: "#10141f",
    titleGrad: "linear-gradient(90deg,#FF6B3D,#B968D9,#4AA3E0)", playGrad: "linear-gradient(135deg,#FF6B3D,#B968D9)",
    lc: LC, srcAccent: "#7a9fd4",
    scene: { bg: 0x070a12, ocean: 0x0c1322, gridA: 0x111a30, gridB: 0x0c1322, gridOp: 0.45, land: 0x35496e, coast: 0x6f8bc0, tile: 0x35496e, frame: 0x6f86ad, insetOutline: 0x8fa6cc, label: "#cdd9ec", labelBg: "rgba(16,24,42,0.92)", plane: 0x6ec6ff, amb: 0x6a7a9c, ambI: 1.15, fog: 0.0062 },
  },
  light: {
    bg: "#eef1f6", header: "rgba(248,250,253,0.96)", footer: "rgba(244,246,250,0.95)",
    panel: "rgba(248,250,253,0.85)", panelSolid: "rgba(250,251,253,0.98)", popover: "rgba(252,253,255,0.99)", tooltip: "rgba(250,251,253,0.97)",
    text: "#19212e", body: "#2c3645", strong: "#374253", muted: "#4a5568", muted2: "#525e72", faint: "#5a6678", off: "#6b7488",
    border: "rgba(15,25,45,0.1)", border2: "rgba(15,25,45,0.13)", borderRow: "rgba(15,25,45,0.1)", border3: "rgba(15,25,45,0.18)",
    inputBg: "rgba(15,25,45,0.03)", inputBorder: "rgba(15,25,45,0.35)", btnBg: "rgba(15,25,45,0.04)", chipBg: "rgba(15,25,45,0.06)", barBg: "rgba(15,25,45,0.05)",
    accent: "#0c63b8", accentDim: "#0c63b855", accentBg: "rgba(12,99,184,0.08)", hot: "#b3400f", hotBorder: "rgba(179,64,15,0.4)", danger: "#b01c28",
    histA: "rgba(12,99,184,0.3)", histB: "rgba(122,63,176,0.22)", thumbBorder: "#19212e", optionBg: "#f4f6fa",
    titleGrad: "linear-gradient(90deg,#b3400f,#7a3fb0,#0c63b8)", playGrad: "linear-gradient(135deg,#c4501f,#8b3fb0)",
    lc: LC_LIGHT, srcAccent: "#3a5d8f",
    scene: { bg: 0xeef1f6, ocean: 0xd3deea, gridA: 0xdbe2ec, gridB: 0xe5eaf1, gridOp: 0.18, land: 0xb5c2d4, coast: 0x6d83a3, tile: 0xf7f9fc, frame: 0x4f637f, insetOutline: 0x44597a, label: "#243348", labelBg: "rgba(255,255,255,0.94)", plane: 0x0c63b8, amb: 0xa8b4c8, ambI: 1.5, fog: 0.0045 },
  },
};

const HMIN = -5000, HMAX = 2025, HSPAN = HMAX - HMIN, TOP = 17;
// ---- vertical model ----
// All map surfaces (mainland land-top and the overseas inset tiles) sit at SURF,
// so every node shares one start elevation. A column's height above SURF encodes
// the age of its origin. The sqrt curve stretches recent centuries apart (so the
// 1800-2025 museums are distinguishable) while still pushing ancient origins high.
const SURF = 0.55;          // shared map-surface elevation
const MAXH = 15.6;          // tallest column above the surface
const age01 = y => Math.max(0, Math.min(1, (HMAX - Math.max(HMIN, Math.min(HMAX, y))) / HSPAN));
const ageH = y => MAXH * Math.sqrt(age01(y));
const topY = y => SURF + ageH(y);   // absolute Y of a marker for origin year y
const NAT_Y = SURF + MAXH;          // natural sites pinned to the very top (no start year)
const UNDATED_Y = SURF + 0.45;      // undated non-natural records sit just above the surface
const yToH = y => topY(y);          // used by the sweep plane + axis ticks
const fy = y => y == null ? "undated" : (y < 0 ? Math.abs(y) + " BCE" : y + " CE");
const rem = px => (px / 16) + "rem";
// Inset-tile label: dark/light pill behind the text so it stays legible over any background.
function drawInsetLabel(ctx, label, sc) {
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = sc.labelBg;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(6, 14, 244, 36, 10); ctx.fill(); } else ctx.fillRect(6, 14, 244, 36);
  let fs = 25; ctx.font = "600 " + fs + "px sans-serif";
  while (ctx.measureText(label).width > 224 && fs > 11) { fs -= 1; ctx.font = "600 " + fs + "px sans-serif"; }
  ctx.fillStyle = sc.label; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 32);
}
function geo(lat, lon) { return [(lon + 10) * 1.15, -(lat - 34) * 1.55]; }
const [CX, CZ] = geo(50, 12);
const TGT_X = CX - 7, TGT_Z = CZ + 2;
function insetFor(lat, lon) {
  for (const k in INSETS) { const [a, b, c, d] = INSETS[k].bbox; if (lat >= a && lat <= b && lon >= c && lon <= d) return k; }
  return null;
}
function insetXZ(key, lat, lon) {
  const it = INSETS[key], [a, b, c, d] = it.bbox, [sx, sz, w, dp] = it.tile;
  const fx = (lon - c) / (d - c), fz = (lat - a) / (b - a);
  return [sx - w / 2 + Math.max(0, Math.min(1, fx)) * w, sz + dp / 2 - Math.max(0, Math.min(1, fz)) * dp];
}
function sceneXZ(s) { if (s.ov) { const k = insetFor(s.la, s.lo); if (k) return insetXZ(k, s.la, s.lo); } return geo(s.la, s.lo); }
const ERAS = [["Antiquity", -3000], ["Classical", -500], ["Medieval", 1000], ["Renaissance", 1500], ["Industrial", 1850], ["Now", 2025]];
const AXIS_TICKS = [-5000, -3000, -1000, 0, 1000, 2025].map(y => [y <= -5000 ? "5000+ BCE" : fy(y), (1 - ageH(y) / MAXH) * 86]);

function initTheme() {
  try { const s = localStorage.getItem("tm-theme"); if (s === "light" || s === "dark") return s; } catch (e) { }
  return (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
}

export default function TimeMap() {
  const wrapRef = useRef(null);
  const sceneRef = useRef(null), rendererRef = useRef(null), cameraRef = useRef(null);
  const ray = useRef(new THREE.Raycaster()), mouse = useRef(new THREE.Vector2());
  const pins = useRef([]), ptPins = useRef([]);
  const planeRef = useRef(null);
  const orbit = useRef({ theta: -0.7, phi: 0.62, dist: 74, tx: 0, tz: 0 });
  const drag = useRef(null);
  const flyRef = useRef(null), reduceRef = useRef(false);
  const yearRef = useRef(2025), playRef = useRef(false), lastSet = useRef(2025);
  const themedRefs = useRef(null);

  const [year, setYear] = useState(2025);
  const [playing, setPlaying] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [srcOn, setSrcOn] = useState(() => new Set(Object.keys(SOURCES).filter(k => SOURCES[k].defaultOn)));
  const [ly, setLy] = useState(() => new Set(Object.keys(LC)));
  const [sq, setSq] = useState("");
  const [co, setCo] = useState("All");
  const [sel, setSel] = useState(null);
  const [hov, setHov] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [theme, setTheme] = useState(initTheme);
  const seekRef = useRef(null), seekDrag = useRef(false);
  const helpRef = useRef(null), helpBtnRef = useRef(null);
  const themeRef = useRef(theme);

  const T = THEMES[theme];
  const TLC = T.lc;

  const cs = useMemo(() => ["All", ...[...new Set(RECORDS.map(r => r.c))].sort()], []);
  const tl = useCallback(l => setLy(p => { const n = new Set(p); n.has(l) ? n.delete(l) : n.add(l); return n; }), []);
  const tSrc = useCallback(id => setSrcOn(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);

  const fl = useMemo(() => SITE_RECORDS.filter(s => {
    if (!srcOn.has(s.src)) return false;
    if (!ly.has(s.ht)) return false;
    if (co !== "All" && s.c !== co) return false;
    if (sq) { const q = sq.toLowerCase(); if (!s.n.toLowerCase().includes(q) && !(s.d || "").toLowerCase().includes(q) && !s.c.toLowerCase().includes(q)) return false; }
    return true;
  }), [srcOn, ly, co, sq]);

  const flPts = useMemo(() => POINT_RECORDS.filter(p => {
    if (!srcOn.has(p.src)) return false;
    if (co !== "All" && p.c !== co) return false;
    if (sq) { const q = sq.toLowerCase(); if (!p.n.toLowerCase().includes(q) && !p.c.toLowerCase().includes(q)) return false; }
    return true;
  }), [srcOn, co, sq]);

  const lc = useMemo(() => { const c = {}; Object.keys(LC).forEach(l => c[l] = 0); fl.forEach(s => c[s.ht]++); return c; }, [fl]);
  // "born and persists": a site is present once its origin year has arrived; heritage doesn't switch off.
  const activeCount = useMemo(() => fl.filter(s => s.sy != null && s.sy <= year).length, [fl, year]);
  const undatedCount = useMemo(() => fl.filter(s => s.sy == null && !(s.natural_top || s.ht === "natural")).length, [fl]);
  const srcCounts = useMemo(() => { const c = {}; Object.keys(SOURCES).forEach(k => c[k] = 0); RECORDS.forEach(r => { if (co !== "All" && r.c !== co) return; c[r.src]++; }); return c; }, [co]);

  const hg = useMemo(() => {
    const n = 120, lo = -3000, hi = 2025, span = hi - lo, bs = span / n, b = new Array(n).fill(0);
    fl.forEach(s => { if (s.sy == null) return; if (s.ey < lo) return; const a = Math.max(0, Math.floor((s.sy - lo) / bs)); const e = Math.min(n - 1, Math.floor((s.ey - lo) / bs)); for (let i = a; i <= e; i++) b[i]++; });
    const mx = Math.max(1, ...b); return { bars: b.map(v => v / mx) };
  }, [fl]);

  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    reduceRef.current = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sc = THEMES[themeRef.current].scene;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(sc.bg);
    scene.fog = new THREE.FogExp2(sc.bg, sc.fog);
    const cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 400);
    const rndr = new THREE.WebGLRenderer({ antialias: true });
    rndr.setSize(W, H); rndr.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rndr.domElement.style.display = "block";
    wrap.appendChild(rndr.domElement);

    const R = { scene, landMats: [], coastMats: [], tileMats: [], frameMats: [], outlineMats: [], labels: [] };

    const amb = new THREE.AmbientLight(sc.amb, sc.ambI); scene.add(amb); R.amb = amb;
    const d1 = new THREE.DirectionalLight(0xfff0dd, 0.7); d1.position.set(30, 45, 18); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x5577cc, 0.45); d2.position.set(-25, 30, -20); scene.add(d2);

    const oceanMat = new THREE.MeshStandardMaterial({ color: sc.ocean, roughness: 1 });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), oceanMat);
    ocean.rotation.x = -Math.PI / 2; ocean.position.set(CX, -0.4, CZ); scene.add(ocean);
    R.oceanMat = oceanMat;
    const grid = new THREE.GridHelper(220, 55, sc.gridA, sc.gridB); grid.position.set(CX, -0.02, CZ);
    grid.material.transparent = true; grid.material.opacity = sc.gridOp; scene.add(grid);
    R.grid = grid;

    EU_MAP.forEach(([name, rings]) => {
      rings.forEach(ring => {
        const shape = new THREE.Shape();
        ring.forEach(([lon, lat], i) => { const [x, z] = geo(lat, lon); if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z); });
        shape.closePath();
        const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false });
        geom.rotateX(-Math.PI / 2);
        const landMat = new THREE.MeshStandardMaterial({ color: sc.land, roughness: 0.85, metalness: 0.05, transparent: true, opacity: 0.95 });
        scene.add(new THREE.Mesh(geom, landMat)); R.landMats.push(landMat);
        const pts = ring.map(([lon, lat]) => { const [x, z] = geo(lat, lon); return new THREE.Vector3(x, 0.57, z); });
        const coastMat = new THREE.LineBasicMaterial({ color: sc.coast, transparent: true, opacity: 0.7 });
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), coastMat)); R.coastMats.push(coastMat);
      });
    });

    // Overseas insets are raised to the same SURF elevation as the mainland, as a solid
    // slab, so every node (mainland or overseas) starts from one consistent surface height.
    Object.entries(INSETS).forEach(([key, it]) => {
      const [sx, sz, w, d] = it.tile;
      const tileMat = new THREE.MeshStandardMaterial({ color: sc.tile, roughness: 0.9, transparent: true, opacity: 0.95 });
      const plat = new THREE.Mesh(new THREE.BoxGeometry(w, SURF, d), tileMat);
      plat.position.set(sx, SURF / 2, sz); scene.add(plat); R.tileMats.push(tileMat);
      const hw = w / 2, hd = d / 2;
      const frame = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]].map(([dx, dz]) => new THREE.Vector3(sx + dx, SURF + 0.04, sz + dz));
      const frameMat = new THREE.LineDashedMaterial({ color: sc.frame, dashSize: 0.8, gapSize: 0.5, transparent: true, opacity: 0.6 });
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(frame), frameMat).computeLineDistances()); R.frameMats.push(frameMat);
      (it.outline || []).forEach(ring => {
        const v = ring.map(([lon, lat]) => { const [x, z] = insetXZ(key, lat, lon); return new THREE.Vector3(x, SURF + 0.06, z); });
        if (v.length > 1) { const om = new THREE.LineBasicMaterial({ color: sc.insetOutline, transparent: true, opacity: 0.8 }); scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), om)); R.outlineMats.push(om); }
      });
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
      const ctx = cv.getContext('2d'); drawInsetLabel(ctx, it.label, sc);
      const tex = new THREE.CanvasTexture(cv);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, w * 0.95 * 0.25), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96, depthWrite: false }));
      lab.rotation.x = -Math.PI / 2; lab.position.set(sx, SURF + 0.1, sz - d / 2 - 1.0); scene.add(lab);
      R.labels.push({ ctx, tex, label: it.label });
    });

    const planeGeo = new THREE.PlaneGeometry(170, 150);
    const planeMat = new THREE.MeshBasicMaterial({ color: sc.plane, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2; plane.position.set(CX, yToH(2025), CZ); scene.add(plane);
    const edgeMat = new THREE.LineBasicMaterial({ color: sc.plane, transparent: true, opacity: 0.4 });
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(planeGeo), edgeMat);
    edge.rotation.x = -Math.PI / 2; plane.add(edge);
    planeRef.current = plane;
    R.planeMat = planeMat; R.edgeMat = edgeMat;

    sceneRef.current = scene; rendererRef.current = rndr; cameraRef.current = cam;
    themedRefs.current = R;

    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (playRef.current) {
        yearRef.current += 8;
        if (yearRef.current > 2025) yearRef.current = -3000;
        const ry = Math.round(yearRef.current);
        if (Math.abs(ry - lastSet.current) >= 12) { lastSet.current = ry; setYear(ry); }
      }
      const cy = yearRef.current;
      if (planeRef.current) planeRef.current.position.y = yToH(cy);
      const focus = playRef.current || focusModeRef.current;
      pins.current.forEach(p => {
        const s = p.rec, natural = s.natural_top || s.ht === "natural", dated = s.sy != null;
        // natural sites have no start year, so they read as always-present
        const act = natural || (dated && s.sy <= cy), isSel = selRef.current && selRef.current.id === s.id;
        const playing = playRef.current;
        const dimO = playing ? 0.12 : (focus ? 0.42 : 0.6), dimStem = playing ? 0.04 : 0.14, dimSc = playing ? 0.85 : 1.0;
        const tgt = isSel ? 1 : (!dated && !natural ? 0.55 : act ? 0.95 : dimO);
        p.sphere.material.opacity += (tgt - p.sphere.material.opacity) * 0.18;
        p.sphere.material.emissiveIntensity += ((isSel ? 1.1 : act ? 0.7 : 0.14) - p.sphere.material.emissiveIntensity) * 0.18;
        p.stem.material.opacity += ((isSel ? 0.7 : act ? 0.45 : dimStem) - p.stem.material.opacity) * 0.18;
        const sc2 = isSel ? 2.0 : act ? 1.45 : dimSc; p.sphere.scale.x += (sc2 - p.sphere.scale.x) * 0.18; p.sphere.scale.y = p.sphere.scale.x; p.sphere.scale.z = p.sphere.scale.x;
      });
      ptPins.current.forEach(p => {
        const s = p.rec, dated = s.sy != null, act = dated && s.sy <= cy, isSel = selRef.current && selRef.current.id === s.id;
        const playing = playRef.current;
        const dimO = playing ? 0.12 : (focus ? 0.4 : 0.6), dimStem = playing ? 0.04 : 0.12;
        const tgt = isSel ? 1 : (!dated ? 0.5 : act ? 0.95 : dimO);
        p.mesh.material.opacity += (tgt - p.mesh.material.opacity) * 0.18;
        p.mesh.material.emissiveIntensity += ((isSel ? 1.0 : act ? 0.6 : 0.2) - p.mesh.material.emissiveIntensity) * 0.18;
        if (p.stem) p.stem.material.opacity += ((isSel ? 0.6 : act ? 0.4 : dimStem) - p.stem.material.opacity) * 0.18;
        const sc2 = isSel ? 1.8 : act ? 1.3 : 1.0; p.mesh.scale.x += (sc2 - p.mesh.scale.x) * 0.18; p.mesh.scale.y = p.mesh.scale.x; p.mesh.scale.z = p.mesh.scale.x;
        if (!reduceRef.current) p.mesh.rotation.y += 0.01;
      });
      if (flyRef.current) {
        const f = flyRef.current, o = orbit.current;
        if (reduceRef.current) { o.tx = f.tx; o.tz = f.tz; flyRef.current = null; }
        else {
          o.tx += (f.tx - o.tx) * 0.07; o.tz += (f.tz - o.tz) * 0.07;
          if (Math.abs(f.tx - o.tx) + Math.abs(f.tz - o.tz) < 0.08) flyRef.current = null;
        }
      }
      const o = orbit.current;
      cam.position.set(TGT_X + o.tx + o.dist * Math.sin(o.theta) * Math.cos(o.phi), o.dist * Math.sin(o.phi), TGT_Z + o.tz + o.dist * Math.cos(o.theta) * Math.cos(o.phi));
      cam.lookAt(TGT_X + o.tx, 4.5, TGT_Z + o.tz);
      rndr.render(scene, cam);
    };
    tick();
    const onResize = () => { const w = wrap.clientWidth, h = wrap.clientHeight; if (w < 2 || h < 2) return; cam.aspect = w / h; cam.updateProjectionMatrix(); rndr.setSize(w, h); };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize); ro.observe(wrap);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); ro.disconnect(); if (wrap.contains(rndr.domElement)) wrap.removeChild(rndr.domElement); rndr.dispose(); };
  }, []);

  // live re-color of the Three.js scene when the theme changes
  useEffect(() => {
    themeRef.current = theme;
    try { localStorage.setItem("tm-theme", theme); } catch (e) { }
    const R = themedRefs.current; if (!R) return;
    const sc = THEMES[theme].scene;
    R.scene.background.set(sc.bg); R.scene.fog.color.set(sc.bg); R.scene.fog.density = sc.fog;
    R.oceanMat.color.set(sc.ocean);
    R.amb.color.set(sc.amb); R.amb.intensity = sc.ambI;
    R.landMats.forEach(m => m.color.set(sc.land));
    R.coastMats.forEach(m => m.color.set(sc.coast));
    R.tileMats.forEach(m => m.color.set(sc.tile));
    R.frameMats.forEach(m => m.color.set(sc.frame));
    R.outlineMats.forEach(m => m.color.set(sc.insetOutline));
    R.planeMat.color.set(sc.plane); R.edgeMat.color.set(sc.plane);
    R.labels.forEach(L => { drawInsetLabel(L.ctx, L.label, sc); L.tex.needsUpdate = true; });
    const old = R.grid;
    const g = new THREE.GridHelper(220, 55, sc.gridA, sc.gridB); g.position.copy(old.position);
    g.material.transparent = true; g.material.opacity = sc.gridOp;
    R.scene.add(g); R.scene.remove(old); old.geometry.dispose(); old.material.dispose(); R.grid = g;
  }, [theme]);

  const focusModeRef = useRef(focusMode); useEffect(() => { focusModeRef.current = focusMode; }, [focusMode]);
  const selRef = useRef(sel); useEffect(() => { selRef.current = sel; }, [sel]);
  useEffect(() => { playRef.current = playing; }, [playing]);
  useEffect(() => { if (!playing) yearRef.current = year; }, [year, playing]);

  useEffect(() => {
    if (!sel) return;
    const [x, z] = sceneXZ(sel);
    flyRef.current = { tx: x - TGT_X, tz: z - TGT_Z };
  }, [sel]);

  const helpWasOpen = useRef(false);
  useEffect(() => {
    if (helpOpen && helpRef.current) { helpRef.current.focus(); helpWasOpen.current = true; }
    else if (!helpOpen && helpWasOpen.current) { helpWasOpen.current = false; if (helpBtnRef.current) helpBtnRef.current.focus(); }
  }, [helpOpen]);

  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return;
    pins.current.forEach(p => { scene.remove(p.group); p.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); });
    pins.current = [];
    fl.forEach(s => {
      const [x, z] = sceneXZ(s);
      const natural = s.natural_top || s.ht === "natural";
      const dated = s.sy != null;
      // Column runs from the shared map surface (SURF) up to the origin year.
      // Natural sites have no human start year, so they're pinned to the very top.
      const top = natural ? NAT_Y : (dated ? topY(s.sy) : UNDATED_Y), bot = SURF;
      const col = new THREE.Color(LC[s.ht] || "#999");
      const group = new THREE.Group();
      const h = Math.max(0.15, top - bot);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 5), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18 }));
      stem.position.y = bot + h / 2; group.add(stem);
      const sph = new THREE.Mesh(SHAPE_GEO[SOURCES[s.src].shape](), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.12, roughness: 0.35, metalness: 0.3, transparent: true, opacity: 0.55, wireframe: !dated && !natural }));
      sph.position.y = top; sph.userData = { rec: s }; group.add(sph);
      const base = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35 }));
      base.rotation.x = -Math.PI / 2; base.position.y = SURF + 0.05; group.add(base);
      group.position.set(x, 0, z); scene.add(group);
      pins.current.push({ group, rec: s, sphere: sph, stem });
    });
  }, [fl]);

  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return;
    ptPins.current.forEach(p => { scene.remove(p.group); p.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); });
    ptPins.current = [];
    flPts.forEach(s => {
      const def = SOURCES[s.src];
      const col = new THREE.Color(def.color);
      const [x, z] = sceneXZ(s);
      const dated = s.sy != null;
      // Museums get the same temporal column as sites: from the surface up to the founding year.
      const top = dated ? topY(s.sy) : UNDATED_Y, bot = SURF;
      const group = new THREE.Group();
      const h = Math.max(0.15, top - bot);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 5), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16 }));
      stem.position.y = bot + h / 2; group.add(stem);
      const m = new THREE.Mesh(SHAPE_GEO[def.shape](), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.4, transparent: true, opacity: 0.6, wireframe: !dated }));
      m.position.y = top; m.userData = { rec: s }; group.add(m);
      const base = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35 }));
      base.rotation.x = -Math.PI / 2; base.position.y = SURF + 0.05; group.add(base);
      group.position.set(x, 0, z); scene.add(group);
      ptPins.current.push({ group, mesh: m, stem, rec: s });
    });
  }, [flPts]);

  const pd = useCallback(e => {
    const wrap = wrapRef.current, r = wrap.getBoundingClientRect();
    mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.current.setFromCamera(mouse.current, cameraRef.current);
    const objs = [...pins.current.map(p => p.sphere), ...ptPins.current.map(p => p.mesh)];
    const hits = ray.current.intersectObjects(objs);
    if (hits.length) { const s = hits[0].object.userData.rec; setSel(p => p && p.id === s.id ? null : s); return; }
    flyRef.current = null;
    drag.current = { x: e.clientX, y: e.clientY, ...orbit.current, shift: e.shiftKey };
  }, []);
  const pm = useCallback(e => {
    if (!drag.current) {
      const wrap = wrapRef.current, r = wrap.getBoundingClientRect();
      mouse.current.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.current.setFromCamera(mouse.current, cameraRef.current);
      const objs = [...pins.current.map(p => p.sphere), ...ptPins.current.map(p => p.mesh)];
      const hits = ray.current.intersectObjects(objs);
      if (hits.length) { setHov(hits[0].object.userData.rec); wrap.style.cursor = "pointer"; }
      else { setHov(null); wrap.style.cursor = "grab"; }
      return;
    }
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    if (drag.current.shift) { orbit.current.tx = drag.current.tx - dx * 0.06; orbit.current.tz = drag.current.tz - dy * 0.06; }
    else { orbit.current.theta = drag.current.theta + dx * 0.005; orbit.current.phi = Math.max(0.12, Math.min(1.45, drag.current.phi + dy * 0.005)); }
  }, []);
  const pu = useCallback(() => { drag.current = null; }, []);
  const wheel = useCallback(e => { e.preventDefault(); orbit.current.dist = Math.max(22, Math.min(150, orbit.current.dist + e.deltaY * 0.06)); }, []);

  useEffect(() => {
    const mv = e => {
      if (!seekDrag.current) return; const r = seekRef.current?.getBoundingClientRect(); if (!r) return;
      const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); const y = Math.round(-3000 + p * 5025);
      setPlaying(false); setYear(y); yearRef.current = y;
    };
    const up = () => { seekDrag.current = false; };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
  }, []);

  const seekPct = ((year + 3000) / 5025) * 100;
  const selDef = sel ? SOURCES[sel.src] : null;
  const isPt = sel && selDef.kind === "point";
  const selAccent = sel ? (isPt ? selDef.color : TLC[sel.ht]) : null;
  const S = {
    lbl: { display: "block", fontSize: rem(10), textTransform: "uppercase", letterSpacing: "0.13em", color: T.muted, marginBottom: 7, fontWeight: 600 },
    inp: { width: "100%", padding: "7px 10px", background: T.inputBg, border: "1px solid " + T.inputBorder, borderRadius: 6, color: T.text, fontSize: rem(12), fontFamily: "inherit", boxSizing: "border-box" },
    btn: { background: T.btnBg, border: "1px solid " + T.border2, borderRadius: 4, color: T.muted, fontSize: rem(10), cursor: "pointer", fontFamily: "inherit" }
  };
  const shapeGlyph = (shape, color, on) => {
    const base = { width: 9, height: 9, boxSizing: "border-box", flexShrink: 0, background: on ? color : "transparent", border: "1.5px solid " + (on ? color : T.off) };
    if (shape === "diamond") return <span aria-hidden="true" style={{ ...base, transform: "rotate(45deg)" }} />;
    if (shape === "cube") return <span aria-hidden="true" style={base} />;
    if (shape === "cone") return <span aria-hidden="true" style={{ width: 0, height: 0, flexShrink: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "9px solid " + (on ? color : T.off) }} />;
    if (shape === "ring") return <span aria-hidden="true" style={{ ...base, borderRadius: "50%", background: "transparent", borderWidth: 2.5 }} />;
    return <span aria-hidden="true" style={{ ...base, borderRadius: "50%" }} />;
  };

  const onSeekKey = useCallback(e => {
    let y = yearRef.current; const k = e.key;
    if (k === "ArrowLeft" || k === "ArrowDown") y -= 10;
    else if (k === "ArrowRight" || k === "ArrowUp") y += 10;
    else if (k === "PageDown") y -= 100;
    else if (k === "PageUp") y += 100;
    else if (k === "Home") y = -3000;
    else if (k === "End") y = 2025;
    else return;
    y = Math.max(-3000, Math.min(2025, Math.round(y)));
    setPlaying(false); setYear(y); yearRef.current = y; e.preventDefault();
  }, []);

  const onCanvasKey = useCallback(e => {
    const o = orbit.current, k = e.key;
    if (k === "ArrowLeft") { if (e.shiftKey) o.tx -= 2; else o.theta -= 0.12; }
    else if (k === "ArrowRight") { if (e.shiftKey) o.tx += 2; else o.theta += 0.12; }
    else if (k === "ArrowUp") { if (e.shiftKey) o.tz -= 2; else o.phi = Math.min(1.45, o.phi + 0.08); }
    else if (k === "ArrowDown") { if (e.shiftKey) o.tz += 2; else o.phi = Math.max(0.12, o.phi - 0.08); }
    else if (k === "+" || k === "=") { o.dist = Math.max(22, o.dist - 4); }
    else if (k === "-" || k === "_") { o.dist = Math.min(150, o.dist + 4); }
    else return;
    flyRef.current = null;
    e.preventDefault();
  }, []);

  return (
    <div className="tm-root" lang="en" style={{ fontFamily: "'DM Sans',sans-serif", background: T.bg, color: T.text, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", colorScheme: theme }}>
      <style>{`
        .tm-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
        .tm-root :focus-visible{outline:2px solid ${T.accent};outline-offset:2px;border-radius:4px;}
        .tm-root a:focus-visible,.tm-root button:focus-visible,.tm-root [role="slider"]:focus-visible,.tm-root input:focus-visible,.tm-root select:focus-visible{outline:2px solid ${T.accent};outline-offset:2px;}
        .tm-sites:focus-within{position:absolute;left:14px;top:14px;bottom:14px;width:360px;max-width:calc(100% - 28px);height:auto;clip:auto;overflow:auto;white-space:normal;background:${T.popover};border:1px solid ${T.accent};border-radius:9px;padding:14px;z-index:40;}
        .tm-sites table{width:100%;border-collapse:collapse;font-size:0.75rem;color:${T.body};}
        .tm-sites caption{text-align:left;color:${T.strong};font-size:0.75rem;margin-bottom:8px;}
        .tm-sites th,.tm-sites td{text-align:left;padding:4px 6px;border-bottom:1px solid ${T.borderRow};vertical-align:top;}
        .tm-sites thead th{color:${T.muted};font-weight:600;}
        .tm-sites button{background:${T.btnBg};border:1px solid ${T.border3};border-radius:5px;color:${T.text};font:inherit;font-size:0.75rem;padding:4px 8px;cursor:pointer;text-align:left;}
        .tm-filters{width:222px;flex-shrink:0;border-right:1px solid ${T.border};overflow-y:auto;padding:14px;background:${T.panel};}
        .tm-details{width:312px;flex-shrink:0;border-left:1px solid ${T.border};overflow-y:auto;background:${T.panelSolid};}
        .tm-legend{position:absolute;left:14px;bottom:14px;background:${T.popover};border:1px solid ${T.border3};border-radius:9px;padding:10px 13px;font-size:0.6875rem;color:${T.strong};line-height:1.7;pointer-events:none;backdrop-filter:blur(6px);max-width:240px;}
        .tm-hint{display:inline;}
        @media (max-width:980px){
          .tm-filters{position:absolute;left:0;top:0;bottom:0;z-index:30;background:${T.panelSolid};box-shadow:4px 0 24px rgba(0,0,0,0.35);}
          .tm-details{position:absolute;right:0;top:0;bottom:0;z-index:30;box-shadow:-4px 0 24px rgba(0,0,0,0.35);}
          .tm-hint{display:none;}
        }
        @media (max-width:560px){
          .tm-details{width:100%;}
          .tm-legend{display:none;}
        }
      `}</style>
      <div className="tm-sr" aria-live="polite">{`${activeCount} of ${fl.length} shown sites had begun by ${fy(year)}`}</div>
      <div style={{ padding: "12px 22px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0, background: T.header, zIndex: 5, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setPanelOpen(v => !v)} aria-expanded={panelOpen} aria-controls="tm-filters" style={{ ...S.btn, minHeight: 30, minWidth: 30, padding: "4px 9px", fontSize: rem(13), borderRadius: 6 }} aria-label={panelOpen ? "Hide filters panel" : "Show filters panel"}><span aria-hidden="true">{"☰"}</span></button>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: rem(23), fontWeight: 700, margin: 0, letterSpacing: "-0.02em", background: T.titleGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>5D TimeMap</h1>
          <span className="tm-hint" style={{ fontSize: rem(12), color: T.muted, fontWeight: 300 }}>{SITE_RECORDS.length} sites {String.fromCharCode(183)} {POINT_RECORDS.length} institutions {String.fromCharCode(183)} real coordinates</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: rem(12), color: T.muted }}>
          <span><b style={{ color: T.strong }}>{fl.length}</b> sites</span>
          {flPts.length > 0 && <span><b style={{ color: isPtColor(T, theme) }}>{flPts.length}</b> institutions</span>}
          <span><b style={{ color: T.accent }}>{activeCount}</b> present in {fy(year)}</span>
          <span className="tm-hint" style={{ color: T.muted }}>drag orbit {String.fromCharCode(183)} shift-drag pan {String.fromCharCode(183)} scroll zoom</span>
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-pressed={theme === "light"} style={{ ...S.btn, minHeight: 28, padding: "5px 11px", borderRadius: 14, display: "flex", alignItems: "center", gap: 6 }} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <span aria-hidden="true">{theme === "dark" ? "☀️" : "\u{1F319}"}</span>{theme === "dark" ? "Light" : "Dark"}
          </button>
          <button ref={helpBtnRef} onClick={() => setHelpOpen(v => !v)} aria-expanded={helpOpen} style={{ ...S.btn, minWidth: 28, minHeight: 28, borderRadius: "50%", fontSize: rem(13), fontWeight: 700, color: T.accent, borderColor: T.accentDim }} aria-label="How to read this map">?</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {panelOpen && <div id="tm-filters" className="tm-filters">
          <label htmlFor="tm-search" style={S.lbl}>Search</label>
          <input id="tm-search" type="search" value={sq} onChange={e => setSq(e.target.value)} placeholder="Search sites, countries..." style={{ ...S.inp, marginBottom: 13 }} />
          <label htmlFor="tm-country" style={S.lbl}>Country</label>
          <select id="tm-country" value={co} onChange={e => setCo(e.target.value)} style={{ ...S.inp, marginBottom: 15, padding: "6px 8px" }}>
            {cs.map(c => <option key={c} value={c} style={{ background: T.optionBg }}>{c}</option>)}
          </select>

          <div id="tm-src-label" style={S.lbl}>Data sources</div>
          <div role="group" aria-labelledby="tm-src-label" style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 15 }}>
            {Object.entries(SOURCES).map(([id, def]) => {
              const on = srcOn.has(id);
              const accent = def.kind === "point" ? (theme === "light" ? darkenForLight(def.color) : def.color) : T.srcAccent;
              const markerColor = def.color || T.srcAccent;
              return (
                <button key={id} onClick={() => tSrc(id)} aria-pressed={on} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 30, padding: "7px 9px", background: on ? accent + "18" : "transparent", border: "1px solid " + (on ? accent + "40" : T.border2), borderRadius: 6, cursor: "pointer", color: on ? accent : T.strong, fontSize: rem(11.5), fontFamily: "inherit", textAlign: "left" }}>
                  {shapeGlyph(def.shape, markerColor, on)}
                  <span style={{ flex: 1 }}>{def.label}</span><span style={{ fontSize: rem(10), opacity: 0.7 }}>{srcCounts[id]}</span>
                </button>
              );
            })}
          </div>

          <div id="tm-layer-label" style={S.lbl}>Heritage Layer (5th D)</div>
          <div role="group" aria-labelledby="tm-layer-label" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {Object.entries(LC).map(([l, markerColor]) => {
              const textColor = TLC[l];
              return (
                <button key={l} onClick={() => tl(l)} aria-pressed={ly.has(l)} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 26, padding: "5px 8px", background: ly.has(l) ? textColor + "14" : "transparent", border: "1px solid " + (ly.has(l) ? textColor + "33" : T.border), borderRadius: 5, cursor: "pointer", color: ly.has(l) ? textColor : T.strong, fontSize: rem(11), textAlign: "left", fontFamily: "inherit" }}>
                  <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: ly.has(l) ? markerColor : "transparent", border: "1.5px solid " + (ly.has(l) ? markerColor : T.off), boxSizing: "border-box", flexShrink: 0 }} /><span style={{ flex: 1 }}>{l}</span><span style={{ fontSize: rem(10), opacity: 0.7 }}>{lc[l] || 0}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 7 }}>
            <button onClick={() => setLy(new Set(Object.keys(LC)))} aria-label="Show all heritage layers" style={{ ...S.btn, flex: 1, minHeight: 28, padding: "6px 4px" }}>All</button>
            <button onClick={() => setLy(new Set())} aria-label="Hide all heritage layers" style={{ ...S.btn, flex: 1, minHeight: 28, padding: "6px 4px" }}>None</button>
          </div>

          <div style={{ ...S.lbl, marginTop: 18 }}>Vertical Axis</div>
          <div style={{ position: "relative", height: 118, marginLeft: 6, marginTop: 2 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 16, width: 3, borderRadius: 2, background: T.titleGrad.replace("90deg", "180deg") }} />
            {AXIS_TICKS.map(([l, p]) => (
              <div key={l} style={{ position: "absolute", left: 11, top: p + "%", fontSize: rem(9.5), color: T.muted, lineHeight: 1 }}>{l}</div>
            ))}
            <div style={{ position: "absolute", left: 0, bottom: -2, fontSize: rem(9), color: T.muted, fontStyle: "italic" }}>older is taller {String.fromCharCode(183)} natural sites pinned to top</div>
          </div>
        </div>}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", minWidth: 0 }}>
          <div ref={wrapRef} tabIndex={0} role="application"
            aria-roledescription="Interactive 3D time map"
            aria-label={`3D map of ${fl.length} UNESCO heritage sites${flPts.length ? ` and ${flPts.length} institutions` : ""}, ${activeCount} already begun by ${fy(year)}. Each site's column rises from the map to its origin year, so older sites are taller. Arrow keys orbit the view, Shift plus arrow keys pan, plus and minus keys zoom. Tab to the sites list that follows for a text version you can browse and select.`}
            onKeyDown={onCanvasKey}
            style={{ flex: 1, minWidth: 0, position: "relative", cursor: "grab", touchAction: "none", overflow: "hidden" }} onPointerDown={pd} onPointerMove={pm} onPointerUp={pu} onPointerLeave={pu} onWheel={wheel}>
            <div className="tm-sites tm-sr">
              <table>
                <caption>{`Sites currently shown (${fl.length}). This table is the text alternative to the 3D map. Activate a site name to open its details panel.`}</caption>
                <thead><tr><th scope="col">Site</th><th scope="col">Country</th><th scope="col">Heritage layer</th><th scope="col">Period</th><th scope="col">Origin → present</th></tr></thead>
                <tbody>
                  {fl.map(s => (
                    <tr key={s.id}>
                      <th scope="row"><button type="button" onClick={() => setSel(s)}>{s.n}</button></th>
                      <td>{s.c}</td>
                      <td>{s.ht}</td>
                      <td>{s.ap || "undated"}</td>
                      <td>{(s.natural_top || s.ht === "natural") ? "natural (no start)" : s.sy != null ? `${fy(s.sy)} to present` : "undated"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {flPts.length > 0 && (
                <table style={{ marginTop: 14 }}>
                  <caption>{`Institutions and other point records currently shown (${flPts.length}).`}</caption>
                  <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Founded</th><th scope="col">City</th><th scope="col">Country</th><th scope="col">Source</th></tr></thead>
                  <tbody>
                    {flPts.map(i => (
                      <tr key={i.id}>
                        <th scope="row"><button type="button" onClick={() => setSel(i)}>{i.n}</button></th>
                        <td>{i.ot || ""}</td>
                        <td>{i.sy != null ? fy(i.sy) : "no data"}</td>
                        <td>{i.ci || ""}</td>
                        <td>{i.c}</td>
                        <td>{SOURCES[i.src].label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="tm-legend" aria-hidden="true">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: LC.architecture, flexShrink: 0 }} /><span>dated site {String.fromCharCode(183)} color = heritage layer</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px dashed " + T.muted, boxSizing: "border-box", flexShrink: 0 }} /><span>wireframe = period not yet standardized</span></div>
              {Object.entries(SOURCES).filter(([id, d]) => d.kind === "point" && srcOn.has(id)).map(([id, d]) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>{shapeGlyph(d.shape, d.color, true)}<span>{d.label}</span></div>
              ))}
              <div style={{ color: T.muted2, marginTop: 2 }}>taller column = older origin {String.fromCharCode(183)} bright = already begun by {fy(year)}</div>
            </div>
            {hov && (!sel || sel.id !== hov.id) && (
              <div aria-hidden="true" style={{ position: "absolute", top: 14, right: 14, background: T.tooltip, border: "1px solid " + (SOURCES[hov.src].kind === "point" ? SOURCES[hov.src].color : LC[hov.ht]) + "66", borderRadius: 9, padding: "10px 14px", maxWidth: 300, pointerEvents: "none", zIndex: 20, backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: rem(13), fontWeight: 600, marginBottom: 3, color: T.text }}>{hov.n}</div>
                {SOURCES[hov.src].kind === "point"
                  ? <div style={{ fontSize: rem(11), color: theme === "light" ? darkenForLight(SOURCES[hov.src].color) : SOURCES[hov.src].color, marginTop: 2 }}>{hov.ot} {String.fromCharCode(183)} {hov.ci ? hov.ci + ", " : ""}{hov.c}</div>
                  : <><div style={{ fontSize: rem(11), color: T.muted }}>{hov.c} {String.fromCharCode(183)} {hov.ap || "undated"}</div>
                    <div style={{ fontSize: rem(11), color: TLC[hov.ht], marginTop: 3 }}>{LI[hov.ht]} {hov.ht}</div></>}
              </div>
            )}
            {helpOpen && (
              <div ref={helpRef} role="dialog" aria-modal="true" aria-label="How to read this map" tabIndex={-1}
                onKeyDown={e => { if (e.key === "Escape") setHelpOpen(false); }}
                style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 420, maxWidth: "calc(100% - 40px)", maxHeight: "calc(100% - 40px)", overflowY: "auto", background: T.popover, border: "1px solid " + T.accentDim, borderRadius: 12, padding: "20px 24px", zIndex: 50, boxShadow: "0 12px 48px rgba(0,0,0,0.4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: rem(18), margin: 0, color: T.text }}>How to read this map</h2>
                  <button onClick={() => setHelpOpen(false)} aria-label="Close help" style={{ background: "none", border: "none", color: T.strong, fontSize: rem(20), cursor: "pointer", minWidth: 28, minHeight: 28 }}><span aria-hidden="true">{String.fromCharCode(215)}</span></button>
                </div>
                <div style={{ fontSize: rem(12.5), color: T.body, lineHeight: 1.7 }}>
                  <p style={{ margin: "0 0 10px" }}>Five dimensions, one scene:</p>
                  <p style={{ margin: "0 0 10px" }}><b style={{ color: T.text }}>1–2. Where.</b> Longitude and latitude on the base map. Overseas territories sit on the dashed inset tiles in the Atlantic.</p>
                  <p style={{ margin: "0 0 10px" }}><b style={{ color: T.text }}>3. When it began.</b> Pin height: the older a site's origin, the taller its pin. Sites older than 5000 BCE clamp to the top.</p>
                  <p style={{ margin: "0 0 10px" }}><b style={{ color: T.text }}>4. Time itself.</b> The timeline sweeps a translucent "now" plane down through history. A site lights up when its origin year arrives and stays lit, since heritage sites still exist today, so as you sweep forward you watch them accumulate. The detail panel still shows each site's original period of creation or use.</p>
                  <p style={{ margin: "0 0 10px" }}><b style={{ color: T.text }}>5. What kind.</b> Color encodes the heritage layer (religion, technology, urban...). Marker shape encodes the data source.</p>
                  <p style={{ margin: "0 0 6px", color: T.muted }}>Drag to orbit, Shift-drag to pan, scroll to zoom. Keyboard: arrows orbit, Shift+arrows pan, plus/minus zoom. Click any pin or use the sites table (reachable by Tab) to open details. The sun/moon button switches between light and dark mode.</p>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: "12px 22px 15px", borderTop: "1px solid " + T.border, background: T.footer, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 9, flexWrap: "wrap" }}>
              <button onClick={() => setPlaying(p => !p)} aria-pressed={playing} aria-label={playing ? "Pause the time sweep" : "Play the time sweep"} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: playing ? T.danger : T.playGrad, color: "#fff", fontSize: rem(15), cursor: "pointer", flexShrink: 0 }}><span aria-hidden="true">{playing ? String.fromCharCode(10074, 10074) : String.fromCharCode(9654)}</span></button>
              <div style={{ flexShrink: 0, minWidth: 128 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: rem(24), fontWeight: 700, lineHeight: 1, color: T.text }}>{fy(year)}</div>
                <div style={{ fontSize: rem(10), color: T.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>Sweep year</div>
              </div>
              <button onClick={() => setFocusMode(f => !f)} aria-pressed={focusMode} style={{ ...S.btn, minHeight: 28, padding: "6px 12px", borderRadius: 16, color: focusMode ? T.accent : T.muted, borderColor: focusMode ? T.accentDim : T.border2, background: focusMode ? T.accentBg : T.btnBg }}>Spotlight active</button>
              <div style={{ flex: 1 }} />
              <div role="group" aria-label="Jump to era" style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {ERAS.map(([label, y]) => {
                  const on = Math.abs(year - y) < 60; return (
                    <button key={label} onClick={() => { setPlaying(false); setYear(y); yearRef.current = y; }} aria-pressed={on} style={{ ...S.btn, minHeight: 26, padding: "5px 11px", borderRadius: 14, fontWeight: on ? 700 : 400, color: on ? T.hot : T.muted, borderColor: on ? T.hotBorder : T.border2 }}>{label}</button>
                  );
                })}
              </div>
            </div>
            <div ref={seekRef} role="slider" tabIndex={0}
              aria-label="Timeline year"
              aria-valuemin={-3000} aria-valuemax={2025} aria-valuenow={year} aria-valuetext={fy(year)}
              onKeyDown={onSeekKey}
              style={{ position: "relative", height: 46, userSelect: "none", cursor: "pointer" }}
              onPointerDown={e => { const r = seekRef.current.getBoundingClientRect(); const p = (e.clientX - r.left) / r.width; const y = Math.round(-3000 + p * 5025); setPlaying(false); setYear(y); yearRef.current = y; seekDrag.current = true; }}>
              <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, height: 28, display: "flex", alignItems: "flex-end", pointerEvents: "none" }}>
                {hg.bars.map((v, i) => <div key={i} style={{ flex: 1, height: (v * 100) + "%", background: `linear-gradient(to top,${T.histA},${T.histB})`, minHeight: v > 0 ? 1 : 0 }} />)}
              </div>
              <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, height: 1, background: T.border3 }} />
              <div style={{ position: "absolute", top: 0, bottom: 8, left: seekPct + "%", width: 2, background: T.accent, boxShadow: "0 0 8px " + T.accent, transform: "translateX(-50%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: -2, left: seekPct + "%", width: 11, height: 11, borderRadius: "50%", background: T.accent, border: "2px solid " + T.thumbBorder, transform: "translateX(-50%)", pointerEvents: "none", boxShadow: "0 0 8px " + T.accent }} />
              {[[-3000, "3000BCE"], [-1000, "1000BCE"], [0, "0"], [1000, "1000"], [1500, "1500"], [2000, "2000"]].map(([y, l]) => (
                <div key={y} style={{ position: "absolute", bottom: 0, left: ((y + 3000) / 5025 * 100) + "%", fontSize: rem(9), color: T.muted2, transform: "translateX(-50%)", pointerEvents: "none" }}>{l}</div>
              ))}
            </div>
            {undatedCount > 0 && <div style={{ fontSize: rem(10), color: T.muted, marginTop: 4 }}>{undatedCount} site{undatedCount > 1 ? "s" : ""} undated (shown as wireframe markers, period needs standardizing)</div>}
          </div>
        </div>

        {sel && (
          <div role="region" aria-label={`Details: ${sel.n}`} className="tm-details">
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid " + T.border }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 10, background: selAccent + "1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: rem(20) }}>{isPt ? "\u{1F3DB}️" : (LI[sel.ht] || "\u{1F4CD}")}</div>
                <button onClick={() => setSel(null)} aria-label="Close details panel" style={{ background: "none", border: "none", color: T.strong, fontSize: rem(21), cursor: "pointer", minWidth: 28, minHeight: 28, padding: "0 4px" }}><span aria-hidden="true">{String.fromCharCode(215)}</span></button>
              </div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: rem(19), fontWeight: 700, margin: "10px 0 8px", lineHeight: 1.3, color: T.text }}>{sel.n}</h2>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {isPt
                  ? <><span style={{ padding: "2px 9px", borderRadius: 14, fontSize: rem(10.5), fontWeight: 500, background: selAccent + "1c", color: theme === "light" ? darkenForLight(selDef.color) : selDef.color }}>{sel.ot}</span>
                    <span style={{ padding: "2px 9px", borderRadius: 14, fontSize: rem(10.5), background: T.chipBg, color: T.faint }}>{selDef.label}</span></>
                  : <><span style={{ padding: "2px 9px", borderRadius: 14, fontSize: rem(10.5), fontWeight: 500, background: selAccent + "1c", color: TLC[sel.ht] }}>{sel.ht}</span>
                    <span style={{ padding: "2px 9px", borderRadius: 14, fontSize: rem(10.5), background: T.chipBg, color: T.faint }}>{sel.uc}</span></>}
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {isPt ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13, marginBottom: 18 }}>
                    {(sel.src === "echo"
                      ? [["City", sel.ci], ["Country", sel.c], ["Role", sel.role], ["Network", sel.net], ["Source", selDef.label]]
                      : [["City", sel.ci], ["Country", sel.c], ["Type", sel.ot], ["Founded", sel.sy != null ? fy(sel.sy) : "no data"], ["Network", sel.net], ["Source", selDef.label]]
                    ).filter(x => x[1]).map(([l, v]) => (
                      <div key={l}><div style={{ fontSize: rem(9), textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, marginBottom: 2 }}>{l}</div><div style={{ fontSize: rem(12), color: T.body }}>{v || "N/A"}</div></div>
                    ))}
                  </div>
                  {sel.net && <div style={{ fontSize: rem(10.5), color: theme === "light" ? darkenForLight(selDef.color) : selDef.color, marginBottom: 12, padding: "5px 10px", background: selDef.color + "18", border: "1px solid " + selDef.color + "33", borderRadius: 6, display: "inline-block" }}>Also part of: {sel.net}</div>}
                  <div style={{ fontSize: rem(11), color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>{sel.src === "echo" ? (sel.assoc ? "ECHO associated partner, placed at its location. No time dimension yet." : "ECHO consortium partner, placed at its location. No time dimension yet.") : sel.sy != null ? "Column height marks the founding year; the museum stands from then to the present." : "No founding year on record yet."}</div>
                  {sel.w && <a href={sel.w} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "9px 14px", background: T.btnBg, border: "1px solid " + T.border2, borderRadius: 7, color: theme === "light" ? darkenForLight(selDef.color) : selDef.color, fontSize: rem(12), textDecoration: "none", textAlign: "center" }}>{"Visit website " + String.fromCharCode(8594)}</a>}
                </>
              ) : (
                <>
                  <p style={{ fontSize: rem(12.5), color: T.muted, lineHeight: 1.65, margin: "0 0 18px" }}>{sel.d}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13, marginBottom: 18 }}>
                    {[["Country", sel.c], ["City", sel.ci], ["Period", (sel.ap || "undated") + (sel.og ? " (ongoing)" : "")], ["Inscribed", sel.yi], ["UNESCO criteria", sel.cr], ["Source", selDef.label], ["Note", sel.ov ? "overseas territory (shown on inset tile)" : null]].filter(x => x[1] != null).map(([l, v]) => (
                      <div key={l}><div style={{ fontSize: rem(9), textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, marginBottom: 2 }}>{l}</div><div style={{ fontSize: rem(12), color: T.body }}>{v || "N/A"}</div></div>
                    ))}
                  </div>
                  {(sel.natural_top || sel.ht === "natural") ? (
                    <div style={{ fontSize: rem(11), color: T.muted, lineHeight: 1.6, marginBottom: 18 }}>Natural site: a landscape or formation with no human start date. It sits at the top of the time axis and reads as always present.</div>
                  ) : sel.sy != null ? (
                    <>
                      <div style={{ fontSize: rem(9), textTransform: "uppercase", letterSpacing: "0.1em", color: T.muted, marginBottom: 6 }}>Period of creation / use{sel.fl === "geological" ? " (geological, approximate)" : ""}{sel.sy < -3000 ? " (begins before the timeline range)" : ""}</div>
                      <div style={{ position: "relative", height: 26, background: T.barBg, borderRadius: 5, overflow: "hidden", marginBottom: 6 }}>
                        <div style={{ position: "absolute", height: "100%", borderRadius: 5, left: Math.max(0, (sel.sy + 3000) / 5025 * 100) + "%", width: Math.min(100, Math.max(1.5, ((sel.og ? 2025 : sel.ey) - Math.max(sel.sy, -3000)) / 5025 * 100)) + "%", background: "linear-gradient(90deg," + LC[sel.ht] + "66," + LC[sel.ht] + "28)" }} />
                        <span style={{ position: "absolute", left: 6, top: 6, fontSize: rem(10), color: T.muted2 }}>{fy(sel.sy)}</span>
                        <span style={{ position: "absolute", right: 6, top: 6, fontSize: rem(10), color: T.muted2 }}>{sel.og ? "present" : fy(sel.ey)}</span>
                      </div>
                      <div style={{ fontSize: rem(10), color: T.muted, marginBottom: 18, lineHeight: 1.5 }}>Origin <b style={{ color: T.body }}>{fy(sel.sy)}</b>. On the map the site stands from this origin and persists to the present, since it still exists today.</div>
                    </>
                  ) : <div style={{ fontSize: rem(11), color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>No standardized period yet. Source value: {sel.ap ? '"' + sel.ap + '"' : "blank"}. Flagged for the data-cleaning pass.</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {sel.up && <a href={sel.up} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "9px 14px", background: T.btnBg, border: "1px solid " + T.border2, borderRadius: 7, color: T.faint, fontSize: rem(12), textDecoration: "none", textAlign: "center" }}>{"UNESCO listing " + String.fromCharCode(8594)}</a>}
                    {sel.ow && <a href={sel.ow} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "9px 14px", background: T.btnBg, border: "1px solid " + T.border2, borderRadius: 7, color: T.faint, fontSize: rem(12), textDecoration: "none", textAlign: "center" }}>{"Official site " + String.fromCharCode(8594)}</a>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function isPtColor(T, theme) { return theme === "light" ? darkenForLight("#E0A93B") : "#E0A93B"; }
