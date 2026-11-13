/* =========================================================
   Rotating 3D ASCII Christmas tree + ASCII snow.
   ~25k points shaped like whorls of drooping branches are
   rotated, projected and z-buffered into a grid of characters.
   ========================================================= */
window.AsciiTree = (function () {
  'use strict';

  const TAU = Math.PI * 2;
  const MONO = 'Consolas, Menlo, "DejaVu Sans Mono", "Courier New", monospace';

  /* ---------- seeded random ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(2511);
  const unif = (a, b) => a + (b - a) * rnd();
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rnd()); };

  /* ---------- palette (index -> colour) ---------- */
  const PAL = [];
  const pc = c => (PAL.push(c), PAL.length - 1);
  const GREENS = [];
  for (let i = 0; i < 12; i++) { const t = i / 11; GREENS.push(pc(`hsl(${130 - t * 14}, ${50 + t * 32}%, ${8 + t * 54}%)`)); }
  const C = {
    snow: pc('#f4f9ff'), snow2: pc('#aebfdc'), snow3: pc('#5f6f90'),
    ground: pc('#5a6686'), ground2: pc('#323a54'),
    trunk: pc('#a06a36'), trunk2: pc('#5e3b1c'),
    starW: pc('#fffbe6'), star: pc('#ffd23f'), star2: pc('#e39a1a'),
    flash: pc('#ffffff'), flash2: pc('#fff0a8'),
    hud: pc('#4f5c7c'),
    red: pc('#ff4d4d'), gold: pc('#ffd23f'), green: pc('#5dff86'),
  };
  const LIGHTS = [['#ff3b3b', '#5c1717'], ['#ffd23f', '#5c4a12'], ['#45a8ff', '#163a5c'], ['#ff6fd8', '#5c2350'], ['#ff9a3c', '#5c3514'], ['#ffffff', '#4a4a5a']]
    .map(([on, off]) => [pc(on), pc(off)]);
  const RAMP = '.,-~:;=+*xvo%&#W@';

  /* ---------- build the 3D point cloud ---------- */
  const NEEDLE = 0, SNOW = 1, LIGHT = 2, TRUNK = 3, GROUND = 4;
  const pts = [];
  const add = (x, y, z, ao, a, type) => pts.push([x, y, z, ao, a, type]);

  const env = y => 0.47 * Math.pow(Math.max(0, 1 - y), 1.05);
  const Y0 = 0.06, Y1 = 0.95, NW = 24, DENS = 0.72;
  for (let i = 0; i < NW; i++) {
    const yw = Y0 + (Y1 - Y0) * i / (NW - 1);
    const u = i / (NW - 1);
    const R = env(yw) + 0.05;
    const nb = Math.floor(6 + 12 * (1 - u));
    for (let b = 0; b < nb; b++) {
      const a = TAU * (b + 0.5 * rnd()) / nb + i * 0.77;
      const L = R * unif(0.85, 1.08);
      const n = Math.floor((25 + 270 * L) * DENS);
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let k = 0; k < n; k++) {
        const s = Math.pow(rnd(), 0.65);
        const sl = s * L;
        const spread = (0.012 + 0.05 * s) * gauss();
        const x = ca * sl - sa * spread;
        const z = sa * sl + ca * spread;
        const y = yw + 0.06 * sl - 0.2 * sl * sl - 0.025 * s * s + 0.012 * gauss();
        const ao = (0.3 + 0.7 * Math.pow(s, 1.3)) * unif(0.75, 1.1);
        const snow = s > 0.55 && rnd() < 0.09 * s;
        add(x, y, z, ao, a, snow ? SNOW : NEEDLE);
      }
    }
  }
  // dark inner filling so you can't see straight through the tree
  for (let k = 0; k < 1800; k++) {
    const y = unif(0.05, 0.9), a = rnd() * TAU, r = env(y) * 0.55 * Math.sqrt(rnd());
    add(Math.cos(a) * r, y, Math.sin(a) * r, unif(0.12, 0.3), a, NEEDLE);
  }
  // lights on the outer tips
  let lightCount = 0;
  for (let tries = 0; lightCount < 170 && tries < 20000; tries++) {
    const p = pts[(rnd() * pts.length) | 0];
    if (p[5] !== NEEDLE || p[3] < 0.72) continue;
    p[5] = LIGHT; lightCount++;
  }
  // trunk
  for (let k = 0; k < 700; k++) {
    const a = rnd() * TAU, r = 0.03 + 0.012 * rnd();
    add(Math.cos(a) * r, unif(-0.03, 0.14), Math.sin(a) * r, unif(0.4, 0.85), a, TRUNK);
  }
  // ground disc
  for (let rr = 0.08; rr < 0.95; rr += 0.035) {
    const cnt = Math.floor(TAU * rr / 0.03);
    for (let k = 0; k < cnt; k++) {
      const a = TAU * k / cnt + rnd() * 0.05;
      add(Math.cos(a) * rr, -0.035, Math.sin(a) * rr, 1 - rr, a, GROUND);
    }
  }

  const N = pts.length;
  const PX = new Float32Array(N), PY = new Float32Array(N), PZ = new Float32Array(N), AO = new Float32Array(N);
  const CA = new Float32Array(N), SA = new Float32Array(N), PH = new Float32Array(N), SP = new Float32Array(N);
  const TY = new Uint8Array(N), LC = new Uint8Array(N);
  pts.forEach((p, i) => {
    PX[i] = p[0]; PY[i] = p[1]; PZ[i] = p[2]; AO[i] = p[3];
    CA[i] = Math.cos(p[4]); SA[i] = Math.sin(p[4]); TY[i] = p[5];
    PH[i] = rnd() * TAU; SP[i] = 1.5 + rnd() * 2.5; LC[i] = (rnd() * LIGHTS.length) | 0;
  });

  /* ---------- star sprite ---------- */
  const STAR = [
    '    .    ',
    '   ###   ',
    '**#@@@#**',
    '  #@@@#  ',
    '  ## ##  ',
    ' #     # ',
  ];

  /* ---------- state ---------- */
  let cv, ctx, gcv, gctx;
  const atlas = document.createElement('canvas');
  let dpr = 1, cw = 6, ch = 10, cwPx = 6, chPx = 10, cols = 0, rows = 0;
  let zbuf, gch, gcol;
  let S = 300, cxPx = 0, cyPx = 0;
  const PHI = 0.3, cP = Math.cos(PHI), sP = Math.sin(PHI), D = 3.2, ROT = 0.42;
  let buildStart = -1, buildDur = 4800, onDone = null, onTick = null, lastTick = -1, doneAt = 0;
  let msg = null, msgRow = 0, hudRow = 0;
  let flakes = [];
  let running = false, lastFrame = 0, t0 = 0;

  function buildAtlas() {
    atlas.width = 95 * cwPx; atlas.height = PAL.length * chPx;
    const a = atlas.getContext('2d');
    a.clearRect(0, 0, atlas.width, atlas.height);
    a.font = `bold ${Math.round(chPx * 0.86)}px ${MONO}`;
    a.textAlign = 'center'; a.textBaseline = 'middle';
    for (let j = 0; j < PAL.length; j++) {
      a.fillStyle = PAL[j];
      for (let k = 1; k < 95; k++) a.fillText(String.fromCharCode(32 + k), k * cwPx + cwPx / 2, j * chPx + chPx / 2 + 1);
    }
  }

  function makeFlake(any) {
    const depth = rnd();
    return {
      x: rnd() * cols, y: any ? rnd() * rows : -1 - rnd() * 4,
      v: 2.5 + depth * 6, ph: rnd() * TAU, amp: 0.4 + rnd() * 1.2,
      ch: depth > 0.7 ? '*' : depth > 0.4 ? '+' : depth > 0.15 ? '.' : "'",
      col: depth > 0.6 ? C.snow : depth > 0.3 ? C.snow2 : C.snow3,
    };
  }

  /* region = { top, bottom } in css px: where the tree (star -> ground) should fit */
  function resize(region) {
    const w = innerWidth, h = innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const target = Math.min(10, Math.max(5, w / 74));
    cwPx = Math.max(4, Math.round(target * dpr));
    chPx = Math.round(cwPx * 1.62);
    cw = cwPx / dpr; ch = chPx / dpr;
    cols = Math.ceil(w / cw); rows = Math.ceil(h / ch);
    cv.width = cols * cwPx; cv.height = rows * chPx;
    cv.style.width = cols * cw + 'px'; cv.style.height = rows * ch + 'px';
    gcv.width = Math.ceil(cv.width / 4); gcv.height = Math.ceil(cv.height / 4);
    gcv.style.width = cv.style.width; gcv.style.height = cv.style.height;
    zbuf = new Float32Array(cols * rows); gch = new Uint8Array(cols * rows); gcol = new Uint8Array(cols * rows);
    buildAtlas();
    flakes = Array.from({ length: Math.round(cols * rows / 38) }, () => makeFlake(true));

    // fit the tree: star top (~y 1.1) to ground front (~y -0.2 projected) into the region
    const availH = Math.max(120, region.bottom - region.top);
    S = Math.min(availH / 1.32, w * 0.98 / 1.05);
    cxPx = w / 2;
    cyPx = region.top + S * 0.68 + Math.max(0, availH - S * 1.32) * 0.5;   // centre it when width-limited
    return anchors();
  }

  function project(x, y, z) {
    const yy = y - 0.5;
    const yc = yy * cP + z * sP, zc = z * cP - yy * sP;
    const f = D / (D + zc);
    return { x: cxPx + x * f * S, y: cyPx - yc * f * S, f };
  }

  function anchors() {
    const front = project(0, -0.035, -0.32);
    const star = project(0, 1.0, 0);
    return { baseX: cxPx, groundY: front.y, baseR: 0.5 * S * front.f, starX: star.x, starY: star.y, cw, ch };
  }

  function setMessageRow(pxBottom) {
    msgRow = Math.min(rows - 3, Math.ceil(pxBottom / ch) + 1);
    hudRow = msgRow + 2;
  }

  /* ---------- render one frame ---------- */
  function put(col, row, code, color) {
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const i = row * cols + col;
    gch[i] = code - 32; gcol[i] = color; zbuf[i] = -1e9;
  }
  function text(str, col, row, colorFn) {
    for (let i = 0; i < str.length; i++) if (str[i] !== ' ') put(col + i, row, str.charCodeAt(i), colorFn(i));
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    const dtS = Math.min(0.1, (now - lastFrame) / 1000 || 0.033);
    lastFrame = now;
    zbuf.fill(1e9); gch.fill(0);

    // snow (behind everything)
    for (const f of flakes) {
      f.y += f.v * dtS; f.ph += dtS;
      if (f.y > rows + 1) Object.assign(f, makeFlake(false));
      const c = Math.round(f.x + Math.sin(f.ph) * f.amp), r = Math.floor(f.y);
      if (c >= 0 && c < cols && r >= 0 && r < rows) { const i = r * cols + c; gch[i] = f.ch.charCodeAt(0) - 32; gcol[i] = f.col; zbuf[i] = 1e8; }
    }

    // how much of the tree is built
    let buildH = -1, k = 1;
    if (buildStart >= 0) {
      k = Math.min(1, (now - buildStart) / buildDur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      buildH = -0.06 + 1.18 * e;
      const tick = Math.floor(buildH / 0.04);
      if (tick !== lastTick && k < 1) { lastTick = tick; if (onTick) onTick(buildH); }
      if (k >= 1 && !doneAt) { doneAt = now; if (onDone) onDone(); }
    }
    const building = buildStart >= 0 && k < 1;

    if (buildStart >= 0) {
      const th = t * ROT, cT = Math.cos(th), sT = Math.sin(th);
      const Lx = -0.55, Ly = 0.45, Lz = -0.7;
      const kx = S / cw, ky = S / ch;
      for (let i = 0; i < N; i++) {
        const y = PY[i];
        if (y > buildH) continue;
        const x = PX[i], z = PZ[i];
        const xr = x * cT - z * sT, zr = x * sT + z * cT;
        const yy = y - 0.5;
        const yc = yy * cP + zr * sP, zc = zr * cP - yy * sP;
        const f = D / (D + zc);
        const col = ((cxPx / cw) + xr * f * kx) | 0;
        const row = ((cyPx / ch) - yc * f * ky) | 0;
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        const ci = row * cols + col;
        if (zc >= zbuf[ci]) continue;
        zbuf[ci] = zc;
        const type = TY[i];
        const nx = CA[i] * cT - SA[i] * sT, nz = CA[i] * sT + SA[i] * cT;
        const lam = Math.max(0, nx * Lx + 0.3 * Ly + nz * Lz);
        let code, color;
        if (building && y > buildH - 0.035 && type !== GROUND) {
          code = 35 + ((i & 1) ? 29 : 0); color = (i % 3) ? C.flash2 : C.flash;   // '#' or '@'
        } else if (type === NEEDLE) {
          let b = AO[i] * (0.3 + 0.75 * lam) * (1.08 - 0.5 * (zc + 0.45));
          b = b < 0 ? 0 : b > 0.999 ? 0.999 : b;
          code = RAMP.charCodeAt((b * RAMP.length) | 0);
          color = GREENS[(b * 12) | 0];
        } else if (type === SNOW) {
          code = zc < 0.05 ? 42 : 43; color = zc < 0.05 ? C.snow : C.snow2;  // '*' / '+'
        } else if (type === LIGHT) {
          const on = Math.sin(t * SP[i] + PH[i]) > -0.25 && zc < 0.25;
          code = on ? 64 : 111; color = LIGHTS[LC[i]][on ? 0 : 1];            // '@' / 'o'
        } else if (type === TRUNK) {
          code = lam > 0.4 ? 35 : lam > 0.15 ? 37 : 61; color = lam > 0.25 ? C.trunk : C.trunk2;
        } else {
          code = AO[i] > 0.45 ? 46 : 45; color = AO[i] > 0.45 ? C.ground : C.ground2;   // '.' / '-'
        }
        gch[ci] = code - 32; gcol[ci] = color;
      }

      // star on top once the build reaches it
      if (buildH > 0.97) {
        const sp = project(0, 1.0, 0);
        const sc = Math.round(sp.x / cw) - 4, sr = Math.round(sp.y / ch) - 2;
        const flash = doneAt && now - doneAt < 700;
        STAR.forEach((line, ry) => {
          for (let rx = 0; rx < line.length; rx++) {
            const chh = line[rx];
            if (chh === ' ') continue;
            let color = chh === '@' ? C.starW : chh === '*' ? C.star2 : C.star;
            if (Math.sin(t * 4 + rx * 0.9 + ry) > 0.75) color = C.starW;
            if (flash) color = C.flash;
            put(sc + rx, sr + ry, chh.charCodeAt(0), color);
          }
        });
        // little twinkle rays
        const tw = Math.floor(t * 2.5) % 4;
        const rays = [[-6, 1, '+'], [6, 1, '+'], [-3, -2, '*'], [3, -2, '*']];
        const [dx, dy, rc] = rays[tw];
        put(sc + 4 + dx, sr + 2 + dy, rc.charCodeAt(0), C.star2);
      }
    }

    // message under the presents, letters typed in one by one
    if (msg) {
      const shown = Math.min(msg.text.length, Math.floor((now - msg.start) / 100));
      const start = Math.round((cols - msg.text.length) / 2);
      const RGB = [C.red, C.gold, C.green];
      text(msg.text.slice(0, shown), start, msgRow, i => RGB[(Math.floor(i / 2) + Math.floor(t * 1.5)) % 3]);
      const deg = ((t * ROT * 180 / Math.PI) % 360).toFixed(2);
      const hud = `rotation ${deg}deg   lights ${lightCount}   snow ${flakes.length}`;
      if (hudRow < rows - 1) text(hud, Math.max(1, Math.round((cols - hud.length) / 2)), hudRow, () => C.hud);
    }

    // draw the grid from the glyph atlas
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let r = 0, i = 0; r < rows; r++) {
      const py = r * chPx;
      for (let c = 0; c < cols; c++, i++) {
        const g = gch[i];
        if (!g) continue;
        ctx.drawImage(atlas, g * cwPx, gcol[i] * chPx, cwPx, chPx, c * cwPx, py, cwPx, chPx);
      }
    }
    // soft bloom
    gctx.clearRect(0, 0, gcv.width, gcv.height);
    gctx.drawImage(cv, 0, 0, gcv.width, gcv.height);
  }

  function loop(now) {
    if (!running) return;
    if (now - lastFrame >= 32) frame(now);   // ~30 fps, easy on phone batteries
    requestAnimationFrame(loop);
  }

  return {
    init(canvas, glowCanvas) {
      cv = canvas; ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
      gcv = glowCanvas; gctx = gcv.getContext('2d');
    },
    resize, setMessageRow, anchors,
    start() { if (running) return; running = true; t0 = lastFrame = performance.now(); requestAnimationFrame(loop); },
    build(opts) {
      buildDur = opts.duration || 4800; onDone = opts.onDone; onTick = opts.onTick;
      buildStart = performance.now(); doneAt = 0; lastTick = -1;
    },
    showMessage(textStr) { msg = { text: textStr, start: performance.now() }; },
  };
})();
