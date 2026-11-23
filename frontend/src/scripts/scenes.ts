// @ts-nocheck — ported as-is from the approved prototype (three r128 API).
// Home: a fixed, scroll-driven stage (#stage + #story). Other pages: one
// hero canvas each ([data-scene="sell" | "deliver" | "contact"]).
import * as THREE from 'three';

const reduce = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let gl = false;
try { const tc = document.createElement('canvas'); gl = !!(tc.getContext('webgl') || tc.getContext('experimental-webgl')); } catch (e) {}
if (!gl) {
  document.querySelectorAll<HTMLElement>('#stage, [data-scene]').forEach((c) => { c.hidden = true; });
} else {
  start();
}

function start() {
  function makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    return r;
  }
  function studio(renderer, scene) {
    const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
    env.background = new THREE.Color(0.32, 0.31, 0.34);
    const panel = (w, h, x, y, z, ry, rx, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = rx; env.add(m); };
    panel(10, 4, 0, 9, 2, 0, Math.PI / 2, new THREE.Color(5, 5, 5));
    panel(4, 8, -9, 1, 2, Math.PI / 2, 0, new THREE.Color(2.4, 2.4, 2.6));
    panel(3, 8, 9, 0, -1, -Math.PI / 2, 0, new THREE.Color(2.6, 1.3, 2.0));
    panel(8, 3, 0, 1, 10, Math.PI, 0, new THREE.Color(1.6, 1.6, 1.6));
    scene.environment = pm.fromScene(env, 0.03).texture; pm.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xead7e2, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 7, 8); scene.add(key);
  }
  const C = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  function mat(hex, rough, o?) { const p = { color: C(hex), roughness: rough, metalness: 0 }; if (o) Object.assign(p, o); return new THREE.MeshPhysicalMaterial(p); }
  function wobble(geo, amt, f) {
    const pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const n = 1 + amt * (Math.sin(v.x * f + 1.3) * Math.sin(v.y * f * 1.3) + Math.sin(v.z * f * 0.9 + v.y * 2.1) * 0.6); v.multiplyScalar(n); pos.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals(); return geo;
  }
  function roundedBox(w, h, d, r) {
    const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r;
    s.moveTo(-w / 2, y); s.lineTo(-w / 2, h / 2 - r); s.quadraticCurveTo(-w / 2, h / 2, x, h / 2);
    s.lineTo(w / 2 - r, h / 2); s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
    s.lineTo(w / 2, y); s.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2);
    s.lineTo(x, -h / 2); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2, y);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - r), bevelEnabled: true, bevelThickness: r / 2, bevelSize: r / 2, bevelSegments: 4, curveSegments: 10 });
    g.center(); return g;
  }
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; }

  /* the real Zyppi Z mark */
  const zImg = new Image(), zHooks = [];
  const onZ = (f) => { zHooks.push(f); if (zImg.complete && zImg.naturalWidth) f(); };
  zImg.onload = () => zHooks.forEach((f) => f());
  zImg.src = '/zyppi-mark.png';
  function drawZ(c, x, y, s) {
    if (!(zImg.complete && zImg.naturalWidth)) return;
    c.save(); c.beginPath(); const r = s * 0.22;
    c.moveTo(x + r, y); c.arcTo(x + s, y, x + s, y + s, r); c.arcTo(x + s, y + s, x, y + s, r); c.arcTo(x, y + s, x, y, r); c.arcTo(x, y, x + s, y, r);
    c.closePath(); c.clip(); c.drawImage(zImg, x, y, s, s); c.restore();
  }
  let shadowTex = null;
  function shadowPlane(parent, w, d) {
    if (!shadowTex) shadowTex = canvasTex(256, 256, (c, W, H) => { const gr = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); gr.addColorStop(0, 'rgba(40,20,40,0.55)'); gr.addColorStop(0.5, 'rgba(40,20,40,0.18)'); gr.addColorStop(1, 'rgba(40,20,40,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; parent.add(m); return m;
  }
  function logoTexture(bg, fg, word) {
    const t = canvasTex(512, 512, () => {});
    const draw = () => { const c = t.image.getContext('2d'); c.fillStyle = bg; c.fillRect(0, 0, 512, 512); drawZ(c, 186, 70, 140); c.fillStyle = fg; c.font = '800 118px Sora, Manrope, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(word, 256, 330); t.needsUpdate = true; };
    draw(); onZ(draw); document.fonts?.ready.then(draw); return t;
  }

  /* ---- products ---- */
  function iceCreamCone() {
    const g = new THREE.Group();
    const waffle = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#d99a52'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a86a2c'; c.lineWidth = 7; for (let i = -h; i < w + h; i += 34) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i, h); c.lineTo(i + h, 0); c.stroke(); } });
    waffle.wrapS = waffle.wrapT = THREE.RepeatWrapping; waffle.repeat.set(2, 1.4);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.05, 40, 1, true), mat(0xffffff, 0.75, { map: waffle, side: THREE.DoubleSide })); cone.rotation.x = Math.PI; cone.position.y = -0.52; g.add(cone);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 12, 40), mat(0xc98942, 0.7)); lip.rotation.x = Math.PI / 2; g.add(lip);
    const st = new THREE.Mesh(wobble(new THREE.SphereGeometry(0.38, 64, 48), 0.035, 9), mat(0xf7a8c4, 0.55)); st.position.y = 0.2; st.scale.set(1, 0.9, 1); g.add(st);
    const drip = new THREE.Mesh(wobble(new THREE.TorusGeometry(0.33, 0.07, 16, 48), 0.08, 12), mat(0xf7a8c4, 0.55)); drip.rotation.x = Math.PI / 2; drip.position.y = 0.05; g.add(drip);
    const ch = new THREE.Mesh(wobble(new THREE.SphereGeometry(0.32, 64, 48), 0.04, 10), mat(0x6a3a22, 0.45, { clearcoat: 0.3 })); ch.position.y = 0.62; ch.scale.set(1, 0.9, 1); g.add(ch);
    const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 24), mat(0xd3132e, 0.15, { clearcoat: 1 })); cherry.position.set(0.04, 0.95, 0.02); g.add(cherry);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.04, 1.0, 0.02), new THREE.Vector3(0.06, 1.1, 0), new THREE.Vector3(0.13, 1.17, -0.02)]), 12, 0.012, 6), mat(0x5a3a1a, 0.6)));
    const colors = [0xffd23f, 0x3fb8ff, 0xffffff, 0x7bd389, 0xff5e8a];
    for (let i = 0; i < 26; i++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 6), mat(colors[i % 5], 0.4));
      const th = (i * 2.399) % (Math.PI * 2), ph = 0.2 + (i % 7) * 0.13;
      sp.position.set(Math.sin(ph) * Math.cos(th) * 0.3, 0.62 + Math.cos(ph) * 0.3, Math.sin(ph) * Math.sin(th) * 0.3);
      sp.rotation.set(i * 0.7, i * 1.3, i * 0.4); g.add(sp);
    }
    return g;
  }
  let chocoLabel = null;
  function chocolateBar() {
    const g = new THREE.Group(), dark = mat(0x4b2414, 0.32, { clearcoat: 0.6, clearcoatRoughness: 0.35 });
    g.add(new THREE.Mesh(roundedBox(0.9, 1.3, 0.08, 0.03), dark));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const b = new THREE.Mesh(roundedBox(0.25, 0.27, 0.09, 0.035), dark); b.position.set(-0.29 + c * 0.29, 0.47 - r * 0.31, 0.065); g.add(b); }
    const foil = new THREE.Mesh(wobble(new THREE.BoxGeometry(0.96, 0.62, 0.2, 12, 8, 2), 0.03, 22), mat(0xd9b25b, 0.28, { metalness: 0.9 })); foil.position.y = -0.36; g.add(foil);
    const wrap = new THREE.Mesh(roundedBox(1.0, 0.5, 0.24, 0.05), mat(0xd4127b, 0.4, { clearcoat: 0.7 })); wrap.position.y = -0.44; g.add(wrap);
    if (!chocoLabel) chocoLabel = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#d4127b'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '800 120px Sora, Manrope, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('choco', w / 2, h / 2 + 6); });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.38), mat(0xffffff, 0.4, { map: chocoLabel, clearcoat: 0.6 })); face.position.set(0, -0.44, 0.125); g.add(face);
    return g;
  }
  function iceBar() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(roundedBox(0.5, 0.85, 0.22, 0.2), mat(0x5a2d1a, 0.3, { clearcoat: 0.8, clearcoatRoughness: 0.2 })); body.position.y = 0.15; g.add(body);
    const stick = new THREE.Mesh(roundedBox(0.12, 0.5, 0.07, 0.03), mat(0xe2c08a, 0.8)); stick.position.y = -0.42; g.add(stick);
    const pts = []; for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(-0.2 + (i % 2) * 0.4, 0.45 - i * 0.075, 0.125));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.018, 8), mat(0xf7a8c4, 0.4, { clearcoat: 0.6 })));
    return g;
  }
  function tub() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.52, 48, 1, true), mat(0xffffff, 0.3, { clearcoat: 0.6, side: THREE.DoubleSide })));
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), mat(0xffffff, 0.3)); base.rotation.x = Math.PI / 2; base.position.y = -0.26; g.add(base);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.38, 0.2, 48, 1, true), mat(0x673ab7, 0.35, { clearcoat: 0.5, side: THREE.DoubleSide })));
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.07, 48), mat(0xd4127b, 0.35, { clearcoat: 0.7 })); lid.position.y = 0.29; g.add(lid);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.02, 48), mat(0xe8429a, 0.35)); top.position.y = 0.335; g.add(top);
    return g;
  }
  function truffle(dust) { const g = new THREE.Group(); g.add(new THREE.Mesh(wobble(new THREE.SphereGeometry(0.17, 40, 30), 0.06, 14), mat(dust ? 0x6b3b22 : 0x3a1a0e, dust ? 0.95 : 0.3, dust ? null : { clearcoat: 0.8 }))); return g; }
  function tomato() {
    const g = new THREE.Group(), b = new THREE.Mesh(wobble(new THREE.SphereGeometry(0.36, 48, 32), 0.02, 6), mat(0xe2342b, 0.3, { clearcoat: 0.9, clearcoatRoughness: 0.2 })); b.scale.set(1, 0.84, 1); g.add(b);
    const lm = mat(0x2f8f3a, 0.6); for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.2), lm); l.position.y = 0.3; l.rotation.y = i * 1.2566; l.translateZ(0.08); l.rotation.x = -0.3; g.add(l); }
    return g;
  }
  function milk() {
    const g = new THREE.Group(), w = mat(0xffffff, 0.35, { clearcoat: 0.5 });
    g.add(new THREE.Mesh(roundedBox(0.46, 0.72, 0.46, 0.04), w));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.33, 0.24, 4, 1), w); roof.rotation.y = Math.PI / 4; roof.position.y = 0.48; g.add(roof);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.22, 0.47), mat(0x673ab7, 0.4, { clearcoat: 0.4 })); band.position.y = -0.06; g.add(band);
    return g;
  }
  function greens() {
    const g = new THREE.Group(), lm = mat(0x3fa34d, 0.5, { side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), lm); l.scale.set(0.8, 2.2, 0.22); const a = (i - 2.5) * 0.26; l.position.set(Math.sin(a) * 0.28, 0.28, 0); l.rotation.set(0, i * 0.5, a); g.add(l); }
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.3, 12), mat(0xa9d18e, 0.6)); st.position.y = -0.24; g.add(st);
    return g;
  }
  function chilli() {
    const g = new THREE.Group(), red = mat(0xd9221c, 0.25, { clearcoat: 1 });
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.38, 0.05, 0), new THREE.Vector3(-0.08, -0.05, 0), new THREE.Vector3(0.2, 0.02, 0), new THREE.Vector3(0.4, 0.2, 0)]), 48, 0.065, 16), red));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), red); tip.position.set(0.4, 0.2, 0); g.add(tip);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.05, 0.16, 10), mat(0x2f8f3a, 0.6)); st.position.set(-0.45, 0.09, 0); st.rotation.z = 1.1; g.add(st);
    return g;
  }

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const seg = (s, a, b) => ease((s - a) / (b - a));
  const backOut = (x) => { x = clamp(x, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  /* ================= HOME: fixed, scroll-driven ================= */
  function homeScene(canvas, story) {
    const storyProgress = () => { const r = story.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight))); };
    const renderer = makeRenderer(canvas), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 14); studio(renderer, scene);
    const stage = new THREE.Group(); scene.add(stage);
    const defs = [
      { make: iceCreamCone, home: [0.05, 0.25, 1.3], rot: [0.15, -0.4, -0.12], size: 1.3, spin: 0.25 },
      { make: chocolateBar, home: [-1.25, -0.55, 0.9], rot: [-0.25, 0.55, 0.22], size: 1.05, spin: 0.18 },
      { make: iceBar, home: [1.3, 0.75, 0.6], rot: [0.1, -0.5, 0.35], size: 1.0, spin: 0.3 },
      { make: tub, home: [1.25, -0.95, 0.5], rot: [0.35, 0.3, -0.12], size: 1.0, spin: 0.22 },
      { make: () => truffle(false), home: [-0.25, -1.45, 1.4], rot: [0, 0, 0], size: 1.0, spin: 0.5 },
      { make: () => truffle(true), home: [0.3, -1.3, 1.7], rot: [0, 0, 0], size: 1.0, spin: 0.5 },
      { make: tomato, home: [-1.55, 0.85, 0.1], rot: [0.3, 0.2, 0.1], size: 0.9, spin: 0.35 },
      { make: milk, home: [-0.55, 1.6, -0.6], rot: [0.2, 0.6, -0.2], size: 0.9, spin: 0.25 },
      { make: greens, home: [1.75, 1.55, -0.9], rot: [0.1, 0.3, -0.5], size: 0.85, spin: 0.3 },
      { make: chilli, home: [-1.75, -0.15, -0.4], rot: [0.4, 0.2, 1.2], size: 0.85, spin: 0.4 },
    ];
    const N = defs.length;
    const items = defs.map((d, i) => {
      const obj = d.make(); stage.add(obj); const ang = (i / N) * Math.PI * 2;
      return { obj, home: new THREE.Vector3().fromArray(d.home), rot0: new THREE.Euler().fromArray(d.rot), size: d.size, spinRate: d.spin,
        slot: new THREE.Vector3(Math.cos(ang) * 0.3, 0.62 + (i % 3) * 0.12, Math.sin(ang) * 0.12), pos: new THREE.Vector3().fromArray(d.home), vel: new THREE.Vector3(), landed: false, phase: i * 1.7, start: 0.1 + i * 0.03 };
    });
    const clusterShadow = shadowPlane(stage, 4.4, 1.6); clusterShadow.position.set(0, -2.2, 0.6);
    const bagShadow = shadowPlane(stage, 2.4, 1.2);
    const bag = new THREE.Group(); stage.add(bag); const bagBody = new THREE.Group(); bag.add(bagBody);
    const W = 1.5, H = 1.7, D = 0.95;
    function fibers(c, w, h) {
      c.fillStyle = '#c69c6a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { const x = (i * 97) % w, y = (i * 211) % h, l = 3 + (i % 9), a = i * 0.7;
        c.strokeStyle = 'rgba(' + (i % 2 ? '96,62,28' : '232,198,150') + ',' + (0.05 + ((i * 37) % 60) / 1000) + ')'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + l * Math.cos(a), y + l * Math.sin(a) * 0.35); c.stroke(); }
    }
    const kraftTex = canvasTex(256, 256, fibers);
    const gussetTex = canvasTex(256, 256, (c, w, h) => {
      fibers(c, w, h);
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(60,35,10,.06)'); g.addColorStop(0.47, 'rgba(60,35,10,.22)'); g.addColorStop(0.5, 'rgba(255,240,215,.22)'); g.addColorStop(0.53, 'rgba(60,35,10,.12)'); g.addColorStop(1, 'rgba(60,35,10,.04)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(60,35,10,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2, h * 0.78); c.lineTo(0, h); c.moveTo(w / 2, h * 0.78); c.lineTo(w, h); c.stroke();
    });
    const kraft = mat(0xffffff, 0.9, { map: kraftTex, side: THREE.DoubleSide });
    const gusset = mat(0xffffff, 0.9, { map: gussetTex, side: THREE.DoubleSide });
    const frontTex = canvasTex(512, 580, () => {});
    const drawFront = () => {
      const c = frontTex.image.getContext('2d'); fibers(c, 512, 580);
      const g = c.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, 'rgba(60,35,10,.22)'); g.addColorStop(1, 'rgba(60,35,10,0)'); c.fillStyle = g; c.fillRect(0, 0, 512, 70);
      drawZ(c, 209, 232, 94);
      c.fillStyle = '#D4127B'; c.font = '800 108px Sora, Manrope, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('zyppi', 256, 398);
      c.fillStyle = '#D4127B'; c.fillRect(0, 462, 512, 10);
      c.fillStyle = '#673AB7'; c.fillRect(0, 472, 512, 108);
      c.fillStyle = 'rgba(255,255,255,.08)'; for (let k = -580; k < 512; k += 22) { c.beginPath(); c.moveTo(k, 580); c.lineTo(k + 108, 472); c.lineTo(k + 116, 472); c.lineTo(k + 8, 580); c.fill(); }
      c.fillStyle = '#ffffff'; c.font = '700 36px Manrope, Sora, sans-serif'; c.fillText('Fresh from Chelyama', 256, 528);
      frontTex.needsUpdate = true;
    };
    drawFront(); onZ(drawFront); document.fonts?.ready.then(drawFront);
    const bp = (w, h, m?) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m || kraft);
    const front = bp(W, H, mat(0xffffff, 0.88, { map: frontTex, side: THREE.DoubleSide })); front.position.z = D / 2; bagBody.add(front);
    const back = bp(W, H); back.position.z = -D / 2; bagBody.add(back);
    const left = bp(D, H, gusset); left.rotation.y = Math.PI / 2; left.position.x = -W / 2; bagBody.add(left);
    const right = bp(D, H, gusset); right.rotation.y = -Math.PI / 2; right.position.x = W / 2; bagBody.add(right);
    const bottom = bp(W, D); bottom.rotation.x = Math.PI / 2; bottom.position.y = -H / 2; bagBody.add(bottom);
    const rimM = mat(0xa57a4c, 0.85);
    [D / 2, -D / 2].forEach((z) => { const r = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.06, 0.03), rimM); r.position.set(0, H / 2, z); bagBody.add(r); });
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, H / 2, -D / 2); bagBody.add(lidPivot);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.03, D + 0.02), kraft); lid.position.z = (D + 0.02) / 2; lidPivot.add(lid);
    const flapPivot = new THREE.Group(); flapPivot.position.set(0, H / 2 + 0.035, D / 2 + 0.008); bagBody.add(flapPivot);
    const flapTex = canvasTex(512, 120, (c, w, h) => { fibers(c, w, h); c.fillStyle = 'rgba(60,35,10,.12)'; c.fillRect(0, 0, w, h); c.fillStyle = '#D4127B'; c.fillRect(0, 0, w, 12); c.fillStyle = 'rgba(60,35,10,.22)'; c.fillRect(0, h - 6, w, 6); });
    const flap = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.02, 0.34), mat(0xffffff, 0.9, { map: flapTex, side: THREE.DoubleSide })); flap.position.y = 0.17; flapPivot.add(flap);
    const seal = new THREE.Group(); seal.position.set(0, 0.33, -0.014); seal.rotation.set(Math.PI, 0, 0); flapPivot.add(seal);
    seal.add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), mat(0xd4127b, 0.3, { clearcoat: 0.9 })));
    const cw = mat(0xffffff, 0.4);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.01), cw); c1.position.set(-0.045, -0.02, 0.005); c1.rotation.z = -0.8; seal.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.01), cw); c2.position.set(0.04, 0.02, 0.005); c2.rotation.z = 0.85; seal.add(c2);
    const door = new THREE.Group(); stage.add(door);
    const frameM = mat(0xffffff, 0.4, { clearcoat: 0.4 });
    const fl = new THREE.Mesh(roundedBox(0.12, 2.1, 0.2, 0.03), frameM); fl.position.x = -0.62; door.add(fl);
    const fr = fl.clone(); fr.position.x = 0.62; door.add(fr);
    const ft = new THREE.Mesh(roundedBox(1.36, 0.12, 0.2, 0.03), frameM); ft.position.y = 1.05; door.add(ft);
    const hinge = new THREE.Group(); hinge.position.set(-0.56, 0, 0); door.add(hinge);
    const panelD = new THREE.Mesh(roundedBox(1.12, 1.98, 0.08, 0.03), mat(0xd4127b, 0.3, { clearcoat: 0.8 })); panelD.position.x = 0.56; hinge.add(panelD);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), mat(0xf2c14e, 0.2, { metalness: 0.9 })); knob.position.set(0.96, 0, 0.07); hinge.add(knob);
    const light = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.96), new THREE.MeshBasicMaterial({ color: C(0xfff1d6) })); light.position.z = -0.03; door.add(light);
    const stepM = new THREE.Mesh(roundedBox(1.7, 0.1, 0.7, 0.03), mat(0xe9e9ef, 0.6)); stepM.position.set(0, -1.05, 0.3); door.add(stepM);
    const doormat = new THREE.Mesh(roundedBox(0.95, 0.03, 0.42, 0.01), mat(0xa50d5f, 0.85)); doormat.position.set(0, -0.99, 0.36); door.add(doormat);
    const routeCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.6, -0.2, 0.6), new THREE.Vector3(0.1, -0.15, 0.9), new THREE.Vector3(0.45, -0.25, 0.65), new THREE.Vector3(0.75, -0.35, 0.55)]);
    const routePts = new THREE.CatmullRomCurve3(routeCurve.getPoints(60).map((p) => new THREE.Vector3(p.x, -2.05, p.z)));
    const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePts.getPoints(90)), new THREE.LineDashedMaterial({ color: C(0xd4127b), dashSize: 0.07, gapSize: 0.07, transparent: true, opacity: 0.85 }));
    route.computeLineDistances(); stage.add(route);

    let vw = 0, vh = 0, isPhone = false, baseScale = 1, baseX = 0;
    function layout() {
      vw = window.innerWidth; vh = window.innerHeight; isPhone = vw < 900;
      renderer.setSize(vw, vh, false); camera.aspect = vw / vh; camera.updateProjectionMatrix();
      const hh = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, hw = hh * camera.aspect;
      if (isPhone) {
        // Centre the cluster on the hero's visual box (below the header), sized to fit inside it.
        const box = document.querySelector('.hero .visual')?.getBoundingClientRect();
        if (box && box.height > 0) {
          const cy = box.top + window.scrollY + box.height / 2;
          baseScale = Math.min(hw / 2.5, (2 * hh * box.height / vh) / 4.7);
          stage.position.set(0, (1 - (2 * cy) / vh) * hh, 0);
        } else { baseScale = Math.min(hw / 2.6, hh / 5.4); stage.position.set(0, hh * 0.4, 0); }
      }
      else { const wrapW = Math.min(1200, vw - 48), wrapL = (vw - wrapW) / 2, cx = (wrapL + wrapW * 0.8) / vw; baseScale = Math.min(hh / 3.3, hw / 4.1); stage.position.set((cx * 2 - 1) * hw - 0.3 * baseScale, -hh * 0.02, 0); }
      stage.scale.setScalar(baseScale); baseX = stage.position.x;
    }
    layout(); window.addEventListener('resize', layout);

    let sS = 0, heroS = 0, fadeS = 1, squash = 0, squashV = 0, lean = 0, prevBagX = 0, t0 = null;
    const cam = { x: 0, y: 0 }, bagPos = new THREE.Vector3(), tgt = new THREE.Vector3(), tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    return function frame(t, dt) {
      if (t0 === null) t0 = t;
      const intro = reduce ? 9 : t - t0;
      const r = story.getBoundingClientRect(), sT = storyProgress(), heroT = clamp(window.scrollY / vh, 0, 1);
      const after = clamp((vh - r.bottom) / (vh * 0.4), 0, 1), k = reduce ? 1 : 1 - Math.pow(0.0009, dt);
      sS += (sT - sS) * k; heroS += (heroT - heroS) * k; fadeS += ((1 - after) - fadeS) * k;
      if (after >= 1 && fadeS < 0.03) fadeS = 0;
      let vis = fadeS;
      if (isPhone) { const out = clamp((window.scrollY - 40) / 140, 0, 1), back2 = clamp((vh * 0.5 - r.top) / (vh * 0.5), 0, 1); vis *= Math.max(1 - out, back2); }
      canvas.style.opacity = vis.toFixed(3); canvas.style.visibility = vis < 0.01 ? 'hidden' : 'visible';
      if (vis < 0.01) return;
      const s = sS;
      const rise = seg(s, 0.02, 0.2), pack = seg(s, 0.52, 0.64), travel = seg(s, 0.7, 0.93), open = seg(s, 0.92, 1);
      const p = routeCurve.getPoint(travel);
      stage.position.x = baseX - (isPhone ? seg(s, 0.66, 0.95) * 1.75 * baseScale : 0);
      const floorY = -2.05 + (H / 2) * (0.78 + 0.22 * rise) * (1 - 0.22 * travel);
      bagPos.set(p.x, -0.2 - (1 - rise) * 5.2 + (floorY + 0.2) * travel, p.z);
      bagPos.y += reduce ? 0 : Math.abs(Math.sin(travel * Math.PI * 4)) * 0.16 * Math.sin(travel * Math.PI);
      bag.position.copy(bagPos); bag.visible = rise > 0.004;
      const vx = (bagPos.x - prevBagX) / Math.max(dt, 0.001); prevBagX = bagPos.x;
      lean += (clamp(-vx * 0.06, -0.18, 0.18) - lean) * 0.12;
      bag.rotation.set(0, -0.35 + travel * 0.5 + (reduce ? 0 : Math.sin(t * 0.6) * 0.04 * (1 - travel)), lean);
      const bs = (0.78 + 0.22 * rise) * (1 - 0.22 * travel);
      squashV += (-squash * 180 - squashV * 14) * dt; squash += squashV * dt;
      bagBody.scale.set(bs * (1 + squash * 0.5), bs * (1 - squash), bs * (1 + squash * 0.5));
      lidPivot.rotation.x = -(1 - pack) * 1.95; lid.visible = pack > 0.02;
      flapPivot.rotation.x = Math.PI * 0.965 * seg(s, 0.6, 0.69);
      seal.scale.setScalar(Math.max(0.0001, 0.72 * backOut(seg(s, 0.67, 0.76))));
      bagShadow.position.set(bagPos.x, -2.1, bagPos.z); bagShadow.material.opacity = rise * 0.9; bagShadow.scale.setScalar(0.6 + 0.4 * bs);
      const dIn = backOut(seg(s, 0.66, 0.8));
      door.position.set(2.75, -1.0, -0.7); door.rotation.y = -0.55; door.scale.setScalar(Math.max(0.0001, dIn * 0.95));
      hinge.rotation.y = -1.1 * open; light.visible = open > 0.02;
      route.geometry.setDrawRange(0, Math.floor(90 * seg(s, 0.68, 0.92)) + 1); route.visible = s > 0.68;
      let allIn = 0;
      items.forEach((it, i) => {
        const tIn = seg(s, it.start, it.start + 0.2); allIn += tIn;
        const pop = reduce ? 1 : backOut((intro - 0.15 - i * 0.07) / 0.8);
        const ang = heroS * 0.5, ca = Math.cos(ang), sa = Math.sin(ang);
        const hx = it.home.x * ca + it.home.z * sa, hz = -it.home.x * sa + it.home.z * ca;
        const bob = reduce ? 0 : Math.sin(t * 0.9 + it.phase) * 0.09, par = reduce || isPhone ? 0 : (it.home.z + 1) * 0.12;
        tmp.set(hx - cam.x * par, it.home.y + bob - heroS * 0.4 + cam.y * par, hz);
        tgt.copy(it.slot).multiplyScalar(bs).applyAxisAngle(up, bag.rotation.y).add(bagPos); tgt.y += squash * -0.2;
        tgt.lerpVectors(tmp, tgt, tIn); tgt.y += Math.sin(tIn * Math.PI) * 1.1;
        if (reduce) it.pos.copy(tgt);
        else { it.vel.x += ((tgt.x - it.pos.x) * 120 - it.vel.x * 16) * dt; it.vel.y += ((tgt.y - it.pos.y) * 120 - it.vel.y * 16) * dt; it.vel.z += ((tgt.z - it.pos.z) * 120 - it.vel.z * 16) * dt; it.pos.addScaledVector(it.vel, dt); }
        it.obj.position.copy(it.pos);
        const spin = reduce ? 0 : t * it.spinRate * (1 - tIn);
        it.obj.rotation.set(it.rot0.x + Math.sin(t * 0.5 + it.phase) * 0.12 * (1 - tIn) + tIn * Math.PI * 2, it.rot0.y + spin, it.rot0.z * (1 - tIn));
        it.obj.scale.setScalar(Math.max(0.0001, it.size * pop * (1 - 0.58 * tIn)));
        if (tIn > 0.97 && !it.landed) { it.landed = true; squashV += 1.6; }
        if (tIn < 0.9) it.landed = false;
        it.obj.visible = !(pack > 0.6 && tIn > 0.99);
      });
      clusterShadow.material.opacity = (1 - allIn / N) * 0.8 * Math.min(1, intro);
      cam.x += (mouse.x - cam.x) * 0.05; cam.y += (mouse.y - cam.y) * 0.05;
      if (!reduce && !isPhone) { camera.position.x = cam.x * 0.7; camera.position.y = -cam.y * 0.45; } else { camera.position.x = 0; camera.position.y = 0; }
      camera.lookAt(0, 0, 0); renderer.render(scene, camera);
    };
  }

  /* ================= hero scenes ================= */
  function heroScene(canvas, build) {
    const renderer = makeRenderer(canvas), scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 11); studio(renderer, scene);
    const root = new THREE.Group(); scene.add(root);
    const api = build(root); let w = 0, h = 0, t0 = null; const cam = { x: 0, y: 0 };
    const size = () => {
      const nw = canvas.clientWidth, nh = canvas.clientHeight; if (!nw || !nh) return false;
      if (nw !== w || nh !== h) { w = nw; h = nh; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
        const hh = Math.tan(THREE.MathUtils.degToRad(15)) * 11, hw = hh * camera.aspect; root.scale.setScalar(Math.min(hw * 2 / api.width, hh * 2 / api.height)); }
      return true;
    };
    return function frame(t, dt) {
      if (!size()) return; if (t0 === null) t0 = t;
      cam.x += (mouse.x - cam.x) * 0.05; cam.y += (mouse.y - cam.y) * 0.05;
      if (!reduce) { root.rotation.y = cam.x * 0.35; root.rotation.x = cam.y * 0.12; }
      api.update(reduce ? 99 : t - t0, dt); renderer.render(scene, camera);
    };
  }

  function buildSell(root) {
    const shop = new THREE.Group(); shop.position.set(-0.9, -0.2, 0); shop.rotation.y = 0.35; root.add(shop);
    const white = mat(0xffffff, 0.4, { clearcoat: 0.4 });
    const counter = new THREE.Mesh(roundedBox(2.3, 0.95, 1.0, 0.08), white); counter.position.y = -0.85; shop.add(counter);
    const stripe = new THREE.Mesh(roundedBox(2.32, 0.18, 1.02, 0.04), mat(0xd4127b, 0.35, { clearcoat: 0.6 })); stripe.position.y = -0.55; shop.add(stripe);
    const wall = new THREE.Mesh(roundedBox(2.3, 1.7, 0.1, 0.04), mat(0xf4f2f7, 0.6)); wall.position.set(0, 0.45, -0.45); shop.add(wall);
    const shelfM = mat(0xc49a68, 0.7);
    [0.05, 0.75].forEach((y) => { const s = new THREE.Mesh(roundedBox(2.1, 0.06, 0.45, 0.02), shelfM); s.position.set(0, y, -0.2); shop.add(s); });
    [-1.08, 1.08].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.5, 16), white); p.position.set(x, 0.55, 0.42); shop.add(p); });
    const aw = new THREE.Group(); aw.position.set(0, 1.75, 0.15); aw.rotation.x = 0.42; shop.add(aw);
    for (let i = 0; i < 8; i++) {
      const stp = new THREE.Mesh(roundedBox(0.3, 0.08, 1.0, 0.03), mat(i % 2 ? 0xffffff : 0xd4127b, 0.4, { clearcoat: 0.5 })); stp.position.x = -1.05 + i * 0.3; aw.add(stp);
      const sc = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(i % 2 ? 0xffffff : 0xd4127b, 0.4)); sc.rotation.x = Math.PI; sc.scale.set(1, 0.6, 0.4); sc.position.set(-1.05 + i * 0.3, -0.02, 0.5); aw.add(sc);
    }
    [[tub, -0.6, 0.27, 0.55], [milk, 0.05, 0.3, 0.55], [() => truffle(false), 0.55, 0.15, 0.9], [chocolateBar, -0.5, 1.0, 0.45], [iceBar, 0.1, 1.05, 0.5], [tomato, 0.62, 0.92, 0.6]]
      .forEach((d) => { const o = d[0](); o.position.set(d[1], d[2], -0.15); o.scale.setScalar(d[3]); o.rotation.y = 0.2; shop.add(o); });
    const phone = new THREE.Group(); phone.position.set(1.25, 0.35, 0.6); phone.rotation.set(0.05, -0.45, 0.06); root.add(phone);
    phone.add(new THREE.Mesh(roundedBox(1.0, 2.0, 0.12, 0.12), mat(0x15161b, 0.25, { clearcoat: 1 })));
    const rr = (x, X, Y, Wd, Ht, R) => { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + Wd, Y, X + Wd, Y + Ht, R); x.arcTo(X + Wd, Y + Ht, X, Y + Ht, R); x.arcTo(X, Y + Ht, X, Y, R); x.arcTo(X, Y, X + Wd, Y, R); x.closePath(); };
    const screenTex = canvasTex(400, 800, () => {});
    const drawScreen = () => {
      const c = screenTex.image.getContext('2d'), w = 400;
      c.fillStyle = '#fbfbfd'; c.fillRect(0, 0, w, 800);
      drawZ(c, 30, 46, 64);
      c.fillStyle = '#0b0b10'; c.font = '800 46px Sora, Manrope, sans-serif'; c.textBaseline = 'alphabetic'; c.fillText('zyppi', 108, 96);
      c.fillStyle = '#d4127b'; rr(c, 30, 170, 340, 190, 30); c.fill();
      c.fillStyle = '#fff'; c.font = '800 44px Sora, Manrope, sans-serif'; c.fillText('New order', 60, 250);
      c.font = '600 28px Manrope, sans-serif'; c.fillText('Tap to accept', 60, 305);
      c.fillStyle = '#eeeef3'; for (let i = 0; i < 4; i++) { rr(c, 30, 400 + i * 92, 340, 70, 18); c.fill(); }
      screenTex.needsUpdate = true;
    };
    drawScreen(); onZ(drawScreen); document.fonts?.ready.then(drawScreen);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 1.86), new THREE.MeshBasicMaterial({ map: screenTex })); screen.position.z = 0.065; phone.add(screen);
    const rings = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: C(0xd4127b), transparent: true, opacity: 0 })); r.position.copy(phone.position); r.rotation.copy(phone.rotation); root.add(r); return r; });
    const flyers = [iceCreamCone(), chocolateBar(), tub()]; flyers.forEach((f) => { f.visible = false; root.add(f); });
    const sh = shadowPlane(root, 5.2, 1.6); sh.position.set(0, -1.45, 0.3);
    const from = new THREE.Vector3(-0.6, 0.6, 0.4), to = new THREE.Vector3(1.2, 0.4, 0.75), pv = new THREE.Vector3();
    return { width: 4.6, height: 4.0, update(t) {
      shop.scale.setScalar(Math.max(0.0001, backOut(t / 0.9))); phone.scale.setScalar(Math.max(0.0001, backOut((t - 0.25) / 0.8)));
      phone.position.y = 0.35 + Math.sin(t * 1.2) * 0.06;
      const cyc = 2.6, k = Math.max(0, t - 1.2), n = Math.floor(k / cyc), f = (k % cyc) / cyc;
      flyers.forEach((o, i) => { o.visible = n % 3 === i && t > 1.2; });
      const o = flyers[n % 3], a = seg(f, 0, 0.55);
      pv.lerpVectors(from, to, a); pv.y += Math.sin(a * Math.PI) * 1.2; o.position.copy(pv);
      o.scale.setScalar(Math.max(0.0001, 0.55 * (1 - seg(f, 0.45, 0.6)) * backOut(f / 0.15)));
      o.rotation.set(a * 2.2, a * 3, 0.2);
      const ringT = seg(f, 0.55, 1);
      rings.forEach((r, i) => { const rt = clamp(ringT * 1.2 - i * 0.2, 0, 1); r.scale.setScalar(1 + rt * 0.45); r.material.opacity = rt > 0 ? (1 - rt) * 0.8 : 0; r.position.y = phone.position.y; });
      const bump = f > 0.55 ? Math.sin(clamp((f - 0.55) / 0.15, 0, 1) * Math.PI) * 0.06 : 0; phone.scale.multiplyScalar(1 + bump);
      phone.rotation.z = 0.06 + (f > 0.55 && f < 0.75 ? Math.sin(t * 40) * 0.03 : 0);
    } };
  }

  function buildDeliver(root) {
    const scooter = new THREE.Group(); scooter.rotation.y = -0.55; root.add(scooter);
    const pink = mat(0xd4127b, 0.3, { clearcoat: 0.9, clearcoatRoughness: 0.15 }), dark = mat(0x1a1a20, 0.5), chrome = mat(0xdedee6, 0.2, { metalness: 0.9 });
    const wheel = (x) => {
      const w = new THREE.Group(); w.position.set(x, -0.72, 0);
      w.add(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 20, 48), dark));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 32), chrome); hub.rotation.x = Math.PI / 2; w.add(hub);
      for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.06), mat(0x9a9aa6, 0.3, { metalness: 0.8 })); sp.rotation.z = i * 1.2566; w.add(sp); }
      scooter.add(w); return w;
    };
    const wf = wheel(0.95), wr = wheel(-0.85);
    const deck = new THREE.Mesh(roundedBox(1.25, 0.16, 0.5, 0.06), pink); deck.position.set(0.05, -0.5, 0); scooter.add(deck);
    const rearBody = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), pink); rearBody.scale.set(1.35, 0.72, 0.85); rearBody.position.set(-0.6, -0.2, 0); scooter.add(rearBody);
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 12, 32, Math.PI), pink); fender.position.set(0.95, -0.72, 0); fender.rotation.z = 0.15; scooter.add(fender);
    const shield = new THREE.Mesh(roundedBox(0.24, 1.05, 0.52, 0.1), pink); shield.position.set(0.72, -0.05, 0); shield.rotation.z = -0.22; scooter.add(shield);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 16), chrome); stem.position.set(0.88, 0.25, 0); stem.rotation.z = -0.22; scooter.add(stem);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 16), dark); bar.rotation.x = Math.PI / 2; bar.position.set(0.98, 0.68, 0); scooter.add(bar);
    [-0.45, 0.45].forEach((z) => { const gp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 16), dark); gp.rotation.x = Math.PI / 2; gp.position.set(0.98, 0.68, z); scooter.add(gp); });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), new THREE.MeshBasicMaterial({ color: C(0xfff2c4) })); lamp.position.set(1.0, 0.5, 0); lamp.scale.set(0.5, 1, 1); scooter.add(lamp);
    const seat = new THREE.Mesh(roundedBox(0.85, 0.14, 0.42, 0.06), dark); seat.position.set(-0.45, 0.17, 0); scooter.add(seat);
    const box = new THREE.Mesh(roundedBox(0.8, 0.72, 0.72, 0.08), mat(0xffffff, 0.35, { clearcoat: 0.6 })); box.position.set(-0.75, 0.66, 0); scooter.add(box);
    const boxLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.64), new THREE.MeshBasicMaterial({ map: logoTexture('#ffffff', '#D4127B', 'zyppi'), transparent: true }));
    boxLogo.position.set(-0.75, 0.66, 0.366); scooter.add(boxLogo);
    const boxLogo2 = boxLogo.clone(); boxLogo2.position.z = -0.366; boxLogo2.rotation.y = Math.PI; scooter.add(boxLogo2);
    const lidStripe = new THREE.Mesh(roundedBox(0.82, 0.08, 0.74, 0.03), mat(0x673ab7, 0.3, { clearcoat: 0.8 })); lidStripe.position.set(-0.75, 1.02, 0); scooter.add(lidStripe);
    const dashes = []; for (let i = 0; i < 10; i++) { const d = new THREE.Mesh(roundedBox(0.5, 0.03, 0.09, 0.012), new THREE.MeshBasicMaterial({ color: C(0xc9c9d3), transparent: true, opacity: 0 })); d.position.set(-4.5 + i * 1.0, -1.16, 0.55); root.add(d); dashes.push(d); }
    const lines = []; for (let j = 0; j < 5; j++) { const l = new THREE.Mesh(roundedBox(0.6 + j * 0.15, 0.03, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: C(0xd4127b), transparent: true, opacity: 0.5 })); l.position.set(-2, -0.3 + j * 0.22, -0.3); root.add(l); lines.push(l); }
    const sh = shadowPlane(root, 3.4, 1.2); sh.position.set(0, -1.16, 0);
    return { width: 4.6, height: 3.6, update(t) {
      const pop = backOut(t / 0.9); scooter.scale.setScalar(Math.max(0.0001, pop));
      const spd = reduce ? 0 : 1;
      wf.rotation.z = wr.rotation.z = -t * 9 * spd;
      scooter.position.y = (reduce ? 0 : Math.abs(Math.sin(t * 7)) * 0.025) + 0.08;
      scooter.rotation.z = reduce ? 0 : Math.sin(t * 1.3) * 0.02;
      dashes.forEach((d, i) => { const x = ((i * 1.0 - t * 3.2 * spd) % 9 + 9) % 9 - 4.5; d.position.x = x * Math.cos(0.55); d.position.z = 0.55 + x * Math.sin(0.55) * 0.3; d.material.opacity = pop * Math.max(0, 1 - Math.pow(Math.abs(x) / 3.2, 2)); });
      lines.forEach((l, i) => { const f = (t * 1.4 + i * 0.37) % 1; l.position.x = -1.2 - f * 2.2; l.material.opacity = (1 - f) * 0.55 * pop; l.position.z = -0.2 + i * 0.05; });
    } };
  }

  function buildContact(root) {
    const g = new THREE.Group(); root.add(g);
    const bubble = new THREE.Mesh(roundedBox(2.6, 1.6, 0.5, 0.45), mat(0xd4127b, 0.3, { clearcoat: 0.9, clearcoatRoughness: 0.15 })); bubble.position.set(-0.25, 0.35, 0); g.add(bubble);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 24), mat(0xd4127b, 0.3, { clearcoat: 0.9 })); tail.position.set(-1.05, -0.55, 0); tail.rotation.z = 2.6; g.add(tail);
    const dots = [0, 1, 2].map((i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 20), mat(0xffffff, 0.25, { clearcoat: 1 })); d.position.set(-0.85 + i * 0.6, 0.35, 0.32); g.add(d); return d; });
    const reply = new THREE.Mesh(roundedBox(1.7, 1.05, 0.4, 0.35), mat(0xffffff, 0.3, { clearcoat: 0.7 })); reply.position.set(1.0, -1.05, -0.5); g.add(reply);
    const rtail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 24), mat(0xffffff, 0.3)); rtail.position.set(1.62, -1.62, -0.5); rtail.rotation.z = -2.6; g.add(rtail);
    const heart = new THREE.Group(); heart.position.set(1.0, -1.02, -0.27); g.add(heart);
    const hm = mat(0x673ab7, 0.3, { clearcoat: 0.8 });
    [-0.11, 0.11].forEach((x) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), hm); s.position.set(x, 0.06, 0); s.scale.z = 0.6; heart.add(s); });
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.3, 24), hm); tip.rotation.z = Math.PI; tip.position.y = -0.12; tip.scale.z = 0.6; heart.add(tip);
    const cone = iceCreamCone(); cone.position.set(-2.05, 1.25, -0.2); cone.scale.setScalar(0.55); cone.rotation.z = 0.35; g.add(cone);
    const choc = chocolateBar(); choc.position.set(1.65, 1.25, -0.8); choc.scale.setScalar(0.5); choc.rotation.set(-0.3, -0.5, -0.4); g.add(choc);
    const sh = shadowPlane(root, 4, 1.4); sh.position.set(0, -2.0, 0);
    return { width: 4.8, height: 4.4, update(t) {
      g.scale.setScalar(Math.max(0.0001, backOut(t / 0.9)));
      dots.forEach((d, i) => { const ph = t * 2.2 - i * 0.35; d.position.y = 0.35 + Math.max(0, Math.sin(ph * Math.PI)) * 0.18; });
      bubble.position.y = 0.35 + Math.sin(t * 1.1) * 0.05;
      reply.position.y = -1.05 + Math.sin(t * 1.1 + 1.2) * 0.05; heart.position.y = reply.position.y + 0.03; rtail.position.y = reply.position.y - 0.57;
      const beat = 1 + Math.max(0, Math.sin(t * 5)) * 0.12 * (Math.floor(t / 1.25) % 2 ? 1 : 0); heart.scale.setScalar(beat * Math.max(0.0001, backOut((t - 0.5) / 0.7)));
      cone.rotation.y = t * 0.4; choc.rotation.y = -0.5 + Math.sin(t * 0.7) * 0.4;
      cone.position.y = 1.35 + Math.sin(t * 0.9) * 0.08; choc.position.y = 1.25 + Math.sin(t * 0.9 + 2) * 0.08;
    } };
  }

  /* ---------- run whatever this page has ---------- */
  const frames = [];
  const stage = document.getElementById('stage'), story = document.getElementById('story');
  if (stage && story) frames.push(homeScene(stage, story));
  const builders = { sell: buildSell, deliver: buildDeliver, contact: buildContact };
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-scene]').forEach((c) => { const b = builders[c.dataset.scene]; if (b) frames.push(heroScene(c, b)); });
  const clock = new THREE.Clock(); let last = 0;
  const loop = () => {
    const t = clock.getElapsedTime(), dt = Math.min(0.05, t - last); last = t;
    if (!document.hidden) frames.forEach((f) => f(t, dt));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
