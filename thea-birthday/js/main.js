(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const W = ART.W, H = ART.H;
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ================= tiny 8-bit sound effects (no files needed) ================= */
  const SFX = {
    ctx: null, on: true,
    init() {
      try {
        if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* no sound, no problem */ }
    },
    tone(f, d = 0.08, type = 'square', v = 0.035, delay = 0, slideTo) {
      if (!this.on || !this.ctx) return;
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + d + 0.03);
    },
    blip(f) { this.tone(f, 0.05, 'square', 0.018); },
    chime() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.07, i * 0.09)); },
    bonk() { this.tone(240, 0.11, 'square', 0.035); this.tone(170, 0.16, 'square', 0.035, 0.1); },
    rattle() { for (let i = 0; i < 5; i++) this.tone(150 + Math.random() * 70, 0.05, 'square', 0.022, i * 0.1); },
    pop() { this.tone(260, 0.22, 'square', 0.035, 0, 1100); [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, 0.12 + i * 0.07)); },
    fanfare() { [[523, 0], [659, .12], [784, .24], [1047, .36], [784, .54], [1047, .66]].forEach(([f, d]) => this.tone(f, 0.22, 'triangle', 0.055, d)); },
    tick() { this.tone(1300, 0.03, 'square', 0.015); },
  };

  /* ================= 🎵 background song ================= */
  const Music = (() => {
    const M = CONTENT.music || {};
    let el = null, started = false, ducked = false, fadeIv = 0;
    const target = M.volume == null ? 0.5 : M.volume;
    function fadeTo(v, ms, then) {
      clearInterval(fadeIv);
      if (!el) return;
      const from = el.volume, steps = Math.max(1, Math.round(ms / 40));
      let i = 0;
      fadeIv = setInterval(() => {
        i++;
        try { el.volume = Math.min(1, Math.max(0, from + (v - from) * i / steps)); } catch (e) { }
        if (i >= steps) { clearInterval(fadeIv); if (then) then(); }
      }, 40);
    }
    const canPlay = () => started && SFX.on && !ducked;
    return {
      start() {
        if (started || !M.src) return;
        started = true;
        el = new Audio(M.src);
        el.loop = true;
        el.preload = 'auto';
        el.volume = 0;
        el.addEventListener('error', () => console.warn('Song file not found at', M.src));
        if (!SFX.on) return;
        const p = el.play();
        if (p && p.catch) p.catch(() => { });
        fadeTo(target, 2500);
      },
      pause() { if (el) fadeTo(0, 400, () => el.pause()); },
      resume() {
        if (!el || !canPlay()) return;
        const p = el.play(); if (p && p.catch) p.catch(() => { });
        fadeTo(target, 800);
      },
      // quiet the song while her voice message is playing
      duck(on) { ducked = on; if (on) this.pause(); else this.resume(); },
    };
  })();

  /* ================= pixel helpers ================= */
  function paint(cv, pixels, ox, oy, w, h, S) {
    cv.width = w * S; cv.height = h * S;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (const p of pixels) { ctx.fillStyle = p.c; ctx.fillRect((p.x - ox) * S, (p.y - oy) * S, S, S); }
  }
  function spriteURL(pixels, w, h, S) {
    const c = document.createElement('canvas');
    paint(c, pixels, 0, 0, w, h, S);
    return c.toDataURL();
  }
  const HEART = spriteURL(ART.heart, ART.heartW, ART.heartH, 6);
  const PLAY = spriteURL(ART.icons.play, 7, 7, 4);
  const PAUSE = spriteURL(ART.icons.pause, 7, 7, 4);

  // pixel heart favicon
  const fav = document.createElement('link');
  fav.rel = 'icon'; fav.href = HEART; document.head.appendChild(fav);

  /* ================= confetti / hearts ================= */
  function burst(layer, x, y, o = {}) {
    const n = o.n || 18, u = o.unit || 6;
    const colors = o.colors || ['#ffd23f', '#ff8fc0', '#9ad7ff', '#ffffff', '#b98cff', '#ff4d6d'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      const heart = o.hearts && Math.random() < o.hearts;
      p.className = 'particle' + (heart ? ' heart' : '');
      const ang = o.spread ? (-Math.PI / 2 + (Math.random() - 0.5) * o.spread) : Math.random() * Math.PI * 2;
      const dist = (o.dist || 14) * u * (0.45 + Math.random() * 0.75);
      const size = heart ? u * (2.2 + Math.random() * 1.4) : u * (Math.random() < 0.3 ? 1.5 : 1);
      p.style.cssText =
        `left:${x}px;top:${y}px;width:${size}px;height:${heart ? size * 8 / 9 : size}px;` +
        `--c:${colors[i % colors.length]};--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px;` +
        `--fall:${(o.fall == null ? 6 : o.fall) * u * (0.6 + Math.random())}px;` +
        `--rot:${(Math.random() - 0.5) * (heart ? 70 : 360)}deg;--dur:${(o.dur || 1200) * (0.75 + Math.random() * 0.5)}ms`;
      if (heart) p.style.backgroundImage = `url(${HEART})`;
      layer.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  /* ================= falling snow + twinkly sky ================= */
  (function snow() {
    const cv = $('#snow'), ctx = cv.getContext('2d');
    let w = 0, h = 0, flakes = [], stars = [];
    const mk = any => {
      const s = [2, 2, 3, 3, 4][(Math.random() * 5) | 0];
      return { x: Math.random() * w, y: any ? Math.random() * h : -8, s, vy: 10 + s * 7 + Math.random() * 10, ph: Math.random() * 6.28, amp: 6 + Math.random() * 14, a: 0.45 + Math.random() * 0.5 };
    };
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.min(110, Math.round(w * h / 7500)) }, () => mk(true));
      stars = Array.from({ length: Math.round(w * h / 8000) }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.75, s: Math.random() < 0.2 ? 3 : 2, p: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.6 }));
    }
    let last = performance.now();
    function frame(t) {
      if (document.body.classList.contains('on-tree')) { last = t; requestAnimationFrame(frame); return; }
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t / 1000 * s.sp + s.p));
        ctx.fillStyle = '#fff1d0';
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
      }
      ctx.fillStyle = '#ffffff';
      for (const f of flakes) {
        f.y += f.vy * dt; f.ph += dt * 0.9;
        if (f.y > h + 6) Object.assign(f, mk(false));
        ctx.globalAlpha = f.a;
        ctx.fillRect(Math.round(f.x + Math.sin(f.ph) * f.amp), Math.round(f.y), f.s, f.s);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);
  })();

  /* ================= 🔒 lock screen ================= */
  const lockHeart = $('#lockHeart');
  paint(lockHeart, ART.heart, 0, 0, ART.heartW, ART.heartH, 6);

  const SECRET = 'YXNoaQ=='; // the secret word, lightly hidden from view-source
  const nopes = ['hmm, not quite... 🥺', 'nope! try again ♡', 'so close (maybe?)', 'think think think...', 'not that one hehe'];
  let nopeI = 0;
  const lockForm = $('#lockForm'), pw = $('#pw'), lockMsg = $('#lockMsg');

  lockForm.addEventListener('submit', e => {
    e.preventDefault();
    SFX.init();
    const guess = pw.value.trim().toLowerCase();
    let enc = '';
    try { enc = btoa(unescape(encodeURIComponent(guess))); } catch (err) { /* ignore */ }
    if (enc === SECRET) unlock();
    else {
      lockMsg.textContent = nopes[nopeI++ % nopes.length];
      lockForm.classList.remove('shake'); void lockForm.offsetWidth; lockForm.classList.add('shake');
      SFX.bonk();
      pw.select();
    }
  });

  function unlock() {
    pw.blur();
    lockMsg.textContent = 'yay! ♥';
    lockForm.classList.remove('shake'); void lockForm.offsetWidth; lockForm.classList.add('yay');
    SFX.chime();
    Music.start();   // must happen inside the tap/enter, or phones block it
    const r = lockForm.getBoundingClientRect();
    burst($('#fx'), r.left + r.width / 2, r.top + r.height * 0.25, { n: 30, unit: 6, dist: 26, hearts: 0.5, fall: 14, dur: 1400 });
    setTimeout(() => {
      $('#lock').classList.remove('active');
      $('#tree').classList.add('active');
      setTimeout(startBuild, reduceMotion ? 100 : 500);
    }, 1000);
  }

  /* ================= 🎄 the tree ================= */
  const scene = $('#scene'), hint = $('#hint');
  let S = 6, u = 6, phase = 'idle';
  AsciiTree.init($('#ascii'), $('#asciiGlow'));

  const presents = ART.presents.map((P, i) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'present';
    el.setAttribute('aria-label', ['open the first present', 'open the second present', 'open the third present'][i]);
    el.style.setProperty('--hd', (i * 1.2) + 's');
    el.style.setProperty('--dd', [0.15, 0.45, 0.3][i] + 's');
    el.style.setProperty('--dir', P.dir);
    const b = P.bbox, bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    const pct = (v, of) => (v / of * 100) + '%';
    Object.assign(el.style, { left: pct(b.x0, W), top: pct(b.y0, H), width: pct(bw, W), height: pct(bh, H) });
    const mk = (box, cls) => {
      const c = document.createElement('canvas');
      c.className = cls;
      Object.assign(c.style, {
        left: pct(box.x0 - b.x0, bw), top: pct(box.y0 - b.y0, bh),
        width: pct(box.x1 - box.x0 + 1, bw), height: pct(box.y1 - box.y0 + 1, bh),
      });
      el.appendChild(c);
      return c;
    };
    const beam = document.createElement('span');
    beam.className = 'beam';
    Object.assign(beam.style, {
      left: pct(P.bodyBox.x0 + 1 - b.x0, bw), width: pct(P.bodyBox.x1 - P.bodyBox.x0 - 1, bw),
      bottom: pct(b.y1 - P.bodyTop, bh),
    });
    el.appendChild(beam);
    const body = mk(P.bodyBox, 'body');
    const lid = mk(P.lidBox, 'lid');
    scene.appendChild(el);
    const st = { i, P, el, body, lid, opened: false };
    el.addEventListener('click', () => onPresent(st));
    return st;
  });

  function drawPresent(st) {
    const P = st.P, bb = P.bodyBox, lb = P.lidBox;
    paint(st.body, st.opened ? P.bodyOpen : P.body, bb.x0, bb.y0, bb.x1 - bb.x0 + 1, bb.y1 - bb.y0 + 1, S);
    paint(st.lid, P.lid, lb.x0, lb.y0, lb.x1 - lb.x0 + 1, lb.y1 - lb.y0 + 1, S);
  }

  let anchorsNow = null;
  function layout() {
    const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0;
    const hintTop = hint.getBoundingClientRect().top || innerHeight - 60;
    // leave room under the tree for the presents + typed message
    const region = { top: safeTop + 46, bottom: hintTop - Math.max(46, innerHeight * 0.09) };
    const g = AsciiTree.resize(region);
    anchorsNow = g;
    // presents span grid columns 3..53 (51 of 57) and sit on grid row 72
    const width = Math.min(innerWidth - 8, g.baseR * 2 * 0.85 * W / 51);
    const height = width * H / W;
    const left = g.baseX - width * (28.5 / W);
    const top = g.groundY - height * (73 / H);
    Object.assign(scene.style, { width: width + 'px', left: left + 'px', top: top + 'px' });
    u = width / W;
    scene.style.setProperty('--u', u + 'px');
    S = Math.max(2, Math.ceil(width * Math.min(3, window.devicePixelRatio || 1) / W));
    presents.forEach(drawPresent);
    AsciiTree.setMessageRow(top + height);
  }
  let resizeRaf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(() => { if (phase !== 'idle') layout(); }); });

  function startBuild() {
    phase = 'build';
    document.body.classList.add('on-tree');
    layout();
    AsciiTree.start();
    presents.forEach(p => p.el.classList.add('show'));
    SFX.tick();
    setTimeout(() => {
      AsciiTree.build({
        duration: reduceMotion ? 300 : 5200,
        onTick: h => SFX.blip(170 + Math.max(0, h) * 900),
        onDone: finish,
      });
    }, reduceMotion ? 0 : 900);
  }

  function finish() {
    phase = 'done';
    presents.forEach(p => { p.el.classList.remove('show'); p.el.classList.add('ready'); });
    SFX.fanfare();
    const g = AsciiTree.anchors();
    burst($('#fx'), g.starX, g.starY, { n: 26, unit: Math.max(4, g.cw * 0.8), dist: 14, fall: 6, hearts: 0.35 });
    setTimeout(() => AsciiTree.showMessage('H A P P Y   B I R T H D A Y   T H E A'), 600);
    setTimeout(() => hint.classList.add('show'), 2200);
  }

  /* ---- presents ---- */
  let busy = false;
  function updateHint() {
    const n = presents.filter(p => p.opened).length;
    hint.textContent = ['tap a present ✨', 'two more to go ✨', 'one more left ✨', 'happy birthday thea ♥'][n];
  }

  function onPresent(st) {
    if (busy || phase !== 'done') return;
    SFX.init();
    if (st.opened) {
      st.el.classList.remove('bump'); void st.el.offsetWidth; st.el.classList.add('bump');
      SFX.tick();
      setTimeout(() => openGift(st.i), 220);
      return;
    }
    busy = true;
    st.el.classList.add('shake');
    SFX.rattle();
    setTimeout(() => {
      st.el.classList.remove('shake');
      st.opened = true;
      st.el.classList.add('opened');
      drawPresent(st);
      SFX.pop();
      burst(scene, (st.P.cx + 0.5) * u, (st.P.bodyTop + 1) * u, { n: 28, unit: u, dist: 18, spread: Math.PI * 1.1, hearts: 0.35, fall: 12 });
      updateHint();
    }, 580);
    setTimeout(() => { busy = false; openGift(st.i); }, reduceMotion ? 700 : 1550);
  }

  /* ================= 🎁 gift popup ================= */
  const modal = $('#modal'), mbody = $('#modalBody'), mcard = $('#modalCard');
  let cleanup = null;

  function openGift(i) {
    [renderLetter, renderAlbums, renderAudio][i](mbody);
    mbody.scrollTop = 0;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    try { history.pushState({ gift: 1 }, ''); } catch (e) { /* file:// on some browsers */ }
  }
  function closeGift(fromPop) {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (cleanup) { cleanup(); cleanup = null; }
    setTimeout(() => { if (!modal.classList.contains('open')) mbody.innerHTML = ''; }, 320);
    if (!fromPop && history.state && history.state.gift) { try { history.back(); } catch (e) { } }
  }
  $('#modalClose').addEventListener('click', () => closeGift(false));
  modal.addEventListener('click', e => { if (e.target === modal) closeGift(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeGift(false); });
  addEventListener('popstate', () => closeGift(true));   // phone "back" closes the gift

  /* ---- gift 1: the letter ---- */
  function renderLetter(root) {
    const L = CONTENT.letter;
    const env = ART.envelope();
    root.innerHTML = `
      <div class="env-stage">
        <div class="envelope" role="button" aria-label="open the letter">
          <canvas class="env-back"></canvas>
          <div class="env-paper"><i></i><i></i><i></i><i></i></div>
          <canvas class="env-front"></canvas>
          <canvas class="env-flap"></canvas>
          <img class="env-seal" src="${HEART}" alt="">
        </div>
        <p class="env-tip">tap to open</p>
      </div>
      <article class="letter" hidden>
        <img class="letter-stamp" src="${HEART}" alt="">
        <p class="l-greet" style="--i:0">${esc(L.greeting)}</p>
        ${L.paragraphs.map((p, k) => `<p style="--i:${k + 1}">${esc(p)}</p>`).join('')}
        <p class="l-sign" style="--i:${L.paragraphs.length + 1}">${esc(L.signoff)}<br><span class="l-name">${esc(L.name)}</span></p>
      </article>`;
    const ES = 10;
    paint($('.env-back', root), env.back, 0, 0, env.W, env.H, ES);
    paint($('.env-front', root), env.front, 0, 0, env.W, env.H, ES);
    paint($('.env-flap', root), env.flap, 0, 0, env.W, env.FH, ES);

    const stage = $('.env-stage', root), envEl = $('.envelope', root), letter = $('.letter', root);
    const timers = [];
    let shown = false, started = false;
    function openEnvelope() {
      if (started) return; started = true;
      $('.env-tip', root).textContent = '♥';
      [[0, () => { envEl.classList.add('unsealed'); SFX.tick(); }],
       [300, () => { envEl.classList.add('open'); SFX.tone(500, 0.18, 'triangle', 0.05, 0, 900); }],
       [700, () => envEl.classList.add('flapback')],
       [900, () => { envEl.classList.add('rise'); SFX.tone(700, 0.25, 'triangle', 0.04, 0, 1400); }],
       [2100, showLetter]].forEach(([d, fn]) => timers.push(setTimeout(fn, d)));
    }
    function showLetter() {
      if (shown) return; shown = true;
      timers.forEach(clearTimeout);
      stage.classList.add('gone');
      timers.push(setTimeout(() => {
        stage.remove();
        letter.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => letter.classList.add('show')));
      }, 350));
    }
    envEl.addEventListener('click', () => (started ? showLetter() : openEnvelope()));
    timers.push(setTimeout(openEnvelope, 900));   // opens by itself after a moment
    cleanup = () => timers.forEach(clearTimeout);
  }

  /* ---- gift 2: album wall ---- */
  function coverEl(a, i) {
    const cover = document.createElement('div');
    cover.className = 'cover';
    const ph = document.createElement('div');
    ph.className = 'ph';
    ph.style.setProperty('--h', (i * 47 + 330) % 360);
    ph.textContent = a.title;
    cover.appendChild(ph);
    if (a.cover) {
      const img = new Image();
      img.alt = ''; img.decoding = 'async';
      img.onerror = () => img.remove();
      img.src = a.cover;
      cover.appendChild(img);
    }
    return cover;
  }
  function renderAlbums(root) {
    root.innerHTML = `
      <h2 class="gift-title">a wall of your favorite albums</h2>
      <p class="gift-sub">tap one ♪</p>
      <div class="wall"></div>`;
    const zoom = document.createElement('div');
    zoom.className = 'zoom'; zoom.hidden = true;
    zoom.innerHTML = `<div class="zoom-inner"><div class="zoom-art"></div><p class="zoom-title"></p><p class="zoom-artist"></p><p class="zoom-tip">tap to go back</p></div>`;
    mcard.appendChild(zoom);
    const wall = $('.wall', root);
    CONTENT.albums.forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'album';
      b.style.setProperty('--r', ((((i * 53) % 11) - 5) * 0.8) + 'deg');
      b.style.setProperty('--d', (i * 90 + 200) + 'ms');
      b.setAttribute('aria-label', `${a.title} by ${a.artist}`);
      const tape = document.createElement('span'); tape.className = 'tape';
      b.append(tape, coverEl(a, i));
      b.addEventListener('click', () => {
        SFX.tick();
        const za = $('.zoom-art', zoom); za.innerHTML = ''; za.appendChild(coverEl(a, i));
        $('.zoom-title', zoom).textContent = a.title;
        $('.zoom-artist', zoom).textContent = a.artist;
        zoom.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => zoom.classList.add('on')));
      });
      wall.appendChild(b);
    });
    zoom.addEventListener('click', () => { zoom.classList.remove('on'); setTimeout(() => { zoom.hidden = true; }, 250); });
    cleanup = () => zoom.remove();
  }

  /* ---- gift 3: the recording ---- */
  function renderAudio(root) {
    const A = CONTENT.audio;
    root.innerHTML = `
      <h2 class="gift-title">${esc(A.title)}</h2>
      <p class="gift-sub">turn your volume up ♪</p>
      <div class="cassette"><canvas></canvas><span class="cas-label">${esc(A.label)}</span></div>
      <div class="player">
        <button class="pixel-btn play-btn" type="button" aria-label="play"><img src="${PLAY}" alt=""></button>
        <div class="bar" aria-label="seek"><div class="fill"></div></div>
        <span class="time">0:00</span>
      </div>
      <p class="audio-msg"></p>`;
    const cv = $('.cassette canvas', root), cas = $('.cassette', root);
    const btn = $('.play-btn', root), icon = $('img', btn), bar = $('.bar', root), fill = $('.fill', root);
    const time = $('.time', root), msg = $('.audio-msg', root);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = A.src;
    let frame = 0, iv = 0;
    const fmt = s => (!isFinite(s) || s < 0) ? '0:00' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    const prog = () => (audio.duration && isFinite(audio.duration)) ? audio.currentTime / audio.duration : 0;
    function draw() {
      paint(cv, ART.cassette(prog(), frame), 0, 0, ART.CAS_W, ART.CAS_H, 8);
      fill.style.width = (prog() * 100) + '%';
      time.textContent = fmt(audio.currentTime);
    }
    draw();
    function setPlaying(on) {
      icon.src = on ? PAUSE : PLAY;
      btn.setAttribute('aria-label', on ? 'pause' : 'play');
      cas.classList.toggle('playing', on);
      clearInterval(iv);
      if (on) iv = setInterval(() => { frame ^= 1; draw(); }, 160);
    }
    btn.addEventListener('click', () => {
      if (audio.paused) {
        const p = audio.play();
        if (p && p.catch) p.catch(() => { msg.textContent = 'the tape is still being recorded... check back soon ♥'; });
      } else audio.pause();
    });
    audio.addEventListener('play', () => { setPlaying(true); msg.textContent = ''; Music.duck(true); });
    audio.addEventListener('pause', () => { setPlaying(false); Music.duck(false); });
    audio.addEventListener('ended', () => { setPlaying(false); draw(); msg.textContent = '♥ press play to hear it again'; Music.duck(false); });
    audio.addEventListener('timeupdate', draw);
    audio.addEventListener('loadedmetadata', draw);
    audio.addEventListener('error', () => {
      msg.textContent = 'the tape is still being recorded... check back soon ♥';
      console.warn('Audio file not found at', A.src);
    });
    // drag / tap to seek
    let dragging = false;
    const seek = e => {
      if (!audio.duration || !isFinite(audio.duration)) return;
      const r = bar.getBoundingClientRect();
      audio.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * audio.duration;
      draw();
    };
    bar.addEventListener('pointerdown', e => { dragging = true; try { bar.setPointerCapture(e.pointerId); } catch (er) { } seek(e); });
    bar.addEventListener('pointermove', e => { if (dragging) seek(e); });
    bar.addEventListener('pointerup', () => { dragging = false; });
    bar.addEventListener('pointercancel', () => { dragging = false; });
    cleanup = () => { clearInterval(iv); audio.pause(); audio.removeAttribute('src'); audio.load(); Music.duck(false); };
  }

  /* ================= sound toggle ================= */
  const soundBtn = $('#soundBtn');
  soundBtn.addEventListener('click', () => {
    SFX.on = !SFX.on;
    soundBtn.textContent = SFX.on ? 'sound on' : 'sound off';
    if (SFX.on) { SFX.init(); SFX.tick(); Music.resume(); } else Music.pause();
  });
})();
