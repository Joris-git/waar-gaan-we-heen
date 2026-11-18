/* Kleine SHA-256 en een eenvoudige versleuteling (XOR met een SHA-256-sleutelstroom).
   Werkt in elke browser, ook als je index.html los opent zonder server.
   Hetzelfde bestand wordt door tools/bouw.mjs gebruikt, zodat beide kanten gelijk rekenen. */
(function (root) {
  'use strict';

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8(str) {
    return new TextEncoder().encode(str);
  }

  function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
  }

  function sha256(bytes) {
    if (typeof bytes === 'string') bytes = utf8(bytes);
    var len = bytes.length;
    var padded = ((len + 9 + 63) >> 6) << 6;
    var buf = new Uint8Array(padded);
    buf.set(bytes);
    buf[len] = 0x80;
    var dv = new DataView(buf.buffer);
    var bits = len * 8;
    dv.setUint32(padded - 8, Math.floor(bits / 4294967296));
    dv.setUint32(padded - 4, bits >>> 0);

    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);

    for (var off = 0; off < padded; off += 64) {
      for (var i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (i = 16; i < 64; i++) {
        var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }

    var out = new Uint8Array(32);
    var odv = new DataView(out.buffer);
    for (i = 0; i < 8; i++) odv.setUint32(i * 4, h[i] >>> 0);
    return out;
  }

  function hex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }

  function hash(str) {
    return hex(sha256(str));
  }

  function toB64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function fromB64(b64) {
    var s = atob(b64);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  // Sleutelstroom: SHA-256(sleutel + '|' + blokteller). Symmetrisch: dezelfde functie ver- en ontsleutelt.
  function xorStream(bytes, key) {
    var out = new Uint8Array(bytes.length);
    var block = null;
    for (var i = 0; i < bytes.length; i++) {
      if (i % 32 === 0) block = sha256(key + '|' + (i / 32));
      out[i] = bytes[i] ^ block[i % 32];
    }
    return out;
  }

  function versleutel(tekst, key) {
    return toB64(xorStream(utf8(tekst), key));
  }

  // Geeft null terug als de sleutel niet klopt (dan is het resultaat geen geldige JSON).
  function ontsleutelJSON(b64, key) {
    try {
      var bytes = xorStream(fromB64(b64), key);
      var tekst = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return JSON.parse(tekst);
    } catch (e) {
      return null;
    }
  }

  // Tekst naar losse woorden: hoofdletters, zonder accenten en leestekens.
  function woorden(tekst) {
    return String(tekst || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/[^A-Z0-9]+/g, ' ')
      .trim().split(' ').filter(Boolean);
  }
  var LIDWOORDEN = { DE: 1, HET: 1, EEN: 1, THE: 1, A: 1 };
  // Antwoord op een raadsel: lidwoord vooraan weg, alles aan elkaar.
  function sleutel(tekst) {
    var w = woorden(tekst);
    while (w.length > 1 && LIDWOORDEN[w[0]]) w.shift();
    return w.join('');
  }
  // Alle aaneengesloten stukjes van een zin, zodat "we gaan naar X" ook X vindt.
  function stukjes(tekst) {
    var w = woorden(tekst), uit = [];
    for (var i = 0; i < w.length && i < 12; i++) {
      for (var j = i + 1; j <= w.length && j <= i + 6; j++) uit.push(w.slice(i, j).join(''));
    }
    return uit;
  }

  var api = { hash: hash, versleutel: versleutel, ontsleutelJSON: ontsleutelJSON, sleutel: sleutel, stukjes: stukjes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Geheim = api;
})(this);
