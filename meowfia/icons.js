/* Card icons: one simple coloured picture per animal and flower, drawn as SVG.
   Background colour says the type (green Farm, red Meowfia, purple flower); the figure says which card. */
(function () {
  const BG = { farm: '#2f7d55', meowfia: '#b93350', flower: '#7a48a8', unknown: '#3a4063' };
  const OUT = 'stroke="rgba(10,12,30,.35)" stroke-width="1" stroke-linejoin="round"';
  const eye = (x, y, r = 1.7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#15172b"/><circle cx="${x + r * .35}" cy="${y - r * .35}" r="${r * .35}" fill="#fff"/>`;

  /* ---------- birds (side view, facing right) ---------- */
  function bird(o) {
    const long = o.legs === 'long', neck = o.neck || 0;
    const bx = 28, by = long ? 32 : 39;
    const hx = neck ? 44 : 43, hy = by - (neck >= 2 ? 21 : neck === 1 ? 16 : 11), hr = o.headR || (neck ? 6.5 : 8);
    const body = o.body, head = o.head || body, wing = o.wing || shade(body, -18);
    const ly = long ? 58 : 55, leg = o.leg || '#e3a04f';
    let g = '';
    // tail
    if (o.tail === 'fan') {
      const cols = o.fan || [wing];
      const n = o.fanN || 7;
      for (let i = 0; i < n; i++) {
        const a = (118 + i * (124 / (n - 1))) * Math.PI / 180;
        const len = o.fanLen || 21;
        const x = bx - 9 + Math.cos(a) * len, y = by - 3 - Math.sin(a) * len * .95;
        g += `<path d="M${bx - 9} ${by - 2} L${x} ${y}" stroke="${cols[i % cols.length]}" stroke-width="5.2" stroke-linecap="round"/>`;
        if (o.fanEye) g += `<circle cx="${x}" cy="${y}" r="2" fill="${o.fanEye}"/>`;
      }
    } else if (o.tail === 'long') {
      g += `<path d="M${bx - 12} ${by - 4} L${bx - 31} ${by + 5} L${bx - 29} ${by + 10} L${bx - 9} ${by + 5} Z" fill="${o.tailC || wing}" ${OUT}/>`;
    } else if (o.tail === 'lyre') {
      g += `<path d="M${bx - 10} ${by - 2} C${bx - 30} ${by - 4} ${bx - 30} ${by - 30} ${bx - 16} ${by - 30}" fill="none" stroke="${o.tailC || wing}" stroke-width="4" stroke-linecap="round"/>`;
      g += `<path d="M${bx - 10} ${by - 2} C${bx - 22} ${by - 8} ${bx - 20} ${by - 24} ${bx - 6} ${by - 27}" fill="none" stroke="${o.fan ? o.fan[0] : '#e9d9b0'}" stroke-width="3" stroke-linecap="round"/>`;
    } else {
      g += `<path d="M${bx - 12} ${by - 4} L${bx - 24} ${by - 2} L${bx - 22} ${by + 5} L${bx - 10} ${by + 5} Z" fill="${o.tailC || wing}" ${OUT}/>`;
    }
    // legs
    g += `<path d="M${bx - 3} ${by + 8} V${ly} h4 M${bx + 5} ${by + 8} V${ly} h4" fill="none" stroke="${leg}" stroke-width="2.2" stroke-linecap="round"/>`;
    // neck
    if (neck) g += `<path d="M${bx + 9} ${by - 4} Q${hx + 3} ${by - 8} ${hx} ${hy + 2}" fill="none" stroke="${o.neckC || body}" stroke-width="${neck >= 2 ? 6.5 : 8}" stroke-linecap="round"/>`;
    // body
    g += `<ellipse cx="${bx}" cy="${by}" rx="16" ry="11" fill="${body}" ${OUT}/>`;
    if (o.belly) g += `<path d="M${bx - 9} ${by + 6} Q${bx + 4} ${by + 14} ${bx + 15} ${by + 1} Q${bx + 6} ${by + 6} ${bx - 9} ${by + 6} Z" fill="${o.belly}"/>`;
    if (o.breast) g += `<ellipse cx="${bx + 9}" cy="${by + 1}" rx="6.5" ry="7.5" fill="${o.breast}"/>`;
    if (o.bars) for (let i = 0; i < 4; i++) g += `<path d="M${bx - 2 + i * 4} ${by + 4} v5" stroke="${o.bars}" stroke-width="1.4"/>`;
    g += `<ellipse cx="${bx - 3}" cy="${by - 1}" rx="10.5" ry="6.5" transform="rotate(-10 ${bx - 3} ${by - 1})" fill="${wing}" ${OUT}/>`;
    if (o.wingTip) g += `<path d="M${bx - 13} ${by - 1} l-6 4 l8 1 Z" fill="${o.wingTip}"/>`;
    if (o.spots) for (const [dx, dy] of [[-7, -2], [-2, 1], [2, -3]]) g += `<circle cx="${bx + dx}" cy="${by + dy}" r="1.2" fill="${o.spots}"/>`;
    // head
    g += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${head}" ${OUT}/>`;
    if (o.cap) g += `<path d="M${hx - hr} ${hy - .5} A${hr} ${hr} 0 0 1 ${hx + hr} ${hy - .5} Z" fill="${o.cap}"/>`;
    if (o.cheek) g += `<circle cx="${hx - 1}" cy="${hy + 2.5}" r="${hr * .42}" fill="${o.cheek}"/>`;
    if (o.stripe) g += `<path d="M${hx - hr + 1} ${hy - 1} H${hx + hr - 1}" stroke="${o.stripe}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (o.moustache) g += `<path d="M${hx + 2} ${hy + 1} v5" stroke="${o.moustache}" stroke-width="2.4" stroke-linecap="round"/>`;
    // beak
    const x = hx + hr - 1.2, y = hy + 1, bk = o.beak || '#f0b34a';
    const t = o.beakType || 'short';
    if (t === 'short') g += `<path d="M${x} ${y - 2.6} L${x + 7} ${y} L${x} ${y + 2.6} Z" fill="${bk}" ${OUT}/>`;
    if (t === 'tiny') g += `<path d="M${x} ${y - 1.8} L${x + 4.5} ${y} L${x} ${y + 1.8} Z" fill="${bk}" ${OUT}/>`;
    if (t === 'strong') g += `<path d="M${x} ${y - 3.2} L${x + 11} ${y + .5} L${x} ${y + 3} Z" fill="${bk}" ${OUT}/>`;
    if (t === 'long') g += `<path d="M${x} ${y - 2} L${x + 15} ${y + 1.5} L${x} ${y + 2.4} Z" fill="${bk}" ${OUT}/>`;
    if (t === 'hook') g += `<path d="M${x - .5} ${y - 3.2} Q${x + 9} ${y - 3.5} ${x + 7.5} ${y + 4.5} L${x + 4.5} ${y + 1.2} L${x - .5} ${y + 2.2} Z" fill="${bk}" ${OUT}/>`;
    if (t === 'curved') g += `<path d="M${x - 1} ${y - 3.4} Q${x + 8.5} ${y - 3.5} ${x + 5} ${y + 5.5} Q${x + 2.5} ${y + 2.5} ${x - 1} ${y + 2.2} Z" fill="${bk}" ${OUT}/>`;
    if (t === 'flat') g += `<rect x="${x - 1}" y="${y - 2}" width="10" height="4.6" rx="2.2" fill="${bk}" ${OUT}/>`;
    if (t === 'wide') g += `<path d="M${x - 1} ${y - 3.6} L${x + 13} ${y - .6} L${x + 13} ${y + 1} L${x - 1} ${y + 3.4} Z" fill="${bk}" ${OUT}/><path d="M${x - 1} ${y + .3} L${x + 13} ${y + .3}" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>`;
    if (t === 'pouch') g += `<path d="M${x - 1} ${y} Q${x + 7} ${y + 12} ${x + 17} ${y} Z" fill="${o.pouch || '#f2a53a'}" ${OUT}/><path d="M${x - 1} ${y - 2.2} L${x + 18} ${y - .4} L${x - 1} ${y + 1.2} Z" fill="${bk}" ${OUT}/>`;
    if (o.beakSpot) g += `<circle cx="${x + 5}" cy="${y + 1.4}" r="1.1" fill="${o.beakSpot}"/>`;
    if (o.wattle) g += `<path d="M${x - 1} ${y + 2.5} q3 6 0 8 q-3 -2 0 -8 Z" fill="${o.wattle}"/>`;
    // crest
    if (o.crest === 'comb') g += `<path d="M${hx - 4} ${hy - hr + 1} q1.5 -6 3 -1 q1.5 -7 3 -1 q1.5 -6 3 0 Z" fill="#e23b3b" ${OUT}/>`;
    if (o.crest === 'tuft') g += `<path d="M${hx - 2} ${hy - hr + 1} l-3 -6 M${hx} ${hy - hr} l0 -7 M${hx + 2} ${hy - hr + 1} l3 -6" stroke="${o.crestC || head}" stroke-width="1.8" stroke-linecap="round"/>`;
    if (o.crest === 'crown') { for (const d of [-3.5, 0, 3.5]) g += `<path d="M${hx + d * .5} ${hy - hr + 1} L${hx + d} ${hy - hr - 6}" stroke="${o.crestC || head}" stroke-width="1"/><circle cx="${hx + d}" cy="${hy - hr - 6.5}" r="1.4" fill="${o.crestC || head}"/>`; }
    if (o.crest === 'casque') g += `<path d="M${hx - 4} ${hy - hr + 2} Q${hx - 1} ${hy - hr - 9} ${hx + 5} ${hy - hr + 2} Z" fill="${o.crestC || '#8a6a45'}" ${OUT}/>`;
    if (o.crest === 'swept') g += `<path d="M${hx + 2} ${hy - hr + 1} Q${hx - 4} ${hy - hr - 8} ${hx - 10} ${hy - hr - 2} Q${hx - 5} ${hy - hr - 2} ${hx - 4} ${hy - hr + 3} Z" fill="${o.crestC || '#fbe3ea'}" ${OUT}/>`;
    // eye
    if (o.sleepy) g += `<path d="M${hx + 1} ${hy - 1} q2 2 4 0" fill="none" stroke="#15172b" stroke-width="1.3" stroke-linecap="round"/>`;
    else if (o.blind) g += `<path d="M${hx - hr + .5} ${hy - 3.2} L${hx + hr - .5} ${hy + .2} L${hx + hr - .5} ${hy - 3.4} L${hx - hr + .5} ${hy - 6} Z" fill="#20233d"/>`;
    else { if (o.eyeRing) g += `<circle cx="${hx + 2.6}" cy="${hy - 1.6}" r="3" fill="${o.eyeRing}"/>`; g += eye(hx + 2.6, hy - 1.6, o.fierce ? 1.5 : 1.7); }
    if (o.fierce) g += `<path d="M${hx - .5} ${hy - 4.2} l6 1.6" stroke="#15172b" stroke-width="1.3" stroke-linecap="round"/>`;
    if (o.extra) g += o.extra;
    if (o.scale) g = `<g transform="translate(${32 * (1 - o.scale)} ${40 * (1 - o.scale)}) scale(${o.scale})">${g}</g>`;
    return g;
  }

  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * pct / 100)));
    return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  const heart = (x, y, s = 1, c = '#ff6b8a') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 3 C-6 -3 -2 -7 0 -3 C2 -7 6 -3 0 3 Z" fill="${c}"/>`;
  const zzz = `<text x="50" y="16" font-size="11" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">z</text><text x="56" y="10" font-size="8" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">z</text>`;
  const sprig = `<path d="M52 27 q6 -1 9 -6" stroke="#6fbf5a" stroke-width="1.6" fill="none"/><ellipse cx="57" cy="23" rx="3" ry="1.5" transform="rotate(-40 57 23)" fill="#6fbf5a"/><ellipse cx="59.5" cy="24.5" rx="3" ry="1.5" transform="rotate(20 59.5 24.5)" fill="#6fbf5a"/>`;
  const arrows = (c = '#fff') => `<path d="M8 12 h12 l-3 -3 M20 12 l-3 3 M24 20 h-12 l3 -3 M12 20 l3 3" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  /* ---------- other creatures ---------- */
  function owl() {
    return `<ellipse cx="32" cy="38" rx="16" ry="18" fill="#9a6b3f" ${OUT}/><path d="M18 24 l4 -9 l6 7 Z M46 24 l-4 -9 l-6 7 Z" fill="#7d5330" ${OUT}/>
      <ellipse cx="32" cy="44" rx="10" ry="10" fill="#e8cfa6"/><path d="M26 42 v4 M32 41 v5 M38 42 v4 M29 48 v3 M35 48 v3" stroke="#9a6b3f" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="25" cy="30" r="7" fill="#fff5dc" ${OUT}/><circle cx="39" cy="30" r="7" fill="#fff5dc" ${OUT}/><circle cx="25" cy="30" r="3.2" fill="#15172b"/><circle cx="39" cy="30" r="3.2" fill="#15172b"/>
      <circle cx="26" cy="29" r="1" fill="#fff"/><circle cx="40" cy="29" r="1" fill="#fff"/><path d="M32 32 l-2.5 4.5 h5 Z" fill="#f0b34a" ${OUT}/>`;
  }
  function penguin() {
    return `<ellipse cx="32" cy="37" rx="15" ry="20" fill="#3d6fb5" ${OUT}/><ellipse cx="32" cy="41" rx="9.5" ry="14" fill="#f5f7fb"/>
      <path d="M17 34 q-6 8 -2 14 q4 -5 5 -12 Z M47 34 q6 8 2 14 q-4 -5 -5 -12 Z" fill="#345f9b" ${OUT}/>
      ${eye(27, 27)}${eye(37, 27)}<path d="M32 29 l-3.5 3 h7 Z" fill="#f0b34a" ${OUT}/><path d="M24 56 h6 M34 56 h6" stroke="#f0b34a" stroke-width="3" stroke-linecap="round"/>`;
  }
  function mosquito() {
    return `<ellipse cx="26" cy="24" rx="12" ry="5" transform="rotate(-28 26 24)" fill="rgba(255,255,255,.65)" ${OUT}/><ellipse cx="38" cy="22" rx="12" ry="5" transform="rotate(20 38 22)" fill="rgba(255,255,255,.65)" ${OUT}/>
      <path d="M26 38 l-9 12 M30 40 l-3 14 M36 40 l5 13 M40 37 l10 10" stroke="#3a3350" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="31" cy="36" rx="11" ry="5.5" transform="rotate(14 31 36)" fill="#6d6485" ${OUT}/><path d="M26 32 l1 8 M31 33 l1 8 M36 34 l1 8" stroke="#3a3350" stroke-width="1.3"/>
      <circle cx="44" cy="39" r="5" fill="#4b4263" ${OUT}/>${eye(45.5, 38, 1.5)}<path d="M48 41 l11 6" stroke="#e23b3b" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  function wasp() {
    return `<ellipse cx="28" cy="22" rx="11" ry="5" transform="rotate(-25 28 22)" fill="rgba(255,255,255,.7)" ${OUT}/><ellipse cx="38" cy="21" rx="10" ry="4.5" transform="rotate(18 38 21)" fill="rgba(255,255,255,.7)" ${OUT}/>
      <ellipse cx="24" cy="38" rx="13" ry="8" fill="#f6c63a" ${OUT}/><path d="M18 31.5 v13 M24 30 v16 M30 31 v14" stroke="#20233d" stroke-width="3"/><path d="M11 38 l-7 3 l7 1 Z" fill="#20233d"/>
      <circle cx="42" cy="36" r="7.5" fill="#f6c63a" ${OUT}/>${eye(44.5, 34.5)}<path d="M44 29 q4 -8 9 -7 M41 29 q0 -8 5 -11" fill="none" stroke="#20233d" stroke-width="1.5" stroke-linecap="round"/>`;
  }
  function spider() {
    let legs = '';
    for (const s of [-1, 1]) for (const [dy, ex, ey] of [[-5, 22, -14], [-2, 26, -4], [2, 26, 7], [5, 21, 16]])
      legs += `<path d="M${32 + s * 7} ${36 + dy} Q${32 + s * 17} ${36 + dy + ey * .2 - 8} ${32 + s * ex} ${36 + ey}" fill="none" stroke="#20233d" stroke-width="2.2" stroke-linecap="round"/>`;
    return `<path d="M32 4 V26" stroke="rgba(255,255,255,.7)" stroke-width="1.2"/>${legs}<ellipse cx="32" cy="40" rx="11" ry="12" fill="#3a3350" ${OUT}/><circle cx="32" cy="28" r="7" fill="#4b4263" ${OUT}/>
      <path d="M32 34 l-4 6 h8 Z" fill="#e23b3b"/>${eye(29.5, 27, 1.4)}${eye(34.5, 27, 1.4)}`;
  }
  function face(o) {  // a front-facing head: cats and other mammals
    let g = '';
    const c = o.fur, cx = 32, cy = 36;
    if (o.mane) g += `<circle cx="${cx}" cy="${cy}" r="23" fill="${o.mane}" ${OUT}/>`;
    if (o.fluff) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g += `<circle cx="${cx + Math.cos(a) * 17}" cy="${cy + Math.sin(a) * 15}" r="6.5" fill="${o.fluff}"/>`; } }
    // ears
    const ear = o.ears || 'cat', ec = o.earC || c, inner = o.earIn || '#f4a8b8';
    if (ear === 'cat') g += `<path d="M${cx - 17} ${cy - 6} L${cx - 15} ${cy - 25} L${cx - 3} ${cy - 15} Z M${cx + 17} ${cy - 6} L${cx + 15} ${cy - 25} L${cx + 3} ${cy - 15} Z" fill="${ec}" ${OUT}/><path d="M${cx - 13.5} ${cy - 12} L${cx - 13} ${cy - 20} L${cx - 7} ${cy - 15} Z M${cx + 13.5} ${cy - 12} L${cx + 13} ${cy - 20} L${cx + 7} ${cy - 15} Z" fill="${inner}"/>`;
    if (ear === 'big') g += `<path d="M${cx - 16} ${cy - 4} L${cx - 22} ${cy - 28} L${cx - 2} ${cy - 15} Z M${cx + 16} ${cy - 4} L${cx + 22} ${cy - 28} L${cx + 2} ${cy - 15} Z" fill="${ec}" ${OUT}/><path d="M${cx - 15} ${cy - 11} L${cx - 18} ${cy - 22} L${cx - 7} ${cy - 15} Z M${cx + 15} ${cy - 11} L${cx + 18} ${cy - 22} L${cx + 7} ${cy - 15} Z" fill="${inner}"/>`;
    if (ear === 'round') g += `<circle cx="${cx - 16}" cy="${cy - 14}" r="${o.earR || 8}" fill="${ec}" ${OUT}/><circle cx="${cx + 16}" cy="${cy - 14}" r="${o.earR || 8}" fill="${ec}" ${OUT}/><circle cx="${cx - 16}" cy="${cy - 14}" r="${(o.earR || 8) * .5}" fill="${inner}"/><circle cx="${cx + 16}" cy="${cy - 14}" r="${(o.earR || 8) * .5}" fill="${inner}"/>`;
    if (ear === 'long') g += `<ellipse cx="${cx - 8}" cy="${cy - 22}" rx="5" ry="14" transform="rotate(-8 ${cx - 8} ${cy - 22})" fill="${ec}" ${OUT}/><ellipse cx="${cx + 8}" cy="${cy - 22}" rx="5" ry="14" transform="rotate(8 ${cx + 8} ${cy - 22})" fill="${ec}" ${OUT}/><ellipse cx="${cx - 8}" cy="${cy - 21}" rx="2.2" ry="9" transform="rotate(-8 ${cx - 8} ${cy - 21})" fill="${inner}"/><ellipse cx="${cx + 8}" cy="${cy - 21}" rx="2.2" ry="9" transform="rotate(8 ${cx + 8} ${cy - 21})" fill="${inner}"/>`;
    if (ear === 'flop') g += `<ellipse cx="${cx - 17}" cy="${cy - 2}" rx="6" ry="12" transform="rotate(14 ${cx - 17} ${cy - 2})" fill="${ec}" ${OUT}/><ellipse cx="${cx + 17}" cy="${cy - 2}" rx="6" ry="12" transform="rotate(-14 ${cx + 17} ${cy - 2})" fill="${ec}" ${OUT}/>`;
    if (ear === 'horse') g += `<path d="M${cx - 12} ${cy - 12} L${cx - 13} ${cy - 27} L${cx - 4} ${cy - 16} Z M${cx + 12} ${cy - 12} L${cx + 13} ${cy - 27} L${cx + 4} ${cy - 16} Z" fill="${ec}" ${OUT}/>`;
    // head
    const rx = o.rx || 18, ry = o.ry || 16;
    g += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" ${OUT}/>`;
    if (o.points) g += `<ellipse cx="${cx}" cy="${cy + 3}" rx="${rx * .62}" ry="${ry * .62}" fill="${o.points}"/>`;
    if (o.muzzle) g += `<ellipse cx="${cx}" cy="${cy + 6}" rx="${o.muzzleR || 9}" ry="${(o.muzzleR || 9) * .78}" fill="${o.muzzle}"/>`;
    if (o.stripes) g += `<path d="M${cx} ${cy - ry + 1} v6 M${cx - 5} ${cy - ry + 2} l1 5 M${cx + 5} ${cy - ry + 2} l-1 5 M${cx - rx + 1} ${cy - 1} h5 M${cx - rx + 2} ${cy + 4} h5 M${cx + rx - 1} ${cy - 1} h-5 M${cx + rx - 2} ${cy + 4} h-5" stroke="${o.stripes}" stroke-width="1.8" stroke-linecap="round"/>`;
    if (o.wrinkles) g += `<path d="M${cx - 6} ${cy - ry + 4} q6 -3 12 0 M${cx - 7} ${cy - ry + 8} q7 -3 14 0" fill="none" stroke="${o.wrinkles}" stroke-width="1.2" stroke-linecap="round"/>`;
    if (o.mask) g += `<path d="M${cx - rx + 1} ${cy - 6} Q${cx} ${cy - 10} ${cx + rx - 1} ${cy - 6} L${cx + rx - 2} ${cy + 1} Q${cx} ${cy - 2} ${cx - rx + 2} ${cy + 1} Z" fill="${o.mask}"/>`;
    if (o.blaze) g += `<path d="M${cx} ${cy - ry + 2} q4 9 0 20 q-4 -11 0 -20 Z" fill="${o.blaze}"/>`;
    // eyes
    const ex = o.eyeX || 7, ey = cy - (o.eyeY === undefined ? 3 : o.eyeY), ec2 = o.eye || '#f6d24a';
    if (o.eyeStyle === 'dot') g += eye(cx - ex, ey, 2) + eye(cx + ex, ey, 2);
    else if (o.eyeStyle === 'bulge') g += `<circle cx="${cx - 9}" cy="${cy - 13}" r="7" fill="${c}" ${OUT}/><circle cx="${cx + 9}" cy="${cy - 13}" r="7" fill="${c}" ${OUT}/><circle cx="${cx - 9}" cy="${cy - 13}" r="4.2" fill="#fff"/><circle cx="${cx + 9}" cy="${cy - 13}" r="4.2" fill="#fff"/><circle cx="${cx - 9}" cy="${cy - 13}" r="2" fill="#15172b"/><circle cx="${cx + 9}" cy="${cy - 13}" r="2" fill="#15172b"/>`;
    else g += `<ellipse cx="${cx - ex}" cy="${ey}" rx="3.6" ry="3.2" fill="${ec2}" ${OUT}/><ellipse cx="${cx + ex}" cy="${ey}" rx="3.6" ry="3.2" fill="${ec2}" ${OUT}/><ellipse cx="${cx - ex}" cy="${ey}" rx="1.1" ry="2.6" fill="#15172b"/><ellipse cx="${cx + ex}" cy="${ey}" rx="1.1" ry="2.6" fill="#15172b"/>`;
    // nose and mouth
    const ny = cy + (o.noseY === undefined ? 4 : o.noseY);
    if (o.nose === 'big') g += `<ellipse cx="${cx}" cy="${ny}" rx="4.5" ry="6" fill="${o.noseC || '#2b2d42'}" ${OUT}/>`;
    else if (o.nose === 'none') g += '';
    else g += `<path d="M${cx - 2.4} ${ny} h4.8 l-2.4 2.8 Z" fill="${o.noseC || '#f08a9c'}"/>`;
    if (o.mouth !== false) g += `<path d="M${cx} ${ny + 2.6} q-3 3.5 -6 1 M${cx} ${ny + 2.6} q3 3.5 6 1" fill="none" stroke="#2b2d42" stroke-width="1.1" stroke-linecap="round"/>`;
    if (o.smile) g += `<path d="M${cx - 6} ${ny + 3} q6 6 12 0" fill="none" stroke="#2b2d42" stroke-width="1.4" stroke-linecap="round"/>`;
    if (o.whiskers !== false && (o.ears || 'cat') === 'cat' || o.whiskers === true) g += `<path d="M${cx - 8} ${ny + 1.5} l-10 -2 M${cx - 8} ${ny + 3.5} l-10 2 M${cx + 8} ${ny + 1.5} l10 -2 M${cx + 8} ${ny + 3.5} l10 2" stroke="rgba(255,255,255,.85)" stroke-width=".9" stroke-linecap="round"/>`;
    if (o.extra) g += o.extra;
    return g;
  }
  const crown = `<path d="M22 16 l3 -9 l4 6 l3 -8 l3 8 l4 -6 l3 9 Z" fill="#f5c33b" ${OUT}/><circle cx="25" cy="7" r="1.5" fill="#f5c33b"/><circle cx="32" cy="5" r="1.5" fill="#f5c33b"/><circle cx="39" cy="7" r="1.5" fill="#f5c33b"/>`;
  function sheep() {
    return face({ fur: '#3b3a4a', fluff: '#f4f1e8', rx: 11, ry: 13, ears: 'flop', earC: '#3b3a4a', eyeStyle: 'dot', eyeX: 5, nose: 'none', mouth: false, whiskers: false,
      extra: `<circle cx="26" cy="23" r="6" fill="#f4f1e8"/><circle cx="32" cy="21" r="6.5" fill="#f4f1e8"/><circle cx="38" cy="23" r="6" fill="#f4f1e8"/><path d="M29 44 q3 2 6 0" fill="none" stroke="#f4a8b8" stroke-width="1.6" stroke-linecap="round"/>` });
  }
  function frog() {
    return face({ fur: '#57b947', ears: 'none', rx: 19, ry: 14, eyeStyle: 'bulge', nose: 'none', mouth: false, whiskers: false,
      extra: `<path d="M19 40 q13 9 26 0" fill="none" stroke="#1f5a22" stroke-width="1.8" stroke-linecap="round"/><circle cx="28" cy="34" r=".9" fill="#1f5a22"/><circle cx="36" cy="34" r=".9" fill="#1f5a22"/><ellipse cx="32" cy="46" rx="9" ry="3" fill="#bfe6a3"/>` });
  }
  function fish() {
    return `<path d="M12 34 l-9 -9 v18 Z" fill="#f47a20" ${OUT}/><ellipse cx="32" cy="34" rx="21" ry="13" fill="#f47a20" ${OUT}/>
      <path d="M22 22.5 q5 11 0 23 q-5 -11 0 -23 Z M36 21.5 q5 12 0 25 q-5 -12 0 -25 Z" fill="#fff" stroke="#20233d" stroke-width="1.2"/>
      <path d="M28 21 q5 -8 12 -2 Z M28 47 q4 6 10 2 Z" fill="#f47a20" ${OUT}/>${eye(46, 31, 2.2)}<path d="M50 38 q2 1 3 -1" fill="none" stroke="#20233d" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  function gecko() {
    return `<path d="M30 40 Q22 54 34 56 Q44 57 42 48" fill="none" stroke="#7bc96a" stroke-width="5" stroke-linecap="round"/>
      <path d="M24 26 l-9 -5 M40 26 l9 -5 M25 37 l-10 5 M39 37 l10 5" stroke="#7bc96a" stroke-width="3.6" stroke-linecap="round"/>
      <circle cx="14" cy="20" r="2.6" fill="#a6e08f"/><circle cx="50" cy="20" r="2.6" fill="#a6e08f"/><circle cx="14" cy="43" r="2.6" fill="#a6e08f"/><circle cx="50" cy="43" r="2.6" fill="#a6e08f"/>
      <ellipse cx="32" cy="31" rx="8.5" ry="13" fill="#7bc96a" ${OUT}/><ellipse cx="32" cy="15" rx="8" ry="7" fill="#8ad479" ${OUT}/>
      <circle cx="29" cy="31" r="1.4" fill="#3f8f3a"/><circle cx="35" cy="27" r="1.4" fill="#3f8f3a"/><circle cx="33" cy="36" r="1.4" fill="#3f8f3a"/>${eye(28, 13, 1.8)}${eye(36, 13, 1.8)}`;
  }

  /* ---------- flowers ---------- */
  function flower(o) {
    const cx = 32, cy = o.cy || 30, n = o.n || 6;
    let g = '';
    if (o.stem !== false) g += `<path d="M32 ${cy + 6} V59" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/><path d="M32 50 q-9 -1 -11 -8 q9 0 11 8 Z" fill="#57b85f"/>`;
    const layer = (count, len, w, col, off, dist) => {
      let s = '';
      for (let i = 0; i < count; i++) {
        const a = off + i * 360 / count;
        s += o.pointed
          ? `<path transform="rotate(${a} ${cx} ${cy})" d="M${cx} ${cy - dist - len} Q${cx + w} ${cy - dist - len * .45} ${cx} ${cy - dist + 2} Q${cx - w} ${cy - dist - len * .45} ${cx} ${cy - dist - len} Z" fill="${col}" ${OUT}/>`
          : `<ellipse transform="rotate(${a} ${cx} ${cy})" cx="${cx}" cy="${cy - dist - len / 2}" rx="${w}" ry="${len / 2}" fill="${col}" ${OUT}/>`;
      }
      return s;
    };
    if (o.outer) g += layer(o.outerN || n, o.len + 3, o.w, o.outer, 180 / n, 2);
    g += layer(n, o.len, o.w, o.petal, 0, 2);
    if (o.inner) g += layer(o.innerN || n, o.len * .6, o.w * .7, o.inner, 180 / n, 1);
    if (o.dots) for (let i = 0; i < n; i++) { const a = (i * 360 / n - 90) * Math.PI / 180; g += `<circle cx="${cx + Math.cos(a) * (o.len * .55 + 3)}" cy="${cy + Math.sin(a) * (o.len * .55 + 3)}" r="1.1" fill="${o.dots}"/>`; }
    g += `<circle cx="${cx}" cy="${cy}" r="${o.centreR || 5.5}" fill="${o.centre || '#f5c33b'}" ${OUT}/>`;
    if (o.seeds) for (const [dx, dy] of [[-2, -1], [2, -1], [0, 2], [-2.5, 2.5], [2.5, 2.5]]) g += `<circle cx="${cx + dx}" cy="${cy + dy}" r=".8" fill="${o.seeds}"/>`;
    if (o.extra) g += o.extra;
    return g;
  }
  function bells(col, n, o = {}) {
    let g = `<path d="M${o.x || 20} 58 Q${o.x || 20} 20 44 10" fill="none" stroke="#3f9a4d" stroke-width="2.6" stroke-linecap="round"/>`;
    const spots = [[40, 14], [30, 24], [24, 37], [42, 30]].slice(0, n);
    for (const [x, y] of spots) {
      g += `<path d="M${x - 6} ${y + 11} Q${x - 7} ${y - 2} ${x} ${y - 3} Q${x + 7} ${y - 2} ${x + 6} ${y + 11} q-2 -2 -4 0 q-2 -2 -4 0 q-2 -2 -4 0 Z" fill="${col}" ${OUT}/>`;
      if (o.spot) g += `<circle cx="${x - 1.5}" cy="${y + 5}" r="1" fill="${o.spot}"/><circle cx="${x + 2}" cy="${y + 3}" r="1" fill="${o.spot}"/>`;
    }
    return g;
  }
  const stemOnly = `<path d="M32 36 V59" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/><path d="M32 50 q-9 -1 -11 -8 q9 0 11 8 Z" fill="#57b85f"/>`;

  const DRAW = {
    /* Farm birds */
    'Pigeon': () => bird({ body: '#a7b3c4', wing: '#7f8ca0', head: '#8794a8', cheek: '#6fc7a0', beak: '#e9b7a2', leg: '#e58a8a' }),
    'Lazy Pigeon': () => bird({ body: '#a7b3c4', wing: '#7f8ca0', head: '#8794a8', beak: '#e9b7a2', leg: '#e58a8a', sleepy: true, extra: zzz }),
    'Hawk': () => bird({ body: '#96602f', wing: '#6e4420', belly: '#f1dfbd', beakType: 'hook', beak: '#f5c33b', fierce: true, tail: 'long', tailC: '#6e4420' }),
    'Blind Hawk': () => bird({ body: '#96602f', wing: '#6e4420', belly: '#f1dfbd', beakType: 'hook', beak: '#f5c33b', blind: true, tail: 'long', tailC: '#6e4420' }),
    'Black Swan': () => bird({ body: '#22232f', wing: '#34364a', neck: 2, beak: '#e23b3b', beakType: 'flat', leg: '#55586e' }),
    'Ugly Duckling': () => bird({ body: '#9b9486', wing: '#7f786b', beak: '#c9b46a', beakType: 'flat', crest: 'tuft', crestC: '#7f786b', scale: .82, leg: '#b89a4f' }),
    'Kookaburra': () => bird({ body: '#f2e6cf', wing: '#7a5a3c', stripe: '#5b4028', beakType: 'wide', beak: '#3d3530', tail: 'long', tailC: '#a8683a', spots: '#58a6d6', headR: 9 }),
    'Tit': () => bird({ body: '#f4d24a', wing: '#5b8fd6', head: '#fafafa', cap: '#2f6fd0', beakType: 'tiny', beak: '#3d3530', scale: .84, leg: '#7d8aa0' }),
    'Eagle': () => bird({ body: '#4f3520', wing: '#3a2616', head: '#f7f4ec', tailC: '#f7f4ec', beakType: 'hook', beak: '#f5c33b', fierce: true }),
    'Falcon': () => bird({ body: '#5f7691', wing: '#465a72', belly: '#f1e6cf', moustache: '#2b3a4f', beakType: 'hook', beak: '#f5c33b', bars: '#465a72', tail: 'long', tailC: '#465a72' }),
    'Pelican': () => bird({ body: '#fbfbf6', wing: '#d9dbd2', neck: 1, beakType: 'pouch', beak: '#f7c948', pouch: '#f29a2e', wingTip: '#3b3f52', leg: '#f29a2e' }),
    'Turkey': () => bird({ body: '#7a4a2a', wing: '#5d3720', head: '#6f9bc4', tail: 'fan', fan: ['#a5673a', '#e9d2a0', '#7a4a2a'], wattle: '#e23b3b', beak: '#f0d28a' }),
    'Owl': owl,
    'Mosquito': mosquito,
    'Seagull': () => bird({ body: '#fbfbfb', wing: '#aeb7c4', wingTip: '#2b2d42', beak: '#f7c948', beakType: 'strong', beakSpot: '#e23b3b', leg: '#f29a2e' }),
    'Goose': () => bird({ body: '#f4f1e8', wing: '#c9c2b0', neck: 1, beak: '#f28a2e', beakType: 'flat', leg: '#f28a2e' }),
    'Chicken': () => bird({ body: '#fbf6ea', wing: '#e6dcc4', crest: 'comb', wattle: '#e23b3b', beak: '#f5c33b', leg: '#f5c33b' }),
    'Crane': () => bird({ body: '#c9d0d9', wing: '#9aa4b2', neck: 2, legs: 'long', beakType: 'long', beak: '#d9c27a', cap: '#e23b3b', leg: '#55586e', headR: 5.5 }),
    'Cuckoo': () => bird({ body: '#8d98a8', wing: '#6c7788', belly: '#f1f1f1', bars: '#55606f', eyeRing: '#f5c33b', tail: 'long', beakType: 'tiny', beak: '#3d3530' }),
    'Emu': () => bird({ body: '#6b5843', wing: '#55452f', neck: 2, neckC: '#6fa3c9', head: '#4a5f73', legs: 'long', beak: '#3d3530', leg: '#5a5248', crest: 'tuft', crestC: '#3d3530', headR: 5.5 }),
    'Crow': () => bird({ body: '#23242f', wing: '#34364a', beakType: 'strong', beak: '#15161d', leg: '#15161d', eyeRing: '#c9d0e6' }),
    'Magpie': () => bird({ body: '#1f2029', wing: '#fbfbfb', belly: '#fbfbfb', tail: 'long', tailC: '#2a4d8f', beakType: 'strong', beak: '#15161d', leg: '#15161d', eyeRing: '#c9d0e6' }),
    'Galah': () => bird({ body: '#ee8fab', wing: '#aab2bf', head: '#f4a9bf', crest: 'swept', beakType: 'curved', beak: '#f1e6d6', leg: '#8d93a1' }),
    'Rainbow Lorikeet': () => bird({ body: '#3fae4d', wing: '#2f8f3f', head: '#3a5fd0', breast: '#f58a2e', belly: '#f5d23b', beakType: 'curved', beak: '#e23b3b', tail: 'long', tailC: '#2f8f3f', leg: '#8d93a1' }),
    'Lovebird': () => bird({ body: '#5fc257', wing: '#3f9f3f', head: '#f58a6b', beakType: 'curved', beak: '#e23b3b', scale: .86, extra: heart(14, 14, 1.25) }),
    'Lyrebird': () => bird({ body: '#8a6a4a', wing: '#6b5038', tail: 'lyre', tailC: '#b98a55', fan: ['#f1e0b8'], beak: '#3d3530', beakType: 'tiny' }),
    'Dove': () => bird({ body: '#ffffff', wing: '#e4e8f0', beak: '#f2b7a8', beakType: 'tiny', leg: '#e58a8a', extra: sprig }),
    'Peacock': () => bird({ body: '#2364c9', wing: '#1f8f7a', tail: 'fan', fan: ['#2fae6a', '#27955c'], fanEye: '#f5c33b', fanLen: 23, fanN: 8, crest: 'crown', crestC: '#7fd0f0', beak: '#d9dbe6', beakType: 'tiny', neck: 1 }),
    'Cassowary': () => bird({ body: '#1d1e27', wing: '#2b2d3b', neck: 2, neckC: '#2f7fe0', head: '#2f7fe0', crest: 'casque', wattle: '#e23b3b', legs: 'long', beak: '#3d3530', leg: '#6b6e7d', headR: 5.5 }),
    'Fairy Penguin': penguin,
    'Vogelkop': () => `<path d="M8 40 A24 22 0 0 1 56 40 Q32 54 8 40 Z" fill="#15161d" ${OUT}/><path d="M17 43 Q32 51 47 43 Q32 34 17 43 Z" fill="#2fd0c8"/><circle cx="22" cy="31" r="3.4" fill="#2fd0c8"/><circle cx="42" cy="31" r="3.4" fill="#2fd0c8"/><circle cx="22" cy="31" r="1.3" fill="#15161d"/><circle cx="42" cy="31" r="1.3" fill="#15161d"/><path d="M27 55 v4 M37 55 v4" stroke="#6b6e7d" stroke-width="2.4" stroke-linecap="round"/>`,
    /* Farm: other animals */
    'Sheep': sheep,
    'Frog': frog,
    'Switcheroo': () => face({ fur: '#c98f5a', ears: 'long', earC: '#b57c48', muzzle: '#f1dcc0', eyeStyle: 'dot', noseC: '#3d3530', rx: 14, ry: 14, whiskers: false, extra: arrows('#fff') }),
    'Koala': () => face({ fur: '#a3a9b3', ears: 'round', earR: 10, earIn: '#e6e9ee', eyeStyle: 'dot', nose: 'big', mouth: false, noseY: 3, eyeX: 8, whiskers: false }),
    'Clownfish': fish,
    'Brumby': () => face({ fur: '#8a5a33', ears: 'horse', rx: 12, ry: 17, blaze: '#fbf3e3', eyeStyle: 'dot', eyeX: 8, eyeY: 5, nose: 'none', mouth: false, whiskers: false, muzzle: '#6b4423', muzzleR: 9, extra: `<circle cx="28.5" cy="44" r="1.4" fill="#2b2d42"/><circle cx="35.5" cy="44" r="1.4" fill="#2b2d42"/><path d="M32 12 q-9 4 -8 16 q3 -8 8 -9 q5 1 8 9 q1 -12 -8 -16 Z" fill="#3d2814"/>` }),
    'Sheepdog': () => face({ fur: '#f4f1e8', ears: 'flop', earC: '#8d93a1', mask: '#8d93a1', muzzle: '#ffffff', eyeStyle: 'dot', nose: 'big', noseC: '#2b2d42', noseY: 2, mouth: false, whiskers: false, extra: `<path d="M27 47 q5 5 10 0 q-2 6 -5 6 q-3 0 -5 -6 Z" fill="#f08a9c"/>` }),
    'Rabbit': () => face({ fur: '#f1e9df', ears: 'long', rx: 14, ry: 13, eyeStyle: 'dot', eyeX: 6, whiskers: true, extra: `<rect x="30" y="45" width="4" height="4.5" rx="1" fill="#fff" stroke="#2b2d42" stroke-width=".7"/>` }),
    'Wasp': wasp,
    'Gecko': gecko,
    'Quokka': () => face({ fur: '#a9794d', ears: 'round', earR: 6.5, earIn: '#d9a878', muzzle: '#e6c8a0', eyeStyle: 'dot', eyeX: 7, noseC: '#3d3530', mouth: false, smile: true, whiskers: false }),
    'Spider': spider,
    /* Meowfia: cats */
    'House Cat': () => face({ fur: '#f29a3b', stripes: '#b8641c', muzzle: '#fbe6c8', eye: '#8fd65a' }),
    'Mouser': () => face({ fur: '#8d93a1', stripes: '#5f6573', muzzle: '#d9dde6', eye: '#f6d24a', extra: `<path d="M27 46 q5 3 10 0" stroke="#f4a8b8" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M37 46 q8 6 12 -2" fill="none" stroke="#c9a8b0" stroke-width="1.4" stroke-linecap="round"/>` }),
    'Sphinx': () => face({ fur: '#e8b7a8', ears: 'big', earC: '#e8b7a8', earIn: '#f6d0c6', wrinkles: '#b98a7c', eye: '#58c9e0', rx: 15, ry: 15, whiskers: false }),
    'Floofer': () => face({ fur: '#fbfbfb', fluff: '#eef0f6', eye: '#58a6e0', earC: '#eef0f6', rx: 15, ry: 14 }),
    'Cat Burgler': () => face({ fur: '#2b2d3b', mask: '#0d0e16', eye: '#f6d24a', muzzle: '#4a4d61', noseC: '#f08a9c', extra: `<path d="M13 21 Q32 6 51 21 Q32 15 13 21 Z" fill="#0d0e16"/>` }),
    'Maine Coon': () => face({ fur: '#a8683a', mane: '#7a4a26', stripes: '#5d3720', muzzle: '#f1dcc0', eye: '#f6b93b', rx: 16, ry: 15, extra: `<path d="M15 12 l-2 -7 M49 12 l2 -7" stroke="#7a4a26" stroke-width="2" stroke-linecap="round"/>` }),
    'Top Cat': () => face({ fur: '#f5c95a', muzzle: '#fff3d0', eye: '#58c96a', cy: 38, extra: crown }),
    'Rag Doll': () => face({ fur: '#f6efe2', points: '#7a6050', earC: '#7a6050', eye: '#4a9de8', noseC: '#3d3530' }),
    'Copycat': () => `<g transform="translate(-9 -5) scale(.82)" opacity=".55">${face({ fur: '#c9cedb', eye: '#fff', whiskers: false })}</g><g transform="translate(13 9) scale(.82)">${face({ fur: '#9aa0b5', stripes: '#6b7088', muzzle: '#dfe2ec', eye: '#f6d24a' })}</g>`,
    /* Flowers */
    'Sunflower': () => flower({ n: 14, len: 13, w: 3.2, petal: '#f7c62f', centre: '#6b4423', centreR: 7.5, seeds: '#3d2814' }),
    'Bookworm': () => `<path d="M10 22 Q21 17 32 22 V52 Q21 47 10 52 Z" fill="#fbf3e3" ${OUT}/><path d="M54 22 Q43 17 32 22 V52 Q43 47 54 52 Z" fill="#f1e6cf" ${OUT}/><path d="M15 28 h12 M15 33 h12 M15 38 h9" stroke="#b8a888" stroke-width="1.5" stroke-linecap="round"/><path d="M38 44 q2 -9 7 -8 q5 1 3 -8 q-1 -6 4 -8" fill="none" stroke="#7bc96a" stroke-width="5.5" stroke-linecap="round"/>${eye(51.5, 20, 1.5)}`,
    'Pitcher Plant': () => `<path d="M32 59 V48" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/><path d="M22 20 Q18 44 32 50 Q46 44 42 20 Z" fill="#8fbf4a" ${OUT}/><path d="M24 26 Q22 42 32 46" fill="none" stroke="#b33a5a" stroke-width="2"/><path d="M40 26 Q42 42 32 46" fill="none" stroke="#b33a5a" stroke-width="2"/><ellipse cx="32" cy="20" rx="10" ry="4" fill="#5d2a3a" ${OUT}/><path d="M42 19 Q50 6 30 8 Q40 11 38 17 Z" fill="#b33a5a" ${OUT}/>`,
    'Cactus Flower': () => `<rect x="24" y="24" width="16" height="32" rx="8" fill="#4fa85a" ${OUT}/><path d="M24 40 h-5 a4 4 0 0 1 -4 -4 v-6 M40 44 h5 a4 4 0 0 0 4 -4 v-8" fill="none" stroke="#4fa85a" stroke-width="6" stroke-linecap="round"/><path d="M29 30 v20 M35 30 v20" stroke="#3a8a46" stroke-width="1.2"/>${flower({ n: 7, len: 7, w: 3, petal: '#f25a8a', centre: '#f7d24a', centreR: 3, cy: 18, stem: false })}`,
    'Lotus': () => `<ellipse cx="32" cy="50" rx="24" ry="6" fill="#3f9a6a" ${OUT}/><path d="M32 12 Q42 30 32 46 Q22 30 32 12 Z" fill="#f7a8c8" ${OUT}/><path d="M17 20 Q32 30 31 46 Q16 40 17 20 Z M47 20 Q32 30 33 46 Q48 40 47 20 Z" fill="#f28ab5" ${OUT}/><path d="M6 32 Q24 34 30 46 Q12 46 6 32 Z M58 32 Q40 34 34 46 Q52 46 58 32 Z" fill="#e86aa0" ${OUT}/>`,
    'Corpse Flower': () => `<path d="M12 34 Q20 56 32 56 Q44 56 52 34 Q42 40 38 30 Q32 40 26 30 Q22 40 12 34 Z" fill="#7a2338" ${OUT}/><path d="M18 38 Q24 50 32 50 Q40 50 46 38" fill="none" stroke="#a83a55" stroke-width="2"/><path d="M28 44 Q26 14 32 6 Q38 14 36 44 Z" fill="#d9c98a" ${OUT}/>`,
    'Banksia': () => `<path d="M32 59 V44" stroke="#7a5a3c" stroke-width="3.4" stroke-linecap="round"/><path d="M30 52 l-12 -5 l3 5 Z M34 49 l12 -5 l-3 6 Z" fill="#4f8a4a" ${OUT}/><rect x="22" y="8" width="20" height="38" rx="10" fill="#f2a53a" ${OUT}/><path d="M24 16 h16 M23 22 h18 M23 28 h18 M23 34 h18 M24 40 h16" stroke="#c9741c" stroke-width="1.6" stroke-dasharray="1.5 2.5"/>`,
    'Flannel Flower': () => flower({ n: 10, len: 15, w: 3.6, petal: '#f7f4e8', pointed: true, centre: '#b8c98a', centreR: 6, dots: '#9ab86a' }),
    'Marigold': () => flower({ n: 10, len: 11, w: 5, petal: '#f58a1f', inner: '#f7b02f', innerN: 8, outer: '#e06a12', centre: '#f7c62f', centreR: 4 }),
    'Tumbleweed': () => `<circle cx="32" cy="36" r="19" fill="none" stroke="#c9a56a" stroke-width="2.2"/><path d="M15 32 Q30 18 49 30 M14 40 Q32 56 50 40 M22 22 Q38 34 26 52 M42 21 Q26 36 40 52 M18 46 Q34 30 48 46 M20 28 Q34 46 46 26" fill="none" stroke="#b98f52" stroke-width="1.7" stroke-linecap="round"/><path d="M4 56 h10 M50 58 h10" stroke="rgba(255,255,255,.5)" stroke-width="1.6" stroke-linecap="round"/>`,
    'Bluebell': () => bells('#5b8ff0', 3),
    'Nightshade': () => flower({ n: 5, len: 13, w: 5, petal: '#7a5ad6', pointed: true, centre: '#f7d24a', centreR: 4.5, extra: `<circle cx="46" cy="49" r="4.5" fill="#20233d" ${OUT}/><circle cx="52" cy="42" r="3.6" fill="#20233d" ${OUT}/>` }),
    'Mulberry': () => { let g = `<path d="M32 6 V18" stroke="#3f9a4d" stroke-width="2.6" stroke-linecap="round"/><path d="M32 12 q10 -8 18 -1 q-9 7 -18 1 Z" fill="#57b85f" ${OUT}/>`; for (const [x, y] of [[26, 22], [38, 22], [32, 20], [22, 31], [32, 30], [42, 31], [26, 40], [38, 40], [32, 48], [32, 39]]) g += `<circle cx="${x}" cy="${y}" r="6" fill="#7a2a6a" ${OUT}/><circle cx="${x - 1.6}" cy="${y - 1.8}" r="1.5" fill="#b86aa8"/>`; return g; },
    'Stinging Bush': () => `<path d="M32 59 V40" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/><path d="M32 6 l5 6 l6 -2 l-1 7 l7 1 l-4 6 l6 4 l-7 3 l3 7 l-8 -1 l-1 8 l-6 -6 l-6 6 l-1 -8 l-8 1 l3 -7 l-7 -3 l6 -4 l-4 -6 l7 -1 l-1 -7 l6 2 Z" fill="#4fa85a" ${OUT}/><path d="M32 12 V44 M32 24 l-9 -5 M32 24 l9 -5 M32 33 l-10 -3 M32 33 l10 -3" stroke="#2f7a3a" stroke-width="1.4" stroke-linecap="round"/><path d="M50 10 l3 5 l-6 0 Z" fill="#f7d24a"/>`,
    'Moonflower': () => flower({ n: 5, len: 14, w: 7, petal: '#fbfbff', centre: '#f1e6a8', centreR: 4, extra: `<path d="M52 8 a8 8 0 1 0 6 12 a6.5 6.5 0 0 1 -6 -12 Z" fill="#f7e27a"/>` }),
    'Wolfsbane': () => `<path d="M32 59 V14" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/>` + [[32, 12], [24, 24], [40, 26], [26, 38], [39, 40]].map(([x, y]) => `<path d="M${x - 6} ${y + 6} Q${x - 8} ${y - 7} ${x + 1} ${y - 8} Q${x + 8} ${y - 6} ${x + 5} ${y + 6} Q${x} ${y + 2} ${x - 6} ${y + 6} Z" fill="#4a4fc9" ${OUT}/><path d="M${x - 2} ${y + 3} q2 -3 4 0" stroke="#c9ccff" stroke-width="1" fill="none"/>`).join(''),
    'Twinflower': () => `<path d="M32 59 V26 M32 26 Q32 14 20 14 M32 26 Q32 14 44 14" fill="none" stroke="#3f9a4d" stroke-width="2.6" stroke-linecap="round"/>` + [20, 44].map(x => `<path d="M${x - 7} 30 Q${x - 8} 15 ${x} 14 Q${x + 8} 15 ${x + 7} 30 q-2.3 -2 -4.6 0 q-2.3 -2 -4.7 0 q-2.3 -2 -4.7 0 Z" fill="#f7a8c8" ${OUT}/>`).join('') + `<path d="M32 48 q-9 0 -10 -7 q9 0 10 7 Z M32 44 q9 0 10 -7 q-9 0 -10 7 Z" fill="#57b85f"/>`,
    "Angel's Trumpet": () => `<path d="M10 10 Q32 4 50 14" fill="none" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/><path d="M30 10 Q29 30 18 50 Q32 58 46 50 Q35 30 34 10 Z" fill="#fbe9a8" ${OUT}/><path d="M18 50 Q32 44 46 50" fill="none" stroke="#e6c25a" stroke-width="2"/><path d="M32 14 V46" stroke="#e6c25a" stroke-width="1.2"/><path d="M18 50 l-3 5 M46 50 l3 5 M32 55 v5" stroke="#fbe9a8" stroke-width="2.4" stroke-linecap="round"/>`,
    'Dandelion': () => { let g = `<path d="M32 59 V32" stroke="#3f9a4d" stroke-width="2.6" stroke-linecap="round"/>`; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g += `<path d="M32 28 L${32 + Math.cos(a) * 17} ${28 + Math.sin(a) * 17}" stroke="#fff" stroke-width="1"/><circle cx="${32 + Math.cos(a) * 18}" cy="${28 + Math.sin(a) * 18}" r="2.2" fill="#fff"/>`; } return g + `<circle cx="32" cy="28" r="3.5" fill="#d9c98a"/><circle cx="54" cy="8" r="1.6" fill="#fff"/><circle cx="58" cy="15" r="1.2" fill="#fff"/>`; },
    'Wildflower': () => { const cols = ['#f25a8a', '#f7c62f', '#5b8ff0', '#57c96a', '#f58a1f', '#b06ae0']; let g = stemOnly; for (let i = 0; i < 6; i++) g += `<ellipse transform="rotate(${i * 60} 32 28)" cx="32" cy="17" rx="5.5" ry="9" fill="${cols[i]}" ${OUT}/>`; return g + `<circle cx="32" cy="28" r="5" fill="#fff" ${OUT}/>`; },
    'Chocolate Lily': () => flower({ n: 6, len: 14, w: 4.6, petal: '#6b3a5a', pointed: true, centre: '#f7d24a', centreR: 4 }),
    'Foxglove': () => bells('#d65aa8', 4, { spot: '#7a1f5a' }),
    'Bottlebrush': () => { let g = `<path d="M32 59 V8" stroke="#7a5a3c" stroke-width="2.6" stroke-linecap="round"/>`; for (let y = 12; y <= 44; y += 3.2) g += `<path d="M18 ${y - 3} L46 ${y + 3} M18 ${y + 3} L46 ${y - 3} M16 ${y} H48" stroke="#e23b3b" stroke-width="1.5" stroke-linecap="round"/>`; return g + `<path d="M32 52 q-10 0 -12 -6 q10 -1 12 6 Z" fill="#57b85f"/>`; },
    'Tigerlily': () => flower({ n: 6, len: 15, w: 5, petal: '#f57a1f', pointed: true, centre: '#7a3a14', centreR: 3.5, dots: '#5d2a0f' }),
    'Snapdragon': () => `<path d="M32 59 V12" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/>` + [[32, 12, '#f7c62f'], [24, 23, '#f25a8a'], [40, 26, '#f25a8a'], [25, 37, '#e03a6a'], [40, 40, '#e03a6a']].map(([x, y, c]) => `<path d="M${x - 7} ${y} Q${x - 7} ${y - 8} ${x} ${y - 7} Q${x + 7} ${y - 8} ${x + 7} ${y} Q${x} ${y + 3} ${x - 7} ${y} Z" fill="${c}" ${OUT}/><path d="M${x - 6} ${y + 1} Q${x} ${y + 8} ${x + 6} ${y + 1} Q${x} ${y + 3} ${x - 6} ${y + 1} Z" fill="#f7e2a8" ${OUT}/>`).join(''),
    'Poppy': () => flower({ n: 4, len: 15, w: 9.5, petal: '#e8322f', centre: '#20233d', centreR: 5, seeds: '#f7d24a' }),
    'Venus Flytrap': () => `<path d="M32 59 V44" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/><path d="M10 26 Q14 46 32 46 Q50 46 54 26 Q32 34 10 26 Z" fill="#57b85f" ${OUT}/><path d="M10 26 Q32 4 54 26 Q32 20 10 26 Z" fill="#6fd06a" ${OUT}/><path d="M12 27 Q32 35 52 27 Q32 21 12 27 Z" fill="#b3324a"/><path d="M15 26 l2 5 l3 -4 l3 6 l3 -5 l3 6 l3 -6 l3 6 l3 -6 l3 5 l3 -6 l3 4 l2 -5" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>`,
    'Wax Flower': () => flower({ n: 5, len: 12, w: 6.5, petal: '#f7b8d0', centre: '#d63a6a', centreR: 5, dots: '#fff' }),
    'Crimson Kunzea': () => { let g = stemOnly; for (let i = 0; i < 22; i++) { const a = i * Math.PI / 11; g += `<path d="M32 28 L${32 + Math.cos(a) * 18} ${28 + Math.sin(a) * 18}" stroke="#d6213a" stroke-width="1.6" stroke-linecap="round"/><circle cx="${32 + Math.cos(a) * 18.5}" cy="${28 + Math.sin(a) * 18.5}" r="1.5" fill="#f7d24a"/>`; } return g + `<circle cx="32" cy="28" r="6" fill="#a8142a" ${OUT}/>`; },
    'Oleander': () => flower({ n: 5, len: 14, w: 6, petal: '#f58ab0', pointed: true, centre: '#fff3c9', centreR: 3.5 }),
    'Thistle': () => `<path d="M32 59 V40" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/><path d="M32 52 l-10 -6 l2 6 Z M32 48 l10 -6 l-2 7 Z" fill="#4f9a4a" ${OUT}/>` + Array.from({ length: 11 }, (_, i) => { const a = (-150 + i * 12) * Math.PI / 180; return `<path d="M32 28 L${32 + Math.cos(a) * 22} ${28 + Math.sin(a) * 22}" stroke="#b05ae0" stroke-width="2.6" stroke-linecap="round"/>`; }).join('') + `<ellipse cx="32" cy="34" rx="10" ry="9" fill="#4f9a4a" ${OUT}/><path d="M24 31 l3 3 l3 -3 l3 3 l3 -3 l3 3 M25 37 l3 3 l3 -3 l3 3 l3 -3" fill="none" stroke="#2f6a3a" stroke-width="1.2"/>`,
    'Golden Wattle': () => { let g = `<path d="M10 56 Q30 40 54 10" fill="none" stroke="#7a5a3c" stroke-width="2.4" stroke-linecap="round"/><path d="M22 47 q-8 -6 -12 -1 q6 5 12 1 Z M40 28 q8 6 12 2 q-5 -6 -12 -2 Z" fill="#6aa85a" ${OUT}/>`; for (const [x, y, r] of [[20, 36, 6], [30, 30, 6.5], [27, 44, 5], [38, 38, 5.5], [40, 20, 6], [48, 22, 4.5], [34, 20, 4.5]]) g += `<circle cx="${x}" cy="${y}" r="${r}" fill="#f7cf2f" ${OUT}/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .3}" fill="#fff1a0"/>`; return g; },
    'Desert Pea': () => `<path d="M8 12 Q32 8 56 14" fill="none" stroke="#6aa85a" stroke-width="2.6" stroke-linecap="round"/>` + [20, 44].map(x => `<path d="M${x} 12 Q${x - 11} 18 ${x - 4} 34 Q${x} 26 ${x + 4} 34 Q${x + 11} 18 ${x} 12 Z" fill="#e0261f" ${OUT}/><path d="M${x} 30 Q${x - 5} 44 ${x} 56 Q${x + 5} 44 ${x} 30 Z" fill="#e0261f" ${OUT}/><ellipse cx="${x}" cy="29" rx="4" ry="5" fill="#15161d"/>`).join(''),
    'Waratah': () => { let g = stemOnly + `<path d="M12 40 Q32 52 52 40 Q44 34 32 36 Q20 34 12 40 Z" fill="#b01c2a" ${OUT}/><path d="M16 36 A16 18 0 0 1 48 36 Q32 42 16 36 Z" fill="#e0263a" ${OUT}/>`; for (const [x, y] of [[26, 26], [32, 22], [38, 26], [23, 32], [29, 31], [35, 31], [41, 32], [32, 28]]) g += `<path d="M${x} ${y} q2 -4 0 -6" stroke="#ff8a96" stroke-width="1.5" fill="none" stroke-linecap="round"/>`; return g; },
    'Amaranth': () => `<path d="M32 59 V10" stroke="#3f9a4d" stroke-width="2.6" stroke-linecap="round"/><path d="M32 46 q-11 -1 -13 -9 q10 0 13 9 Z M32 40 q11 -1 13 -9 q-10 0 -13 9 Z" fill="#57b85f"/>` + [[32, 10, 0], [24, 14, -24], [40, 14, 24]].map(([x, y, r]) => `<path transform="rotate(${r} ${x} ${y})" d="M${x} ${y} q-5 10 0 24 q5 -14 0 -24 Z" fill="#c21f7a" ${OUT}/>` + Array.from({ length: 5 }, (_, i) => `<circle transform="rotate(${r} ${x} ${y})" cx="${x}" cy="${y + 4 + i * 4}" r="2.4" fill="#e04a9a"/>`).join('')).join(''),
    'Bird of Paradise': () => `<path d="M30 59 Q30 44 22 36" fill="none" stroke="#3f9a4d" stroke-width="3" stroke-linecap="round"/><path d="M8 40 Q26 30 50 34 Q30 44 8 40 Z" fill="#4f9a6a" ${OUT}/><path d="M20 35 L18 8 L28 32 Z M27 33 L34 6 L35 31 Z M34 32 L50 10 L42 32 Z" fill="#f58a1f" ${OUT}/><path d="M38 33 L58 26 L44 36 Z" fill="#3a5fd0" ${OUT}/>`,
  };

  function svg(name, type) {
    const draw = DRAW[name];
    const inner = draw ? draw() : `<text x="32" y="42" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">${(name || '?').slice(0, 1)}</text>`;
    return `<svg class="icon" viewBox="0 0 64 64" role="img" aria-label="${name || ''}"><rect width="64" height="64" rx="14" fill="${BG[type] || BG.unknown}"/><circle cx="32" cy="34" r="26" fill="rgba(255,255,255,.10)"/>${inner}</svg>`;
  }

  const BADGE = {
    eggs: '<ellipse cx="12" cy="13" rx="6" ry="7.5" fill="currentColor"/>',
    self: '<ellipse cx="10" cy="13" rx="5" ry="6.5" fill="currentColor"/><path d="M19 5 v8 M15 9 h8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    info: '<path d="M2 12 Q12 2 22 12 Q12 22 2 12 Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.4" fill="currentColor"/>',
    track: '<path d="M4 20 L10 12 L15 16 L21 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="21" cy="5" r="2.2" fill="currentColor"/>',
    swap: '<path d="M4 8 h14 l-4 -4 M20 16 h-14 l4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    hug: '<path d="M12 21 C-2 11 6 1 12 8 C18 1 26 11 12 21 Z" fill="currentColor"/>',
    confuse: '<path d="M8 9 a4.5 4.5 0 1 1 6 4.2 c-1.6 .8 -2 1.6 -2 3.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="21" r="1.6" fill="currentColor"/>',
    steal: '<path d="M5 10 h14 l-1.5 11 h-11 Z" fill="currentColor"/><path d="M8.5 10 a3.5 4.5 0 0 1 7 0" fill="none" stroke="currentColor" stroke-width="2"/>',
    kill: '<path d="M4 11 a8 8 0 1 1 16 0 c0 3 -1.5 4.5 -3 5.5 v3.5 h-10 v-3.5 c-1.5 -1 -3 -2.5 -3 -5.5 Z" fill="currentColor"/><circle cx="9" cy="11" r="2" fill="#1b1e36"/><circle cx="15" cy="11" r="2" fill="#1b1e36"/>',
    wink: '<path d="M3 13 q4 -6 8 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="17" cy="12" r="3" fill="currentColor"/>',
    redirect: '<path d="M3 18 h8 a6 6 0 0 0 6 -6 V5 M13 9 l4 -4 l4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    copy: '<rect x="4" y="4" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="9" width="11" height="11" rx="2.5" fill="currentColor"/>',
    twist: '<path d="M12 2 l2.6 6.3 l6.8 .6 l-5.2 4.4 l1.6 6.7 l-5.8 -3.6 l-5.8 3.6 l1.6 -6.7 l-5.2 -4.4 l6.8 -.6 Z" fill="currentColor"/>',
    flower: '<circle cx="12" cy="6" r="4" fill="currentColor"/><circle cx="18" cy="11" r="4" fill="currentColor"/><circle cx="15.5" cy="18" r="4" fill="currentColor"/><circle cx="8.5" cy="18" r="4" fill="currentColor"/><circle cx="6" cy="11" r="4" fill="currentColor"/><circle cx="12" cy="12.5" r="3" fill="#1b1e36"/>',
  };
  const badge = (kind) => `<svg class="badge-ic" viewBox="0 0 24 24" aria-hidden="true">${BADGE[kind] || BADGE.twist}</svg>`;

  window.MeowIcons = { svg, badge, names: Object.keys(DRAW) };
})();
