/* Meowfia Lab: games, replays, cards, rules, simulations and the run control page. No build step. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');
  const SEAT_COLORS = ['#f7b84b', '#6fc3f7', '#f78fb3', '#8be28b', '#c9a0ff', '#ff9e6b', '#5fe0d0', '#e6e36b'];
  const D = { cards: null, variants: null, games: [], sims: [], config: {}, card: {}, sim: null };
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem('meowfia.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem('meowfia.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* ---------- data ---------- */
  async function getJSON(path, { control = false } = {}) {
    const r = await fetch(path + (path.includes('?') ? '' : '?v=' + Date.now()), { cache: 'no-store' });
    if (!r.ok) throw new Error(path + ': ' + r.status);
    return r.json();
  }
  async function getData(path) {
    try { return await getJSON('data/' + path); }
    catch (e) {                                   // not published yet: ask the control service, if we can reach it
      if (canCall() && !selfHosted()) return ctl('/data/' + path);
      throw e;
    }
  }
  // The control service is this very site when it is served by the PC ("SELF"); from the public site it can only be
  // called if it has an https address (a browser won't let an https page call an http one).
  const selfHosted = () => D.config.control === 'SELF';
  const controlBase = () => (selfHosted() ? '' : D.config.control || '');
  const canCall = () => selfHosted() || (!!D.config.control && (location.protocol !== 'https:' || D.config.control.startsWith('https:')));
  async function ctl(path, opts = {}) {
    if (!canCall()) throw new Error('unreachable');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeout || 6000);
    try {
      const r = await fetch(controlBase() + path, { ...opts, signal: ctrl.signal, headers: opts.body ? { 'Content-Type': 'application/json' } : undefined });
      if (!r.ok) throw new Error((await r.text()) || r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  async function boot() {
    $('#brand-mark').innerHTML = MeowIcons.svg('House Cat', 'meowfia');
    try {
      const [cards, variants, games, sims, config] = await Promise.all([
        getJSON('data/cards.json'), getJSON('data/variants.json'), getJSON('data/games/index.json'),
        getJSON('data/sims/index.json'), getJSON('data/config.json').catch(() => ({}))]);
      Object.assign(D, { cards, variants, games, sims, config });
      for (const c of [...cards.roles, ...cards.flowers]) D.card[c.name] = c;
    } catch (e) {
      app.innerHTML = `<div class="empty">The site's data could not be loaded.<br><span class="small">${esc(e.message)}</span></div>`;
      return;
    }
    window.addEventListener('hashchange', route);
    route();
    if (canCall() && !selfHosted()) {             // newest runs straight from the machine, when it is reachable
      ctl('/api/index', { timeout: 3500 }).then((x) => {
        const merge = (mine, theirs) => { const ids = new Set(mine.map((g) => g.id)); return [...theirs.filter((g) => !ids.has(g.id)), ...mine].sort((a, b) => (b.started || '').localeCompare(a.started || '')); };
        const before = D.games.length + D.sims.length;
        D.games = merge(D.games, x.games || []); D.sims = merge(D.sims, x.sims || []);
        if (D.games.length + D.sims.length !== before && ['', '#/', '#/sims'].includes(location.hash)) route();
      }).catch(() => {});
    }
  }

  /* ---------- small pieces ---------- */
  const typeOf = (name) => (D.card[name] ? D.card[name].type : 'unknown');
  const typeClass = (t) => ({ farm: 'farm', meowfia: 'cat', flower: 'flower' }[t] || '');
  const icon = (name) => MeowIcons.svg(name, typeOf(name));
  const chip = (name, extra = '') => name ? `<span class="chip" data-card="${esc(name)}"><span class="ic">${icon(name)}</span>${esc(name)}${extra}</span>` : '';
  const icOnly = (name) => `<span class="ic-only" data-card="${esc(name)}" title="${esc(name)}">${icon(name)}</span>`;
  const alignPill = (a) => a ? `<span class="pill ${a === 'Farm' ? 'farm' : 'cat'}">${a}</span>` : '';
  const when = (iso) => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  const pct = (x, digits = 0) => (x * 100).toFixed(digits) + '%';
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  function avatar(game, name, cls = '') {
    const i = game.players.indexOf(name);
    return `<span class="av ${cls}" style="background:${SEAT_COLORS[i % 8]}">${esc(name[0])}</span>`;
  }
  const who = (game, name) => `<span class="who">${avatar(game, name, 's')}${esc(name)}</span>`;
  function egg(game, id, cls = '') {
    const c = game.cards[id]; if (!c) return '';
    const wild = id[0] === 'W';
    return `<span class="egg ${wild ? 'wild' : id[0].toLowerCase()} ${cls}" title="${wild ? 'Wild (0)' : c.value + ' of ' + ({ H: 'Hearts', D: 'Diamonds', C: 'Clubs', S: 'Spades' }[id[0]])}">${wild ? 'W' : c.value}<small style="font-size:9px;margin-left:1px">${wild ? '' : ({ H: '♥', D: '♦', C: '♣', S: '♠' }[id[0]])}</small></span>`;
  }
  const hand = (game, ids, cls) => `<span class="hand">${ids.map((i) => egg(game, i, cls)).join('')}</span>`;
  const meters = (r) => r ? `<div class="meters">${['fun', 'tension', 'deduction', 'bluffing', 'clarity'].map((k) => `<div class="meter"><b>${r[k] ?? '–'}</b><span>${k}</span><div class="bar"><i style="width:${(r[k] || 0) * 10}%"></i></div></div>`).join('')}</div>` : '';
  const overrides = (list) => (list || []).map((o) => `<span class="pill amber">${esc(o)}</span>`).join('');

  /* ---------- router ---------- */
  function route() {
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent);
    const view = parts[0] || 'games';
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === ({ game: 'games', sim: 'sims' }[view] || view)));
    stopPolling();
    window.scrollTo(0, 0);
    if (view === 'games') return viewGames();
    if (view === 'game') return viewGame(parts[1], parts[2]);
    if (view === 'cards') return viewCards(parts[1]);
    if (view === 'rules') return viewRules(parts[1]);
    if (view === 'sims') return viewSims();
    if (view === 'sim') return viewSim(parts[1]);
    if (view === 'new') return viewNew();
    app.innerHTML = '<div class="empty">Page not found.</div>';
  }

  /* ---------- games list ---------- */
  function roundPip(r) {
    let cls = 'skip', text = 'Skipped';
    if (r.exclusive) { cls = 'cat'; text = `${r.exclusive} won alone`; }
    else if (r.eliminated && r.eliminated.length) {
      const e = r.eliminated[0];
      cls = e.alignment === 'Meowfia' ? 'farm' : 'cat';
      text = e.alignment === 'Meowfia' ? 'Cat caught' : r.meowfia === 0 ? 'No cats' : 'Farm egged';
    } else if (!r.skipped) text = 'No one out';
    return `<span class="round-pip ${cls}"><span class="n">R${r.round}</span>${(r.flowers || []).map(icOnly).join('')}${esc(text)}</span>`;
  }
  function gameCard(g) {
    const top = Object.entries(g.scores).sort((a, b) => b[1] - a[1]);
    return `<a class="card game-card" href="#/game/${encodeURIComponent(g.id)}">
      <div class="when"><span>${when(g.started)}</span><span>·</span><span>${esc(g.variant)}</span>${overrides(g.overrides)}</div>
      <div class="headline">${esc(g.headline || `${g.players.length} players, ${plural(g.rounds.length, 'round')}`)}</div>
      <div class="rounds-strip">${g.rounds.map(roundPip).join('')}</div>
      <div class="podium">${top.slice(0, 3).map(([n, s], i) => `<span class="pill ${i === 0 ? 'amber' : ''}">${i === 0 ? '★ ' : ''}${esc(n)} ${s}</span>`).join('')}<span class="pill">${g.players.length} players · ${esc(g.model || '')}</span></div>
      ${meters(g.review)}</a>`;
  }
  function viewGames() {
    app.innerHTML = `<div class="page-head"><h1>Playtests</h1>
      <p>Meowfia is a social deduction card game where nobody knows who the cats are. Here AI players sit at the table, bluff, deduce and throw eggs, so each rule change can be watched before it reaches real cards.</p></div>
      ${D.games.length ? `<div class="games">${D.games.map(gameCard).join('')}</div>` : '<div class="empty">No games yet. Start one from <a href="#/new"><b>New run</b></a>.</div>'}`;
  }

  /* ---------- one game ---------- */
  const G = { game: null, tab: 'overview', mode: store.get('mode', 'story'), viewer: '', revealed: new Set() };
  async function viewGame(id, tab) {
    if (!G.game || G.game.id !== id) {
      app.innerHTML = '<div class="loading">Loading the game</div>';
      try { G.game = await getData(`games/${id}.json`); } catch (e) { app.innerHTML = `<div class="empty">This game could not be loaded.</div>`; return; }
      G.revealed = new Set(); G.viewer = '';
    }
    G.tab = tab || 'overview';
    renderGame();
  }
  const spoil = (round) => G.mode === 'story' || G.revealed.has(round) || G.revealed.has('all');
  const sees = (round, name) => spoil(round) || G.viewer === name;

  function renderGame() {
    const g = G.game, rv = g.review || {};
    const tabs = [['overview', 'Overview'], ...g.rounds.map((r) => ['r' + r.round, 'Round ' + r.round])];
    app.innerHTML = `<div class="game-top">
        <div class="crumbs"><a href="#/">Playtests</a> / ${when(g.started)}</div>
        <h1>${esc((spoil('all') || G.mode === 'story') && rv.headline ? rv.headline : `${g.variant}: ${g.players.length} players`)}</h1>
        <div class="game-meta"><span class="pill">${esc(g.variant)}</span>${overrides(g.overrides)}<span class="pill">Seed ${g.seed}</span><span class="pill">${esc(g.model || '')} players</span>${g.minutes ? `<span class="pill">${g.minutes} min</span>` : ''}</div>
      </div>
      <div class="controls">
        <div class="tabs" id="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${G.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <span class="spacer"></span>
        <div class="seg" id="mode" title="Play along hides every secret until you reveal the round">
          <button data-mode="play" class="${G.mode === 'play' ? 'on' : ''}">Play along</button>
          <button data-mode="story" class="${G.mode === 'story' ? 'on' : ''}">Storyteller</button></div>
        ${G.mode === 'play' ? `<select id="viewer" title="Sit in a seat: see what that player saw"><option value="">Watching the table</option>${g.players.map((n) => `<option ${G.viewer === n ? 'selected' : ''} value="${n}">Sitting as ${n}</option>`).join('')}</select>` : ''}
      </div>
      <div id="tabbody"></div>`;
    $('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) location.hash = `#/game/${encodeURIComponent(g.id)}/${b.dataset.tab}`; };
    $('#mode').onclick = (e) => { const b = e.target.closest('button'); if (b) { G.mode = b.dataset.mode; store.set('mode', G.mode); renderGame(); } };
    if ($('#viewer')) $('#viewer').onchange = (e) => { G.viewer = e.target.value; renderGame(); };
    const body = $('#tabbody');
    if (G.tab === 'overview') body.innerHTML = overview(g);
    else {
      const rec = g.rounds.find((r) => 'r' + r.round === G.tab);
      body.innerHTML = rec ? roundView(g, rec) : '<div class="empty">No such round.</div>';
    }
    body.onclick = (e) => {
      const b = e.target.closest('[data-reveal]');
      if (b) { G.revealed.add(b.dataset.reveal === 'all' ? 'all' : +b.dataset.reveal); const y = window.scrollY; renderGame(); window.scrollTo(0, y); }
    };
    drawLines();
  }

  function scoreBars(g, scores, gained) {
    const max = Math.max(1, ...Object.values(scores));
    return `<div class="scores">${Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([n, s]) => `<div class="score-row">${who(g, n)}
      <div class="track"><i style="width:${Math.max(2, s / max * 100)}%;background:${SEAT_COLORS[g.players.indexOf(n) % 8]}"></i></div>
      <div class="val">${s}${gained && gained[n] ? `<small>${gained[n] > 0 ? '+' : ''}${gained[n]}</small>` : ''}</div></div>`).join('')}</div>`;
  }

  function overview(g) {
    const rv = g.review, open = spoil('all');
    let h = '';
    if (!open) h += `<div class="reveal-bar"><div class="grow"><b>You're playing along.</b><div class="muted small">The recap, final scores and every secret are hidden. Open a round to follow it as the table saw it.</div></div><button class="btn primary" data-reveal="all">Reveal the whole game</button></div>`;
    if (open && rv) {
      h += `<div class="section recap"><p class="lead">${esc(rv.summary)}</p>${meters(rv.scores)}</div>
        <div class="section two">
          <div class="card pad"><h3 style="margin-bottom:10px">Round by round</h3><ol class="list">${(rv.rounds || []).map((r) => `<li><b>Round ${r.round}.</b> ${esc(r.recap)}</li>`).join('')}</ol></div>
          <div class="card pad"><h3 style="margin-bottom:10px">Moments worth reading</h3><ul class="list">${(rv.highlights || []).map((x) => `<li><a href="#/game/${encodeURIComponent(g.id)}/r${x.round}"><b>Round ${x.round}.</b></a> ${esc(x.text)}</li>`).join('') || '<li>None noted.</li>'}</ul></div>
        </div>
        <div class="section two">
          <div class="card pad"><h3 style="margin-bottom:10px">Notes for the designer</h3><ul class="list">${(rv.design_notes || []).map((x) => `<li>${esc(x)}</li>`).join('') || '<li>None.</li>'}</ul></div>
          <div class="card pad"><h3 style="margin-bottom:10px">Where players misread the rules</h3><ul class="list">${(rv.confusions || []).map((x) => `<li><b>${esc(x.player)}, round ${x.round}.</b> ${esc(x.what)}</li>`).join('') || '<li>Nobody did.</li>'}</ul></div>
        </div>`;
    } else if (open) h += `<div class="section"><div class="empty">This game has no written review.</div></div>`;
    if (open) {
      h += `<div class="section two"><div class="card pad"><h3 style="margin-bottom:12px">Final scores</h3>${scoreBars(g, g.scores)}
          <p class="muted small" style="margin-top:12px">Score = cards banked in the score pile at full value, plus 1 per card kept, plus bonuses.</p></div>
        <div class="card pad"><h3 style="margin-bottom:12px">Where the points came from</h3><div class="roster">${g.players.map((n) => { const b = g.breakdown[n]; return `<div class="line">${who(g, n)}<div class="what"><span class="pill amber">${b.pile} banked</span><span class="pill">${b.kept} kept</span>${b.bonus ? `<span class="pill flower">${b.bonus > 0 ? '+' : ''}${b.bonus} bonus</span>` : ''}${hand(g, b.pile_cards)}</div></div>`; }).join('')}</div></div></div>`;
    }
    h += `<div class="section"><h2>Rounds</h2><div class="games">${g.rounds.map((rec) => {
      const cyc = rec.cycles[rec.cycles.length - 1] || {}, v = cyc.vote || {}, s = spoil(rec.round);
      const out = (v.eliminated || [])[0];
      return `<a class="card game-card" href="#/game/${encodeURIComponent(g.id)}/r${rec.round}"><div class="when">Round ${rec.round} · dealer ${esc(rec.dealer)}</div>
        <div class="row wrap">${rec.revealed.filter((x) => !x.hidden || s).map((x) => chip(x.face)).join('')}${rec.revealed.some((x) => x.hidden) && !s ? '<span class="chip hidden-card">Face-down cards</span>' : ''}</div>
        <div class="muted small">${rec.skipped ? 'Skipped: the Cactus Flower showed there were no Meowfia.' : rec.exclusive_winner ? (s ? `${esc(rec.exclusive_winner)} won the round alone.` : 'Ended early by a challenge.') : out ? (s && !v.corpse ? `${esc(out)} was eggsecuted: ${v.revealed[out]}.` : `${esc(out)} was eggsecuted.`) : 'Nobody was eggsecuted.'}</div></a>`;
    }).join('')}</div></div>
    <div class="section"><h2>This game</h2><div class="card pad"><dl class="kv">
      <dt>Variant</dt><dd><a href="#/rules/${encodeURIComponent(g.variant)}">${esc(g.variant)}</a> ${overrides(g.overrides)}</dd>
      <dt>Players</dt><dd>${g.players.map((n) => who(g, n)).join(' &nbsp; ')}</dd>
      <dt>Seed</dt><dd>${g.seed}</dd><dt>Played by</dt><dd>${esc(g.model || '')}${g.review_model && g.review ? `, reviewed by ${esc(g.review_model)}` : ''}</dd>
      <dt>Length</dt><dd>${g.minutes || '?'} minutes, ${g.usage ? g.usage.calls + ' turns' : ''}</dd>
      ${g.usage ? `<dt>Usage</dt><dd>about $${g.usage.api_equivalent_usd} at API prices (charged to the subscription)</dd>` : ''}</dl></div></div>`;
    return h;
  }

  /* --- the table diagram --- */
  function seatPos(i, n) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n;
    return { x: 50 + Math.cos(a) * 40, y: 50 + Math.sin(a) * 39 };
  }
  function table(g, people, opts = {}) {
    const n = g.players.length;
    const seats = g.players.map((name, i) => {
      const p = people[name] || {}, pos = seatPos(i, n), show = opts.show ? opts.show(name) : true;
      const cls = ['seat', show && p.alignment ? (p.alignment === 'Farm' ? 'farm' : 'cat') : '', p.dead ? 'dead' : '', (opts.out || []).includes(name) ? 'out' : ''].join(' ');
      const tags = (opts.tags ? opts.tags(name) : []).join('');
      const sub = opts.sub ? opts.sub(name) : '';
      return `<div class="${cls}" style="left:${pos.x}%;top:${pos.y}%" data-seat="${esc(name)}"><div class="face">${avatar(g, name)}
        ${p.nest !== undefined ? `<span class="nest" title="Cards in nest">${p.nest}</span>` : ''}
        ${show && p.role ? `<span class="role" data-card="${esc(p.role)}">${icon(p.role)}</span>` : ''}</div>
        <div class="nm">${esc(name)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}${tags ? `<div class="tags">${tags}</div>` : ''}</div>`;
    }).join('');
    const arrows = JSON.stringify(opts.arrows || []).replace(/"/g, '&quot;');
    return `<div class="table-wrap" data-arrows="${arrows}"><div class="felt"><div class="felt-label">${esc(opts.label || '')}</div></div><svg class="lines"></svg>${seats}</div>`;
  }
  function drawLines() {
    $$('.table-wrap').forEach((wrap) => {
      const svg = $('svg.lines', wrap), box = wrap.getBoundingClientRect();
      const arrows = JSON.parse(wrap.dataset.arrows || '[]');
      if (!box.width) return;
      const centre = (name) => { const el = $(`[data-seat="${CSS.escape(name)}"] .face`, wrap); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, r: r.width / 2 + 7 }; };
      let h = `<defs>${['#f5a623', '#4cc27a', '#f0566f', '#b57be6', '#8aa0d8'].map((c, i) => `<marker id="ah${i}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${c}"/></marker>`).join('')}</defs>`;
      const cols = { amber: 0, farm: 1, cat: 2, flower: 3, dim: 4 }, hex = ['#f5a623', '#4cc27a', '#f0566f', '#b57be6', '#8aa0d8'];
      arrows.forEach((a, idx) => {
        const A = centre(a.from), B = a.to === a.from ? null : centre(a.to);
        const ci = cols[a.color] ?? 0, w = a.width || 2.4;
        if (!A) return;
        if (!B) {                                 // a visit to themself: a small loop
          h += `<circle cx="${A.x}" cy="${A.y - A.r - 9}" r="10" fill="none" stroke="${hex[ci]}" stroke-width="${w}" stroke-dasharray="${a.dash ? '5 4' : ''}"/>`;
          return;
        }
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const x1 = A.x + ux * A.r, y1 = A.y + uy * A.r, x2 = B.x - ux * (B.r + 3), y2 = B.y - uy * (B.r + 3);
        const bend = (a.bend ?? 0.16) * len, mx = (x1 + x2) / 2 - uy * bend, my = (y1 + y2) / 2 + ux * bend;
        h += `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${hex[ci]}" stroke-width="${w}" stroke-linecap="round" marker-end="url(#ah${ci})" opacity="${a.opacity || .95}" stroke-dasharray="${a.dash ? '6 5' : ''}"/>`;
        if (a.label) {
          const lx = (x1 + 2 * mx + x2) / 4, ly = (y1 + 2 * my + y2) / 4;
          h += `<circle cx="${lx}" cy="${ly}" r="10.5" fill="#121425" stroke="${hex[ci]}" stroke-width="1.5"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">${esc(a.label)}</text>`;
        }
      });
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      svg.innerHTML = h;
    });
  }
  window.addEventListener('resize', () => { clearTimeout(drawLines.t); drawLines.t = setTimeout(drawLines, 120); });

  /* --- a round --- */
  const VERB = {
    lay: (g, e) => e.src === e.to ? [`earned ${plural(e.n, 'egg')}`, 'good', 'self'] : [`laid ${plural(e.n, 'egg')} in ${e.to}'s nest`, 'good', 'eggs'],
    steal: (g, e) => [`stole ${plural(e.n, 'egg')} from ${e.to}${e.inverted ? ' (Angel\'s Trumpet turned the gift into a theft)' : ''}`, 'bad', 'steal'],
    give: (g, e) => [`passed ${plural(e.n, 'stolen egg')} to ${e.to}`, '', 'eggs'],
    hugged: (g, e) => [`hugged ${e.to}: their ability does nothing tonight`, 'block', 'hug'],
    confused: (g, e) => [e.by === e.to ? 'was visited and became confused' : `confused ${e.to}`, 'odd', 'confuse'],
    cure: (g, e) => [`cured ${e.to}`, 'good', 'hug'],
    kill: (g, e) => [`killed ${e.to}`, 'bad', 'kill'],
    wink: (g, e) => [`gave ${e.to} a Wink`, 'odd', 'wink'],
    swap_animals: (g, e) => [`made ${e.a} and ${e.b} swap animals (and alignments)`, 'odd', 'swap'],
    swap_nests: (g, e) => [`made ${e.a} and ${e.b} swap nests`, 'odd', 'swap'],
    align: (g, e) => [e.by === e.to ? `became ${e.alignment}` : `turned ${e.to} ${e.alignment}`, e.alignment === 'Meowfia' ? 'bad' : 'good', 'swap'],
    rotate: (g, e) => [`moved every animal ${plural(e.k, 'seat')} clockwise`, 'odd', 'swap'],
    redirect: (g, e) => [`sent ${e.who}'s visit to ${e.to}`, 'odd', 'redirect'],
    copy: (g, e) => [`copied ${e.of}'s animal: the ${e.role}`, 'odd', 'copy'],
    info: (g, e) => [e.by === e.to ? `learned: ${e.text}` : `told ${e.to}: ${e.text}`, '', 'info'],
    blocked: () => ['was hugged, so their ability did nothing', 'block', 'hug'],
  };
  function nightEvents(g, night, canSee) {
    const rows = [];
    let lastBlock = null;
    const events = [];
    for (const e of night.events) {             // "laid 1 egg in A, B and C's nests" instead of three lines
      const prev = events[events.length - 1];
      if (prev && e.t === 'lay' && prev.t === 'lay' && prev.by === e.by && e.src !== e.to && prev.src !== prev.to0 && prev.n === e.n && !e.inverted) { prev.many.push(e.to); continue; }
      events.push(e.t === 'lay' ? { ...e, to0: e.to, many: [e.to] } : e);
    }
    for (const e of events) {
      if (e.t === 'blocked') { if (lastBlock === e.to) continue; lastBlock = e.to; }
      const f = VERB[e.t]; if (!f) continue;
      let [text, cls, badge] = f(g, e);
      if (e.many && e.many.length > 1) text = `laid ${plural(e.n, 'egg')} in each of ${e.many.slice(0, -1).join(', ')} and ${e.many[e.many.length - 1]}'s nests`;
      const actor = e.by || e.to;
      if (!canSee(actor)) continue;
      rows.push(`<div class="event ${cls}"><span class="mark">${MeowIcons.badge(badge)}</span><div>${who(g, actor)} ${e.as ? icOnly(e.as) : ''} ${esc(text)}</div></div>`);
    }
    return rows.join('') || '<div class="event"><div class="muted">A quiet night: nothing happened.</div></div>';
  }
  function dayLog(g, rec, entries, canSee) {
    let h = '';
    for (const e of entries) {
      const note = e.note && canSee(e.p) ? `<div class="thought">${esc(e.note)}</div>` : '';
      if (e.k === 'beat') h += `<div class="beat">${esc(e.label)} · ${e.n} of ${e.of}</div>`;
      else if (e.k === 'system') { if (!e.text.startsWith('Nest sizes:')) h += `<div class="sys">${esc(e.text)}</div>`; }
      else if (e.k === 'say') h += `<div class="msg">${e.anon && !canSee(e.p) ? '<span class="av" style="background:#59608a">?</span>' : avatar(g, e.p)}<div class="body"><div class="from">${e.anon && !canSee(e.p) ? 'Someone' : esc(e.p)}${e.anon ? '<span class="pill flower">eyes shut</span>' : ''}</div><div class="bubble">${esc(e.text)}</div>${note}</div></div>`;
      else if (e.k === 'whisper') { if (canSee(e.p) || canSee(e.to)) h += `<div class="msg whisper">${avatar(g, e.p)}<div class="body"><div class="from">${esc(e.p)} <span class="pill flower">whispers to ${esc(e.to)}</span></div><div class="bubble">${esc(e.text)}</div>${note}</div></div>`; }
      else if (e.k === 'quiet') { if (canSee(e.p) && e.note) h += `<div class="msg quiet">${avatar(g, e.p)}<div class="body"><div class="from">${esc(e.p)}</div><div class="bubble">stays quiet</div>${note}</div></div>`; }
      else if (e.k === 'caw') h += `<div class="sys caw">${esc(e.p)}: CAW CAW!${e.bluebell ? ' The Bluebell ends the day.' : e.need ? ` (${e.count} of ${e.need})` : ''}</div>${note ? `<div class="msg quiet"><span></span><div class="body">${note}</div></div>` : ''}`;
      else if (e.k === 'death') h += `<div class="sys death">${esc(e.text)}${e.by && !e.public_by && canSee(e.by) ? ` <span class="pill dead">${esc(e.by)} did it</span>` : ''}</div>${e.note && e.by && canSee(e.by) ? `<div class="msg quiet">${avatar(g, e.by)}<div class="body"><div class="thought">${esc(e.note)}</div></div></div>` : ''}`;
      else if (e.k === 'action') h += `<div class="sys act">${esc(e.text)}${e.secret && canSee(e.p) ? ` <span class="pill flower">${esc(e.secret)}</span>` : ''}</div>${note ? `<div class="msg quiet">${avatar(g, e.p)}<div class="body">${note}</div></div>` : ''}`;
    }
    return `<div class="chat">${h || '<div class="sys">Nobody said anything.</div>'}</div>`;
  }
  function susGrid(g, cyc, truth, showTruth) {
    const b = cyc.beliefs || {}, names = g.players;
    if (!Object.keys(b).length) return '';
    const cell = (v) => { if (v === undefined) return '<td class="self">–</td>'; const hue = 140 - v * 1.4; return `<td style="background:hsl(${hue} 62% ${48 + (50 - Math.abs(v - 50)) * .18}%)">${v}</td>`; };
    return `<div class="grid-scroll"><table class="sus"><tr><th></th>${names.map((n) => `<th>${esc(n)}</th>`).join('')}</tr>
      ${names.filter((n) => b[n]).map((n) => `<tr><th style="text-align:right">${esc(n)} thinks</th>${names.map((m) => m === n ? '<td class="self">·</td>' : cell(b[n].meowfia[m])).join('')}</tr>`).join('')}
      ${showTruth ? `<tr class="truth"><th style="text-align:right">The truth</th>${names.map((m) => `<td>${truth[m] === 'Meowfia' ? '<span class="pill cat">Cat</span>' : '<span class="pill farm">Farm</span>'}</td>`).join('')}</tr>` : ''}</table></div>
      <p class="muted small" style="text-align:center;margin-top:8px">Each player's private guess, before the vote, of how likely each other player was Meowfia (%).</p>
      ${showTruth ? `<div class="feelings">${names.filter((n) => b[n] && b[n].feeling).map((n) => `<div>${who(g, n)} ${b[n].claimed ? `<span class="pill">claimed ${esc(b[n].claimed)}</span>` : '<span class="pill">claimed nothing</span>'} “${esc(b[n].feeling)}”</div>`).join('')}</div>` : ''}`;
  }

  function roundView(g, rec) {
    const R = rec.round, s = spoil(R), see = (n) => sees(R, n);
    const start = rec.players;
    let step = 0;
    const title = (name, hint = '') => `<div class="phase-title"><span class="num">${++step}</span><h2>${name}</h2>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
    let h = '';
    // pool
    h += `<div class="phase">${title('The pool', 'Hold a card to inspect it')}<div class="pool-new">${rec.revealed.map((x) => {
      if (x.hidden && !s) return `<div class="card bigcard facedown"><div class="art"></div><div><div class="name">Face-down card</div><p>Hidden by the Lotus until the round ends.</p></div></div>`;
      const c = D.card[x.face] || {};
      return `<div class="card bigcard" data-card="${esc(x.face)}"><div class="art">${icon(x.face)}</div><div><div class="name">${esc(x.face)} <span class="pill ${typeClass(c.type)}">${c.type === 'flower' ? 'Flower' : c.team || ''}</span>${x.hidden ? ' <span class="pill">was face-down</span>' : ''}</div><p>${esc(c.text || '')}</p></div></div>`;
    }).join('')}</div>
      <div class="row wrap" style="margin-top:12px"><span class="muted small" style="font-weight:700">Animals in the pool</span>${rec.pool.map((a) => chip(a)).join('')}</div></div>`;
    // who was what
    const startPeople = Object.fromEntries(g.players.map((n) => [n, { ...start[n], nest: start[n].hand.length }]));
    h += `<div class="phase">${title('The deal', s ? 'Everyone\'s secret animal and nest' : 'Secret: each player knows only their own')}<div class="two">
      <div class="card pad">${table(g, startPeople, { show: see, label: `Round ${R}`, sub: (n) => see(n) ? esc(start[n].told !== start[n].role ? `thinks: ${start[n].told}` : start[n].role) : '' })}
        <div class="legend"><span><i style="background:var(--farm)"></i>Farm</span><span><i style="background:var(--cat)"></i>Meowfia</span><span>Number = cards in nest</span></div></div>
      <div class="roster">${g.players.map((n) => { const p = start[n]; return `<div class="line">${who(g, n)}<div class="what">${see(n) ? `${alignPill(p.alignment)}${chip(p.role)}${p.told !== p.role ? `<span class="pill confused">believes they are the ${esc(p.told)}</span>` : ''}${p.winks ? '<span class="pill amber">holds a Wink</span>' : ''}${hand(g, p.hand)}` : `<span class="muted small">${p.hand.length} cards in nest</span>`}</div></div>`; }).join('')}</div></div></div>`;
    if (rec.dusk) h += `<div class="phase">${title('Dusk', 'Nightshade: talk before the night')}${dayLog(g, rec, rec.dusk, see)}</div>`;

    rec.cycles.forEach((cyc, ci) => {
      const again = ci > 0 ? ' (again)' : '';
      const after = cyc.after_night || start;
      const truth = Object.fromEntries(g.players.map((n) => [n, after[n].alignment]));
      // night
      (cyc.nights || []).forEach((night, ni) => {
        const label = 'The night' + again + ((cyc.nights.length > 1) ? ` ${ni + 1}` : '');
        const anyone = s || (G.viewer && true);
        if (!anyone) { h += `<div class="phase">${title(label)}<div class="locked"><b>Everyone closes their eyes.</b>What happened in the dark is hidden while you play along.</div></div>`; return; }
        const arrows = [];
        for (const n of g.players) {
          if (!see(n)) continue;
          const d = night.declared[n], v = night.visits[n];
          if (d && d !== v) arrows.push({ from: n, to: d, color: 'dim', dash: true, width: 1.8, opacity: .7 });
          if (v) arrows.push({ from: n, to: v, color: 'amber' });
        }
        const people = Object.fromEntries(g.players.map((n) => [n, { ...start[n], nest: start[n].hand.length }]));
        h += `<div class="phase">${title(label, 'Arrows show who visited whom')}<div class="two">
          <div class="card pad">${table(g, people, { show: see, arrows, label: 'Night', tags: (n) => see(n) ? ((night.status || {})[n] || []).map((x) => `<span class="pill ${x}">${x}</span>`) : [] })}
            <div class="legend"><span><i style="background:var(--amber)"></i>Visit</span><span><i style="background:#8aa0d8"></i>Where they meant to go</span></div></div>
          <div><div class="events">${nightEvents(g, night, see)}</div>
          ${Object.entries(night.choices).filter(([n, c]) => see(n) && c.note).length ? `<h3 style="margin:16px 0 8px">What they were thinking</h3><div class="events">${Object.entries(night.choices).filter(([n, c]) => see(n) && c.note).map(([n, c]) => `<div class="event"><div>${who(g, n)} <span class="muted small">chose ${esc(c.targets.join(' and ') || (c.role ? '' : 'nobody'))}${c.role ? ` naming the ${esc(c.role)}` : ''}</span><div class="thought">${esc(c.note)}</div></div></div>`).join('')}</div>` : ''}</div></div></div>`;
      });
      // dawn
      const reps = Object.entries(cyc.reports || {}).filter(([n]) => see(n));
      h += `<div class="phase">${title('Dawn' + again, 'Each player\'s private report')}${reps.length ? `<div class="reports">${reps.map(([n, r]) => `<div class="card report"><div class="head">${who(g, n)}${r.confused ? '<span class="pill confused">confused</span>' : ''}<span class="delta ${r.reported > 0 ? 'up' : r.reported < 0 ? 'down' : ''}">${r.reported > 0 ? '+' : ''}${r.reported} ${Math.abs(r.reported) === 1 ? 'egg' : 'eggs'}</span></div>
        <ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}${r.confused && r.eggs !== r.reported ? `<li><b>In truth:</b> ${r.eggs > 0 ? '+' : ''}${r.eggs}.</li>` : ''}</ul>
        ${r.discarded.length ? `<div class="row wrap" style="margin-top:8px"><span class="muted small">Discarded</span>${hand(g, r.discarded)}</div>` : ''}</div>`).join('')}</div>` : `<div class="locked"><b>Reports are private.</b>Each player learns how many eggs their nest gained or lost, and what their animal found out.</div>`}
        ${(cyc.night_deaths || []).length ? `<div class="sys death" style="margin-top:12px">${cyc.night_deaths.map(esc).join(' and ')} ${cyc.night_deaths.length === 1 ? 'was' : 'were'} found dead in the morning.</div>` : ''}</div>`;
      if (rec.skipped && ci === rec.cycles.length - 1) {
        h += `<div class="phase">${title('The day' + again)}${dayLog(g, rec, cyc.day || [], see)}</div>`;
        return;
      }
      // day
      h += `<div class="phase">${title('The day' + again, 'What the table said')}
        <div class="row wrap" style="margin-bottom:12px"><span class="muted small" style="font-weight:700">Nests</span>${g.players.map((n) => `<span class="pill">${esc(n)} ${after[n].hand.length}</span>`).join('')}</div>
        ${dayLog(g, rec, cyc.day || [], see)}</div>`;
      // suspicions
      if (cyc.beliefs && Object.keys(cyc.beliefs).length) h += `<div class="phase">${title('Suspicions', 'Asked privately, just before the vote')}${s ? `<div class="card pad">${susGrid(g, cyc, truth, true)}</div>` : `<div class="locked"><b>What everyone privately believed</b>is revealed with the round.</div>`}</div>`;
      // vote
      const v = cyc.vote;
      if (v) {
        const arrows = Object.entries(v.throws).filter(([, t]) => g.players.includes(t.target)).map(([n, t]) => ({ from: n, to: t.target, label: String(t.cards.length), color: t.dead ? 'dim' : 'cat', width: 1.6 + t.cards.length * 1.1, dash: t.dead, bend: .1 }));
        const endPeople = Object.fromEntries(g.players.map((n) => [n, { ...after[n], nest: after[n].hand.length, dead: (v.throws[n] || {}).dead }]));
        const showRes = s && !v.again;
        let verdict = '';
        if (v.again) verdict = `<div class="verdict none"><div><h3>The Bottlebrush took the most eggs</h3><div class="muted small">Nobody is eggsecuted. The round goes back to night.</div></div></div>`;
        else if (!v.eliminated.length) verdict = `<div class="verdict none"><div><h3>Nobody was eggsecuted</h3></div></div>`;
        else if (!s) verdict = `<div class="verdict none"><div class="grow"><h3>${v.eliminated.map(esc).join(' and ')} ${v.eliminated.length > 1 ? 'are' : 'is'} eggsecuted</h3><div class="muted small">Were they a cat? Make your guess, then reveal.</div></div><button class="btn primary" data-reveal="${R}">Reveal round ${R}</button></div>`;
        else verdict = v.eliminated.map((e) => { const a = v.revealed[e]; return `<div class="verdict ${a === 'Meowfia' ? 'farm' : 'cat'}">${avatar(g, e)}<div><h3>${esc(e)} was ${a === 'Meowfia' ? 'a cat' : 'Farm'}.</h3><div class="small">${a === 'Meowfia' ? 'Farm wins the round.' : truth && Object.values(truth).every((x) => x === 'Farm') ? 'There were no cats at all: everyone\'s thrown eggs are lost.' : 'Meowfia wins the round.'}${v.goose ? ' The Goose is in the pool, so winners and losers swap.' : ''}${v.corpse ? ' (The Corpse Flower kept this hidden from the table.)' : ''}</div></div></div>`; }).join('');
        h += `<div class="phase">${title('Eggsecution' + again, 'Arrows are thrown eggs; the number is how many')}<div class="two">
          <div class="card pad">${table(g, endPeople, { show: see, arrows, out: v.eliminated, label: 'The throw', sub: (n) => v.tally[n] ? `${v.tally[n]} vote${v.tally[n] === 1 ? '' : 's'}` : '' })}</div>
          <div class="throws">${Object.entries(v.throws).map(([n, t]) => { const res = (v.results || {})[n]; return `<div class="throw"><div class="l1">${who(g, n)}<span class="arrow">→</span>${g.players.includes(t.target) ? who(g, t.target) : `<b>${esc(t.target)}</b>`}
            ${see(n) ? hand(g, t.cards) : `<span class="pill">${plural(t.cards.length, 'card')}</span>`}${t.dead ? '<span class="pill dead">dead: no votes</span>' : ''}${t.grudge ? '<span class="pill flower">Grudge ×2</span>' : ''}
            ${showRes && res ? (res.result === 'won' ? `<span class="pill farm">banked ${res.points}</span>` : res.result === 'clownfish' ? '<span class="pill flower">taken by the Clownfish</span>' : `<span class="pill cat">${res.result === 'nothing' ? 'scored nothing' : 'lost'}</span>${res.back ? `<span class="pill">got back</span>${egg(g, res.back)}` : ''}`) : ''}</div>
            ${t.note && see(n) ? `<div class="thought">${esc(t.note)}</div>` : ''}</div>`; }).join('')}</div></div>
          <div style="margin-top:14px;display:grid;gap:10px">${verdict}</div></div>`;
      }
    });
    if (rec.exclusive_winner) h += `<div class="phase"><div class="verdict farm">${avatar(g, rec.exclusive_winner)}<div><h3>${esc(rec.exclusive_winner)} won the round alone</h3><div class="small">Every guess in the challenge was right. Nobody else scores this round.</div></div></div></div>`;
    if (s) {
      const end = rec.end;
      h += `<div class="phase">${title('After the round')}<div class="two"><div class="card pad"><h3 style="margin-bottom:12px">Scores</h3>${scoreBars(g, rec.scores, rec.gained)}</div>
        <div class="roster">${g.players.map((n) => { const a = end[n], b = start[n]; const ch = a.role !== b.role || a.alignment !== b.alignment; return `<div class="line">${who(g, n)}<div class="what">${alignPill(a.alignment)}${chip(a.role)}${ch ? `<span class="pill amber">was ${esc(b.alignment)} ${esc(b.role)}</span>` : ''}</div></div>`; }).join('')}</div></div></div>`;
    } else h += `<div class="reveal-bar"><div class="grow"><b>Finished reading round ${R}?</b><div class="muted small">Reveal every secret: who was what, what happened at night, what everyone was thinking.</div></div><button class="btn primary" data-reveal="${R}">Reveal round ${R}</button></div>`;
    const idx = g.rounds.indexOf(rec);
    h += `<div class="row" style="margin-top:26px;justify-content:space-between">${idx > 0 ? `<a class="btn" href="#/game/${encodeURIComponent(g.id)}/r${g.rounds[idx - 1].round}">← Round ${g.rounds[idx - 1].round}</a>` : `<a class="btn" href="#/game/${encodeURIComponent(g.id)}">← Overview</a>`}
      ${idx < g.rounds.length - 1 ? `<a class="btn primary" href="#/game/${encodeURIComponent(g.id)}/r${g.rounds[idx + 1].round}">Round ${g.rounds[idx + 1].round} →</a>` : `<a class="btn primary" href="#/game/${encodeURIComponent(g.id)}">Overview →</a>`}</div>`;
    return h;
  }

  /* ---------- card inspector (hold a card) ---------- */
  async function latestSim() {
    if (D.sim !== null) return D.sim;
    D.sim = false;
    if (D.sims.length) { try { D.sim = await getData(`sims/${D.sims[0].id}.json`); } catch { /* none */ } }
    return D.sim;
  }
  async function openCard(name) {
    const c = D.card[name]; if (!c) return;
    const sheet = $('#sheet');
    const seen = D.games.reduce((n, g) => n + g.rounds.filter((r) => (r.revealed || []).includes(name)).length, 0);
    const kind = c.type === 'flower' ? `<span class="pill flower">Flower · ${esc(c.group)}</span>` : `<span class="pill ${typeClass(c.type)}">${esc(c.team)}</span><span class="pill">${MeowIcons.badge(c.ability)} ${esc(D.cards.abilities[c.ability])}</span>${c.buffer ? '<span class="pill amber">Always in the pool</span>' : ''}`;
    const body = (stats) => `<div class="sheet-card" role="dialog" aria-label="${esc(name)}">
      <div class="sheet-head"><div class="art">${icon(name)}</div><div><h2>${esc(name)}</h2><div class="row wrap" style="margin-top:6px">${kind}</div></div></div>
      <div class="sheet-text">${esc(c.text)}</div>
      ${c.implemented === false ? '<p class="small"><span class="pill dead">Not simulated yet</span> This flower is left out of the deck.</p>' : ''}
      ${c.reading ? `<h4>How the simulator reads it</h4><p>${esc(c.reading)}</p>` : ''}
      ${c.note ? `<h4>At a text table</h4><p>${esc(c.note)}</p>` : ''}
      ${c.tiers && c.tiers.length ? `<h4>When it acts at night</h4><div class="row wrap">${c.tiers.map((t) => `<span class="pill">${esc(t.name)}</span>`).join('')}</div>` : c.type !== 'flower' ? '<h4>When it acts at night</h4><p>It has no night effect of its own.</p>' : ''}
      ${stats}
      <button class="btn sheet-close" data-close>Close</button></div>`;
    const realLine = `<div class="stat"><b>${seen}</b><span>times revealed in real games</span></div>`;
    sheet.innerHTML = body(`<h4>In play</h4><div class="statgrid">${realLine}</div>`);
    sheet.hidden = false;
    const sim = await latestSim();
    if (!sim || sheet.hidden || !$('.sheet-head h2', sheet) || $('.sheet-head h2', sheet).textContent !== name) return;
    let st = realLine;
    if (c.type === 'flower') { const f = sim.flowers.find((x) => x.name === name); st += `<div class="stat"><b>${f ? pct(f.share, 1) : '0%'}</b><span>of simulated rounds had it</span></div>`; }
    else {
      const r = sim.roles.find((x) => x.name === name);
      if (r && r.dealt) st += `<div class="stat"><b>${pct(r.effect_rate)}</b><span>of nights it did something</span></div><div class="stat"><b>${pct(r.blocked_rate)}</b><span>of nights it was hugged</span></div><div class="stat"><b>${r.eggs_moved}</b><span>eggs moved per night</span></div><div class="stat"><b>${r.dealt}</b><span>times dealt in ${sim.games} simulated games</span></div>`;
    }
    $('.sheet-card', sheet).outerHTML = body(`<h4>In play</h4><div class="statgrid">${st}</div><p class="tiny faint" style="margin-top:8px">Simulation figures come from random bots (${esc(sim.variant)}): they show what the card does, not how well people use it.</p>`);
  }
  function closeSheet() { $('#sheet').hidden = true; }
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  // Hold (touch or mouse) to inspect; a plain mouse click also works.
  let press = null;
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-card]'); if (!el) return;
    el.classList.add('pressing');
    press = { el, x: e.clientX, y: e.clientY, fired: false, timer: setTimeout(() => { press.fired = true; el.classList.remove('pressing'); if (navigator.vibrate) navigator.vibrate(8); openCard(el.dataset.card); }, 380) };
  });
  const cancelPress = () => { if (press) { clearTimeout(press.timer); press.el.classList.remove('pressing'); } };
  document.addEventListener('pointermove', (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { cancelPress(); press = null; } });
  document.addEventListener('pointerup', (e) => {
    if (!press) return;
    cancelPress();
    const { el, fired } = press; press = null;
    if (!fired && e.pointerType === 'mouse') openCard(el.dataset.card);
  });
  document.addEventListener('pointercancel', () => { cancelPress(); press = null; });
  document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-card]')) e.preventDefault(); });
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-card]'); if (el && el.closest('a')) e.preventDefault(); }, true);

  /* ---------- cards ---------- */
  const CF = { type: 'all', ability: '', q: '' };
  function tile(c) {
    const off = c.implemented === false;
    return `<div class="tile ${off ? 'off' : ''}" data-card="${esc(c.name)}"><div class="art">${icon(c.name)}</div><div class="name">${esc(c.name)}</div>
      <div class="tkind">${c.type === 'flower' ? `${MeowIcons.badge('flower')} ${esc(c.group)}` : `${MeowIcons.badge(c.ability)} ${esc(D.cards.abilities[c.ability])}`}</div></div>`;
  }
  function viewCards(open) {
    const all = [...D.cards.roles, ...D.cards.flowers];
    const draw = () => {
      const q = CF.q.trim().toLowerCase();
      const list = all.filter((c) => (CF.type === 'all' || c.type === CF.type) && (!CF.ability || c.ability === CF.ability || c.group === CF.ability) && (!q || c.name.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)));
      const groups = [['farm', 'Farm animals'], ['meowfia', 'Meowfia cats'], ['flower', 'Flowers']];
      $('#cardlist').innerHTML = groups.map(([t, label]) => { const items = list.filter((c) => c.type === t); return items.length ? `<div class="section"><h2>${label} <span class="count">${items.length}</span></h2><div class="tiles">${items.map(tile).join('')}</div></div>` : ''; }).join('') || '<div class="empty">No cards match.</div>';
      const ab = CF.type === 'flower' ? [...new Set(D.cards.flowers.map((f) => f.group))].map((x) => [x, x]) : Object.entries(D.cards.abilities);
      $('#abil').innerHTML = ab.map(([k, l]) => `<button class="fchip ${CF.ability === k ? 'on' : ''}" data-ab="${esc(k)}">${CF.type === 'flower' ? '' : MeowIcons.badge(k)}${esc(l)}</button>`).join('');
      $$('#ctype button').forEach((b) => b.classList.toggle('on', b.dataset.t === CF.type));
    };
    app.innerHTML = `<div class="page-head"><h1>Cards</h1><p>Every animal and flower in Meowfia. Tap or hold a card for its full text, how the simulator reads it and how it behaves in play.</p></div>
      <div class="filters"><div class="seg" id="ctype"><button data-t="all">All</button><button data-t="farm">Farm</button><button data-t="meowfia">Meowfia</button><button data-t="flower">Flowers</button></div>
      <input type="text" id="cq" placeholder="Search cards" value="${esc(CF.q)}" aria-label="Search cards"></div>
      <div class="chips-row" id="abil"></div><div id="cardlist"></div>`;
    $('#ctype').onclick = (e) => { const b = e.target.closest('button'); if (b) { CF.type = b.dataset.t; CF.ability = ''; draw(); } };
    $('#abil').onclick = (e) => { const b = e.target.closest('button'); if (b) { CF.ability = CF.ability === b.dataset.ab ? '' : b.dataset.ab; draw(); } };
    $('#cq').oninput = (e) => { CF.q = e.target.value; draw(); };
    draw();
    if (open && D.card[open]) openCard(open);
  }

  /* ---------- rules ---------- */
  function rulesHTML(text) {
    const out = []; let list = null;
    const flush = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null; } };
    const rich = (s) => esc(s).replace(/^([A-Z][A-Za-z' ]{1,28}):/, '<b>$1:</b>');
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line) { flush(); continue; }
      if (/^[A-Z][A-Z :,']+$/.test(line) && line.length < 60) { flush(); out.push(`<h3>${esc(line.replace(/^RULES: /, ''))}</h3>`); continue; }
      const m = line.match(/^(-|\d+\.)\s+(.*)$/);
      if (m) { const tag = m[1] === '-' ? 'ul' : 'ol'; if (!list || list.tag !== tag) { flush(); list = { tag, items: [] }; } list.items.push(rich(m[2])); continue; }
      flush(); out.push(`<p>${rich(line)}</p>`);
    }
    flush();
    return out.join('');
  }
  const showVal = (v) => Array.isArray(v) ? (v.length > 6 ? `${v.length} items` : v.join(', ') || 'none') : String(v);
  function viewRules(name) {
    const v = D.variants.find((x) => x.name === name) || D.variants[0];
    app.innerHTML = `<div class="page-head"><h1>Rules</h1><p>The rules exactly as the players read them, generated from the variant's settings.</p></div>
      <div class="filters"><label class="field" style="min-width:240px"><span>Game version</span><select id="vsel">${D.variants.map((x) => `<option ${x.name === v.name ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <div class="grow"><div class="muted">${esc(v.description)}</div>${v.extends ? `<div class="small faint">Based on ${esc(v.extends)}</div>` : ''}</div></div>
      ${v.changes.length ? `<div class="section"><h2>What this version changes</h2><div class="card pad"><dl class="kv">${v.changes.map((c) => `<dt>${esc(c.key)}</dt><dd>${esc(showVal(c.to))} <span class="faint">(was ${esc(showVal(c.from ?? 'unset'))})</span></dd>`).join('')}</dl></div></div>` : ''}
      <div class="section"><h2>Settings</h2><div class="settings">${Object.entries(v.settings).map(([sec, kv]) => `<div class="card pad"><h3>${esc(sec)}</h3><dl class="kv">${Object.entries(kv).map(([k, val]) => `<dt>${esc(k.replace(/_/g, ' '))}</dt><dd>${esc(showVal(val))}</dd>`).join('')}</dl></div>`).join('')}</div></div>
      <div class="section"><h2>The rules</h2><div class="card pad rules-text">${rulesHTML(v.rules)}</div></div>`;
    $('#vsel').onchange = (e) => { location.hash = '#/rules/' + encodeURIComponent(e.target.value); };
  }

  /* ---------- simulations ---------- */
  const SUM = [['no_meowfia_rounds', 'rounds with no Meowfia', 'p'], ['meowfia_per_round', 'Meowfia per round', 'n'], ['mean_nest_at_vote', 'cards in a nest at the vote', 'n'],
    ['mean_egg_change', 'eggs gained per player per night', 'n'], ['night_deaths_per_round', 'night deaths per round', 'n'], ['day_deaths_per_round', 'day deaths per round', 'n'],
    ['hugs_per_night', 'hugs per night', 'n'], ['confusions_per_night', 'confusions per night', 'n'], ['players_changing_animal_per_round', 'players whose animal changed, per round', 'n'],
    ['players_changing_alignment_per_round', 'players who changed side, per round', 'n'], ['redirects_per_night', 'redirected visits per night', 'n'], ['all_meowfia_rounds', 'rounds where everyone was Meowfia', 'p'],
    ['skipped_rounds', 'rounds skipped', 'p'], ['games_ended_early', 'games cut short (deck ran out)', 'n']];
  function viewSims() {
    app.innerHTML = `<div class="page-head"><h1>Simulations</h1><p>Hundreds of games played by random bots in a few seconds. They show how the rules behave mechanically: how often an ability has any effect, how large nests grow, how often nobody is Meowfia. They say nothing about how people would play.</p></div>
      ${D.sims.length ? `<div class="games">${D.sims.map((s) => `<a class="card game-card" href="#/sim/${encodeURIComponent(s.id)}"><div class="when"><span>${when(s.started)}</span><span>·</span><span>${esc(s.variant)}</span>${overrides(s.overrides)}</div>
        <div class="headline">${s.games} games, ${s.players} players</div>
        <div class="podium"><span class="pill">${pct(s.summary.no_meowfia_rounds)} no-cat rounds</span><span class="pill">nest ${s.summary.mean_nest_at_vote} at the vote</span><span class="pill">${s.summary.night_deaths_per_round} night deaths / round</span>${s.errors ? `<span class="pill cat">${s.errors} crashes</span>` : '<span class="pill farm">no crashes</span>'}</div></a>`).join('')}</div>` : '<div class="empty">No simulation sets yet. Start one from <a href="#/new"><b>New run</b></a>.</div>'}`;
  }
  const SORT = { key: 'dealt', dir: -1 };
  async function viewSim(id) {
    app.innerHTML = '<div class="loading">Loading the simulation set</div>';
    let s; try { s = await getData(`sims/${id}.json`); } catch { app.innerHTML = '<div class="empty">This simulation set could not be loaded.</div>'; return; }
    const bars = (rows, fmt = (v) => v) => { const max = Math.max(...rows.map((r) => r.share), .0001); return `<div class="bars">${rows.map((r) => `<div class="bar-row"><span>${fmt(r.value)}</span><div class="track"><i style="width:${r.share / max * 100}%"></i></div><span class="v">${pct(r.share)}</span></div>`).join('')}</div>`; };
    const rolesTable = () => {
      const rows = [...s.roles].sort((a, b) => { const x = a[SORT.key] ?? -1, y = b[SORT.key] ?? -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * SORT.dir; });
      return `<div class="tablewrap"><table class="data"><thead><tr>${[['name', 'Animal'], ['dealt', 'Dealt'], ['effect_rate', 'Did something'], ['blocked_rate', 'Hugged'], ['eggs_moved', 'Eggs moved / night'], ['eggs_self', 'Eggs for itself']].map(([k, l]) => `<th data-sort="${k}">${l}${SORT.key === k ? (SORT.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('')}<th>What it did (per night)</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${chip(r.name)}</td><td>${r.dealt}</td><td>${r.dealt ? `<span class="inline-bar"><i style="width:${r.effect_rate * 100}%"></i></span>${pct(r.effect_rate)}` : '–'}</td><td>${r.dealt ? pct(r.blocked_rate) : '–'}</td><td>${r.dealt ? r.eggs_moved : '–'}</td><td>${r.dealt ? r.eggs_self : '–'}</td>
          <td class="small muted">${r.events ? Object.entries(r.events).map(([k, v]) => `${k.replace('_', ' ')} ${v}`).join(' · ') : ''}</td></tr>`).join('')}</tbody></table></div>`;
    };
    app.innerHTML = `<div class="crumbs"><a href="#/sims">Simulations</a> / ${when(s.started)}</div>
      <div class="page-head" style="margin-top:8px"><h1>${s.games} games of ${esc(s.variant)}</h1>
      <div class="game-meta" style="margin-top:10px">${overrides((s.settings || {}).overrides)}<span class="pill">${s.players} players</span><span class="pill">${s.rounds_per_game} rounds</span><span class="pill">${s.seconds}s</span>${s.error_count ? `<span class="pill cat">${s.error_count} crashes</span>` : '<span class="pill farm">no crashes</span>'}</div>
      <p>Played by random bots, so these are facts about the rules, not about good play.</p></div>
      ${s.error_count ? `<div class="card pad" style="border-color:var(--cat)"><h3>Crashes</h3><ul class="list">${s.errors.map((e) => `<li>Seed ${e.seed}: ${esc(e.error)}</li>`).join('')}</ul></div>` : ''}
      <div class="stat-tiles">${SUM.map(([k, l, f]) => `<div class="stat"><b>${f === 'p' ? pct(s.summary[k], 1) : s.summary[k]}</b><span>${l}</span></div>`).join('')}</div>
      <div class="section three"><div class="card pad"><h3 style="margin-bottom:10px">Meowfia in a round</h3>${bars(s.meowfia_count)}</div>
        <div class="card pad"><h3 style="margin-bottom:10px">Cards in a nest at the vote</h3>${bars(s.nest_at_vote)}</div>
        <div class="card pad"><h3 style="margin-bottom:10px">Eggs gained or lost in a night</h3>${bars(s.egg_change, (v) => (v > 0 ? '+' : '') + v)}</div></div>
      <div class="section"><h2>Animals</h2><p class="muted small" style="margin:-6px 0 12px">“Did something” counts nights where the ability changed anything or told anyone anything. A low figure means the card often has no visible effect.</p><div id="roles">${rolesTable()}</div></div>
      <div class="section"><h2>Flowers</h2><div class="card pad"><div class="row wrap">${s.flowers.sort((a, b) => b.rounds - a.rounds).map((f) => chip(f.name, ` <span class="faint">${pct(f.share, 1)}</span>`)).join('') || '<span class="muted">No flowers appeared.</span>'}</div><p class="muted small" style="margin-top:10px">Share of rounds in which each flower was active.</p></div></div>`;
    $('#roles').onclick = (e) => { const th = e.target.closest('th[data-sort]'); if (!th) return; if (SORT.key === th.dataset.sort) SORT.dir *= -1; else { SORT.key = th.dataset.sort; SORT.dir = th.dataset.sort === 'name' ? 1 : -1; } $('#roles').innerHTML = rolesTable(); };
  }

  /* ---------- new run ---------- */
  let poll = null;
  function stopPolling() { if (poll) { clearInterval(poll); poll = null; } }
  const F = store.get('form', { kind: 'game', variant: '', players: 6, rounds: 3, seed: '', model: 'sonnet', review: 'opus', probes: true, games: 500, first: [], set: '' });
  function viewNew() {
    const control = D.config.control;
    app.innerHTML = `<div class="page-head"><h1>New run</h1><p>Runs happen on your own PC and use your Claude subscription, so this page only works from a device on your Tailscale network.</p></div>
      <div class="card pad row" id="conn"><span class="status-dot"></span><div class="grow"><b>Looking for the PC</b><div class="muted small">${selfHosted() ? 'This is the PC\x27s own copy of the site.' : control ? esc(control) : 'No control address is configured.'}</div></div></div>
      <div id="runui"></div>`;
    if (!control) { $('#conn').innerHTML = '<span class="status-dot bad"></span><div class="grow"><b>Not set up</b><div class="muted small">The site has no control address yet.</div></div>'; return; }
    if (!canCall()) {                             // the public site: hand over to the PC's own copy
      $('#conn').innerHTML = `<span class="status-dot"></span><div class="grow"><b>Runs are started from your PC's copy of this site</b><div class="muted small">It opens only on a device connected to your Tailscale network. It has the same pages, plus the controls to start, watch and stop runs.</div></div><a class="btn primary" href="${esc(control)}/#/new">Open the run page</a>`;
      return;
    }
    ctl('/api/status', { timeout: 5000 }).then((st) => { connected(st); poll = setInterval(refresh, 2500); }).catch(() => {
      $('#conn').innerHTML = `<span class="status-dot bad"></span><div class="grow"><b>Can't reach the PC</b><div class="muted small">Turn on Tailscale on this device and make sure the PC is on, then <a href="javascript:location.reload()"><u>try again</u></a>. Everything else on this site works without it.</div></div>`;
    });
  }
  function connected(st) {
    $('#conn').innerHTML = `<span class="status-dot ok"></span><div class="grow"><b>Connected to the PC</b><div class="muted small">${st.running ? 'A run is in progress.' : 'Idle and ready.'}</div></div>`;
    if (!F.variant || !st.variants.includes(F.variant)) F.variant = st.variants[0];
    const cardNames = [...D.cards.roles.filter((r) => !r.buffer), ...D.cards.flowers.filter((f) => f.implemented !== false)].map((c) => c.name).sort();
    $('#runui').innerHTML = `<div class="section" id="runs"></div>
      <div class="section"><h2>Start a run</h2><form class="form card pad" id="form">
        <div class="kind-pick"><button type="button" class="kind ${F.kind === 'game' ? 'on' : ''}" data-kind="game"><b>Real game</b><span>Claude plays every seat. You get a full replay, a recap and a review. Takes a few minutes and uses your subscription.</span></button>
          <button type="button" class="kind ${F.kind === 'sim' ? 'on' : ''}" data-kind="sim"><b>Simulation set</b><span>Hundreds of random-bot games in seconds, reported as statistics about the mechanics. Free.</span></button></div>
        <div class="form-grid">
          <label class="field"><span>Game version</span><select name="variant">${st.variants.map((v) => `<option ${v === F.variant ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
          <label class="field"><span>Players</span><select name="players">${[4, 5, 6, 7, 8].map((n) => `<option ${n == F.players ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="field"><span>Rounds</span><select name="rounds">${[1, 2, 3, 4, 5, 6].map((n) => `<option ${n == F.rounds ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="field"><span>Seed</span><input type="number" name="seed" value="${esc(F.seed)}" placeholder="random"><small>The same seed gives the same starting deck, hands and alignment rolls.</small></label>
        </div>
        <div class="form-grid" data-for="game">
          <label class="field"><span>Players' model</span><select name="model">${['haiku', 'sonnet', 'opus'].map((m) => `<option ${m === F.model ? 'selected' : ''}>${m}</option>`).join('')}</select><small>Sonnet plays well; Haiku is quicker and lighter on usage.</small></label>
          <label class="field"><span>Reviewer</span><select name="review">${['opus', 'sonnet', 'haiku', 'none'].map((m) => `<option ${m === F.review ? 'selected' : ''}>${m}</option>`).join('')}</select><small>Writes the recap and scores after the game.</small></label>
          <label class="field"><span>Pre-vote survey</span><select name="probes"><option value="1" ${F.probes ? 'selected' : ''}>Ask who they suspect</option><option value="0" ${F.probes ? '' : 'selected'}>Skip</option></select><small>One extra question per player per round.</small></label>
        </div>
        <div class="form-grid" data-for="sim">
          <label class="field"><span>Number of games</span><select name="games">${[100, 300, 500, 1000, 3000].map((n) => `<option ${n == F.games ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span>Force cards into the first pool (up to 3)</span>
          <div class="row wrap" id="first">${(F.first || []).map((n) => `<span class="chip" data-drop="${esc(n)}"><span class="ic">${icon(n)}</span>${esc(n)} ✕</span>`).join('')}
            <select id="addfirst" style="width:auto"><option value="">Add a card…</option>${cardNames.map((n) => `<option>${esc(n)}</option>`).join('')}</select></div>
          <small>Useful for testing one animal or flower.</small></label>
        <label class="field"><span>Rule changes for this run only</span><textarea name="set" rows="3" placeholder="one per line, for example:&#10;day.beats=6&#10;game.starting_hand=5">${esc(F.set)}</textarea>
          <small>Any setting from the <a href="#/rules"><u>Rules</u></a> page, written as section.key=value.</small></label>
        <div class="row"><button class="btn primary" type="submit">Start</button><span class="muted small" id="formmsg"></span></div>
      </form></div>`;
    const form = $('#form');
    const sync = () => { $$('[data-for]', form).forEach((el) => { el.style.display = el.dataset.for === F.kind ? '' : 'none'; }); $$('.kind', form).forEach((b) => b.classList.toggle('on', b.dataset.kind === F.kind)); };
    sync();
    form.onclick = (e) => {
      const k = e.target.closest('.kind'); if (k) { F.kind = k.dataset.kind; sync(); }
      const d = e.target.closest('[data-drop]'); if (d) { F.first = F.first.filter((x) => x !== d.dataset.drop); store.set('form', F); connected(st); }
    };
    $('#addfirst').onchange = (e) => { if (e.target.value && (F.first || []).length < 3) { F.first = [...(F.first || []), e.target.value]; store.set('form', F); connected(st); } };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      Object.assign(F, { variant: fd.get('variant'), players: +fd.get('players'), rounds: +fd.get('rounds'), seed: fd.get('seed'), model: fd.get('model'), review: fd.get('review'), probes: fd.get('probes') === '1', games: +fd.get('games'), set: fd.get('set') });
      store.set('form', F);
      const set = F.set.split('\n').map((x) => x.trim()).filter(Boolean);
      if (F.first && F.first.length) set.push('game.first_reveal=' + JSON.stringify(F.first));
      $('#formmsg').textContent = 'Starting…';
      try {
        await ctl('/api/run', { method: 'POST', body: JSON.stringify({ type: F.kind, variant: F.variant, players: F.players, rounds: F.rounds, seed: F.seed === '' ? null : +F.seed, model: F.model, review_model: F.review, probes: F.probes, games: F.games, set }) });
        $('#formmsg').textContent = 'Queued.';
        refresh();
      } catch (err) { $('#formmsg').textContent = 'Could not start: ' + err.message; }
    };
    showRuns(st);
  }
  async function refresh() {
    try { showRuns(await ctl('/api/status')); } catch { /* keep the last view */ }
  }
  function showRuns(st) {
    const box = $('#runs'); if (!box) return;
    const item = (r) => {
      const link = r.state === 'done' ? `<a class="btn small primary" href="#/${r.type === 'sim' ? 'sim' : 'game'}/${encodeURIComponent(r.id)}">Open</a>` : '';
      const state = { queued: '<span class="pill">Queued</span>', running: '<span class="pill amber">Running</span>', done: '<span class="pill farm">Finished</span>', stopped: '<span class="pill cat">Stopped</span>', failed: '<span class="pill cat">Failed</span>' }[r.state] || '';
      return `<div class="queue-item">${state}<div class="grow"><b>${r.type === 'sim' ? `Simulation set: ${r.games} games` : 'Real game'}</b> <span class="muted">· ${esc(r.variant)} · ${r.players} players${r.type === 'game' ? ' · ' + esc(r.model) : ''}</span>
        ${r.message ? `<div class="small muted">${esc(r.message)}</div>` : ''}</div>
        ${r.state === 'running' || r.state === 'queued' ? `<button class="btn small danger" data-stop="${esc(r.id)}">Stop</button>` : ''}
        ${r.state === 'stopped' && r.type === 'game' && r.resumable ? `<button class="btn small" data-resume="${esc(r.id)}">Continue</button>` : ''}${link}</div>`;
    };
    const run = st.running;
    box.innerHTML = `${run ? `<h2>Now running</h2>${item(run)}
        <div style="margin:10px 0"><div class="row small muted" style="justify-content:space-between;margin-bottom:5px"><span>${esc(run.phase || 'Starting')}</span><span>${run.elapsed || ''}${run.calls ? ' · ' + run.calls + ' turns' : ''}</span></div><div class="progress"><i style="width:${Math.round((run.progress || 0) * 100)}%"></i></div></div>
        ${run.tail && run.tail.length ? `<div class="live" id="live">${esc(run.tail.join('\n'))}</div>` : ''}` : ''}
      ${st.queue.length ? `<h2 style="margin-top:18px">Waiting</h2><div style="display:grid;gap:8px">${st.queue.map(item).join('')}</div>` : ''}
      ${st.recent.length ? `<h2 style="margin-top:18px">Recent</h2><div style="display:grid;gap:8px">${st.recent.map(item).join('')}</div>` : ''}`;
    const live = $('#live'); if (live) live.scrollTop = live.scrollHeight;
    box.onclick = async (e) => {
      const s = e.target.closest('[data-stop]'), r = e.target.closest('[data-resume]');
      if (s) { await ctl('/api/stop', { method: 'POST', body: JSON.stringify({ id: s.dataset.stop }) }).catch(() => {}); refresh(); }
      if (r) { await ctl('/api/resume', { method: 'POST', body: JSON.stringify({ id: r.dataset.resume }) }).catch(() => {}); refresh(); }
    };
    $$('.status-dot.ok').forEach((d) => { const t = d.parentElement.querySelector('.muted'); if (t) t.textContent = run ? 'A run is in progress.' : 'Idle and ready.'; });
    if (st.finished_since && st.finished_since.length) {       // pick up newly finished runs in the lists
      for (const x of st.finished_since) { const list = x.type === 'sim' ? D.sims : D.games; if (x.entry && !list.find((y) => y.id === x.id)) list.unshift(x.entry); }
    }
  }

  boot();
})();
