/* Codescherm: invoer, aftellen, uitslag en film. */
(function () {
  'use strict';

  var K = window.KLUIS, G = window.Geheim;
  var $ = function (id) { return document.getElementById(id); };
  var bewegingUit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var params = new URLSearchParams(location.search);
  var DUUR = Math.max(3, parseInt(params.get('duur'), 10) || K.aftellen || 15);

  // Vakjes 1 t/m 7 en hoeveel cijfers elk vakje heeft (zoals op het A4).
  var GROEPEN = [{ nr: 1, n: 2 }, { nr: 2, n: 2 }, { nr: 3, n: 1 }, { nr: 4, n: 1 }, { nr: 5, n: 1 }, { nr: 6, n: 2 }, { nr: 7, n: 2 }];
  var cijfers = ['', '', '', '', '', '', '', '', '', '', ''];
  var cursor = 0, poging = 1;
  var vakken = [], badges = [];

  // ============ Geluid ============
  var geluidAan = true;
  try { geluidAan = localStorage.getItem('kluis-geluid') !== 'uit'; } catch (e) { /* */ }
  var ac = null, meester = null, ruisBuf = null, drone = null;
  function audio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        meester = ac.createGain();
        meester.gain.value = geluidAan ? 0.9 : 0;
        var comp = ac.createDynamicsCompressor();
        meester.connect(comp).connect(ac.destination);
        ruisBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        var d = ruisBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        startDrone();
      } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function nu() { return ac.currentTime; }
  function osc(type, f, start, duur, vol, naar, bestemming) {
    if (!audio()) return null;
    var t = nu() + (start || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (naar) o.frequency.exponentialRampToValueAtTime(naar, t + duur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, duur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    o.connect(g).connect(bestemming || meester);
    o.start(t); o.stop(t + duur + 0.05);
    return o;
  }
  function ruis(start, duur, vanF, naarF, vol, type) {
    if (!audio()) return;
    var t = nu() + (start || 0), b = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    b.buffer = ruisBuf; f.type = type || 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(vanF, t); f.frequency.exponentialRampToValueAtTime(naarF, t + duur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + duur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    b.connect(f).connect(g).connect(meester);
    b.start(t); b.stop(t + duur + 0.05);
  }
  function startDrone() {
    var g = ac.createGain(); g.gain.value = 0.0001;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    var o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = 'sawtooth'; o1.frequency.value = 55; o2.type = 'sawtooth'; o2.frequency.value = 55.6;
    o1.connect(lp); o2.connect(lp); lp.connect(g).connect(meester);
    o1.start(); o2.start();
    g.gain.exponentialRampToValueAtTime(0.035, nu() + 3);
    drone = { g: g, lp: lp, o1: o1, o2: o2 };
  }
  function droneNaar(vol, filter, toon, sec) {
    if (!drone) return;
    var t = nu();
    drone.g.gain.cancelScheduledValues(t); drone.g.gain.setTargetAtTime(Math.max(vol, 0.0001), t, sec / 3);
    drone.lp.frequency.cancelScheduledValues(t); drone.lp.frequency.setTargetAtTime(filter, t, sec / 3);
    drone.o1.frequency.setTargetAtTime(toon, t, sec / 3); drone.o2.frequency.setTargetAtTime(toon * 1.011, t, sec / 3);
  }
  var klank = {
    toets: function (i) { osc('square', 660 + i * 40, 0, 0.06, 0.05); osc('sine', 1320 + i * 80, 0.01, 0.08, 0.04); },
    wis: function () { osc('triangle', 300, 0, 0.12, 0.08, 150); },
    vol: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { osc('triangle', f, i * 0.06, 0.4, 0.07); }); },
    weiger: function () { osc('square', 160, 0, 0.12, 0.06); },
    hart: function (sterk) { osc('sine', 130, 0, 0.22, sterk ? 0.9 : 0.6, 38); osc('sine', 110, 0.16, 0.2, sterk ? 0.6 : 0.35, 36); },
    tik: function () { osc('square', 2400, 0, 0.02, 0.05); },
    sirene: function () { var o = osc('sawtooth', 600, 0, 0.9, 0.06, 1100); },
    knal: function () { ruis(0, 0.6, 6000, 200, 0.9, 'lowpass'); osc('sine', 90, 0, 1.2, 0.9, 30); },
    tap: function (e) { osc('triangle', 500 + e * 9, 0, 0.07, 0.07); },
    overdrive: function () { ruis(0, 0.5, 400, 8000, 0.5); [784, 1047, 1568].forEach(function (f) { osc('square', f, 0, 0.3, 0.04); }); },
    zacht: function () {
      ruis(0, 1.2, 800, 5000, 0.08);
      [523, 659, 784].forEach(function (f, i) { osc('sine', f, i * 0.12, 1.6, 0.05); });
      [1568, 1976, 2349].forEach(function (f, i) { osc('sine', f, 0.5 + i * 0.1, 0.9, 0.025); });
    },
    gered: function () {
      klank.knal();
      [[262, 0], [330, 0], [392, 0], [523, 0], [659, .5], [784, .5], [1047, .5]].forEach(function (n) { osc('sawtooth', n[0], 0.15 + n[1], 3.2, 0.05); osc('sine', n[0] * 2, 0.15 + n[1], 3, 0.03); });
      [1568, 1976, 2349, 2637, 3136].forEach(function (f, i) { osc('sine', f, 0.9 + i * 0.09, 0.8, 0.04); });
    },
    mislukt: function () {
      if (!audio()) return;
      var ws = ac.createWaveShaper(), curve = new Float32Array(256);
      for (var i = 0; i < 256; i++) { var x = i / 128 - 1; curve[i] = Math.tanh(x * 8); }
      ws.curve = curve; ws.connect(meester);
      osc('sawtooth', 92, 0, 1.3, 0.35, 70, ws); osc('sawtooth', 97, 0, 1.3, 0.3, 72, ws);
      [0, 0.25, 0.5].forEach(function (s) { ruis(s, 0.15, 3000, 800, 0.4); });
      osc('sine', 60, 0, 1.6, 0.8, 30);
    }
  };
  var riser = null;
  function startRiser(sec) {
    if (!audio()) return;
    stopRiser();
    var t = nu(), o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(560, t + sec);
    o2.frequency.setValueAtTime(70.8, t); o2.frequency.exponentialRampToValueAtTime(566, t + sec);
    f.type = 'lowpass'; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(6000, t + sec);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + sec);
    o.connect(f); o2.connect(f); f.connect(g).connect(meester);
    o.start(t); o2.start(t);
    var b = ac.createBufferSource(), bf = ac.createBiquadFilter(), bg = ac.createGain();
    b.buffer = ruisBuf; b.loop = true; bf.type = 'bandpass'; bf.Q.value = 2;
    bf.frequency.setValueAtTime(300, t); bf.frequency.exponentialRampToValueAtTime(9000, t + sec);
    bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(0.14, t + sec);
    b.connect(bf).connect(bg).connect(meester); b.start(t);
    riser = { stop: function (snel) { var tt = nu(); [g, bg].forEach(function (x) { x.gain.cancelScheduledValues(tt); x.gain.setTargetAtTime(0.0001, tt, snel ? 0.01 : 0.08); }); setTimeout(function () { try { o.stop(); o2.stop(); b.stop(); } catch (e) { /* */ } }, 400); } };
  }
  function stopRiser(snel) { if (riser) { riser.stop(snel); riser = null; } }
  function zetGeluid() {
    $('geluidKnop').setAttribute('aria-pressed', String(geluidAan));
    $('geluidKnop').setAttribute('aria-label', geluidAan ? 'Geluid uit' : 'Geluid aan');
    if (meester) meester.gain.setTargetAtTime(geluidAan ? 0.9 : 0, nu(), 0.05);
  }
  $('geluidKnop').addEventListener('click', function () {
    geluidAan = !geluidAan; audio();
    try { localStorage.setItem('kluis-geluid', geluidAan ? 'aan' : 'uit'); } catch (e) { /* */ }
    zetGeluid();
  });
  zetGeluid();
  $('schermKnop').addEventListener('click', function () {
    var d = document, el = d.documentElement;
    if (!d.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  });
  function tril(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* */ } }

  // ============ Ruimte: warp-sterren en datastromen ============
  var cv = $('ruimte'), cx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var sterren = [], snelheid = 0.06, doelSnelheid = 0.06, intensiteit = 0, kleurRood = 0;
  var kolommen = [];
  function formaat() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    kolommen = [];
    var n = Math.max(6, Math.floor(W / 90));
    for (var i = 0; i < n; i++) kolommen.push({ x: (i + 0.5) * W / n, y: Math.random() * H, v: 60 + Math.random() * 160 });
  }
  formaat();
  addEventListener('resize', formaat);
  for (var s = 0; s < 650; s++) sterren.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
  var HEX = '0123456789ABCDEF';
  var vorig = performance.now();
  (function teken(t) {
    var dt = Math.min(0.05, (t - vorig) / 1000); vorig = t;
    snelheid += (doelSnelheid - snelheid) * Math.min(1, dt * 2.5);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = 'rgba(3,4,9,' + (0.35 + 0.4 * (1 - intensiteit)) + ')';
    cx.fillRect(0, 0, W, H);
    var mx = W / 2, my = H / 2, f = Math.max(W, H) * 0.6;
    cx.lineCap = 'round';
    for (var i = 0; i < sterren.length; i++) {
      var st = sterren[i], z0 = st.z;
      st.z -= snelheid * dt;
      if (st.z <= 0.01) { st.x = Math.random() * 2 - 1; st.y = Math.random() * 2 - 1; st.z = 1; continue; }
      var x1 = mx + st.x / st.z * f, y1 = my + st.y / st.z * f;
      var x0 = mx + st.x / Math.min(1, z0 + snelheid * 0.04) * f, y0 = my + st.y / Math.min(1, z0 + snelheid * 0.04) * f;
      if (x1 < -50 || x1 > W + 50 || y1 < -50 || y1 > H + 50) { st.z = 1; continue; }
      var a = Math.min(1, (1 - st.z) * 1.6);
      var r = 200 + 55 * kleurRood, g = 230 - 150 * kleurRood, b = 255 - 190 * kleurRood;
      cx.strokeStyle = 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + a + ')';
      cx.lineWidth = Math.max(0.6, (1 - st.z) * 2.4);
      cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke();
    }
    if (intensiteit > 0.05) {
      cx.font = '600 13px JetBrains Mono, monospace';
      cx.fillStyle = 'rgba(61,245,224,' + (0.12 + intensiteit * 0.35) * (1 - kleurRood * 0.4) + ')';
      for (var k = 0; k < kolommen.length; k++) {
        var kol = kolommen[k];
        kol.y += kol.v * dt * (1 + intensiteit * 4);
        if (kol.y > H + 200) kol.y = -200;
        for (var j = 0; j < 12; j++) cx.fillText(HEX[(Math.random() * 16) | 0] + HEX[(Math.random() * 16) | 0], kol.x, kol.y - j * 18);
      }
    }
    requestAnimationFrame(teken);
  })(vorig);

  // ============ Telemetrie ============
  var hart = 72, spanning = 12;
  setInterval(function () {
    var d = new Date();
    $('tKlok').textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (x) { return (x < 10 ? '0' : '') + x; }).join(':');
    $('tSignaal').textContent = (96 + Math.random() * 3.9).toFixed(1);
    $('tHart').textContent = Math.round(hart + Math.random() * 4);
    $('tSpanning').textContent = Math.round(spanning);
  }, 250);

  // ============ Invoer ============
  function bouwPaneel() {
    var rb = $('regelBreedte'), rl = $('regelLengte');
    var vak = function (index, kolom) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'vak'; b.style.gridColumn = kolom; b.style.gridRow = 1;
      b.addEventListener('click', function () { cursor = index; tekenVakken(); klank.toets(0); });
      vakken[index] = b;
      return b;
    };
    var teken = function (t, kolom, cls) {
      var s = document.createElement('span');
      s.className = 'teken' + (cls ? ' ' + cls : ''); s.textContent = t; s.style.gridColumn = kolom; s.style.gridRow = 1;
      s.setAttribute('aria-hidden', 'true');
      return s;
    };
    var badge = function (nr, kolom) {
      var s = document.createElement('span');
      s.className = 'groep-badge'; s.textContent = nr; s.style.gridColumn = kolom; s.setAttribute('aria-hidden', 'true');
      badges[nr - 1] = s;
      return s;
    };
    [vak(0, 1), vak(1, 2), teken('.', 3), vak(2, 4), vak(3, 5), vak(4, 6), vak(5, 7), teken(',', 8),
      badge(1, '1 / 3'), badge(2, '4 / 6'), badge(3, '6'), badge(4, '7')].forEach(function (el) { rb.appendChild(el); });
    [teken('-', 1, 'min'), vak(6, 2), teken('.', 3), vak(7, 4), vak(8, 5), vak(9, 6), vak(10, 7),
      badge(5, '2'), badge(6, '4 / 6'), badge(7, '6 / 8')].forEach(function (el) { rl.appendChild(el); });
  }
  function groepVan(index) {
    var start = 0;
    for (var g = 0; g < GROEPEN.length; g++) { if (index < start + GROEPEN[g].n) return g; start += GROEPEN[g].n; }
    return 6;
  }
  function tekenVakken(plopIndex) {
    vakken.forEach(function (v, i) {
      v.textContent = cijfers[i];
      v.classList.toggle('vol', !!cijfers[i]);
      v.classList.toggle('nu', i === cursor && $('ontgrendel').dataset.bezig !== '1');
      v.setAttribute('aria-label', 'Vakje ' + (groepVan(i) + 1) + ', cijfer ' + (i + 1) + ' van 11: ' + (cijfers[i] || 'leeg'));
      if (i === plopIndex) { v.classList.remove('plop'); void v.offsetWidth; v.classList.add('plop'); }
    });
    var start = 0;
    GROEPEN.forEach(function (g, k) {
      var vol = true;
      for (var j = 0; j < g.n; j++) if (!cijfers[start + j]) vol = false;
      badges[k].classList.toggle('vol', vol);
      start += g.n;
    });
    var leeg = cijfers.filter(function (c) { return !c; }).length;
    var knop = $('ontgrendel');
    var wasDicht = knop.disabled;
    knop.disabled = leeg > 0;
    $('ontgrendelSub').textContent = leeg > 0 ? 'Nog ' + leeg + (leeg === 1 ? ' cijfer' : ' cijfers') : 'Houd ingedrukt';
    $('paneel').classList.toggle('compleet', leeg === 0);
    if (wasDicht && leeg === 0) { klank.vol(); tril([20, 40, 20]); }
  }
  function typ(c) {
    if (document.body.dataset.fase !== 'invoer') return;
    audio();
    cijfers[cursor] = c;
    var gezet = cursor;
    if (cursor < 10) cursor++;
    klank.toets(gezet % 6); tril(8);
    tekenVakken(gezet);
  }
  function terug() {
    if (cijfers[cursor]) cijfers[cursor] = '';
    else if (cursor > 0) { cursor--; cijfers[cursor] = ''; }
    klank.wis(); tekenVakken();
  }
  document.querySelectorAll('#toetsen [data-cijfer]').forEach(function (b) {
    b.addEventListener('click', function () { typ(b.dataset.cijfer); });
  });
  $('terugToets').addEventListener('click', function () { audio(); terug(); });
  $('wisAlles').addEventListener('click', function () { audio(); cijfers = cijfers.map(function () { return ''; }); cursor = 0; klank.wis(); tekenVakken(); });

  document.addEventListener('keydown', function (e) {
    var fase = document.body.dataset.fase;
    if (fase === 'wacht') { wachtToets(e); return; }
    if (fase === 'wachtopen') return;
    if (fase === 'aftellen') { if (e.key !== 'Escape' && !e.repeat) energieTik(null); return; }
    if (fase !== 'invoer') return;
    if (/^\d$/.test(e.key)) {
      typ(e.key);
      var toets = document.querySelector('#toetsen [data-cijfer="' + e.key + '"]');
      if (toets) { toets.classList.add('druk'); setTimeout(function () { toets.classList.remove('druk'); }, 120); }
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') { audio(); terug(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { cursor = Math.max(0, cursor - 1); tekenVakken(); }
    else if (e.key === 'ArrowRight') { cursor = Math.min(10, cursor + 1); tekenVakken(); }
    else if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && document.activeElement && !document.activeElement.closest('#toetsen')) {
      if (!$('ontgrendel').disabled) { e.preventDefault(); startHouden(); }
    }
  });
  document.addEventListener('keyup', function (e) { if (e.key === 'Enter' || e.key === ' ') stopHouden(); });

  // ============ Ingedrukt houden ============
  var HOUD = bewegingUit ? 600 : 1500, houdStart = 0, houdRaf = null, houdTimer = null;
  var film = $('film');
  function codeKlopt() { return G.hash('boysinwonderland|kluis|' + cijfers.join('')) === K.codeHash; }
  // Waar staat de film? Een versleutelde YouTube-link of bestandsnaam gaat pas open met de goede code.
  function filmBron() {
    if (K.filmGeheim) {
      var o = G.ontsleutelJSON(K.filmGeheim, 'film|' + cijfers.join(''));
      if (o) return o;
    }
    return K.film ? { bestand: K.film } : null;
  }
  function ontgrendelFilm() {
    // Binnen een gebaar van de gebruiker: dan mag de film later met geluid starten.
    if (!codeKlopt() || film.dataset.klaar) return;
    var bron = filmBron();
    if (!bron || !bron.bestand) return;
    film.dataset.klaar = '1';
    film.src = bron.bestand; film.preload = 'auto';
    film.muted = true;
    var p = film.play();
    if (p && p.then) p.then(function () { film.pause(); film.currentTime = 0; film.muted = false; }).catch(function () { film.muted = false; });
    else film.muted = false;
    film.load && film.readyState === 0 && film.load();
  }
  function startHouden() {
    var knop = $('ontgrendel');
    if (knop.disabled || houdStart) return;
    audio();
    ontgrendelFilm();
    houdStart = performance.now();
    knop.classList.add('vast');
    startRiser(HOUD / 1000);
    tril(15);
    (function stap() {
      var p = Math.min(1, (performance.now() - houdStart) / HOUD);
      $('ringVulling').style.strokeDashoffset = 339.3 * (1 - p);
      $('ontgrendel').style.setProperty('--houd', p.toFixed(3));
      if (p >= 1) { klaarMetHouden(); return; }
      houdRaf = requestAnimationFrame(stap);
    })();
  }
  function stopHouden() {
    if (!houdStart) return;
    var kort = performance.now() - houdStart < 300;
    houdStart = 0;
    cancelAnimationFrame(houdRaf);
    stopRiser();
    $('ontgrendel').classList.remove('vast');
    $('ringVulling').style.strokeDashoffset = 339.3;
    $('ontgrendel').style.setProperty('--houd', 0);
    var h = $('ontgrendelHint');
    if (kort) { h.textContent = 'Niet loslaten! Houd de knop ingedrukt tot hij vol is.'; } else { h.textContent = 'Te vroeg losgelaten. Houd vast tot hij vol is.'; }
    h.classList.remove('let-op'); void h.offsetWidth; h.classList.add('let-op');
    klank.weiger();
  }
  function klaarMetHouden() {
    houdStart = 0;
    $('ontgrendel').classList.remove('vast');
    $('ringVulling').style.strokeDashoffset = 339.3;
    $('ontgrendel').style.setProperty('--houd', 0);
    $('ontgrendelHint').textContent = 'Houd de knop ingedrukt om de code te versturen.';
    $('ontgrendelHint').classList.remove('let-op');
    stopRiser(true);
    startAftellen();
  }
  var ok = $('ontgrendel');
  ok.addEventListener('pointerdown', function (e) { if (!ok.disabled) { e.preventDefault(); ok.setPointerCapture(e.pointerId); startHouden(); } });
  ok.addEventListener('pointerup', stopHouden);
  ok.addEventListener('pointercancel', stopHouden);
  ok.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  ok.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); e.stopPropagation(); startHouden(); } });
  ok.addEventListener('keyup', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); stopHouden(); } });

  // ============ Aftellen ============
  var energie = 0, tikken = 0, overdriveTot = 0, timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function wisTimers() { timers.forEach(clearTimeout); timers = []; }
  function zetFase(f) { document.body.dataset.fase = f; }
  function flits(soort) { var fl = $('flits'); fl.className = 'laag-flits' + (soort ? ' ' + soort : ''); void fl.offsetWidth; fl.classList.add('aan'); }
  function codeTekst() { return cijfers.slice(0, 2).join('') + '.' + cijfers.slice(2, 6).join('') + ', -' + cijfers[6] + '.' + cijfers.slice(7).join(''); }

  function bouwControles() {
    var ol = $('controles'); ol.innerHTML = '';
    var start = 0;
    GROEPEN.forEach(function (g, k) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="nr">' + g.nr + '</span><span class="naam"></span><span class="cijfers"></span><span class="st"></span>';
      li.querySelector('.naam').textContent = 'Envelop ' + g.nr + ' · ' + (K.enveloppen[k] || '');
      li.dataset.cijfers = cijfers.slice(start, start + g.n).join('');
      start += g.n;
      ol.appendChild(li);
    });
  }
  function feed(html, alarm) {
    var ul = $('feed'), li = document.createElement('li');
    var t = new Date(), stempel = [t.getMinutes(), t.getSeconds()].map(function (x) { return (x < 10 ? '0' : '') + x; }).join(':') + '.' + String(t.getMilliseconds()).padStart(3, '0');
    li.innerHTML = '<b>[' + stempel + ']</b> ' + html;
    if (alarm) li.className = 'alarm';
    ul.appendChild(li);
    while (ul.children.length > 14) ul.removeChild(ul.firstChild);
  }
  function berichten() {
    var namen = K.enveloppen;
    var r = function (a) { return a[(Math.random() * a.length) | 0]; };
    return [
      ['Verbinding met de kluis wordt opgebouwd'],
      ['Code ontvangen: <b>' + codeTekst() + '</b>'],
      ['Toegangsprotocol <b>NEGEN-VRIENDEN</b> gestart'],
      ['Satellieten uitlijnen <b>3/12</b>'],
      ['Firewall laag 1 doorbroken'],
      ['Hartslag groep: <b>' + (110 + ((Math.random() * 30) | 0)) + '</b> bpm'],
      ['Satellieten uitlijnen <b>8/12</b>'],
      [r(namen) + ' kijkt zenuwachtig om zich heen'],
      ['Rekenkracht verhoogd naar <b>300%</b>'],
      ['Waarschuwing: spanning boven normaal', true],
      ['Versleuteling ontrafelen <b>23%</b>'],
      ['Joris en Nando houden hun adem in'],
      ['Firewall laag 2 doorbroken'],
      ['Satellieten uitlijnen <b>12/12</b>'],
      ['Versleuteling ontrafelen <b>61%</b>'],
      ['Wie heeft er verkeerd gerekend? Analyse loopt'],
      ['Koffers worden alvast uit de kast gehaald'],
      ['Kluismechaniek draait: <b>klik klik klik</b>'],
      ['Versleuteling ontrafelen <b>88%</b>'],
      ['Kritiek: niet meer terug te draaien', true],
      ['Paspoorten worden gezocht'],
      ['Laatste controle van alle berekeningen'],
      ['Alle systemen op rood', true],
      ['Versleuteling ontrafelen <b>99%</b>'],
      ['Nog even volhouden', true],
      ['Uitslag wordt berekend', true]
    ];
  }
  function startAftellen() {
    zetFase('aftellen');
    poging > 1 && feed('Poging <b>' + poging + '</b>');
    $('tKluis').textContent = 'WORDT GEOPEND';
    bouwControles();
    $('feed').innerHTML = '';
    $('klokCode').textContent = codeTekst();
    energie = 0; tikken = 0; $('tikTeller').textContent = '0'; $('energieVulling').style.width = '0%';
    $('energie').classList.remove('overdrive');
    var streepjes = '';
    for (var s = 0; s < 60; s++) { var a = s / 60 * Math.PI * 2, r1 = 80, r2 = s % 5 ? 84 : 76; streepjes += '<line x1="' + (100 + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (100 + r1 * Math.sin(a)).toFixed(1) + '" x2="' + (100 + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (100 + r2 * Math.sin(a)).toFixed(1) + '"/>'; }
    $('klokStreepjes').innerHTML = streepjes;
    flits(); klank.knal(); tril([60, 30, 60]);
    droneNaar(0.08, 1200, 55, 2);
    startRiser(DUUR);

    var startT = performance.now();
    var lijst = berichten(), volgendeBericht = 0;
    var controles = Array.prototype.slice.call(document.querySelectorAll('#controles li'));
    var laatsteSec = -1;

    (function lus() {
      if (document.body.dataset.fase !== 'aftellen') return;
      var verstreken = (performance.now() - startT) / 1000;
      var t = Math.min(1, verstreken / DUUR);
      var over = Math.max(0, DUUR - verstreken);
      var sec = Math.ceil(over);
      intensiteit = Math.pow(t, 1.3);
      energie = Math.max(0, energie - 22 * (1 / 60));
      var boost = performance.now() < overdriveTot ? 0.9 : energie / 100 * 0.5;
      doelSnelheid = 0.12 + intensiteit * 1.5 + boost;
      kleurRood = over < 3.2 ? Math.min(1, kleurRood + 0.05) : intensiteit * 0.3;
      hart = 80 + intensiteit * 90;
      spanning = 12 + intensiteit * 88;
      $('energieVulling').style.width = energie + '%';
      var schok = intensiteit * 5 + (over < 3.2 ? 8 : 0) + energie / 30;
      document.documentElement.style.setProperty('--schok', bewegingUit ? 0 : schok.toFixed(2));
      document.body.classList.toggle('schud', !bewegingUit && intensiteit > 0.15);
      document.body.classList.toggle('waarschuwing', t > 0.42);
      document.body.classList.toggle('kritiek', over < 3.2);
      $('klokVulling').style.strokeDashoffset = 578 * t;

      if (sec !== laatsteSec && sec > 0) {
        laatsteSec = sec;
        var g = $('getal');
        g.textContent = sec; g.dataset.tekst = sec;
        g.classList.remove('tik'); void g.offsetWidth; g.classList.add('tik');
        $('aftelStatus').textContent = sec;
        klank.hart(over < 3.2);
        if (over < 6) later(function () { klank.hart(over < 3.2); }, 330);
        if (over < 3.2) { klank.sirene(); flits('rood'); tril([80, 40, 80]); } else tril(30);
      }
      if (Math.random() < 0.08 + intensiteit * 0.3) klank.tik();

      // Berichten steeds sneller
      var tijdVoorBericht = (volgendeBericht / lijst.length) * DUUR * 0.95;
      if (volgendeBericht < lijst.length && verstreken >= tijdVoorBericht) { feed(lijst[volgendeBericht][0], lijst[volgendeBericht][1]); volgendeBericht++; }

      // Fragmenten inlezen met rollende cijfers
      controles.forEach(function (li, k) {
        var klaarOp = DUUR * (0.08 + k * 0.11);
        var c = li.querySelector('.cijfers');
        if (verstreken > klaarOp - DUUR * 0.1) li.classList.add('actief');
        if (verstreken < klaarOp) {
          if (li.classList.contains('actief')) c.textContent = li.dataset.cijfers.replace(/\d/g, function () { return (Math.random() * 10) | 0; });
        } else if (!li.classList.contains('goed')) {
          c.textContent = li.dataset.cijfers; li.classList.add('goed');
          feed('Envelop ' + (k + 1) + ' · ' + (K.enveloppen[k] || '') + ': fragment <b>' + li.dataset.cijfers + '</b> ingelezen');
          klank.toets(k);
        }
      });

      if (verstreken >= DUUR) { eindeAftellen(); return; }
      requestAnimationFrame(lus);
    })();
  }

  function energieTik(e) {
    if (document.body.dataset.fase !== 'aftellen') return;
    audio();
    energie = Math.min(100, energie + 7);
    tikken++;
    $('tikTeller').textContent = tikken;
    klank.tap(energie);
    tril(10);
    var x = e ? e.clientX : innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.6;
    var y = e ? e.clientY : innerHeight * (0.3 + Math.random() * 0.5);
    vonken(x, y, 10);
    var kop = $('energieKop'), blok = $('energie');
    if (energie >= 100 && performance.now() > overdriveTot) {
      overdriveTot = performance.now() + 1500;
      energie = 55;
      blok.classList.add('overdrive');
      kop.textContent = 'Overdrive!';
      klank.overdrive(); flits('goud');
      vonken(innerWidth / 2, innerHeight / 2, 40);
      setTimeout(function () { blok.classList.remove('overdrive'); }, 1500);
    } else if (performance.now() > overdriveTot) {
      kop.textContent = energie > 60 ? 'Harder! Harder!' : 'Geef energie! Tik zo snel als je kunt';
    }
  }
  $('f-aftellen').addEventListener('pointerdown', energieTik);

  function vonken(x, y, n) {
    if (bewegingUit) return;
    var laag = $('vonken');
    var ring = document.createElement('span');
    ring.className = 'tik-ring'; ring.style.left = x + 'px'; ring.style.top = y + 'px';
    laag.appendChild(ring);
    setTimeout(function () { ring.remove(); }, 650);
    for (var i = 0; i < n; i++) {
      var v = document.createElement('span'), a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 120;
      v.className = 'vonk'; v.style.left = x + 'px'; v.style.top = y + 'px';
      v.style.setProperty('--x', Math.cos(a) * d + 'px'); v.style.setProperty('--y', Math.sin(a) * d + 'px');
      if (Math.random() < 0.4) v.style.background = '#3df5e0';
      laag.appendChild(v);
      setTimeout(function (el) { return function () { el.remove(); }; }(v), 750);
    }
  }

  function eindeAftellen() {
    wisTimers();
    stopRiser(true);
    droneNaar(0.0001, 200, 40, 0.05);
    document.body.classList.remove('schud', 'waarschuwing', 'kritiek');
    document.documentElement.style.setProperty('--schok', 0);
    zetFase('stilte');
    intensiteit = 0; doelSnelheid = 0; snelheid = 0; kleurRood = 0;
    $('aftelStatus').textContent = 'De uitslag komt eraan';
    later(function () { klank.hart(true); }, 1300);
    later(function () { klank.hart(false); }, 1800);
    later(uitslag, bewegingUit ? 600 : 2600);
  }

  function uitslag() {
    var goed = codeKlopt();
    hart = 72; spanning = goed ? 0 : 99;
    if (goed) {
      zetFase('gered');

      $('tKluis').textContent = 'OPEN';
      flits('goud'); klank.gered(); tril([100, 50, 100, 50, 300]);
      doelSnelheid = 0.9; intensiteit = 0.3;
      vonken(innerWidth / 2, innerHeight / 2, 60);
      later(function () { vonken(innerWidth * 0.25, innerHeight * 0.4, 40); }, 300);
      later(function () { vonken(innerWidth * 0.75, innerHeight * 0.4, 40); }, 500);
      droneNaar(0.05, 2000, 65.4, 2);
      laadFilm();
    } else {
      zetFase('mislukt');
      $('tKluis').textContent = 'GEWEIGERD';
      $('foutTekst').textContent = K.foutTeksten[(poging - 1) % K.foutTeksten.length];
      flits('rood'); klank.mislukt(); tril([300, 100, 300]);
      doelSnelheid = 0.03; intensiteit = 0.1; kleurRood = 1;
      droneNaar(0.05, 300, 41, 1);
    }
  }
  $('opnieuw').addEventListener('click', function () {
    poging++;
    $('tPoging').textContent = poging;
    $('tKluis').textContent = 'VERGRENDELD';
    kleurRood = 0; doelSnelheid = 0.06; intensiteit = 0; spanning = 12;
    droneNaar(0.035, 400, 55, 1);
    cursor = 0;
    zetFase('invoer');
    tekenVakken();
  });

  // ============ Film ============
  function laadFilm() {
    var bron = filmBron();
    if (bron && bron.youtube) { laadYoutube(bron.youtube); return; }
    $('filmPad').textContent = (bron && bron.bestand) || '(geen film ingesteld)';
    if (!film.dataset.klaar && bron && bron.bestand) { film.dataset.klaar = '1'; film.src = bron.bestand; film.preload = 'auto'; film.load(); }
    var start = performance.now(), klaar = false, fout = false;
    film.addEventListener('error', function () { fout = true; }, { once: true });
    (function check() {
      if (document.body.dataset.fase !== 'gered') return;
      var p = 0;
      try { if (film.duration && film.buffered.length) p = film.buffered.end(film.buffered.length - 1) / film.duration; } catch (e) { /* */ }
      if (film.readyState >= 3) p = Math.max(p, 1);
      var minTijd = performance.now() - start > (bewegingUit ? 500 : 3600);
      var weergave = Math.min(1, Math.max(p, (performance.now() - start) / 4000 * 0.6));
      $('ladenVulling').style.width = (weergave * 100) + '%';
      $('ladenTekst').textContent = fout ? 'Film niet gevonden' : film.readyState >= 3 ? 'Film klaar' : 'Film laden ' + Math.round(weergave * 100) + '%';
      klaar = film.readyState >= 3 || fout || film.error;
      if (minTijd && (klaar || performance.now() - start > 15000)) { toonKaart(toonFilm); return; }
      setTimeout(check, 120);
    })();
  }
  // Kaart: een rondvlucht langs Europese hoofdsteden, dan naar de pin, daarna de film.
  var kaart = null;
  var SPELD = '<div class="speld"><svg viewBox="0 0 52 68"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff7a3d"/></linearGradient></defs><path d="M26 3C13.3 3 3 13 3 25.5 3 42 26 65 26 65s23-23 23-39.5C49 13 38.7 3 26 3z" fill="url(#sg)" stroke="#1a1003" stroke-width="3"/><circle cx="26" cy="25" r="8" fill="#1a1003"/></svg></div>';
  function maakKaart() {
    if (kaart) return;
    kaart = L.map('kaart', { zoomControl: false, attributionControl: true, zoomSnap: 0, keyboard: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18, attribution: 'Beelden &copy; Esri, Maxar, Earthstar Geographics'
    }).addTo(kaart);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 18, subdomains: 'abcd', opacity: 0.85, attribution: '&copy; OpenStreetMap, &copy; CARTO'
    }).addTo(kaart);
    kaart._lagen = [];
  }
  function laag(l) { l.addTo(kaart); kaart._lagen.push(l); return l; }
  function doelCoord() {
    return {
      lat: parseFloat(cijfers.slice(0, 2).join('') + '.' + cijfers.slice(2, 6).join('')),
      lon: -parseFloat(cijfers[6] + '.' + cijfers.slice(7).join(''))
    };
  }
  function toonKaart(verder) {
    var d = doelCoord();
    if (!window.L || isNaN(d.lat) || isNaN(d.lon)) { verder(); return; }
    var klaar = false, kaartTimers = [];
    var na = function (fn, ms) { kaartTimers.push(setTimeout(fn, bewegingUit ? Math.min(ms, 80) : ms)); };
    var door = function () {
      if (klaar) return;
      klaar = true;
      kaartTimers.forEach(clearTimeout);
      try { kaart.stop(); kaart.off('move'); } catch (e) { /* */ }
      stopRiser();
      $('f-kaart').classList.add('weg');
      setTimeout(function () { $('f-kaart').classList.remove('weg'); verder(); }, bewegingUit ? 0 : 1200);
    };
    zetFase('kaart');
    droneNaar(0.0001, 200, 40, 1.5);
    var boven = $('kaartBoven'), groot = $('kaartCoord');
    boven.textContent = 'Bestemming wordt gezocht'; boven.className = 'boven goud';
    groot.textContent = ''; groot.className = 'kaart-coord';
    maakKaart();
    kaart._lagen.forEach(function (l) { kaart.removeLayer(l); });
    kaart._lagen = [];
    kaart.invalidateSize();

    var route = (K.route || []).filter(function (r) { return isFinite(r.lat) && isFinite(r.lon); });
    var punten = route.map(function (r) { return [r.lat, r.lon]; }).concat([[d.lat, d.lon]]);
    var bezocht = [punten[0]];
    var lijn = laag(L.polyline(bezocht, { color: '#ffb547', weight: 3, opacity: 0.9, dashArray: '2 9', lineCap: 'round', interactive: false }));
    kaart.setView(punten[0], route.length ? 6.2 : 2, { animate: false });
    kaart.on('move', function () { lijn.setLatLngs(bezocht.concat([kaart.getCenter()])); });

    var stip = function (naam, vertrek) {
      return laag(L.marker([0, 0], {
        keyboard: false, interactive: false,
        icon: L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: '<div class="stip' + (vertrek ? ' vertrek' : '') + '"><span></span></div>' })
      }));
    };
    var zet = function (tekst, cls) { groot.textContent = tekst; groot.className = 'kaart-coord' + (cls ? ' ' + cls : ''); };

    function aankomst(i) {
      if (klaar) return;
      bezocht.push(punten[i]);
      lijn.setLatLngs(bezocht);
      if (i === punten.length - 1) { gevonden(); return; }
      var r = route[i], m = stip(r.naam, i === 0);
      m.setLatLng(punten[i]);
      m.getElement() && (m.getElement().querySelector('span').textContent = r.naam);
      if (i === 0) {
        boven.textContent = 'Vertrek';
        zet(r.naam);
        klank.tik();
        na(function () { boven.textContent = 'Bestemming wordt gezocht'; vlieg(i + 1); }, 1800);
        return;
      }
      zet(r.naam + '?', 'vraag');
      klank.toets(i);
      na(function () {
        zet('Nee.', 'nee');
        klank.weiger();
        var el = m.getElement();
        if (el) el.firstChild.classList.add('af');
      }, 1000);
      na(function () { vlieg(i + 1); }, 1700);
    }
    function vlieg(i) {
      if (klaar) return;
      var laatste = i === punten.length - 1;
      var duur = bewegingUit ? 0.3 : laatste ? 9 : 2.6;
      if (laatste) { boven.textContent = 'Laatste koers'; zet('...', 'vraag'); startRiser(duur); }
      else { ruis(0, duur * 0.8, 300, 2500, 0.12); }
      kaart.once('moveend', function () { aankomst(i); });
      kaart.flyTo(punten[i], laatste ? 16 : 6.2, { duration: duur, easeLinearity: laatste ? 0.12 : 0.25 });
    }
    function gevonden() {
      stopRiser(true);
      kaart.off('move');
      laag(L.marker(punten[punten.length - 1], {
        keyboard: false, interactive: false,
        icon: L.divIcon({ className: '', iconSize: [56, 72], iconAnchor: [28, 70], html: SPELD })
      }));
      boven.textContent = 'Bestemming gevonden';
      boven.className = 'boven gevonden';
      zet(codeTekst(), 'gevonden');
      na(function () { klank.knal(); tril([60, 40, 120]); vonken(innerWidth / 2, innerHeight / 2, 40); }, 600);
      na(door, 4500);
    }

    if (route.length) na(function () { aankomst(0); }, 700);
    if (!route.length) { kaart.setView([30, 0], 2, { animate: false }); na(function () { vlieg(0); }, 1200); }
    // Vangnet als de kaart niet laadt of blijft hangen
    kaartTimers.push(setTimeout(door, (route.length * 4.5 + 9 + 16) * 1000));
    $('kaartVerder').onclick = door;
  }

  function laadYoutube(id) {
    var start = performance.now();
    (function check() {
      if (document.body.dataset.fase !== 'gered') return;
      var p = Math.min(1, (performance.now() - start) / 3600);
      $('ladenVulling').style.width = (p * 100) + '%';
      $('ladenTekst').textContent = p < 1 ? 'Film laden ' + Math.round(p * 100) + '%' : 'Film klaar';
      if (p >= 1) { toonKaart(function () { toonYoutube(id); }); return; }
      setTimeout(check, 100);
    })();
  }
  // YouTube ingesloten via de IFrame API, zodat we weten wanneer de film klaar is.
  var ytSpeler = null;
  function laadYtApi(klaar, mislukt) {
    if (window.YT && window.YT.Player) { klaar(); return; }
    var vorige = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (vorige) vorige(); klaar(); };
    if (!document.getElementById('ytApi')) {
      var sc = document.createElement('script');
      sc.id = 'ytApi'; sc.src = 'https://www.youtube.com/iframe_api'; sc.onerror = mislukt;
      document.head.appendChild(sc);
    }
  }
  function toonYoutube(id) {
    zetFase('film');
    droneNaar(0.0001, 200, 40, 0.5);
    film.hidden = true; $('filmBalk').hidden = true;
    $('filmFout').hidden = true;
    var kader = $('ytKader');
    kader.hidden = false;
    $('naarEind').hidden = false;
    setTimeout(function () { kader.classList.add('zichtbaar'); }, 300);
    var gestart = false;
    var reserve = setTimeout(function () { if (!gestart) simpelIframe(id); }, 7000);
    laadYtApi(function () {
      if (gestart) return;
      gestart = true; clearTimeout(reserve);
      if (ytSpeler) { try { ytSpeler.loadVideoById(id); ytSpeler.playVideo(); } catch (e) { /* */ } return; }
      ytSpeler = new YT.Player('ytSpeler', {
        host: 'https://www.youtube-nocookie.com',
        videoId: id, width: '100%', height: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, fs: 1 },
        events: {
          onReady: function (e) { try { e.target.unMute(); e.target.setVolume(100); e.target.playVideo(); } catch (x) { /* */ } },
          onStateChange: function (e) { if (e.data === 0) toonEind(); },
          onError: function (e) { ytFout(e.data, id); }
        }
      });
    }, function () { if (!gestart) { gestart = true; clearTimeout(reserve); simpelIframe(id); } });
  }
  function simpelIframe(id) {
    var plek = $('ytSpeler');
    if (plek.tagName === 'IFRAME') return;
    var f = document.createElement('iframe');
    f.id = 'ytSpeler'; f.title = 'De film';
    f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    f.allowFullscreen = true;
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&playsinline=1&rel=0&modestbranding=1';
    plek.replaceWith(f);
  }
  function ytFout(code, id) {
    var h = $('filmFout').querySelector('h2'), p = $('filmFout').querySelector('p');
    if (code === 101 || code === 150) {
      h.textContent = 'Deze video mag niet ingesloten worden';
      p.innerHTML = 'Zet in YouTube Studio bij deze video <b>Insluiten toestaan</b> aan. Tot die tijd kun je hem <a id="ytLos" target="_blank" rel="noopener">op YouTube bekijken</a>.';
    } else {
      h.textContent = 'De video speelt niet af';
      p.innerHTML = 'Staat hij op <b>Niet vermeld</b> (niet op Privé)? Je kunt hem ook <a id="ytLos" target="_blank" rel="noopener">op YouTube bekijken</a>.';
    }
    $('ytLos').href = 'https://youtu.be/' + encodeURIComponent(id);
    $('ytKader').hidden = true;
    $('filmFout').hidden = false;
  }
  $('naarEind').addEventListener('click', function () { toonEind(); });

  function toonFilm() {
    zetFase('film');
    droneNaar(0.0001, 200, 40, 0.5);
    $('naarEind').hidden = false;
    if (film.error || !film.currentSrc) { $('filmFout').hidden = false; return; }
    film.currentTime = 0;
    film.muted = false;
    var p = film.play();
    if (p && p.catch) p.catch(function () { $('filmStart').hidden = false; });
    setTimeout(function () { film.classList.add('zichtbaar'); }, 50);
  }
  $('filmStart').addEventListener('click', function () {
    $('filmStart').hidden = true; film.muted = false;
    film.play().catch(function () { $('filmFout').hidden = false; });
    film.classList.add('zichtbaar');
  });
  film.addEventListener('error', function () { if (document.body.dataset.fase === 'film') $('filmFout').hidden = false; });
  film.addEventListener('timeupdate', function () { if (film.duration) $('filmVoortgang').style.width = (film.currentTime / film.duration * 100) + '%'; });
  film.addEventListener('play', function () { $('filmPauze').classList.remove('gepauzeerd'); });
  film.addEventListener('pause', function () { $('filmPauze').classList.add('gepauzeerd'); });
  film.addEventListener('ended', function () { toonEind(); });
  $('filmPauze').addEventListener('click', function () { if (film.paused) film.play(); else film.pause(); });
  $('filmOpnieuw').addEventListener('click', function () { film.currentTime = 0; film.play(); });
  var balkTimer;
  $('f-film').addEventListener('pointermove', function () {
    $('filmBalk').classList.add('toon');
    clearTimeout(balkTimer);
    balkTimer = setTimeout(function () { if (!film.ended) $('filmBalk').classList.remove('toon'); }, 2500);
  });

  // ============ Muziek op het eindscherm (YouTube) ============
  // Reclame kan YouTube zelf ervoor zetten; de speler blijft zichtbaar zodat je die kunt overslaan.
  var ICOON_PAUZE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>';
  var ICOON_SPEEL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>';
  var muziekSpeler = null;
  function muziekStatus(st) {
    var k = $('muziek'), label = k.querySelector('.muziek-label'), titel = k.querySelector('.muziek-titel');
    k.classList.remove('tik', 'fout', 'uit');
    $('muziekStop').hidden = false;
    titel.textContent = (K.eindMuziek && K.eindMuziek.titel) || 'Hangover';
    if (st === 'laadt') { label.textContent = 'Muziek laadt'; $('muziekStop').innerHTML = ICOON_PAUZE; return; }
    if (st === 'speelt') { label.textContent = 'Nu speelt'; $('muziekStop').innerHTML = ICOON_PAUZE; $('muziekStop').setAttribute('aria-label', 'Muziek stoppen'); return; }
    if (st === 'uit') { k.classList.add('uit'); label.textContent = 'Gepauzeerd'; $('muziekStop').innerHTML = ICOON_SPEEL; $('muziekStop').setAttribute('aria-label', 'Muziek weer aanzetten'); return; }
    if (st === 'tik') { k.classList.add('tik', 'uit'); label.textContent = 'Tik om te starten'; $('muziekStop').innerHTML = ICOON_SPEEL; return; }
    k.classList.add('fout'); label.textContent = 'Lukt niet hier'; $('muziekStop').hidden = true;
  }
  function startMuziek() {
    var m = K.eindMuziek;
    if (!m || !m.youtube) return;
    $('muziek').hidden = false;
    muziekStatus('laadt');
    laadYtApi(function () {
      if (muziekSpeler) { try { muziekSpeler.seekTo(m.start || 0); muziekSpeler.playVideo(); } catch (e) { /* */ } return; }
      muziekSpeler = new YT.Player('muziekSpeler', {
        host: 'https://www.youtube-nocookie.com',
        videoId: m.youtube, width: '100%', height: '100%',
        playerVars: { autoplay: 1, start: m.start || 0, playsinline: 1, rel: 0, modestbranding: 1, controls: 1 },
        events: {
          onReady: function (e) { try { e.target.unMute(); e.target.setVolume(m.volume == null ? 70 : m.volume); e.target.playVideo(); } catch (x) { /* */ } },
          onStateChange: function (e) { if (e.data === 1) muziekStatus('speelt'); else if (e.data === 2) muziekStatus('uit'); },
          onError: function () { muziekStatus('fout'); }
        }
      });
      // Blokkeert de browser het automatisch afspelen, dan vragen we om een tik.
      setTimeout(function () {
        try { var st = muziekSpeler.getPlayerState ? muziekSpeler.getPlayerState() : -1; if (st === -1 || st === 5) muziekStatus('tik'); } catch (e) { /* */ }
      }, 4000);
    }, function () { muziekStatus('fout'); });
  }
  function speelMuziek() { try { muziekSpeler.unMute(); muziekSpeler.playVideo(); } catch (e) { /* */ } }
  function stopMuziek() { try { if (muziekSpeler) muziekSpeler.pauseVideo(); } catch (e) { /* */ } if (!$('muziek').hidden) muziekStatus('uit'); }
  $('muziek').addEventListener('click', function (e) {
    if (e.target.closest('#muziekStop') || !$('muziek').classList.contains('tik')) return;
    speelMuziek();
  });
  $('muziekStop').addEventListener('click', function (e) {
    e.stopPropagation();
    if ($('muziek').classList.contains('uit')) speelMuziek(); else stopMuziek();
  });

  // ============ Eindscherm ============
  function toonEind() {
    if (document.body.dataset.fase === 'eind') return;
    try { if (ytSpeler && ytSpeler.pauseVideo) ytSpeler.pauseVideo(); } catch (e) { /* */ }
    try { film.pause(); } catch (e) { /* */ }
    var o = K.eindGeheim ? G.ontsleutelJSON(K.eindGeheim, 'eind|' + cijfers.join('')) : null;
    o = o || { boven: 'De kluis is open', land: 'Gered!', regio: '', datum: '', punten: [], slot: 'Pak je koffer.' };
    $('eindBoven').textContent = o.boven || 'De kluis is open';
    $('eindLand').textContent = o.land || '';
    $('eindRegio').textContent = o.regio || '';
    $('eindDatum').textContent = o.datum || '';
    $('eindSlot').textContent = o.slot || '';
    var ol = $('eindPunten');
    ol.innerHTML = '';
    (o.punten || []).forEach(function (t, i) {
      var li = document.createElement('li');
      li.textContent = t;
      li.style.animationDelay = (1.4 + i * 0.22) + 's';
      ol.appendChild(li);
    });
    var c = doelCoord();
    $('eindMaps').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.lat.toFixed(4) + ',' + c.lon.toFixed(4));
    zetFase('eind');
    $('tKluis').textContent = 'OPEN';
    doelSnelheid = 0.25; intensiteit = 0.15; kleurRood = 0;
    droneNaar(0.0001, 200, 40, 0.6); // geen brom op het eindscherm
    flits('goud'); klank.zacht(); tril([60, 40, 120]);
    startMuziek();
    var salvo = function (k) {
      if (document.body.dataset.fase !== 'eind' || k > 6) return;
      vonken(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.2 + Math.random() * 0.5), 34);
      setTimeout(function () { salvo(k + 1); }, 450 + Math.random() * 500);
    };
    salvo(0);
  }
  $('eindOpnieuw').addEventListener('click', function () {
    stopMuziek();
    var bron = filmBron();
    if (bron && bron.youtube) { $('ytKader').classList.remove('zichtbaar'); toonYoutube(bron.youtube); try { ytSpeler.seekTo(0); ytSpeler.playVideo(); } catch (e) { /* */ } }
    else { toonFilm(); }
  });

  // Eerste interactie zet de achtergrondbrom aan
  document.addEventListener('pointerdown', function eerste() { audio(); document.removeEventListener('pointerdown', eerste); }, { once: true });

  bouwPaneel();
  tekenVakken();

  // ============ Sneltoetsen voor de organisatie ============
  // ?code=<11 cijfers>&naar=eind  (of naar=kaart, naar=film, naar=gered, naar=aftellen)
  // ============ Wachtscherm: eindeloze kraakpoging ============
  // Draait tot het wachtwoord is getypt. Toetsenbord: gewoon typen (onzichtbaar).
  // Telefoon of tablet: tik 5 keer snel op de cijfers, dan verschijnt een veld.
  var wachtBuffer = '', wachtTikken = [], wachtTimers = [];
  var kraakCellen = [], kraakVast = [];
  function wwKlopt(w) { return !!K.wachtwoordHash && G.hash('boysinwonderland|wachtwoord|' + w) === K.wachtwoordHash; }
  function wachtNorm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
  function orbPuls(cls) { var o = $('orb'); o.classList.remove('hoort', 'nee'); void o.offsetWidth; o.classList.add(cls); setTimeout(function () { o.classList.remove(cls); }, 450); }
  function wachtToets(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') { if (wachtBuffer) { orbPuls('nee'); klank.weiger(); } wachtBuffer = ''; return; }
    if (e.key === 'Escape') { wachtBuffer = ''; return; }
    if (!/^[a-zA-Z0-9]$/.test(e.key)) return;
    audio();
    wachtBuffer = (wachtBuffer + e.key.toLowerCase()).slice(-40);
    orbPuls('hoort');
    osc('square', 900 + Math.random() * 400, 0, 0.04, 0.03);
    for (var i = 1; i <= wachtBuffer.length; i++) {
      if (wwKlopt(wachtBuffer.slice(-i))) { wachtOpen(); return; }
    }
  }
  function wachtOpen() {
    if (document.body.dataset.fase !== 'wacht') return;
    wachtTimers.forEach(function (t) { clearInterval(t); clearTimeout(t); });
    try { sessionStorage.setItem('kluis-open', '1'); } catch (e) { /* */ }
    document.body.dataset.fase = 'wachtopen';
    $('f-wacht').style.display = 'flex';
    $('f-wacht').classList.add('open');
    $('wachtStatus').textContent = 'Toegang verleend';
    audio(); klank.knal(); startRiser(1.4); tril([40, 30, 120]);
    doelSnelheid = 1.6;
    setTimeout(function () { flits('goud'); stopRiser(true); }, 1300);
    setTimeout(function () {
      $('f-wacht').style.display = ''; $('f-wacht').classList.remove('open');
      doelSnelheid = 0.06; intensiteit = 0;
      zetFase('invoer'); tekenVakken();
    }, bewegingUit ? 200 : 2000);
  }
  function bouwKraker() {
    var maak = function (regel, delen) {
      var el = $(regel); el.innerHTML = '';
      delen.forEach(function (d) {
        var sp = document.createElement('span');
        if (d === 'c') { sp.className = 'kc'; sp.textContent = '0'; kraakCellen.push(sp); }
        else { sp.className = 'kt'; sp.textContent = d; }
        el.appendChild(sp);
      });
    };
    kraakCellen = [];
    maak('kraakRegel1', ['c', 'c', '.', 'c', 'c', 'c', 'c', ',']);
    maak('kraakRegel2', ['-', 'c', '.', 'c', 'c', 'c', 'c']);
    kraakVast = kraakCellen.map(function () { return false; });
  }
  function randCijfer() { return String((Math.random() * 10) | 0); }
  function kraakPoging() {
    // Zet een willekeurig aantal cijfers "vast", keur dan alles af en begin opnieuw.
    var doel = 3 + ((Math.random() * 7) | 0), gezet = 0;
    var volgorde = kraakCellen.map(function (_, i) { return i; }).sort(function () { return Math.random() - .5; });
    $('wachtStatus').textContent = 'Code wordt gekraakt'; $('wachtStatus').classList.remove('rood');
    (function stap() {
      if (document.body.dataset.fase !== 'wacht') return;
      if (gezet < doel) {
        var i = volgorde[gezet++];
        kraakVast[i] = true; kraakCellen[i].classList.add('vast');
        osc('sine', 600 + gezet * 70, 0, 0.06, 0.025);
        wachtTimers.push(setTimeout(stap, 260 + Math.random() * 520));
        return;
      }
      // Afgekeurd
      var code = kraakCellen.map(function (c) { return c.textContent; }).join('');
      if (G.hash('boysinwonderland|kluis|' + code) === K.codeHash) code = code.slice(0, 10) + ((+code[10] + 1) % 10);
      var o = $('orb'); o.classList.add('fout');
      $('wachtStatus').textContent = 'Toegang geweigerd'; $('wachtStatus').classList.add('rood');
      osc('sawtooth', 140, 0, 0.18, 0.04, 90);
      var li = document.createElement('li');
      li.innerHTML = code.slice(0, 2) + '.' + code.slice(2, 6) + ', -' + code[6] + '.' + code.slice(7) + '<b>GEWEIGERD</b>';
      $('kraakLog').appendChild(li);
      while ($('kraakLog').children.length > 8) $('kraakLog').removeChild($('kraakLog').firstChild);
      wachtTimers.push(setTimeout(function () {
        o.classList.remove('fout');
        kraakVast = kraakVast.map(function () { return false; });
        kraakCellen.forEach(function (c) { c.classList.remove('vast'); });
        kraakPoging();
      }, 900));
    })();
  }
  function startWacht() {
    if (!K.wachtwoordHash) { zetFase('invoer'); return; }
    doelSnelheid = 0.05; intensiteit = 0.35;
    bouwKraker();
    // Rollende cijfers
    wachtTimers.push(setInterval(function () {
      kraakCellen.forEach(function (c, i) { if (!kraakVast[i]) c.textContent = randCijfer(); });
    }, bewegingUit ? 400 : 55));
    // Teller, snelheid en looptijd
    var pogingen = 1000000 + ((Math.random() * 9000000) | 0), begin = Date.now();
    wachtTimers.push(setInterval(function () {
      var snel = 180000 + ((Math.random() * 90000) | 0);
      pogingen += (snel / 10) | 0;
      $('kraakPogingen').textContent = pogingen.toLocaleString('nl-NL');
      $('kraakSnelheid').textContent = snel.toLocaleString('nl-NL');
      var s = Math.floor((Date.now() - begin) / 1000);
      $('kraakTijd').textContent = [s / 3600 | 0, (s / 60 | 0) % 60, s % 60].map(function (x) { return (x < 10 ? '0' : '') + x; }).join(':');
    }, 100));
    kraakPoging();
    // Telefoon/tablet: vijf snelle tikken tonen het veld
    $('orb').addEventListener('click', function () {
      var nu = Date.now();
      wachtTikken = wachtTikken.filter(function (t) { return nu - t < 2500; }).concat(nu);
      orbPuls('hoort');
      if (wachtTikken.length >= 5) { $('wachtVeld').hidden = false; $('wachtInvoer').focus(); wachtTikken = []; }
    });
    $('wachtVeld').addEventListener('submit', function (e) {
      e.preventDefault();
      var w = wachtNorm($('wachtInvoer').value);
      if (wwKlopt(w)) { $('wachtInvoer').blur(); wachtOpen(); return; }
      var v = $('wachtVeld'); v.classList.remove('nee'); void v.offsetWidth; v.classList.add('nee');
      orbPuls('nee'); klank.weiger(); $('wachtInvoer').value = '';
    });
  }
  (function () {
    var open = false;
    try { open = sessionStorage.getItem('kluis-open') === '1'; } catch (e) { /* */ }
    if (open || params.has('code') || params.has('naar') || params.has('open')) zetFase('invoer');
    else startWacht();
  })();

  (function sneltoets() {
    var code = (params.get('code') || '').replace(/\D/g, '');
    var naar = (params.get('naar') || '').toLowerCase();
    if (code.length !== 11) return;
    cijfers = code.split(''); cursor = 10; tekenVakken();
    if (!naar) return;
    var laag = document.createElement('div');
    laag.className = 'sneltoets';
    var knop = document.createElement('button');
    knop.type = 'button'; knop.className = 'knop goud-knop';
    knop.textContent = 'Sneltoets: naar ' + naar;
    var uitleg = document.createElement('p');
    uitleg.textContent = 'Tik eerst één keer, dan mag de browser geluid en film afspelen.';
    laag.appendChild(knop); laag.appendChild(uitleg);
    document.body.appendChild(laag);
    knop.focus();
    knop.addEventListener('click', function () {
      laag.remove();
      audio();
      var bron = filmBron();
      if (naar === 'eind') toonEind();
      else if (naar === 'film') { if (bron && bron.youtube) toonYoutube(bron.youtube); else uitslag(); }
      else if (naar === 'kaart') toonKaart(function () { if (bron && bron.youtube) toonYoutube(bron.youtube); else uitslag(); });
      else if (naar === 'aftellen') startAftellen();
      else uitslag();
    });
  })();
})();
