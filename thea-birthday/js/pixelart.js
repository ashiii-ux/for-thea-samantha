/* =========================================================
   Pixel art for Thea's tree.
   Everything is designed on a tiny 57 x 76 grid;
   main.js scales it up crisp for any screen size.
   ========================================================= */
(function () {
  'use strict';

  const W = 57, H = 76, CX = 28;

  // tiny seeded random -> the tree looks identical on every visit
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(1113);

  const C = {
    tOut: '#0f3826', tShadow1: '#123f2b', tShadow2: '#1b5a3a',
    tDark: '#1f6a42', tMid: '#2e8a50', tLight: '#46a95f', tHi: '#7ed383',
    trunkOut: '#3a2010', trunk: '#7b4a26', trunkLight: '#9a6235', trunkDark: '#5c361b', trunkShadow: '#4a2a14',
    starOut: '#a8600c', star: '#ffd23f', starLight: '#fff2a6', starDark: '#f0a11c',
    snowEdge: '#bcd3ee', snowTop: '#ffffff', snow: '#eaf3ff', snowDeep: '#d3e3f6', snowShadow: '#b4c9e6',
    gold: '#ffd23f', gold2: '#f5a524',
  };

  const LIGHT_COLORS = ['#ff4d6d', '#ffd23f', '#5ee0ff', '#ff9de2', '#b98cff', '#ffffff'];

  const idx = (x, y) => y * W + x;
  const inB = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
  const full = new Array(W * H).fill(null);
  const put = (x, y, c) => { if (inB(x, y)) full[idx(x, y)] = c; };

  /* ---------------- trunk ---------------- */
  for (let y = 56; y <= 66; y++) {
    for (let x = 25; x <= 31; x++) {
      let c;
      if (x === 25 || x === 31) c = C.trunkOut;
      else if (y <= 59) c = C.trunkShadow;
      else if (x <= 27) c = C.trunkLight;
      else if (x === 30) c = C.trunkDark;
      else c = C.trunk;
      if (x > 25 && x < 31 && y > 59 && (x * 3 + y * 5) % 7 === 0) c = C.trunkDark; // bark
      put(x, y, c);
    }
  }

  /* ---------------- tree ---------------- */
  const tiers = [
    { top: 11, bot: 24, hw0: 1, hw1: 8 },
    { top: 19, bot: 35, hw0: 3, hw1: 14 },
    { top: 29, bot: 46, hw0: 5, hw1: 20 },
    { top: 40, bot: 57, hw0: 7, hw1: 25 },
  ];
  const hwAt = (t, y) => y > t.bot ? t.hw1
    : Math.max(0, Math.round(t.hw0 + (t.hw1 - t.hw0) * (y - t.top) / (t.bot - t.top)));

  const owner = new Int8Array(W * H).fill(-1);
  const claim = (x, y, i) => { if (inB(x, y) && owner[idx(x, y)] < 0) owner[idx(x, y)] = i; };
  tiers.forEach((t, i) => {
    for (let y = t.top; y <= t.bot; y++) {
      const hw = hwAt(t, y);
      for (let x = CX - hw; x <= CX + hw; x++) claim(x, y, i);
    }
    // little drooping branch tips
    for (const s of [-1, 1]) {
      for (const d of [0, 1, 2]) claim(CX + s * (t.hw1 - d), t.bot + 1, i);
      for (const d of [0, 1]) claim(CX + s * (t.hw1 - d), t.bot + 2, i);
    }
  });

  const inTree = (x, y) => inB(x, y) && owner[idx(x, y)] >= 0;
  const isEdge = (x, y) => !inTree(x - 1, y) || !inTree(x + 1, y) || !inTree(x, y - 1) || !inTree(x, y + 1);
  const shadowLevel = (x, y) => {
    const o = owner[idx(x, y)];
    if (o <= 0) return 0;
    if (inTree(x, y - 1) && owner[idx(x, y - 1)] < o) return 1;
    if (inTree(x, y - 2) && owner[idx(x, y - 2)] < o) return 2;
    return 0;
  };
  const isInterior = (x, y) => inTree(x, y) && !isEdge(x, y) && !shadowLevel(x, y);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inTree(x, y)) continue;
      const t = tiers[owner[idx(x, y)]];
      let c;
      if (isEdge(x, y)) c = C.tOut;
      else {
        const hw = Math.max(1, hwAt(t, y));
        const rx = (x - CX) / hw;
        const chk = (x + y) & 1;
        if (rx < -0.5) c = C.tLight;
        else if (rx < -0.32) c = chk ? C.tLight : C.tMid;
        else if (rx < 0.3) c = C.tMid;
        else if (rx < 0.48) c = chk ? C.tDark : C.tMid;
        else c = C.tDark;
        if (!inTree(x - 1, y - 1) && rx < 0.2) c = C.tHi;      // rim light on upper-left edges
        const sh = shadowLevel(x, y);
        if (sh === 1) c = C.tShadow1;
        else if (sh === 2) c = rx < -0.5 ? C.tMid : C.tShadow2;
      }
      put(x, y, c);
    }
  }

  /* ---------------- garland ---------------- */
  const deco = new Set();
  tiers.forEach((t, i) => {
    const xl = CX - t.hw1, xr = CX + t.hw1, h = t.bot - t.top;
    for (let x = xl; x <= xr; x++) {
      const u = (x - xl) / (xr - xl);
      const y = Math.round(t.top + h * (0.30 + 0.45 * u) + Math.sin(u * Math.PI) * h * 0.12);
      if (!inTree(x, y) || owner[idx(x, y)] !== i || isEdge(x, y) || shadowLevel(x, y)) continue;
      put(x, y, (x & 1) ? C.gold : C.gold2);
      deco.add(idx(x, y));
    }
  });

  /* ---------------- ornaments ---------------- */
  const ORN = [
    { hi: '#ffb3ba', base: '#e63946', dk: '#9e1b2a' },
    { hi: '#c4ecff', base: '#3fa7f0', dk: '#1f5fa8' },
    { hi: '#ffe0f0', base: '#ff7ab8', dk: '#c2407e' },
    { hi: '#fff6c4', base: '#ffc93c', dk: '#c58a0f' },
    { hi: '#eadaff', base: '#a66cff', dk: '#6b38c2' },
  ];
  const orns = [];
  for (let tries = 0; orns.length < 17 && tries < 6000; tries++) {
    const x = 2 + Math.floor(rand() * (W - 4)), y = 14 + Math.floor(rand() * 43);
    let ok = true;
    for (let dy = -2; dy <= 1 && ok; dy++)
      for (let dx = -1; dx <= 1 && ok; dx++)
        if (!isInterior(x + dx, y + dy) || deco.has(idx(x + dx, y + dy))) ok = false;
    if (!ok) continue;
    if (deco.has(idx(x, y + 2)) || deco.has(idx(x - 2, y)) || deco.has(idx(x + 2, y))) continue;
    if (orns.some(o => Math.abs(o.x - x) + Math.abs(o.y - y) < 8)) continue;
    orns.push({ x, y });
  }
  orns.forEach((o, k) => {
    const c = ORN[k % ORN.length];
    const px = [[0, -2, '#e8c25a'], [0, -1, c.base], [-1, 0, c.base], [0, 0, c.hi], [1, 0, c.dk], [0, 1, c.dk]];
    px.forEach(([dx, dy, col]) => { put(o.x + dx, o.y + dy, col); deco.add(idx(o.x + dx, o.y + dy)); });
  });

  /* ---------------- star ---------------- */
  const STAR = [
    '.....#.....',
    '....###....',
    '....###....',
    '...#####...',
    '###########',
    '.#########.',
    '..#######..',
    '...#####...',
    '..###.###..',
    '..##...##..',
    '.##.....##.',
  ];
  const sx = CX - 5, sy = 1;
  const starSet = new Set();
  STAR.forEach((r, yy) => [...r].forEach((ch, xx) => { if (ch === '#') starSet.add(idx(sx + xx, sy + yy)); }));
  const inStar = (x, y) => inB(x, y) && starSet.has(idx(x, y));
  const starPixels = [];
  for (let y = 0; y < 14; y++) {
    for (let x = sx - 1; x <= sx + 11; x++) {
      if (inStar(x, y)) {
        const tl = !inStar(x, y - 1) || !inStar(x - 1, y);
        const br = !inStar(x + 1, y) || !inStar(x, y + 1);
        let c = C.star;
        if (tl && !br) c = C.starLight;
        else if (br) c = C.starDark;
        put(x, y, c); starPixels.push({ x, y });
      } else if (inStar(x - 1, y) || inStar(x + 1, y) || inStar(x, y - 1) || inStar(x, y + 1)) {
        put(x, y, C.starOut); starPixels.push({ x, y });
      }
    }
  }
  put(CX, sy + 4, '#ffffff'); put(CX - 1, sy + 4, C.starLight); put(CX, sy + 3, C.starLight);

  /* ---------------- snow ---------------- */
  const snowTop = x => { const dx = Math.abs(x - CX); return dx > 27 ? Infinity : 63 + Math.round(Math.pow(dx / 28, 2) * 11); };
  const snowSet = new Set();
  for (let x = 0; x < W; x++) {
    const top = snowTop(x);
    if (top === Infinity) continue;
    for (let y = top; y < H; y++) {
      let c = C.snow;
      if (y === top || snowTop(x - 1) > y || snowTop(x + 1) > y) c = C.snowEdge;
      else if (y === top + 1) c = C.snowTop;
      else if (y >= H - 2) c = (x + y) & 1 ? C.snowDeep : C.snow;
      else if ((x * 7 + y * 13) % 23 === 0) c = C.snowTop;
      put(x, y, c); snowSet.add(idx(x, y));
    }
  }

  /* ---------------- presents ---------------- */
  const BOW_BIG = [
    '.OO...OO.',
    'OhrO.OrhO',
    'OrrdkdrrO',
    '.OOOkOOO.',
  ];
  const BOW_SMALL = [
    '.OO.OO.',
    'OhdkdhO',
    '.OOkOO.',
  ];
  const PRESENT_DEFS = [
    { // 1: pink polka-dot with white ribbon  -> letter
      x0: 4, x1: 18, bodyTop: 63, bot: 72, lidH: 4, bow: BOW_BIG, pattern: 'dots', dir: -1,
      col: { out: '#6e1c40', dark: '#d4507f', base: '#ff7aa8', light: '#ffb3cc', pat: '#ffd9e6', inside: '#5a1734', inside2: '#a83563' },
      rib: { out: '#7d7f9c', light: '#ffffff', base: '#f1f1f8', dark: '#c6c8de' },
    },
    { // 2: red with gold ribbon  -> albums
      x0: 21, x1: 35, bodyTop: 67, bot: 72, lidH: 3, bow: BOW_SMALL, pattern: 'none', dir: 1,
      col: { out: '#5a0f17', dark: '#b3202f', base: '#e63946', light: '#ff7b85', pat: '#e63946', inside: '#4a0c13', inside2: '#8e1824' },
      rib: { out: '#8a5a06', light: '#fff0a0', base: '#ffd23f', dark: '#d99a11' },
    },
    { // 3: blue striped with pink ribbon  -> audio
      x0: 38, x1: 52, bodyTop: 63, bot: 72, lidH: 4, bow: BOW_BIG, pattern: 'stripes', dir: 1,
      col: { out: '#123a5c', dark: '#2b6cb0', base: '#4aa3df', light: '#a3d8ff', pat: '#78c0f2', inside: '#0e2c47', inside2: '#22578f' },
      rib: { out: '#7a1f45', light: '#ffd0e4', base: '#ff8fc0', dark: '#e05a98' },
    },
  ];

  function makePresent(d, i) {
    const { x0, x1, bodyTop, bot, lidH, col, rib } = d;
    const cx = (x0 + x1) / 2;
    const lidTop = bodyTop - lidH;
    const bowTop = lidTop - d.bow.length;
    const body = [], bodyOpen = [], lid = [];
    const ribbon = x => x < cx ? rib.light : x > cx ? rib.dark : rib.base;

    for (let y = bodyTop; y <= bot; y++) {
      for (let x = x0; x <= x1; x++) {
        const border = x === x0 || x === x1 || y === bot || y === bodyTop;
        let c;
        if (border) c = col.out;
        else if (Math.abs(x - cx) <= 1) c = ribbon(x);
        else if (y === bodyTop + 1) c = col.dark;
        else if (x === x0 + 1) c = col.light;
        else if (x === x1 - 1 || y === bot - 1) c = col.dark;
        else {
          const lx = x - x0, ly = y - bodyTop;
          const dot = d.pattern === 'dots' && ((lx % 4 === 3 && ly % 4 === 3) || (lx % 4 === 1 && ly % 4 === 1));
          const stripe = d.pattern === 'stripes' && lx % 4 === 3;
          c = dot || stripe ? col.pat : col.base;
        }
        body.push({ x, y, c });
        let co = c;
        if (!border && y === bodyTop + 1) co = col.inside;
        else if (!border && y === bodyTop + 2) co = col.inside2;
        bodyOpen.push({ x, y, c: co });
      }
    }
    for (let y = lidTop; y < bodyTop; y++) {
      for (let x = x0 - 1; x <= x1 + 1; x++) {
        let c;
        if (x === x0 - 1 || x === x1 + 1 || y === lidTop) c = col.out;
        else if (Math.abs(x - cx) <= 1) c = y === bodyTop - 1 ? rib.dark : ribbon(x);
        else if (y === bodyTop - 1) c = col.dark;
        else if (y === lidTop + 1) c = col.light;
        else c = col.base;
        lid.push({ x, y, c });
      }
    }
    const bmap = { O: rib.out, h: rib.light, r: rib.base, d: rib.dark, k: rib.dark };
    const bx = cx - (d.bow[0].length - 1) / 2;
    d.bow.forEach((r, yy) => [...r].forEach((ch, xx) => { if (bmap[ch]) lid.push({ x: bx + xx, y: bowTop + yy, c: bmap[ch] }); }));

    // soft shadow in the snow
    for (let x = x0 - 1; x <= x1 + 2; x++) {
      if (snowSet.has(idx(x, bot + 1))) put(x, bot + 1, C.snowShadow);
    }
    for (let y = bot - 2; y <= bot; y++) {
      for (let x = x1 + 1; x <= x1 + 2; x++) if (snowSet.has(idx(x, y))) put(x, y, C.snowShadow);
    }

    return {
      id: i, cx, bodyTop, dir: d.dir,
      body, bodyOpen, lid,
      bbox: { x0: x0 - 1, y0: bowTop, x1: x1 + 1, y1: bot },
      lidBox: { x0: x0 - 1, y0: bowTop, x1: x1 + 1, y1: bodyTop - 1 },
      bodyBox: { x0, y0: bodyTop, x1, y1: bot },
    };
  }
  const presents = PRESENT_DEFS.map(makePresent);

  /* ---------------- lights (twinkle live) ---------------- */
  const base = full.slice();               // everything except lights + presents
  const lights = [];
  for (let tries = 0; lights.length < 30 && tries < 6000; tries++) {
    const x = 2 + Math.floor(rand() * (W - 4)), y = 13 + Math.floor(rand() * 45);
    if (!isInterior(x, y) || deco.has(idx(x, y))) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => deco.has(idx(x + dx, y + dy)))) continue;
    if (lights.some(l => Math.abs(l.x - x) + Math.abs(l.y - y) < 5)) continue;
    lights.push({ x, y, ci: lights.length % LIGHT_COLORS.length, ph: rand() * 6.28, sp: 1.2 + rand() * 1.8 });
  }
  lights.forEach(l => put(l.x, l.y, LIGHT_COLORS[l.ci]));

  presents.forEach(p => { p.body.forEach(q => put(q.x, q.y, q.c)); p.lid.forEach(q => put(q.x, q.y, q.c)); });

  /* ---------------- small sprites ---------------- */
  function fromRows(rows, map) {
    const out = [];
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (map[ch]) out.push({ x, y, c: map[ch] }); }));
    return out;
  }
  const heart = fromRows([
    '.OO...OO.',
    'OhhO.OrrO',
    'OhrrOrrrO',
    'OrrrrrrdO',
    '.OrrrrdO.',
    '..OrrdO..',
    '...OdO...',
    '....O....',
  ], { O: '#7a1f45', h: '#ffd0e0', r: '#ff5c93', d: '#d63a72' });

  const icons = {
    play: fromRows(['#......', '###....', '#####..', '#######', '#####..', '###....', '#......'], { '#': '#ffffff' }),
    pause: fromRows(['.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.', '.##.##.'], { '#': '#ffffff' }),
  };

  /* envelope: 30 x 20, flap 30 x 12 */
  function envelope() {
    const EW = 30, EH = 20, FH = 12, mid = (EW - 1) / 2;
    const OUT = '#9c3d66';
    const vy = x => Math.round((FH - 1) * (1 - Math.abs(x - mid) / mid));
    const back = [], front = [], flap = [];
    for (let y = 0; y < EH; y++) {
      for (let x = 0; x < EW; x++) {
        const border = x === 0 || x === EW - 1 || y === 0 || y === EH - 1;
        back.push({ x, y, c: border ? OUT : (y < 3 ? '#cf7f9f' : '#e79ab8') });
        const v = vy(x);
        if (y >= v) {
          let c = border || y === v ? OUT : (x < mid ? '#ffe2ec' : '#ffd0e0');
          if (!border && y === EH - 2) c = '#f7b9cf';
          front.push({ x, y, c });
        }
        if (y < FH && y <= v) {
          const c = (y === 0 || x === 0 || x === EW - 1 || y === v) ? OUT : (y === 1 ? '#ffdce8' : '#ffc2d7');
          flap.push({ x, y, c });
        }
      }
    }
    return { W: EW, H: EH, FH, back, front, flap };
  }

  /* cassette: 44 x 28, p = progress 0..1, f = reel frame 0/1 */
  const CAS_W = 44, CAS_H = 28;
  function cassette(p, f) {
    const g = new Array(CAS_W * CAS_H).fill(null);
    const s = (x, y, c) => { if (x >= 0 && x < CAS_W && y >= 0 && y < CAS_H) g[y * CAS_W + x] = c; };
    const ink = '#2b1838';
    for (let y = 0; y < CAS_H; y++) for (let x = 0; x < CAS_W; x++) {
      const cornerOut = (x === 0 || x === CAS_W - 1) && (y === 0 || y === CAS_H - 1);
      if (cornerOut) continue;
      const corner = (x === 1 || x === CAS_W - 2) && (y === 1 || y === CAS_H - 2);
      let c = '#ff9ec4';
      if (x === 0 || x === CAS_W - 1 || y === 0 || y === CAS_H - 1 || corner) c = ink;
      else if (y === 1 || x === 1) c = '#ffc7dc';
      else if (y === CAS_H - 2 || x === CAS_W - 2) c = '#e06d9d';
      s(x, y, c);
    }
    // label
    for (let y = 3; y <= 19; y++) for (let x = 4; x <= 39; x++) {
      let c = '#fff4e6';
      if (x === 4 || x === 39 || y === 3 || y === 19) c = ink;
      else if (y === 17) c = '#ff9ec4';
      else if (y === 18) c = '#9ad7ff';
      else if (x === 38 || y === 16) c = '#f3dcc4';
      s(x, y, c);
    }
    // window
    for (let y = 7; y <= 15; y++) for (let x = 11; x <= 32; x++) {
      const edge = x === 11 || x === 32 || y === 7 || y === 15;
      s(x, y, edge ? ink : (y === 8 ? '#55406a' : '#3b2a4a'));
    }
    // reels with tape that moves from left to right
    const reels = [{ cx: 17, r: 1.6 + 2.2 * (1 - p) }, { cx: 26, r: 1.6 + 2.2 * p }];
    reels.forEach(R => {
      for (let y = 8; y <= 14; y++) for (let x = 12; x <= 31; x++) {
        if (Math.hypot(x - R.cx, y - 11) <= R.r) s(x, y, '#7a4a32');
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const spoke = f === 0 ? (dx === 0 || dy === 0) : (dx !== 0 && dy !== 0);
        s(R.cx + dx, 11 + dy, dx === 0 && dy === 0 ? ink : spoke ? '#c9c3d6' : '#ffffff');
      }
    });
    // bottom trapezoid
    for (let y = 21; y <= 26; y++) {
      const inset = 26 - y;
      for (let x = 9 + inset; x <= 34 - inset; x++) {
        const edge = x === 9 + inset || x === 34 - inset || y === 21;
        s(x, y, edge ? ink : '#f07fae');
      }
    }
    [[14, 24], [15, 24], [28, 24], [29, 24], [21, 23], [22, 23]].forEach(([x, y]) => s(x, y, ink));
    [[2, 2], [41, 2], [2, 25], [41, 25]].forEach(([x, y]) => s(x, y, '#9a8fb0'));
    const out = [];
    for (let i = 0; i < g.length; i++) if (g[i]) out.push({ x: i % CAS_W, y: (i / CAS_W) | 0, c: g[i] });
    return out;
  }

  const toList = arr => {
    const out = [];
    for (let i = 0; i < arr.length; i++) if (arr[i]) out.push({ x: i % W, y: (i / W) | 0, c: arr[i] });
    return out;
  };

  window.ART = {
    W, H, CX,
    fullPixels: toList(full),
    basePixels: toList(base),
    lights, lightColors: LIGHT_COLORS,
    presents,
    starPixels,
    star: { cx: CX, cy: sy + 5, tips: [[CX, sy - 2], [sx - 2, sy + 4], [sx + 12, sy + 4], [sx, sy + 12], [sx + 10, sy + 12]] },
    heart, heartW: 9, heartH: 8,
    icons, envelope, cassette, CAS_W, CAS_H,
  };
})();
