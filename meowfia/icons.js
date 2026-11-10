/* Meowfia illustrations: one portrait per animal and flower, drawn as flat SVG on its own background.
   Farm animals sit on daylight colours, cats on night colours, flowers on pale petals, so the side is readable
   before the animal is. Everything is generated here: no image files. */
(function () {
  'use strict';
  const INK = '#2a2420', WHITE = '#fffdf8';
  const C = (cx, cy, r, fill, x = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${x}/>`;
  const E = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${x}/>`;
  const P = (d, fill, x = '') => `<path d="${d}" fill="${fill}" ${x}/>`;
  const S = (d, stroke, w, x = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
  const R = (x, y, w, h, r, fill, t = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${t}/>`;
  const rot = (a, cx, cy, s) => `<g transform="rotate(${a} ${cx} ${cy})">${s}</g>`;
  const mir = (s) => `<g transform="translate(64 0) scale(-1 1)">${s}</g>`;
  const both = (s) => s + mir(s);
  const eye = (x, y, r = 2.8, iris = '') => (iris ? C(x, y, r + 1.8, iris) : '') + C(x, y, r, INK) + C(x + r * .36, y - r * .36, r * .34, '#fff');

  /* ---------------- birds: a bust in profile, facing right ---------------- */
  function beak(t, x, y, c, c2) {
    switch (t) {
      case 'tiny': return P(`M${x} ${y - 2.8} L${x + 7} ${y + .4} L${x} ${y + 3} Z`, c);
      case 'cone': return P(`M${x} ${y - 4} L${x + 11.5} ${y + .6} L${x} ${y + 4.2} Z`, c);
      case 'strong': return P(`M${x - 1} ${y - 5} C${x + 6} ${y - 5.5} ${x + 13} ${y - 2.5} ${x + 16} ${y + 1.8} L${x - 1} ${y + 4.8} Z`, c) + (c2 ? P(`M${x + 9} ${y - 2.6} C${x + 12} ${y - 1.6} ${x + 14.5} ${y} ${x + 16} ${y + 1.8} L${x + 9.5} ${y + 3} Z`, c2) : '');
      case 'hook': return P(`M${x - 1} ${y - 5.5} C${x + 8} ${y - 7.5} ${x + 14} ${y - 2} ${x + 10.5} ${y + 8} C${x + 9} ${y + 3.6} ${x + 5} ${y + 3.4} ${x - 1} ${y + 4.4} Z`, c2 || c) + P(`M${x - 1} ${y - 5.5} C${x + 3} ${y - 6.6} ${x + 6} ${y - 5.6} ${x + 7.5} ${y - 4} L${x + 5.4} ${y + 3.4} L${x - 1} ${y + 4.4} Z`, c);
      case 'dagger': return P(`M${x - 1.5} ${y - 5.5} L${x + 21} ${y + .2} L${x - 1.5} ${y + .8} Z`, c) + P(`M${x - 1.5} ${y + .2} L${x + 21} ${y + .2} L${x - 1.5} ${y + 5.2} Z`, c2 || c);
      case 'thin': return P(`M${x - 1} ${y - 2.6} L${x + 20} ${y + 1.2} L${x - 1} ${y + 2.8} Z`, c);
      case 'duck': return P(`M${x - 1.5} ${y - 4.2} C${x + 7} ${y - 4.6} ${x + 15} ${y - 2.4} ${x + 16.5} ${y + 1} C${x + 16.5} ${y + 4.6} ${x + 8} ${y + 5.4} ${x - 1.5} ${y + 4.4} Z`, c) + (c2 ? C(x + 13.6, y + 1.6, 1.9, c2) : '');
      case 'parrot': return P(`M${x - 2} ${y - 5.5} C${x + 8} ${y - 7.5} ${x + 10.5} ${y + .5} ${x + 4} ${y + 8.5} C${x + 3.6} ${y + 4.4} ${x + 1} ${y + 3.4} ${x - 2} ${y + 3.4} Z`, c);
      case 'pelican': return P(`M${x - 1} ${y - .6} L${x + 21} ${y + 3.6} C${x + 18} ${y + 14} ${x + 5} ${y + 15} ${x - 1} ${y + 5} Z`, c2) + P(`M${x - 1.5} ${y - 3.6} L${x + 22} ${y + 2.4} L${x + 21} ${y + 4.4} L${x - 1.5} ${y + 1.6} Z`, c);
      default: return '';
    }
  }
  function bird(o) {
    const long = o.neck === 'long', mid = o.neck === 'mid';
    const hx = long ? 40 : mid ? 37 : 34, hy = long ? 16.5 : mid ? 21 : 27, r = o.r || (long ? 10 : mid ? 12.5 : 15.5);
    const head = o.head || o.body;
    let g = o.back || '';
    if (long) {
      g += P('M-2 66 C0 51 11 44 24 44 C38 44 47 52 49 66 Z', o.body);
      if (o.wing) g += P('M3 66 C5 55 13 49 24 48 C20 54 19 60 21 66 Z', o.wing);
      if (o.belly) g += P('M49 66 C47 55 41 48 33 46 C37 52 37 59 35 66 Z', o.belly);
      g += S(`M26 57 C25 41 ${hx} 42 ${hx - 2} ${hy + 4}`, o.neckC || head, o.neckW || 10);
    } else {
      g += P(mid ? 'M1 66 C2 50 13 41 27 41 C41 41 50 51 51 66 Z' : 'M4 66 C4 48 15 37 30 37 C45 37 54 50 54 66 Z', o.body);
      if (o.wing) g += P(mid ? 'M5 66 C6 54 14 47 25 45 C21 52 21 59 23 66 Z' : 'M8 66 C8 54 15 45 26 42 C22 50 22 58 25 66 Z', o.wing);
      if (o.belly) g += P(mid ? 'M51 66 C50 55 45 47 37 43 C40 51 40 59 37 66 Z' : 'M54 66 C54 54 49 44 41 39 C44 48 43 58 39 66 Z', o.belly);
      if (mid) g += S(`M29 54 C30 45 ${hx - 1} 42 ${hx - 2} ${hy + 5}`, o.neckC || head, 14);
    }
    g += o.chest || '';
    if (o.collar) g += C(hx - 2.6, hy + 5.6, r, o.collar) + (o.collar2 ? C(hx - 1.3, hy + 2.9, r, o.collar2) : '');
    g += C(hx, hy, r, head);
    if (o.cap) g += P(`M${hx - r} ${hy - 1} A${r} ${r} 0 0 1 ${hx + r} ${hy - 1} Q${hx} ${hy - 6} ${hx - r} ${hy - 1} Z`, o.cap);
    if (o.nape) g += P(`M${hx - r} ${hy} A${r} ${r} 0 0 1 ${hx - 2} ${hy - r} Q${hx - 6} ${hy} ${hx - 4} ${hy + r - .4} A${r} ${r} 0 0 1 ${hx - r} ${hy} Z`, o.nape);
    if (o.throat) g += P(`M${hx + r} ${hy + 1} A${r} ${r} 0 0 1 ${hx - 4} ${hy + r - .5} Q${hx + 1} ${hy + 4} ${hx + r} ${hy + 1} Z`, o.throat);
    if (o.cheek) g += C(hx + 1.5, hy + r * .42, r * .42, o.cheek);
    if (o.mask) g += P(`M${hx - r + 1.2} ${hy - 2.5} Q${hx} ${hy - 8} ${hx + r - .8} ${hy - 2.5} L${hx + r - .5} ${hy + 1.5} Q${hx} ${hy - 2} ${hx - r + 2.4} ${hy + 3} Z`, o.mask);
    if (o.tear) g += P(`M${hx + 2} ${hy - 3} L${hx + 7.5} ${hy - 3} L${hx + 6} ${hy + r * .72} Q${hx + 3} ${hy + r * .5} ${hx + 2} ${hy - 3} Z`, o.tear);
    g += o.mid || '';
    const b = o.beak || {};
    g += beak(b.t || 'cone', hx + r - 2.6 + (b.dx || 0), hy + 2 + (b.dy || 0), b.c || '#f0a63a', b.c2);
    const ex = hx + r * .34, ey = hy - r * .2, er = o.eyeR || Math.max(2.2, r * .18);
    if (o.eye === 'closed') g += S(`M${ex - 3.2} ${ey} Q${ex} ${ey + 3.2} ${ex + 3.2} ${ey}`, INK, 1.7);
    else if (o.eye !== 'none') g += eye(ex, ey, er, o.iris);
    if (o.brow) g += S(`M${ex - 6} ${ey - 5.6} L${ex + 4.6} ${ey - 2.6}`, o.brow, 2.4);
    return g + (o.front || '');
  }
  const tuft = (x, y, c, n = 3, len = 8) => Array.from({ length: n }, (_, i) => S(`M${x + i * 2.4 - n} ${y + 1} q${-3 + i * 1.5} ${-len * .6} ${-1 + i * 2.4} ${-len}`, c, 2.2)).join('');
  const streaks = (c) => [[39, 46], [45, 50], [41, 55], [47, 59], [36, 60]].map(([x, y]) => S(`M${x} ${y} v3.4`, c, 1.9)).join('');
  const bars = (c) => [47.5, 52, 56.5, 61].map((y, i) => S(`M${40.4 - i * .5} ${y} Q${44} ${y + 2} ${47.4 + i * .9} ${y - .4}`, c, 1.6)).join('');

  /* ---------------- cats: a face, front on ---------------- */
  function cat(o) {
    const fur = o.fur, inner = o.inner || '#f4a9a0', iris = o.iris || '#f4c63d';
    let g = o.back || '';
    const earL = o.ears === 'big' ? 'M13 31 L3 3 L30 16 Z' : 'M11 32 L8 7 L28 17 Z';
    const inL = o.ears === 'big' ? 'M14 25 L8.5 10 L24 17.5 Z' : 'M14 25.5 L12.2 13 L23 18.5 Z';
    g += both(P(earL, o.earC || fur) + P(inL, inner));
    if (o.ears === 'tuft') g += both(S('M8.6 8 L6 1.5 M9.6 8.4 L10.5 2', o.earC || fur, 1.8));
    if (o.fluff) g += both(P('M12 30 L3 31 L10 36 L2 41 L11 43 L6 50 L15 50 L14 57 L23 53 L32 60 Z', o.fluff));
    g += E(32, 36.5, 22, 19, fur);
    g += o.under || '';
    if (o.stripes) g += S('M32 18.5 V26 M26 19.6 L27.6 25.6 M38 19.6 L36.4 25.6', o.stripes, 2.1) + both(S('M11.5 35 L16.5 36 M12 40.5 L17 40', o.stripes, 2));
    if (o.muzzle) g += C(27.2, 44.6, 6.6, o.muzzle) + C(36.8, 44.6, 6.6, o.muzzle) + E(32, 49.5, 5, 4, o.muzzle);
    const ey = o.eyeY || 33.5;
    if (o.eyes !== 'none') {
      const one = (x) => E(x, ey, 5.2, 5.4, iris) + E(x, ey, o.pupil || 1.9, 4.5, INK) + C(x + 1.6, ey - 2, 1.1, '#fff');
      g += one(21.5) + one(42.5);
    }
    g += P('M29 39.4 Q32 38.4 35 39.4 L32 43 Z', o.nose || '#e8788a');
    g += S('M32 43 V45.4 M32 45.4 Q29.4 48.4 26.8 46 M32 45.4 Q34.6 48.4 37.2 46', o.line || INK, 1.3);
    if (o.whiskers !== false) g += both(S('M19 44.5 L6.5 42 M19 46.8 L7 48.6', o.whisker || WHITE, .9, 'opacity=".85"'));
    return g + (o.front || '');
  }

  /* ---------------- flowers ---------------- */
  // Petals round a centre. `pt` makes them pointed.
  function bloom(o) {
    const cx = o.cx ?? 32, cy = o.cy ?? 32, n = o.n, len = o.len, w = o.w;
    let g = '';
    for (let i = 0; i < n; i++) {
      const a = (o.rot || 0) + i * 360 / n;
      const petal = o.pt
        ? P(`M${cx} ${cy - (o.off || 2)} Q${cx - w} ${cy - len * .55} ${cx} ${cy - len} Q${cx + w} ${cy - len * .55} ${cx} ${cy - (o.off || 2)} Z`, o.c)
        : E(cx, cy - (o.off || 0) - len / 2, w, len / 2, o.c);
      g += rot(a, cx, cy, petal + (o.vein ? S(`M${cx} ${cy - 4} V${cy - len + 3}`, o.vein, 1) : ''));
    }
    return g;
  }
  const stem = (d = 'M32 64 V40', c = '#4f9a57', w = 3) => S(d, c, w);
  const leaf = (x, y, a, c = '#5cab5f', s = 1) => rot(a, x, y, P(`M${x} ${y} q${7 * s} ${-6 * s} ${15 * s} ${-1 * s} q${-8 * s} ${6 * s} ${-15 * s} ${1 * s} Z`, c));

  /* ---------------- the cards ---------------- */
  const SKY = '#cfe6f5', SAND = '#f4e4c1', MINT = '#d7eed9', ROSE = '#f8dcdc', LILAC = '#e2dcf4', BUTTER = '#faefb9', PEACH = '#fbe0c6', MIST = '#e3eaee';
  const NIGHT = '#2c2a4d', PLUM = '#43284f', WINE = '#4c2536', DEEP = '#1f3447', MOSS = '#27402f', COAL = '#33323a';
  const ART = {
    /* ----- farm: birds ----- */
    'Pigeon': [SKY, () => bird({ body: '#8f9db3', wing: '#74839b', belly: '#aab5c6', head: '#7d8ba4', collar: '#5fae8e', collar2: '#9a7fc4', beak: { t: 'cone', c: '#3d4250' }, mid: C(46.5, 26.2, 2.3, WHITE), iris: '#f08c3a' })],
    'Lazy Pigeon': [LILAC, () => bird({ body: '#a39a94', wing: '#887e78', belly: '#beb6ae', head: '#958b86', collar: '#7fa892', collar2: '#a596bd', beak: { t: 'cone', c: '#4a4448' }, mid: C(46.5, 26.2, 2.3, WHITE), eye: 'closed', front: S('M49 6 h6 l-6 7 h6', '#6c5fa8', 1.9) + S('M41 3 h4 l-4 4.6 h4', '#6c5fa8', 1.5) })],
    'Hawk': [SAND, () => bird({ body: '#8b5b3c', wing: '#6e4429', belly: '#f1dfc0', chest: streaks('#8b5b3c'), head: '#9a6844', throat: '#f1dfc0', beak: { t: 'hook', c: '#f2c230', c2: '#4b4b55' }, iris: '#f6c833', brow: '#5a3620' })],
    'Blind Hawk': [MIST, () => bird({ body: '#7b6e68', wing: '#5f534e', belly: '#d9cdbf', chest: streaks('#6a5d57'), head: '#8a7c75', beak: { t: 'hook', c: '#e9bf45', c2: '#4b4b55' }, eye: 'none', mid: P('M19.5 21 Q34 15 49.6 22.4 L49.6 28 Q34 21 19 27.6 Z', '#f6f1e6') + S('M20 24 l-7 -4 M20 25 l-8 3', '#f6f1e6', 2.6) + S('M26 22.2 l1 4 M34 20.4 l.6 4 M42 21.6 l-.4 4', '#d8cfbd', 1) })],
    'Black Swan': [ROSE, () => bird({ neck: 'long', body: '#2e2b31', wing: '#3d3940', head: '#2e2b31', neckW: 9, beak: { t: 'duck', c: '#d8343a', c2: '#fbe9e0', dy: 1 }, iris: '#e04848', back: both('') + S('M6 50 q4 -5 9 -3 M10 55 q5 -5 10 -3', '#4a454e', 2) })],
    'Ugly Duckling': [BUTTER, () => bird({ body: '#9a8f7c', wing: '#857a68', belly: '#bdb29c', head: '#a79b86', beak: { t: 'duck', c: '#4f4a47', dy: 2 }, eyeR: 3.2, back: tuft(31, 12.6, '#a79b86', 4, 7), front: S('M12 47 l-3 -2 M15 53 l-4 -1 M20 44 l-2 -3', '#857a68', 1.8) })],
    'Kookaburra': [MINT, () => bird({ body: '#8a6a4e', wing: '#5e8fc4', belly: '#f3ead6', head: '#f3ead6', cap: '#8a6a4e', mask: '#6b4d36', beak: { t: 'dagger', c: '#3f3a37', c2: '#e8d5ac', dx: -1 }, back: tuft(30, 12.8, '#8a6a4e', 4, 5) })],
    'Tit': [BUTTER, () => bird({ body: '#f2cc3c', wing: '#4d86c9', belly: '#f8dc62', head: '#fffdf5', cap: '#3f7fd0', mask: '#27313f', throat: '#27313f', beak: { t: 'tiny', c: '#3b3b44' }, eyeR: 2.6 })],
    'Eagle': [SKY, () => bird({ body: '#4b3527', wing: '#3a281c', head: '#fffdf6', beak: { t: 'hook', c: '#f5bf1f', c2: '#f5bf1f', dx: -.5 }, iris: '#f8d24a', brow: '#cfc6b4', r: 15.5, front: S('M21 39 l3 4 M27 41 l2 4 M33 42 l1 4', '#fffdf6', 2.4) })],
    'Falcon': [PEACH, () => bird({ body: '#5d6b7e', wing: '#48566a', belly: '#f6efe0', chest: bars('#5d6b7e'), head: '#56647a', throat: '#f6efe0', cheek: '#f6efe0', tear: '#303a49', beak: { t: 'hook', c: '#f0c330', c2: '#59606c' }, iris: '#f0c330', eyeR: 2.6 })],
    'Pelican': [SKY, () => bird({ neck: 'mid', body: '#fffdf8', wing: '#3c3f47', head: '#fffdf8', beak: { t: 'pelican', c: '#f08d6c', c2: '#f7c948', dy: -1 }, iris: '#f7d35c', back: tuft(33, 9.4, '#fffdf8', 3, 5) })],
    'Turkey': [PEACH, () => bird({ neck: 'mid', body: '#7a4a2c', wing: '#5d351d', head: '#7fb0d2', neckC: '#d8504a', beak: { t: 'cone', c: '#e9c06a' }, back: [-64, -42, -20, 2, 24].map((a) => rot(a, 22, 58, P('M22 58 L15 20 Q22 13 29 20 Z', '#a4683d') + P('M16.4 27 Q22 22 27.6 27 L28.4 22.6 Q22 15 15.6 22.6 Z', '#f1dcb4'))).join(''), front: S('M49 22 q3 3 1 7', '#d8343a', 3.2) + P('M44 30 q4 6 0 11 q-4 -5 0 -11 Z', '#d8343a') })],
    'Owl': [LILAC, () => {
      let g = P('M14 23 L10 8 L24 15 Z M50 23 L54 8 L40 15 Z', '#7c5a40');
      g += E(32, 39, 21, 24, '#8c684a') + E(32, 49, 13, 13, '#e6d2ae');
      g += [[26, 44], [32, 47], [38, 44], [29, 52], [35, 52], [32, 57]].map(([x, y]) => S(`M${x - 2} ${y} q2 2.4 4 0`, '#8c684a', 1.6)).join('');
      g += C(22.5, 29, 10, '#f4e7c8') + C(41.5, 29, 10, '#f4e7c8');
      g += C(22.5, 29, 6.4, '#f5b921') + C(41.5, 29, 6.4, '#f5b921') + C(22.5, 29, 3.6, INK) + C(41.5, 29, 3.6, INK) + C(24, 27.4, 1.3, '#fff') + C(43, 27.4, 1.3, '#fff');
      return g + P('M29 33 L35 33 L32 40 Z', '#f0a63a') + S('M14 20 Q22 15 31 21 M50 20 Q42 15 33 21', '#6a4a33', 2.4);
    }],
    'Mosquito': [MINT, () => {
      let g = both(E(20, 24, 13, 5.2, '#ffffff', 'opacity=".85" transform="rotate(24 20 24)"')) + both(S('M9 22 Q18 20 28 28', '#b9c7c0', .9));
      g += both(S('M28 33 L15 38 L9 50 M28 36 L18 45 L16 58 M29 31 L16 31 L7 36', '#4a4a52', 1.5));
      g += E(32, 42, 4.4, 13, '#6f6a72') + [36, 41, 46, 51].map((y) => S(`M${28.4} ${y} h7.2`, '#3f3b45', 1.5)).join('');
      g += C(32, 27.5, 5.6, '#4a4650') + C(32, 19.6, 4.4, '#3f3b45') + C(29.6, 18.6, 1.7, '#d8343a') + C(34.4, 18.6, 1.7, '#d8343a');
      return g + S('M32 15.4 V3', '#3f3b45', 1.6) + both(S('M30 16 Q26 10 22 9', '#3f3b45', 1.1));
    }],
    'Seagull': [SKY, () => bird({ body: '#fffdf8', wing: '#9fb0be', head: '#fffdf8', beak: { t: 'strong', c: '#f6c634' }, mid: C(58, 30.4, 1.8, '#e0453a'), iris: '#f6dc7a', eyeR: 2.4, front: P('M8 66 L4 54 L14 60 Z', '#3a3f48') })],
    'Goose': [MINT, () => bird({ neck: 'long', body: '#fffdf8', wing: '#e9e4d8', head: '#fffdf8', neckW: 10, beak: { t: 'duck', c: '#f08a2c', dy: 1 }, iris: '#69a9dc', eyeR: 2.2 })],
    'Chicken': [PEACH, () => bird({ body: '#fffdf8', wing: '#eee6d6', head: '#fffdf8', beak: { t: 'cone', c: '#f2b62c' }, back: C(27, 12.6, 5, '#e03c3c') + C(34.5, 10.4, 5.6, '#e03c3c') + C(41.6, 13.4, 4.6, '#e03c3c'), front: P('M46 33 q5 5 1 11 q-5 -4 -1 -11 Z', '#e03c3c') })],
    'Crane': [MIST, () => bird({ neck: 'long', body: '#eef0f0', wing: '#30343c', head: '#fffdf8', neckC: '#30343c', neckW: 7, cap: '#e0453a', beak: { t: 'thin', c: '#c9b24a', dy: .5 }, r: 9, eyeR: 2 })],
    'Cuckoo': [MINT, () => bird({ body: '#76828f', wing: '#5d6975', belly: '#fffdf8', chest: bars('#4d5661'), head: '#7f8b98', beak: { t: 'cone', c: '#3f424a', dy: .5 }, iris: '#f4c63d', eyeR: 2.4, front: E(13, 57, 6, 7.6, '#bfe0df', 'transform="rotate(-18 13 57)"') + C(11.5, 55, 1, '#7aa9a8') + C(15, 59.4, 1.1, '#7aa9a8') + C(12.4, 60.6, .8, '#7aa9a8') })],
    'Emu': [SAND, () => bird({ neck: 'long', body: '#6f5a48', wing: '#5a4737', head: '#4a4e58', neckC: '#7fa7c4', neckW: 7.5, beak: { t: 'strong', c: '#3a3a40', dy: 1.4 }, iris: '#f08c3a', r: 9, eyeR: 2.3, back: tuft(38, 8.4, '#4a4e58', 5, 6), front: S('M6 52 l-3 5 M12 48 l-4 6 M18 46 l-3 6 M30 48 l1 6', '#8a7460', 2) })],
    'Crow': ['#f6dc8a', () => bird({ body: '#25232b', wing: '#34323c', head: '#25232b', beak: { t: 'strong', c: '#17161b' }, iris: '#f5f2ea', eyeR: 2.1, front: S('M12 52 q6 -6 13 -5', '#4b4860', 2) })],
    'Magpie': [MINT, () => bird({ body: '#25232b', wing: '#34323c', collar: '#fffdf8', head: '#25232b', nape: '#fffdf8', beak: { t: 'strong', c: '#cfd8de', c2: '#2c2c33' }, iris: '#c0562c', eyeR: 2.3, front: P('M10 62 Q14 50 25 45 L27 49 Q18 54 15 64 Z', '#fffdf8') })],
    'Galah': [MIST, () => bird({ body: '#e8798f', wing: '#9aa4b0', head: '#e8798f', cap: '#fbd6dc', beak: { t: 'parrot', c: '#f3ecdc', dx: -.5 }, iris: '#e8798f', eyeR: 2.2, back: P('M24 14 Q30 2 42 8 Q36 9 34 14 Z', '#fbd6dc') })],
    'Rainbow Lorikeet': [BUTTER, () => bird({ body: '#f08a2c', wing: '#33a457', belly: '#f6c83a', head: '#3460d3', collar: '#b6d93f', beak: { t: 'parrot', c: '#e63f33', dx: -.5 }, iris: '#e63f33', eyeR: 2.1 })],
    'Lovebird': [ROSE, () => bird({ body: '#56b25a', wing: '#3d9647', head: '#f5874f', cap: '#ee5a44', beak: { t: 'parrot', c: '#e23a34', dx: -.5 }, iris: '#fffdf8', eyeR: 2.3, front: P('M11 12 c-4 -5 -11 0 -5.5 6 l5.5 5 l5.5 -5 c5.5 -6 -1.500 -11 -5.500 -6 Z', '#e8506a') })],
    'Lyrebird': [MINT, () => bird({ body: '#7a5b45', wing: '#614634', belly: '#a48468', head: '#7a5b45', beak: { t: 'cone', c: '#3f3a37' }, eyeR: 2.4, r: 12, back: S('M14 60 C2 44 2 20 12 10 C16 6 21 9 18 14', '#b4764a', 3.4) + S('M20 60 C12 40 20 18 30 6', '#e9dcc2', 1.4) + S('M17 60 C8 42 12 20 22 6', '#e9dcc2', 1.4) + S('M23 60 C17 44 26 22 37 9', '#e9dcc2', 1.4) + [18, 26, 34, 42].map((y) => S(`M${6.5 - (y - 30) * .06} ${y} h4`, '#5e3d25', 1.4)).join('') })],
    'Dove': [SKY, () => bird({ body: '#fffdf8', wing: '#e8e6ee', head: '#fffdf8', beak: { t: 'tiny', c: '#e8a7a0' }, eyeR: 2.5, front: S('M51 30 Q57 28 61 21', '#6a8f3c', 1.6) + leaf(55, 28, -70, '#7fae45', .5) + leaf(57, 26, 0, '#7fae45', .5) + leaf(59, 23, -50, '#7fae45', .45) })],
    'Peacock': [MINT, () => bird({ neck: 'mid', body: '#1f6fd0', wing: '#2aa37a', head: '#1f6fd0', beak: { t: 'cone', c: '#d8d2c4' }, eyeR: 2.3, mid: S('M38 15.4 q4 -2.400 8 -.4 M38 24.600 q4 2 8 .2', '#fffdf8', 1.5),
      back: [-70, -47, -24, -1, 22, 45].map((a) => rot(a, 24, 60, P('M24 60 L16 16 Q24 4 32 16 Z', '#2f9f6b') + C(24, 17, 5.4, '#e7c13d') + C(24, 17, 3.5, '#2d6fd2') + C(24, 17.6, 1.7, '#1d2a55'))).join(''),
      front: [-24, 0, 24].map((a) => rot(a, 37, 10, S('M37 10 V2.6', '#1f6fd0', 1.1) + C(37, 2.4, 1.7, '#2aa37a'))).join('') })],
    'Cassowary': [SAND, () => bird({ neck: 'long', body: '#26242a', wing: '#34323a', head: '#3f8fd6', neckC: '#3577c4', neckW: 8, beak: { t: 'strong', c: '#4a4a50', dy: 1.2 }, iris: '#f0b03a', r: 9.4, eyeR: 2.2, back: P('M33 13 Q35 -2 46 4 Q47 10 44 13 Z', '#8a6b4c'), front: P('M38 27 q3 8 -1 13 q-4 -5 1 -13 Z', '#e0453a') })],
    'Fairy Penguin': [SKY, () => {
      let g = E(32, 40, 20, 25, '#46678e') + both(P('M13 34 Q4 44 9 56 Q13 50 16 44 Z', '#3a5878'));
      g += P('M32 21 C22 21 19 30 19 42 C19 56 25 64 32 64 C39 64 45 56 45 42 C45 30 42 21 32 21 Z', '#fffdf8');
      g += P('M12 26 C12 12 22 7 32 7 C42 7 52 12 52 26 C46 20 40 22 32 27 C24 22 18 20 12 26 Z', '#46678e');
      return g + eye(23.5, 22.5, 2.7) + eye(40.5, 22.5, 2.7) + P('M28.6 27 Q32 25 35.4 27 L32 33 Z', '#3b3f4a') + both(E(25.5, 63, 5, 2.4, '#f0b48a'));
    }],
    'Vogelkop': [PEACH, () => {
      let g = E(32, 34, 28, 23, '#17161c') + P('M4 34 A28 23 0 0 1 60 34 Q32 20 4 34 Z', '#23212b');
      g += E(20, 26, 4.6, 3.2, '#35d0f2') + E(44, 26, 4.6, 3.2, '#35d0f2') + C(20, 26, 1.3, '#0d2c3a') + C(44, 26, 1.3, '#0d2c3a');
      g += P('M12 40 Q32 60 52 40 Q46 51 32 52 Q18 51 12 40 Z', '#35d0f2');
      return g + P('M29 33 L35 33 L32 38 Z', '#3a3842') + S('M27 62 v-5 M37 62 v-5', '#3a3842', 2);
    }],
    /* ----- farm: other animals ----- */
    'Sheep': [MINT, () => {
      let g = [[14, 26], [22, 15], [34, 12], [45, 17], [51, 28], [50, 41], [14, 40], [32, 22]].map(([x, y]) => C(x, y, 11, '#fffdf8')).join('');
      g += both(E(13.5, 34, 7, 3.6, '#4a4350', 'transform="rotate(-24 13.5 34)"'));
      g += P('M21 31 C21 23 43 23 43 31 L41 49 C40 58 24 58 23 49 Z', '#4a4350');
      g += [[25, 23], [32, 20], [39, 23]].map(([x, y]) => C(x, y, 6, '#fffdf8')).join('');
      return g + C(26.5, 37, 2.7, '#fffdf8') + C(37.5, 37, 2.7, '#fffdf8') + C(26.9, 37.4, 1.5, INK) + C(37.9, 37.4, 1.5, INK) + S('M29.6 49 L32 51 L34.4 49 M32 51 v2.4', '#f0a9a8', 1.6);
    }],
    'Frog': [BUTTER, () => {
      let g = E(32, 41, 25, 18, '#5fb548') + C(19, 21, 10, '#5fb548') + C(45, 21, 10, '#5fb548');
      g += E(32, 48, 17, 9, '#cfe9a6');
      g += C(19, 20.5, 6.6, '#fffdf8') + C(45, 20.5, 6.6, '#fffdf8') + E(19, 21, 3.6, 2.6, INK) + E(45, 21, 3.6, 2.6, INK) + C(20.6, 19.6, .9, '#fff') + C(46.6, 19.6, .9, '#fff');
      return g + S('M14 41 Q32 53 50 41', '#2f6d2a', 2) + C(28.5, 34.5, 1, '#2f6d2a') + C(35.5, 34.5, 1, '#2f6d2a') + C(11, 44, 2.6, '#7bcb62') + C(53.5, 46, 2, '#7bcb62');
    }],
    'Switcheroo': [SAND, () => {
      let g = both(P('M22 26 Q10 12 12 1 Q24 6 28 22 Z', '#b9774a') + P('M21 22 Q14 13 15 6 Q22 10 25 20 Z', '#f0c2a6'));
      g += P('M17 34 C17 21 47 21 47 34 C47 44 43 54 39 59 C36 63 28 63 25 59 C21 54 17 44 17 34 Z', '#c58555');
      g += E(32, 54, 9.6, 8.4, '#efd6b6');
      g += eye(23.6, 35, 2.8) + eye(40.4, 35, 2.8);
      g += P('M27.6 49 Q32 46.4 36.4 49 Q35 54 32 54 Q29 54 27.6 49 Z', '#3a3033') + S('M32 54 v3.4 M32 57.4 q-3 2 -5.4 0 M32 57.4 q3 2 5.4 0', '#3a3033', 1.2);
      return g;
    }],
    'Koala': [MINT, () => {
      let g = both(C(11.5, 23, 11.5, '#9aa0a8') + C(11.5, 23, 6.8, '#f3dfe0'));
      g += E(32, 37, 22, 20.5, '#a7adb5') + E(32, 50, 11, 6, '#c9cdd3');
      g += eye(21.5, 32, 2.7) + eye(42.5, 32, 2.7);
      g += P('M26 37 C26 30 38 30 38 37 L37 45 C36 50 28 50 27 45 Z', '#3a3438') + E(30, 36, 1.6, 2.4, '#655d63');
      return g + S('M28 53 Q32 55.6 36 53', '#5c6067', 1.4) + both(S('M4 15 l-2 -4 M8 12 l-1 -5 M14 11 l1 -5', '#9aa0a8', 2));
    }],
    'Clownfish': ['#bfe6f2', () => {
      let g = P('M50 32 L63 19 Q60 32 63 45 Z', '#f27a1a') + P('M24 14 Q34 5 46 16 L42 22 L26 20 Z', '#f27a1a') + P('M28 49 Q34 58 44 50 L40 44 Z', '#f27a1a');
      g += E(30, 32, 25, 16.5, '#f58220');
      g += P('M17 18.4 Q23 32 17 45.6 Q11 43 9.6 40 Q14 32 9.6 24 Q12 20.6 17 18.4 Z', WHITE);
      g += P('M33 15.6 Q41 32 33 48.4 Q29 48.6 26 48 Q33 32 26 16 Q29.6 15.4 33 15.6 Z', WHITE) + P('M48 24 Q52 32 48 40 Q46 41 44.4 41.6 Q49 32 44.4 22.4 Z', WHITE);
      g += S('M17 18.4 Q23 32 17 45.6 M26 16 Q33 32 26 48 M33 15.6 Q41 32 33 48.4 M44.4 22.4 Q49 32 44.4 41.6', '#27262c', 1.3);
      return g + C(11.6, 29, 3.6, WHITE) + C(11, 29, 2.1, INK) + S('M6.4 36.6 q2.4 1.6 4.6 .4', '#8a3d0c', 1.3) + C(58, 8, 2.2, '#e9f8fc') + C(52.5, 3.5, 1.4, '#e9f8fc');
    }],
    'Brumby': [SAND, () => {
      let g = P('M30 2 L36 13 L27 15 Z', '#8a5632') + P('M10 66 C10 46 16 28 26 15 L40 12 C47 14 50 20 52 30 L60 46 C62 52 58 57 53 56 L42 50 C38 56 36 60 36 66 Z', '#a8683c');
      g += P('M24 14 C12 22 6 40 6 66 L18 66 C16 44 22 28 32 17 Z', '#3d2a22');
      g += P('M27 14 Q34 20 36 30 L31 27 Q30 21 26 17 Z', '#3d2a22');
      g += P('M48 39 L60 46 C62 52 58 57 53 56 L45 51.6 Q49 46 48 39 Z', '#e6c7a4') + E(56.4, 49, 1.3, 2, '#5a3a26');
      g += eye(41.4, 27, 2.6) + P('M37 19 L40 12.6 L44.6 22 Z', '#fffdf8', 'opacity=".9"');
      return g + S('M49.6 54.4 q3 1 5.4 -1', '#5a3a26', 1.2);
    }],
    'Sheepdog': [SKY, () => {
      let g = both(P('M14 20 Q2 22 4 42 Q12 40 18 30 Z', '#2b2a30'));
      g += P('M12 30 C12 16 52 16 52 30 C52 42 46 52 42 57 C38 62 26 62 22 57 C18 52 12 42 12 30 Z', '#2b2a30');
      g += P('M32 16 C28 22 27 30 22 38 C19 44 20 52 24 57 C28 61 36 61 40 57 C44 52 45 44 42 38 C37 30 36 22 32 16 Z', WHITE);
      g += both(C(21.4, 31.6, 3.3, '#b8742e')) + both(C(21.4, 31.6, 2.1, INK)) + both(C(22.2, 30.8, .7, '#fff'));
      g += P('M27 43.4 Q32 40.6 37 43.4 Q36 48.4 32 48.4 Q28 48.4 27 43.4 Z', INK) + S('M32 48.4 v3 M26.6 52 Q32 55 37.400 52', INK, 1.3);
      return g + P('M29 53.6 Q32 55 35 53.6 Q35.6 60.6 32 60.6 Q28.4 60.6 29 53.6 Z', '#f08a94');
    }],
    'Rabbit': [ROSE, () => {
      let g = both(P('M22 30 Q10 6 20 1.6 Q29 4 29 28 Z', '#f2ead9') + P('M22.6 25 Q15.6 9 20.4 6 Q25 9 25.6 25 Z', '#f5b8c0'));
      g += E(32, 42, 19, 18, '#f7f0e2') + both(C(23, 49, 7.6, WHITE));
      g += eye(22.5, 38, 2.8) + eye(41.5, 38, 2.8);
      g += P('M29.4 44.4 Q32 43.2 34.6 44.4 L32 47.4 Z', '#ee8fa0') + S('M32 47.4 v2 M32 49.4 q-2.600 2.400 -5 .4 M32 49.4 q2.600 2.400 5 .4', '#b98c84', 1.2);
      return g + R(29.6, 51.2, 4.8, 4.6, 1, WHITE, 'stroke="#d8cdb8" stroke-width=".7"') + S('M32 51.4 v4.2', '#d8cdb8', .7) + both(S('M19 47 L8 45.4 M19 49 L8.6 51', '#cdbfa8', .8));
    }],
    'Wasp': [BUTTER, () => {
      let g = both(E(17, 24, 15, 6.4, '#ffffff', 'opacity=".9" transform="rotate(30 17 24)"')) + both(S('M7 19 Q18 20 27 30', '#bcc9d2', .9));
      g += P('M32 62 L27.6 53 h8.8 Z', '#27252b');
      g += E(32, 43, 10, 15, '#f6c21c') + P('M22.6 38 h18.8 l.5 4.4 h-19.8 Z M22.800 46.6 h18.400 l-1.200 4.600 h-16 Z', '#27252b');
      g += C(32, 25.6, 7, '#27252b') + C(32, 16, 6.6, '#f6c21c') + E(28.4, 15.4, 2.3, 3.2, '#27252b') + E(35.6, 15.4, 2.3, 3.2, '#27252b');
      return g + both(S('M29.6 10.4 Q26 3 20.6 4', '#27252b', 1.4));
    }],
    'Gecko': [PEACH, () => {
      let g = S('M33 44 C34 54 46 52 44 60 C43 64 37 63 38 60', '#3fae8c', 5.2);
      g += both(S('M26 25 L16 20 M25 40 L14 45', '#3fae8c', 3.6) + C(15, 19.4, 3.1, '#3fae8c') + C(13, 45.6, 3.1, '#3fae8c') + C(12.4, 17, 1.4, '#3fae8c') + C(12.4, 21.6, 1.4, '#3fae8c') + C(10.4, 43.6, 1.4, '#3fae8c') + C(10.4, 48, 1.4, '#3fae8c'));
      g += E(32, 33, 8.6, 15, '#48bd98') + P('M22.6 13 C22.6 3 41.4 3 41.4 13 C41.4 19 37 22 32 22 C27 22 22.6 19 22.6 13 Z', '#48bd98');
      g += [[29, 28], [35.4, 32], [29.6, 37], [34.6, 42], [32, 24]].map(([x, y]) => C(x, y, 1.5, '#f2c24a')).join('');
      return g + C(25.6, 11.6, 3.3, '#f2c24a') + C(38.4, 11.6, 3.3, '#f2c24a') + E(25.6, 11.6, 1, 2.6, INK) + E(38.4, 11.6, 1, 2.6, INK);
    }],
    'Quokka': [MINT, () => {
      let g = both(C(14, 17, 7.4, '#8f6845') + C(14.4, 17.6, 4.2, '#d9a98c'));
      g += E(32, 37, 22, 20.5, '#a57b53') + E(32, 46, 13.6, 10.6, '#e3c9a4');
      g += eye(22.6, 32.6, 2.8) + eye(41.4, 32.6, 2.8);
      g += P('M28.2 39.6 Q32 37.6 35.8 39.6 Q35 43.6 32 43.6 Q29 43.6 28.2 39.6 Z', '#3a3033');
      return g + S('M23 46 Q32 55.6 41 46', '#5c4030', 1.7) + both(C(18, 43.6, 3, '#e79a86', 'opacity=".55"'));
    }],
    'Spider': [LILAC, () => {
      let g = S('M32 0 V20', '#b5aecb', 1.1);
      g += both(S('M26 34 L15 24 L7 29 M25 38 L11 35 L4 43 M25.6 42 L12 46 L7 56 M27.6 45.6 L19 54 L18 63', '#2c2a33', 2.2));
      g += E(32, 44, 11.6, 12.6, '#2c2a33') + C(32, 28, 7.6, '#3a3742');
      g += P('M28.4 39 h7.2 L32 44 Z M28.400 49 h7.200 L32 44 Z', '#e0453a');
      return g + C(29.2, 25.6, 1.7, '#fffdf8') + C(34.8, 25.6, 1.7, '#fffdf8') + C(26.4, 29, 1, '#fffdf8') + C(37.6, 29, 1, '#fffdf8');
    }],
    /* ----- meowfia: cats ----- */
    'House Cat': [NIGHT, () => cat({ fur: '#f09b3c', stripes: '#c8701c', muzzle: '#fde9cf', iris: '#7fc46a' })],
    'Mouser': [DEEP, () => cat({ fur: '#8e97a3', stripes: '#646d79', muzzle: '#dfe4e9', iris: '#f4c63d', front: S('M35 48.6 C40 52 36 58 42 61 C45 62.6 47 60 46 58', '#f0a2ad', 1.9) + E(33.6, 48.2, 2.6, 1.8, '#b9b2aa') })],
    'Sphinx': [PLUM, () => cat({ fur: '#e8b9a6', earC: '#e8b9a6', inner: '#f3cfc2', ears: 'big', iris: '#6fc3e0', whiskers: false, nose: '#d98a80', line: '#a8695e', under: S('M24 21.6 Q32 18.6 40 21.6 M26 25.2 Q32 22.6 38 25.2', '#cf9682', 1.3) + both(S('M13.6 41 q3 3 2 7', '#cf9682', 1.2)) })],
    'Floofer': [WINE, () => cat({ fur: '#fbf3e4', fluff: '#fbf3e4', earC: '#f1e4cc', iris: '#5fa8e0', muzzle: '#ffffff', whisker: '#d8cbb4', line: '#b9a48c', back: both(P('M16 22 L7 17 L14 28 Z', '#fbf3e4')), front: both(S('M24.400 60 l1 -4 M30 62 l.6 -4', '#e6d8bf', 1.3)) })],
    'Cat Burgler': [COAL, () => cat({ fur: '#5a5f6b', earC: '#4b505b', inner: '#7b808c', muzzle: '#8f949e', iris: '#f4d03d', pupil: 1.5, whisker: '#d5d8de', back: P('M10 22 C12 6 52 6 54 22 Z', '#22232a') + R(8, 19.6, 48, 5.6, 2.8, '#33343d'), under: P('M10.6 29.6 Q32 22.6 53.4 29.6 L52.6 38.6 Q43 41.6 36 36 H28 Q21 41.6 11.4 38.6 Z', '#17171c') })],
    'Maine Coon': [MOSS, () => cat({ fur: '#a8743f', earC: '#8f5f30', ears: 'tuft', fluff: '#c79457', stripes: '#6e4620', muzzle: '#f3e3c8', iris: '#b7cf45', whisker: '#f3e3c8', front: both(P('M22 55 L17 64 L27 60 L32 66 Z', '#e6cfa6')) })],
    'Top Cat': [PLUM, () => cat({ fur: '#2a2a31', inner: '#56535e', iris: '#f4c63d', muzzle: WHITE, nose: '#e8788a', under: P('M32 27 C29 33 26.6 38 23 42 C20 48 24 55.6 32 55.6 C40 55.6 44 48 41 42 C37.4 38 35 33 32 27 Z', WHITE), front: R(17.6, -2, 28.8, 17, 2.4, '#17171b') + R(17.6, 10, 28.8, 5, 0, '#d8343a') + R(11, 14, 42, 4.6, 2.3, '#17171b') + C(42.5, 33.5, 7, 'none', 'stroke="#e9c14a" stroke-width="1.4"') + S('M49 36.4 Q54 44 51 54', '#e9c14a', 1) })],
    'Rag Doll': [DEEP, () => cat({ fur: '#f6ecd9', earC: '#6d5244', inner: '#a88776', iris: '#4f9fe6', muzzle: WHITE, whisker: '#f6ecd9', under: P('M32 24 C22 24 15.6 31 17 39 C20 46 26 45 32 41 C38 45 44 46 47 39 C48.4 31 42 24 32 24 Z', '#7a5c4c'), front: S('M32 17.6 V24', '#b54848', 1.1) + S('M29.6 19 h4.8 M29.6 21.4 h4.800 M29.600 23.800 h4.800', '#b54848', 1.1) })],
    'Copycat': [NIGHT, () => cat({ fur: '#f09b3c', iris: '#7fc46a', muzzle: '#fde9cf', back: '', under: P('M32 17.4 C44.6 17.4 54 25.6 54 36.5 C54 47.6 44.6 55.5 32 55.5 Z', '#7f8794') + P('M36 17 L55 7 L53 32 L44 22 Z', '#7f8794') + P('M41 18.5 L51.800 13 L50 25.500 Z', '#f4a9a0') + S('M32 17 V56', '#fffdf8', 1, 'stroke-dasharray="2.4 2.4"') })],
    /* ----- flowers ----- */
    'Sunflower': ['#fdf3c4', () => bloom({ n: 16, len: 27, w: 4.6, c: '#f6b81c' }) + bloom({ n: 16, len: 23, w: 4, c: '#fcd436', rot: 11.25 }) + C(32, 32, 11, '#6b4423') + C(32, 32, 7, '#8a5a2e') + [[29, 30], [34, 29], [32, 34], [36, 34], [28, 35]].map(([x, y]) => C(x, y, .9, '#4d2f16')).join('')],
    'Bookworm': ['#e6efd6', () => {
      let g = P('M6 20 Q20 14 32 21 Q44 14 58 20 V52 Q44 46 32 53 Q20 46 6 52 Z', '#fffdf6') + S('M32 21 V53', '#d8cfbc', 1.4) + P('M4 22 l2 -2 V52 Q20 46 32 53 Q44 46 58 52 V20 l2 2 V56 Q44 50 32 57 Q20 50 4 56 Z', '#b0563e');
      g += S('M11 27 Q19 24 27 27 M11 33 Q19 30 27 33 M11 39 Q19 36 27 39 M37 27 Q45 24 53 27', '#c9c0ad', 1.3);
      g += S('M38 46 C38 36 48 40 46 32 C45 27 50 24 52 28', '#7cc04a', 6.4);
      return g + C(52, 27, 4.6, '#8ed15a') + C(50.6, 26, 1.3, WHITE) + C(54, 26, 1.3, WHITE) + C(50.8, 26.2, .6, INK) + C(54.2, 26.2, .6, INK) + S('M50.4 29.400 q1.800 1.400 3.600 0', '#3d6d24', .9);
    }],
    'Pitcher Plant': ['#e3efd2', () => stem('M24 64 C22 52 26 46 30 44') + leaf(23, 58, 190, '#5cab5f', .8) + P('M19 22 C15 36 20 50 31 53 C42 50 47 36 43 22 Z', '#9ac24a') + P('M19 22 C22 34 26 42 31 53 C24 50 16.6 38 19 22 Z', '#7fae3c') + [[26, 34], [35, 30], [38, 41], [29, 44], [33, 37]].map(([x, y]) => C(x, y, 1.9, '#c2453e')).join('') + E(31, 22, 12.6, 4.6, '#b23a3a') + E(31, 22.6, 8.6, 2.6, '#5c1d22') + P('M19 21 C20 8 34 4 46 10 C40 12 40 18 43.4 21.6 Z', '#c2453e')],
    'Cactus Flower': ['#fbe9c8', () => {
      let g = R(23, 22, 18, 44, 9, '#4fa25c') + S('M23 44 H13 V33', '#4fa25c', 8) + S('M41 50 H51 V40', '#4fa25c', 8);
      g += S('M29 28 V62 M35 28 V62', '#3d8749', 1.2) + [[26, 34], [38, 38], [26, 48], [38, 54], [13, 38], [51, 45]].map(([x, y]) => S(`M${x - 1.6} ${y} h3.2 M${x} ${y - 1.6} v3.2`, '#e9f3d8', .9)).join('');
      return g + bloom({ cx: 32, cy: 17, n: 7, len: 12, w: 4, c: '#f0609a', pt: true, off: 1 }) + C(32, 17, 3.3, '#f9d24a');
    }],
    'Lotus': ['#d9eef0', () => E(32, 53, 27, 6.6, '#58a86a') + P('M32 53 L50 49 L44 56 Z', '#d9eef0') + [-62, -34, 34, 62].map((a) => rot(a, 32, 50, P('M32 50 Q23 34 32 18 Q41 34 32 50 Z', '#f29bb8'))).join('') + [-17, 17].map((a) => rot(a, 32, 50, P('M32 50 Q22 32 32 12 Q42 32 32 50 Z', '#f6b3ca'))).join('') + P('M32 50 Q22 30 32 9 Q42 30 32 50 Z', '#fbd0de') + C(32, 46, 3, '#f6cf4a')],
    'Corpse Flower': ['#e9e2ee', () => P('M10 30 C12 44 20 54 32 58 C44 54 52 44 54 30 C48 35 44 30 40 34 C37 29 34 33 32 30 C30 33 27 29 24 34 C20 30 16 35 10 30 Z', '#7c2a4a') + P('M17 36 C20 46 25 52 32 55 C39 52 44 46 47 36 C42 40 38 37 32 40 C26 37 22 40 17 36 Z', '#a23d62') + P('M27.6 44 C27 26 28 8 32 3 C36 8 37 26 36.400 44 Z', '#e3d59a') + S('M32 8 V40', '#c9ba78', 1.2) + R(27, 56, 10, 10, 3, '#5d8f4a')],
    'Banksia': ['#f6ead0', () => stem('M32 64 V50', '#7a5a3a', 4) + rot(-52, 30, 56, P('M30 56 l4 -3 l1 3 l4 -3 l1 3 l4 -3 l1 3 l4 -2.6 l0 4.600 l-19 2 Z', '#5d9150')) + rot(232, 34, 56, P('M34 56 l4 3 l1 -3 l4 3 l1 -3 l4 3 l1 -3 l4 2.6 l0 -4.600 l-19 -2 Z', '#5d9150')) + R(20, 6, 24, 46, 12, '#e9951f') + [12, 19, 26, 33, 40, 47].map((y, i) => [23, 28, 33, 38].map((x) => S(`M${x + (i % 2) * 2.5} ${y} q1.600 -3 3 0`, '#fbd77a', 1.5)).join('')).join('') + R(20, 6, 24, 9, 4.5, '#f6b63e', 'opacity=".6"')],
    'Flannel Flower': ['#e4ecd9', () => bloom({ n: 10, len: 28, w: 5.6, c: '#fbf7ea', pt: true, off: 3 }) + bloom({ n: 10, len: 28, w: 1.6, c: '#9fc08a', pt: true, off: 21 }) + C(32, 32, 8, '#bcd0a0') + C(32, 32, 4.6, '#8fae78') + [[29, 30], [35, 31], [32, 35]].map(([x, y]) => C(x, y, 1, '#e9f1dc')).join('')],
    'Marigold': ['#fdf0cf', () => bloom({ n: 12, len: 28, w: 7, c: '#ef7a14' }) + bloom({ n: 10, len: 21, w: 6, c: '#f89a1e', rot: 18 }) + bloom({ n: 8, len: 14, w: 5, c: '#fbb732', rot: 5 }) + C(32, 32, 5, '#fcd04a')],
    'Tumbleweed': ['#f4e7cd', () => [0, 40, 80, 120, 160].map((a) => rot(a, 31, 31, S('M9 31 C14 14 46 12 52 28 C56 42 22 52 16 38 C12 28 36 20 40 30', '#b08a55', 1.7))).join('') + S('M12 22 l-5 -4 M50 44 l6 3 M24 53 l-3 6 M45 12 l4 -5', '#b08a55', 1.6) + S('M2 60 H16 M48 58 H62 M22 62 H34', '#d8c39a', 1.4)],
    'Bluebell': ['#e4e6f8', () => S('M20 64 C20 38 28 14 50 12', '#4f9a57', 2.8) + leaf(20, 58, 200, '#5cab5f', .9) + [[28, 27, -8], [38, 19, -22], [49, 14, -30]].map(([x, y, a], i) => rot(a, x, y, S(`M${x} ${y - 2} V${y + 4}`, '#4f9a57', 1.5) + P(`M${x - 6} ${y + 4} Q${x} ${y - 1} ${x + 6} ${y + 4} L${x + 7.6} ${y + 16} l-3.600 -2.400 l-4 2.800 l-4 -2.800 l-3.600 2.400 Z`, i === 1 ? '#5b74e0' : '#6f86ec') + C(x, y + 14, 1.3, '#fbe58a'))).join('')],
    'Nightshade': ['#e6def2', () => stem('M32 64 V34') + leaf(32, 54, 160, '#4f9a57', .9) + C(44, 54, 5, '#2a2338') + C(50.6, 46, 4.4, '#3a2f4d') + C(45.2, 52.6, 1.2, '#7b6c98') + bloom({ cx: 30, cy: 26, n: 5, len: 22, w: 7.6, c: '#7a52c0', pt: true, off: 1 }) + bloom({ cx: 30, cy: 26, n: 5, len: 9, w: 2.6, c: '#f6cf3a', pt: true, off: 0, rot: 36 }) + C(30, 26, 3.6, '#f6cf3a')],
    'Mulberry': ['#efe0ee', () => S('M32 4 V16', '#6b4a2c', 2.6) + leaf(32, 9, -18, '#5cab5f', 1.1) + [[32, 21], [25.6, 27], [38.4, 27], [32, 30], [24, 36], [40, 36], [32, 40], [26.6, 46], [37.4, 46], [32, 52]].map(([x, y], i) => C(x, y, 6.4, ['#6a2468', '#7d2f7a', '#5a1d58'][i % 3]) + C(x - 1.8, y - 2, 1.5, '#b06aac')).join('')],
    'Stinging Bush': ['#e2efd0', () => S('M32 64 V30', '#4c7f3e', 2.6) + P('M32 6 l5 6 l6 -3 l1 7 l7 0 l-2 7 l6 3 l-5 5 l4 6 l-7 2 l1 7 l-7 -1 l-2 7 l-7 -5 l-7 5 l-2 -7 l-7 1 l1 -7 l-7 -2 l4 -6 l-5 -5 l6 -3 l-2 -7 l7 0 l1 -7 l6 3 Z', '#62a84a') + S('M32 12 V48 M32 22 L21 16 M32 22 L43 16 M32 31 L18 27 M32 31 L46 27 M32 40 L22 40 M32 40 L42 40', '#3f7d33', 1.3) + [[14, 12], [50, 12], [8, 34], [56, 34], [16, 52], [48, 52]].map(([x, y]) => P(`M${x} ${y - 3} l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1 Z`, '#e0453a')).join('')],
    'Moonflower': ['#dfe3f6', () => C(48, 15, 11, '#f6e7a0') + C(52.6, 12, 9.6, '#dfe3f6') + bloom({ n: 5, len: 24, w: 12.6, c: '#fffdf8', cx: 28, cy: 36 }) + bloom({ n: 5, len: 19, w: 1, c: '#d8d6ea', cx: 28, cy: 36, pt: true, off: 3 }) + C(28, 36, 4.6, '#f3e9a4') + C(28, 36, 2, '#d9c95a')],
    'Wolfsbane': ['#e3e0f6', () => stem('M32 64 V8') + leaf(32, 56, 200, '#4f9a57', 1) + leaf(32, 58, -20, '#4f9a57', 1) + [[32, 8, 0], [24, 20, -1], [40, 24, 1], [25, 36, -1], [39, 40, 1]].map(([x, y, s]) => P(`M${x - 7} ${y + 8} C${x - 8} ${y - 4} ${x - 2} ${y - 8} ${x + 1} ${y - 7} C${x + 7} ${y - 5} ${x + 8} ${y + 2} ${x + 6} ${y + 8} Q${x} ${y + 4} ${x - 7} ${y + 8} Z`, s ? '#5a48c0' : '#6c5ad6') + P(`M${x - 3} ${y + 6} q3 -3 6 0 q-3 3 -6 0 Z`, '#2c2470')).join('')],
    'Twinflower': ['#fbe6ea', () => S('M32 64 V34 M32 34 C30 22 20 22 18 28 M32 34 C34 22 44 22 46 28', '#4f9a57', 2.4) + leaf(32, 58, 200, '#5cab5f', .8) + leaf(32, 58, -20, '#5cab5f', .8) + [18, 46].map((x) => P(`M${x - 7} 28 Q${x} 23 ${x + 7} 28 L${x + 9} 44 l-4.500 -2.600 l-4.500 3 l-4.500 -3 l-4.500 2.600 Z`, '#f29ab4') + S(`M${x - 3} 31 V38 M${x + 3} 31 V38`, '#e07a9a', 1)).join('')],
    'Angel\'s Trumpet': ['#fdeeda', () => S('M10 6 C24 4 34 8 34 16', '#6b8f4a', 3) + leaf(14, 6, 150, '#5cab5f', 1) + P('M29 14 h10 C40 30 46 42 56 52 L48 50 L46 58 L39 51 L34 60 L29 51 L22 58 L20 50 L12 52 C22 42 28 30 29 14 Z', '#f7c98a') + P('M29 14 h10 C39.6 22 41 28 43 33 Q34 30 25 33 C27 28 28.400 22 29 14 Z', '#f2b266') + S('M34 20 V52 M30 30 L24 50 M38 30 L44 50', '#e9a55a', 1) + R(28, 11, 12, 5.6, 2.8, '#6b8f4a')],
    'Dandelion': ['#dceef4', () => stem('M30 64 C30 52 32 46 32 40', '#6aa858', 2.4) + Array.from({ length: 14 }, (_, i) => rot(i * 360 / 14, 30, 30, S('M30 30 V11', '#b9c2c9', .9) + S('M26.4 10.6 L30 13 L33.6 10.6 M30 13 V8', '#ffffff', 1.2))).join('') + C(30, 30, 3.6, '#c9b98a') + [[52, 14, 20], [58, 26, 40], [50, 5, 10]].map(([x, y, a]) => rot(a, x, y, S(`M${x} ${y + 5} V${y - 2}`, '#b9c2c9', .9) + S(`M${x - 3} ${y - 3.4} L${x} ${y - 1.400} L${x + 3} ${y - 3.400}`, '#ffffff', 1.2))).join('')],
    'Wildflower': ['#e9f1d6', () => S('M20 64 V40 M33 64 V30 M46 64 V42', '#5a9e52', 2.2) + bloom({ cx: 20, cy: 34, n: 5, len: 11, w: 4.4, c: '#f06a8c' }) + C(20, 34, 3, '#fbd84a') + bloom({ cx: 33, cy: 22, n: 6, len: 13, w: 4.4, c: '#7d6fe0' }) + C(33, 22, 3.4, '#fbd84a') + bloom({ cx: 46, cy: 36, n: 5, len: 11, w: 4.4, c: '#f6a11c' }) + C(46, 36, 3, '#8a4b1c') + leaf(33, 52, -24, '#6cb360', .8) + leaf(20, 56, 200, '#6cb360', .7)],
    'Chocolate Lily': ['#f1e3d8', () => stem('M32 64 V36') + leaf(32, 56, -30, '#5cab5f', .9) + bloom({ cx: 32, cy: 28, n: 6, len: 24, w: 7.6, c: '#6b3f5c', pt: true, off: 1 }) + bloom({ cx: 32, cy: 28, n: 6, len: 20, w: 1.2, c: '#8f5c80', pt: true, off: 4 }) + C(32, 28, 4.2, '#3d2236') + [0, 120, 240].map((a) => rot(a, 32, 28, C(32, 22.4, 1.5, '#f2c84a'))).join('')],
    'Foxglove': ['#f6e2ef', () => S('M22 64 C22 40 26 16 30 4', '#4f9a57', 2.8) + leaf(22, 60, -10, '#5cab5f', 1.1) + [[30, 6, 4.6], [29, 16, 5.6], [27.6, 27, 6.6], [26, 39, 7.6]].map(([x, y, w], i) => P(`M${x} ${y} C${x + 4} ${y - 3} ${x + 12} ${y - 2} ${x + 12 + w * 2} ${y + 3} L${x + 13 + w * 2} ${y + w + 5} C${x + 10 + w} ${y + w + 5} ${x + 3} ${y + w + 2} ${x} ${y} Z`, i % 2 ? '#d75aa8' : '#e272b8') + E(x + 10 + w * 1.7, y + w * .5 + 4, 2, w * .55, '#fbe3f1') + C(x + 10 + w * 1.7, y + w * .5 + 3, .7, '#8a2466') + C(x + 10.6 + w * 1.7, y + w * .5 + 5.4, .6, '#8a2466')).join('')],
    'Bottlebrush': ['#e6efd6', () => S('M6 60 L58 8', '#7a5a3a', 2.6) + leaf(14, 53, -78, '#5d9150', .9) + leaf(54, 12, -20, '#5d9150', .8) + leaf(52, 13, -110, '#5d9150', .8) + rot(-45, 32, 34, Array.from({ length: 13 }, (_, i) => S(`M${12 + i * 3.3} 34 v-13 M${12 + i * 3.3} 34 v13`, i % 2 ? '#d8273a' : '#ee3f4c', 2) + C(12 + i * 3.3, 20.4, 1.1, '#fbd24a') + C(12 + i * 3.3, 47.6, 1.1, '#fbd24a')).join(''))],
    'Tigerlily': ['#fdecd2', () => stem('M32 64 V38') + leaf(32, 56, 200, '#5cab5f', .9) + bloom({ cx: 32, cy: 28, n: 6, len: 25, w: 8, c: '#f47a1c', pt: true, off: 1 }) + [0, 60, 120, 180, 240, 300].map((a) => rot(a, 32, 28, C(32, 14, 1.1, '#5a2a12') + C(30, 18, .9, '#5a2a12') + C(34, 19, .9, '#5a2a12'))).join('') + C(32, 28, 3.6, '#fbd24a') + [30, 150, 270].map((a) => rot(a, 32, 28, S('M32 28 V18', '#fbd24a', 1) + E(32, 17.6, 1, 2, '#7a3a14'))).join('')],
    'Snapdragon': ['#fbe6dc', () => stem('M32 64 V6') + leaf(32, 58, -24, '#5cab5f', .9) + leaf(32, 58, 204, '#5cab5f', .9) + [[32, 9, 6], [25, 20, 7], [39, 22, 7], [24, 34, 8], [40, 37, 8], [32, 46, 8]].map(([x, y, r], i) => C(x - r * .45, y - r * .3, r * .62, '#f0608a') + C(x + r * .45, y - r * .3, r * .62, '#f0608a') + E(x, y + r * .4, r * .9, r * .6, i % 2 ? '#f7a23a' : '#fbc54a') + S(`M${x - r * .5} ${y + .4} q${r * .5} ${r * .35} ${r} 0`, '#b83a62', 1)).join('')],
    'Poppy': ['#fbe2dc', () => stem('M32 64 C34 54 30 46 32 40') + bloom({ n: 4, len: 26, w: 15, c: '#e2382e', cy: 30, rot: 45 }) + bloom({ n: 4, len: 22, w: 12, c: '#f04a3a', cy: 30 }) + C(32, 30, 7, '#231f26') + C(32, 30, 3, '#6a8f3c') + Array.from({ length: 10 }, (_, i) => rot(i * 36, 32, 30, C(32, 24.4, .9, '#f6d24a'))).join('')],
    'Venus Flytrap': ['#e3efd2', () => stem('M32 64 V48', '#4f9a57', 3.4) + P('M30 48 C10 44 4 26 12 10 C22 16 30 30 30 48 Z', '#6cb84a') + P('M34 48 C54 44 60 26 52 10 C42 16 34 30 34 48 Z', '#6cb84a') + P('M29 44 C16 40 11 28 15 17 C22 23 28 32 29 44 Z', '#e0565e') + P('M35 44 C48 40 53 28 49 17 C42 23 36 32 35 44 Z', '#e0565e') + [[12, 10, 14, 4], [16, 14, 20, 8.6], [20.6, 19.6, 25, 15], [24.6, 26, 29, 22], [27.6, 33.6, 31.6, 30]].map(([a, b, c, d]) => both(S(`M${a} ${b} L${c} ${d}`, '#fffdf2', 1.7))).join('')],
    'Wax Flower': ['#fbe4ec', () => bloom({ n: 5, len: 26, w: 11, c: '#f7a8c4' }) + bloom({ n: 5, len: 24, w: 9, c: '#fbc6d8' }) + C(32, 32, 8.6, '#c2316c') + C(32, 32, 5.6, '#e9d36a') + C(32, 32, 2.2, '#8fae3c') + Array.from({ length: 10 }, (_, i) => rot(i * 36, 32, 32, C(32, 25, .8, '#fffdf8'))).join('')],
    'Crimson Kunzea': ['#f8e0e2', () => stem('M32 64 V44', '#7a5a3a', 2.6) + leaf(32, 56, -30, '#5d9150', .7) + leaf(32, 52, 210, '#5d9150', .7) + Array.from({ length: 22 }, (_, i) => rot(i * 360 / 22, 32, 28, S('M32 28 V8', i % 2 ? '#c81e3c' : '#e23450', 1.6) + C(32, 7.4, 1.5, '#fbd24a'))).join('') + C(32, 28, 7.6, '#a8142e') + C(32, 28, 3.6, '#7c0e22')],
    'Oleander': ['#fde6ea', () => leaf(32, 34, 200, '#5d9150', 1.6) + leaf(32, 34, -30, '#5d9150', 1.6) + [0, 72, 144, 216, 288].map((a) => rot(a, 32, 32, P('M32 32 C24 26 22 12 30 6 C40 6 44 16 40 24 C38 28 35 30 32 32 Z', '#f0709a') + S('M32 30 Q31 18 33 9', '#f8a6c0', 1))).join('') + C(32, 32, 4.6, '#fbe08a') + C(32, 32, 2, '#d99a2c')],
    'Thistle': ['#eadff2', () => stem('M32 64 V46', '#5a8f4a', 3) + rot(-36, 32, 58, P('M32 58 l5 -2 l0 3 l5 -2 l0 3 l6 -1 l-6 3.600 l-10 .4 Z', '#6aa058')) + rot(216, 32, 58, P('M32 58 l5 2 l0 -3 l5 2 l0 -3 l6 1 l-6 -3.600 l-10 -.4 Z', '#6aa058')) + Array.from({ length: 13 }, (_, i) => rot(-54 + i * 9, 32, 34, S('M32 34 V5', i % 2 ? '#9a4fd0' : '#b46be6', 2.2))).join('') + P('M21 32 C21 26 43 26 43 32 C43 42 38 48 32 48 C26 48 21 42 21 32 Z', '#5f9a50') + [[25, 33], [32, 31], [39, 33], [28.6, 39], [35.4, 39], [32, 44]].map(([x, y]) => S(`M${x - 2} ${y + 1.6} L${x} ${y - 1.6} L${x + 2} ${y + 1.6}`, '#cfe6b8', 1.1)).join('')],
    'Golden Wattle': ['#eef2d2', () => S('M8 58 C24 50 40 32 56 8', '#7a5a3a', 2.4) + leaf(20, 52, -100, '#6a9c58', 1) + leaf(44, 24, 20, '#6a9c58', 1) + [[14, 44, 6], [24, 37, 6.6], [22, 54, 5], [33, 43, 6], [34, 28, 6.6], [44, 34, 5.6], [42, 17, 6], [51, 22, 5], [52, 9, 5]].map(([x, y, r]) => C(x, y, r, '#f6c81c') + Array.from({ length: 8 }, (_, i) => rot(i * 45, x, y, C(x, y - r, 1, '#fde36a'))).join('') + C(x - r * .3, y - r * .3, r * .3, '#fde36a')).join('')],
    'Desert Pea': ['#f6e6d0', () => S('M6 12 C24 8 44 10 60 18', '#6a9c58', 2.6) + leaf(12, 11, -150, '#7fae6a', .8) + leaf(52, 15, -40, '#7fae6a', .8) + [[20, 12, 8], [40, 13, -6]].map(([x, y, a]) => rot(a, x, y, P(`M${x - 6.6} ${y} C${x - 9} ${y + 12} ${x - 5} ${y + 28} ${x} ${y + 46} C${x + 5} ${y + 28} ${x + 9} ${y + 12} ${x + 6.6} ${y} Z`, '#dd2a2e') + P(`M${x - 6.6} ${y} C${x - 13} ${y - 4} ${x - 6} ${y - 12} ${x} ${y - 6} C${x + 6} ${y - 12} ${x + 13} ${y - 4} ${x + 6.6} ${y} Z`, '#f04a3e') + E(x, y + 9, 5.4, 7, '#1d1a20') + C(x - 1.6, y + 6.6, 1.4, '#5a5560'))).join('')],
    'Waratah': ['#f8e2de', () => stem('M32 64 V48', '#6a4a34', 3.4) + leaf(32, 58, -20, '#4f8f4a', 1.2) + leaf(32, 58, 200, '#4f8f4a', 1.2) + bloom({ cx: 32, cy: 34, n: 9, len: 26, w: 7, c: '#b8182c', pt: true, off: 2, rot: 20 }) + P('M14 34 C14 14 50 14 50 34 C50 40 42 44 32 44 C22 44 14 40 14 34 Z', '#e0283c') + [[22, 30], [28, 24], [36, 24], [42, 30], [25, 37], [32, 32], [39, 37], [32, 40]].map(([x, y]) => S(`M${x - 2.6} ${y + 1} q2.600 -5 5.200 0`, '#fb7a7a', 1.5)).join('')],
    'Amaranth': ['#f6e0ec', () => S('M30 64 V10', '#5a8f4a', 2.8) + leaf(30, 50, -24, '#5cab5f', 1.1) + leaf(30, 54, 204, '#5cab5f', 1) + [['M30 10 C40 6 52 14 50 30 C49 40 44 46 46 56', 6.6, '#c2247c'], ['M30 14 C22 10 12 18 14 30 C15 38 18 42 16 50', 5.6, '#d43a90'], ['M30 18 C36 20 38 28 36 38', 5, '#a81c68']].map(([d, w, c]) => S(d, c, w) + S(d, '#f08ac4', 1.2, 'stroke-dasharray="1 4"')).join('')],
    'Bird of Paradise': ['#e2f0e6', () => S('M22 64 C22 50 24 44 28 40', '#4f8f4a', 3.6) + P('M6 44 C18 34 38 34 58 38 C44 46 22 50 6 44 Z', '#5a9a68') + P('M6 44 C18 40 38 38 58 38 C40 42 22 46 6 44 Z', '#3f7d52') + [[-52, '#f6a11c'], [-30, '#f58a1c'], [-8, '#f6a11c'], [14, '#f58a1c']].map(([a, c]) => rot(a, 30, 40, P('M30 40 Q23 22 30 3 Q37 22 30 40 Z', c))).join('') + rot(38, 30, 40, P('M30 40 Q26 26 30 12 Q34 26 30 40 Z', '#3a52c8')) + rot(54, 30, 40, P('M30 40 Q27.600 30 30 20 Q32.400 30 30 40 Z', '#4a66de'))],
  };

  const BG = { farm: '#dfeedd', meowfia: '#2c2a4d', flower: '#f1e4f1', unknown: '#e8e3d8' };
  const cache = {};
  // Face-down / unknown: an egg with a question mark.
  const unknown = () => E(32, 35, 17, 21, '#fffdf6') + E(26, 27, 4, 6, '#ffffff', 'opacity=".7" transform="rotate(24 26 27)"') + S('M26.6 30 C26.6 22.6 38 22.6 38 30 C38 35 32 34.6 32 40', '#b9ad99', 3.2) + C(32, 46.4, 2.1, '#b9ad99');
  function svg(name, type) {
    const key = name + '|' + (type || '');
    if (cache[key]) return cache[key];
    const a = ART[name];
    const bg = a ? a[0] : (BG[type] || BG.unknown);
    let body;
    try { body = a ? a[1]() : unknown(); } catch (e) { body = unknown(); }
    return (cache[key] = `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" fill="${bg}"/>${body}</svg>`);
  }
  const bg = (name) => (ART[name] ? ART[name][0] : BG.unknown);

  /* ---------------- small line icons (currentColor) ---------------- */
  const L = (d, x = '') => `<path d="${d}" ${x}/>`;
  const UI = {
    // navigation
    games: L('M4 7.500 a2 2 0 0 1 2 -2 h7 a2 2 0 0 1 2 2 v11 a2 2 0 0 1 -2 2 h-7 a2 2 0 0 1 -2 -2 Z') + L('M15 7 l3.400 -.9 a2 2 0 0 1 2.400 1.400 l2 8.600 a2 2 0 0 1 -1.400 2.400 l-6.400 1.700'),
    sims: L('M4 20 V10 M10 20 V4 M16 20 V13 M22 20 V8'),
    cards: L('M4 4 h7 v7 h-7 Z M13 4 h7 v7 h-7 Z M4 13 h7 v7 h-7 Z M13 13 h7 v7 h-7 Z'),
    rules: L('M5 4 h11 a3 3 0 0 1 3 3 v13 H8 a3 3 0 0 1 -3 -3 Z') + L('M9 9 h6 M9 13 h6'),
    run: L('M7 4 l13 8 l-13 8 Z'),
    // phases
    pool: L('M6 3 h12 a1 1 0 0 1 1 1 v16 a1 1 0 0 1 -1 1 h-12 a1 1 0 0 1 -1 -1 v-16 a1 1 0 0 1 1 -1 Z') + L('M12 8.500 l2.500 3.500 l-2.500 3.500 l-2.500 -3.500 Z'),
    deal: L('M12 3 a4 4 0 1 1 0 8 a4 4 0 0 1 0 -8 Z M4 21 a8 8 0 0 1 16 0'),
    night: L('M20 14.500 A8.500 8.500 0 1 1 9.500 4 a7 7 0 0 0 10.500 10.500 Z'),
    dawn: L('M3 18 h18 M6.500 18 a5.500 5.500 0 0 1 11 0 M12 6 v3 M4.600 10.600 l2 2 M19.400 10.600 l-2 2'),
    day: L('M12 7 a5 5 0 1 1 0 10 a5 5 0 0 1 0 -10 Z M12 2 v2.500 M12 19.500 V22 M2 12 h2.500 M19.500 12 H22 M4.900 4.900 l1.800 1.800 M17.300 17.300 l1.800 1.800 M4.900 19.100 l1.800 -1.800 M17.300 6.700 l1.800 -1.800'),
    minds: L('M12 3 a7 7 0 0 0 -4 12.700 V18 h8 v-2.300 A7 7 0 0 0 12 3 Z M9 21 h6'),
    vote: L('M12 3 c4 0 6.500 5 6.500 9.500 a6.500 6.500 0 0 1 -13 0 C5.500 8 8 3 12 3 Z'),
    scores: L('M7 4 h10 v5 a5 5 0 0 1 -10 0 Z M7 6 H4 a3 3 0 0 0 3 4 M17 6 h3 a3 3 0 0 1 -3 4 M12 14 v4 M8 20 h8'),
    // actions
    close: L('M6 6 l12 12 M18 6 l-12 12'),
    back: L('M14 5 l-7 7 l7 7'),
    next: L('M10 5 l7 7 l-7 7'),
    down: L('M5 9 l7 7 l7 -7'),
    plus: L('M12 5 v14 M5 12 h14'),
    minus: L('M5 12 h14'),
    check: L('M5 12.500 l4.500 4.500 l9.500 -10'),
    search: L('M10.500 4 a6.500 6.500 0 1 1 0 13 a6.500 6.500 0 0 1 0 -13 Z M15.500 15.500 L20 20'),
    dice: L('M5 4 h14 a1 1 0 0 1 1 1 v14 a1 1 0 0 1 -1 1 h-14 a1 1 0 0 1 -1 -1 v-14 a1 1 0 0 1 1 -1 Z') + L('M8.500 8.500 h.01 M15.500 8.500 h.01 M12 12 h.01 M8.500 15.500 h.01 M15.500 15.500 h.01', 'stroke-width="2.6"'),
    eye: L('M2 12 c2.500 -4.500 6 -7 10 -7 s7.500 2.500 10 7 c-2.500 4.500 -6 7 -10 7 s-7.500 -2.500 -10 -7 Z M12 9 a3 3 0 1 1 0 6 a3 3 0 0 1 0 -6 Z'),
    eyeoff: L('M4 4 l16 16 M9.900 5.300 A9.600 9.600 0 0 1 12 5 c4 0 7.500 2.500 10 7 a14 14 0 0 1 -3.200 4 M14.100 14.100 A3 3 0 0 1 9.900 9.900 M6.300 6.800 A14 14 0 0 0 2 12 c2.500 4.500 6 7 10 7 a9.600 9.600 0 0 0 4 -.900'),
    info: L('M12 3 a9 9 0 1 1 0 18 a9 9 0 0 1 0 -18 Z M12 11 v6 M12 7.500 h.01'),
    reset: L('M4 12 a8 8 0 1 0 2.600 -5.900 M4 4 v5 h5'),
    stop: L('M6 6 h12 v12 h-12 Z'),
    copy: L('M9 9 h11 v11 h-11 Z M5 15 h-1 v-11 h11 v1'),
    link: L('M10 14 a4 4 0 0 0 5.700 0 l3 -3 a4 4 0 0 0 -5.700 -5.700 l-1 1 M14 10 a4 4 0 0 0 -5.700 0 l-3 3 a4 4 0 0 0 5.700 5.700 l1 -1'),
    sun: L('M12 8 a4 4 0 1 1 0 8 a4 4 0 0 1 0 -8 Z M12 3 v2 M12 19 v2 M3 12 h2 M19 12 h2'),
    moon: L('M20 14.500 A8.500 8.500 0 1 1 9.500 4 a7 7 0 0 0 10.500 10.500 Z'),
    save: L('M5 4 h11 l3 3 v13 h-14 Z M8 4 v5 h7 M8 20 v-6 h8 v6'),
    trash: L('M5 7 h14 M10 7 V4 h4 v3 M7 7 l1 13 h8 l1 -13'),
    // abilities and night events
    eggs: L('M12 3 c4 0 6.500 5 6.500 9.500 a6.500 6.500 0 0 1 -13 0 C5.500 8 8 3 12 3 Z'),
    self: L('M12 3 c4 0 6.500 5 6.500 9.500 a6.500 6.500 0 0 1 -13 0 C5.500 8 8 3 12 3 Z M12 9 v6 M9 12 h6'),
    steal: L('M12 3 c4 0 6.500 5 6.500 9.500 a6.500 6.500 0 0 1 -13 0 C5.500 8 8 3 12 3 Z M9 12 h6'),
    hug: L('M12 20 C5 15 3 11.500 3 8.500 A4.500 4.500 0 0 1 12 7 a4.500 4.500 0 0 1 9 1.500 c0 3 -2 6.500 -9 11.500 Z'),
    confuse: L('M9 9 a3 3 0 1 1 4.500 2.600 c-1 .6 -1.500 1.200 -1.500 2.400 M12 17.500 h.01 M12 3 a9 9 0 1 1 0 18 a9 9 0 0 1 0 -18 Z'),
    kill: L('M12 3 a8 8 0 0 0 -5 14.200 V20 h10 v-2.800 A8 8 0 0 0 12 3 Z M9 11 h.01 M15 11 h.01 M10 20 v-2 M14 20 v-2', ''),
    wink: L('M3 10 q3.500 3 7 0 M14 10.500 a2.200 2.200 0 1 0 4.400 0 a2.200 2.200 0 0 0 -4.400 0 M7 16 q5 4 10 0'),
    swap: L('M4 8 h14 l-3.500 -3.500 M20 16 h-14 l3.500 3.500'),
    redirect: L('M4 18 h5 a5 5 0 0 0 5 -5 v-7 M10 9.500 l4 -4 l4 4'),
    copycard: L('M9 9 h11 v11 h-11 Z M5 15 h-1 v-11 h11 v1'),
    info2: L('M10.500 4 a6.500 6.500 0 1 1 0 13 a6.500 6.500 0 0 1 0 -13 Z M15.500 15.500 L20 20'),
    track: L('M5 19 c0 -5 3 -5 3 -9 a2 2 0 1 0 -4 0 M12 19 c0 -5 3 -5 3 -9 a2 2 0 1 0 -4 0 M19 14 a2 2 0 1 0 -4 0', ''),
    twist: L('M12 3 l2.600 5.600 l6 .800 l-4.400 4.200 l1.100 6 l-5.300 -3 l-5.300 3 l1.100 -6 l-4.400 -4.200 l6 -.800 Z'),
    flower: L('M12 9.500 a2.500 2.500 0 1 1 0 5 a2.500 2.500 0 0 1 0 -5 Z M12 9.500 V4 M12 14.500 V20 M9.800 10.800 L5 8 M14.200 13.200 L19 16 M9.800 13.200 L5 16 M14.200 10.800 L19 8'),
  };
  const ALIAS = { info: 'info2', copy: 'copycard', give: 'eggs', lay: 'eggs' };
  function ui(name, size) {
    const d = UI[name] || UI[ALIAS[name]] || UI.info;
    return `<svg class="ui" viewBox="0 0 24 24" ${size ? `width="${size}" height="${size}"` : ''} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  }
  const badge = (kind) => ui(ALIAS[kind] && !['info', 'copy'].includes(kind) ? kind : (UI[ALIAS[kind]] ? ALIAS[kind] : kind));

  window.MeowIcons = { svg, bg, ui, badge, names: Object.keys(ART) };
})();
