/* Meowfia Lab. Plain JavaScript, no build step: a hash router, a few page renderers and one event handler per page.
   Sections: data, small pieces, router, games, replay, card sheet, cards, rules, simulations, run builder. */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');
  const ui = MeowIcons.ui;
  const SEAT = ['#e9a23b', '#4c9bd6', '#e2709a', '#58b06a', '#9478de', '#ee7f52', '#38b9a8', '#b9a833'];
  const D = { cards: null, variants: [], games: [], sims: [], config: {}, card: {}, sim: null, meta: null };
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem('meowfia.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem('meowfia.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* ================= data ================= */
  let stamp = '';
  async function getJSON(path, fresh) {
    const r = await fetch(path + '?v=' + (fresh ? Date.now() : stamp), fresh ? { cache: 'no-store' } : undefined);
    if (!r.ok) throw new Error(path + ': ' + r.status);
    return r.json();
  }
  // The control service is this very site when the PC serves it ("SELF"). From the public https site a browser
  // will not call an http address, so there the run page hands over to the PC's copy instead.
  const selfHosted = () => D.config.control === 'SELF';
  const controlBase = () => (selfHosted() ? '' : D.config.control || '');
  const canCall = () => selfHosted() || (!!D.config.control && (location.protocol !== 'https:' || D.config.control.startsWith('https:')));
  async function ctl(path, opts = {}) {
    if (!canCall()) throw new Error('unreachable');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeout || 8000);
    try {
      const r = await fetch(controlBase() + path, { method: opts.body ? 'POST' : 'GET', body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctrl.signal, headers: opts.body ? { 'Content-Type': 'application/json' } : undefined, cache: 'no-store' });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'The PC answered ' + r.status);
      return data;
    } finally { clearTimeout(t); }
  }
  async function getData(path) {
    try { return await getJSON('data/' + path); }
    catch (e) { return getJSON('data/' + path, true); }
  }
  async function boot() {
    chrome();
    try {
      D.config = await getJSON('data/config.json', true).catch(() => ({}));
      stamp = encodeURIComponent(D.config.built || Date.now());
      const [cards, variants, games, sims] = await Promise.all([getJSON('data/cards.json'), getJSON('data/variants.json'), getJSON('data/games/index.json'), getJSON('data/sims/index.json')]);
      Object.assign(D, { cards, variants, games, sims, meta: cards.meta });
      for (const c of [...cards.roles, ...cards.flowers]) D.card[c.name] = c;
    } catch (e) {
      app.innerHTML = `<div class="page"><div class="empty"><b>The site's data could not be loaded.</b><span>${esc(e.message)}</span></div></div>`;
      return;
    }
    window.addEventListener('hashchange', route);
    route();
  }

  /* ================= small pieces ================= */
  const typeOf = (name) => (D.card[name] ? D.card[name].type : 'unknown');
  const icon = (name) => MeowIcons.svg(name, typeOf(name));
  const sideClass = (a) => (a === 'Farm' ? 'farm' : a === 'Meowfia' ? 'cat' : '');
  const plural = (n, w, ws) => `${n} ${n === 1 ? w : ws || w + 's'}`;
  const pct = (x, digits = 0) => (x * 100).toFixed(digits) + '%';
  const list = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function when(iso, short) {
    if (!iso) return '';
    const d = new Date(iso);
    const day = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: short ? undefined : 'numeric' });
    return short ? day : day + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const MODEL = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus', fable: 'Fable' };
  const model = (m) => MODEL[m] || cap(String(m || ''));
  function modelsOf(g) {
    const extra = Object.values(g.seat_models || {}).filter((m) => m && m !== g.model);
    return extra.length ? 'Mixed models' : model(g.model);
  }
  // A card anywhere on the site: tap or hold it to inspect.
  const cchip = (name, extra = '') => (name ? `<button type="button" class="cchip ${typeOf(name)}" data-card="${esc(name)}"><span class="cchip-art">${icon(name)}</span><span>${esc(name)}</span>${extra}</button>` : '');
  const cdot = (name) => `<button type="button" class="cdot" data-card="${esc(name)}" aria-label="${esc(name)}">${icon(name)}</button>`;
  const pill = (text, cls = '') => `<span class="pill ${cls}">${text}</span>`;
  const sidePill = (a) => (a ? pill(a, sideClass(a)) : '');
  // A player's token when their animal is not shown: an egg in their seat colour.
  const eggToken = (i) => `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="${SEAT[i % 8]}" opacity=".22"/><ellipse cx="32" cy="34" rx="15.5" ry="19.500" fill="${SEAT[i % 8]}"/><ellipse cx="26" cy="26" rx="4" ry="6" fill="#fff" opacity=".45" transform="rotate(24 26 26)"/></svg>`;
  function av(g, name, p, size = '') {
    const i = g.players.indexOf(name);
    if (p && p.role) return `<span class="av ${size} ${sideClass(p.alignment)}${p.dead ? ' dead' : ''}" data-card="${esc(p.role)}" title="${esc(name)}, the ${esc(p.role)}">${icon(p.role)}</span>`;
    return `<span class="av ${size} tok${p && p.dead ? ' dead' : ''}" title="${esc(name)}">${eggToken(i)}</span>`;
  }
  const dot = (g, name) => `<i class="seat-dot" style="background:${SEAT[g.players.indexOf(name) % 8]}"></i>`;
  const SUIT = { H: '♥', D: '♦', C: '♣', S: '♠' };
  function egg(g, id) {
    const c = g.cards[id]; if (!c) return '';
    const wild = id[0] === 'W';
    return `<span class="egg ${wild ? 'wild' : 'HD'.includes(id[0]) ? 'red' : 'black'}" title="${wild ? 'Wild, worth 0' : 'Worth ' + c.value}">${wild ? 'W' : c.value}<i>${wild ? '' : SUIT[id[0]]}</i></span>`;
  }
  const hand = (g, ids) => `<span class="eggs">${ids.map((i) => egg(g, i)).join('')}</span>`;
  const REVIEW = ['fun', 'tension', 'deduction', 'bluffing', 'clarity'];
  const meters = (r) => (r ? `<div class="meters">${REVIEW.map((k) => `<div class="meter"><div class="meter-top"><span>${cap(k)}</span><b>${r[k] ?? '–'}</b></div><div class="bar"><i style="width:${(r[k] || 0) * 10}%"></i></div></div>`).join('')}</div>` : '');
  let toastTimer;
  function toast(text, bad) {
    const t = $('#toast');
    t.textContent = text; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3600);
  }

  // What a run changed from its version, in words.
  function settingMeta(key) { return D.meta ? D.meta.settings.find((s) => s.key === key) : null; }
  function showValue(m, v) {
    if (!m) return Array.isArray(v) ? (v.length > 4 ? `${v.length} items` : v.join(', ') || 'none') : String(v);
    if (m.kind === 'bool') return v ? 'Yes' : 'No';
    if (m.kind === 'percent') return Math.round(v * 100) + '%';
    if (m.kind === 'choice') return (m.options.find((o) => o.value === v) || { label: v }).label;
    return String(v);
  }
  function parseOverride(o) {
    const i = o.indexOf('='), key = o.slice(0, i).trim(), raw = o.slice(i + 1).trim();
    let v = raw;
    try { v = JSON.parse(raw.replace(/"\s*=\s*/g, '":')); } catch { /* a bare word */ }
    return [key, v];
  }
  function describe(o) {
    const [key, v] = parseOverride(o);
    const names = (a) => list((a || []).map(String));
    if (key === 'deck.roles') return `${v.length} animals in the deck`;
    if (key === 'deck.flowers') return v.length ? `${plural(v.length, 'flower')} in the deck` : 'No flowers';
    if (key === 'game.start_pool') return `Pool starts with the ${names(v)}`;
    if (key === 'game.first_reveal') return `Round 1 reveals the ${names(v)}`;
    if (key === 'game.reveal_plan') return v.map((r, i) => (r.length ? `Round ${i + 1} reveals the ${names(r)}` : '')).filter(Boolean).join('; ');
    if (key === 'game.seat_roles') return Object.entries(v).map(([n, r]) => `${n} is the ${r}`).join(', ');
    if (key === 'game.seat_sides') return Object.entries(v).map(([n, r]) => `${n} is ${r}`).join(', ');
    if (key === 'game.seat_rounds') return v === 'first' ? 'Fixed seats apply to round 1 only' : 'Fixed seats apply every round';
    if (key.startsWith('text.')) return `${key.slice(5)} is reworded`;
    if (key === 'rules.notes') return `${plural(v.length, 'clarification')} added to the rules`;
    const m = settingMeta(key);
    return m ? `${m.label}: ${showValue(m, v)}` : `${key} = ${showValue(null, v)}`;
  }
  const changesPill = (o) => (o && o.length ? pill(plural(o.length, 'rule change'), 'yolk') : '');

  /* ================= frame and router ================= */
  const NAV = [['games', 'Games', 'games'], ['sims', 'Simulations', 'sims'], ['cards', 'Cards', 'cards'], ['rules', 'Rules', 'rules'], ['run', 'New run', 'run']];
  function chrome() {
    $('#brand-mark').innerHTML = MeowIcons.svg('House Cat', 'meowfia');
    $('#nav').innerHTML = NAV.map(([k, l]) => `<a href="#/${k === 'games' ? '' : k}" data-nav="${k}"${k === 'run' ? ' class="cta"' : ''}>${k === 'run' ? ui('run', 14) : ''}${l}</a>`).join('');
    $('#tabbar').innerHTML = NAV.map(([k, l, ic]) => `<a href="#/${k === 'games' ? '' : k}" data-nav="${k}">${ui(ic, 22)}<span>${l === 'Simulations' ? 'Sims' : l === 'New run' ? 'Run' : l}</span></a>`).join('');
    const btn = $('#theme');
    const paint = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      btn.innerHTML = ui(dark ? 'sun' : 'moon', 20);
      $('#theme-color').setAttribute('content', dark ? '#16150f' : '#f6f3ec');
    };
    btn.onclick = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('meowfia.theme', next); } catch { /* private mode */ }
      paint(); drawLines();
    };
    paint();
  }
  let lastView = '';
  function route() {
    const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const parts = path.split('/').map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
    let view = parts[0] || 'games';
    if (view === 'new') view = 'run';
    const section = { game: 'games', health: 'games', sim: 'sims', play: 'run' }[view] || view;
    $$('[data-nav]').forEach((a) => { const on = a.dataset.nav === section; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    stopPolling(); closeSheet();
    if (view !== 'play') leavePlay();
    const key = view + '/' + (parts[1] || '');
    if (key !== lastView) window.scrollTo(0, 0);
    lastView = key;
    document.title = 'Meowfia Lab';
    if (view === 'games') return viewGames();
    if (view === 'game') return viewGame(parts[1], parts[2]);
    if (view === 'cards') return viewCards(parts[1]);
    if (view === 'rules') return viewRules(parts[1]);
    if (view === 'health') return viewHealth();
    if (view === 'sims') return viewSims();
    if (view === 'sim') return viewSim(parts[1]);
    if (view === 'run') return viewRun(new URLSearchParams(query));
    if (view === 'play') return viewPlay(parts[1]);
    app.innerHTML = '<div class="page"><div class="empty"><b>Page not found.</b><a class="btn" href="#/">Back to the games</a></div></div>';
  }
  const page = (html, cls = '') => { app.innerHTML = `<div class="page ${cls}">${html}</div>`; };

  /* ================= games ================= */
  function outcome(r) {
    if (r.skipped) return ['skip', 'Skipped'];
    if (r.exclusive) return ['cat', `${r.exclusive} won alone`];
    if (r.eliminated && r.eliminated.length) {
      const e = r.eliminated[0];
      if (e.alignment === 'Meowfia') return ['farm', 'Cat caught'];
      return r.meowfia === 0 ? ['skip', 'No cats'] : ['cat', 'Cats escaped'];
    }
    return ['skip', 'Nobody out'];
  }
  // The games list: a title, tags you can filter by, and the cards that were in play.
  const GL = { q: '', tags: [] };
  const BASICS = ['deck.roles', 'deck.flowers', 'game.start_pool', 'game.pool_reveal', 'game.max_meowfia', 'game.max_flowers'];
  function gameTags(g) {                         // the "basics only" setup is one tag, not five
    let o = g.overrides || [];
    const t = (D.meta.setups || {}).testing, at = (k) => { const x = o.find((y) => parseOverride(y)[0] === k); return x ? parseOverride(x)[1] : undefined; };
    const basics = t && Array.isArray(at('deck.roles')) && sameSet(at('deck.roles'), t.roles);
    if (basics) o = o.filter((y) => !BASICS.includes(parseOverride(y)[0]) || (parseOverride(y)[0] === 'deck.flowers' && at('deck.flowers').length));
    return [...new Set([...(g.variant === D.variants[0].name ? [] : [g.variant]), modelsOf(g), `${g.players.length} players`, ...(basics ? ['Basics only'] : []), ...o.map(tagOf).filter(Boolean)])];
  }
  const gameChanges = (g) => { const t = gameTags(g); return t.slice(t.indexOf(`${g.players.length} players`) + 1); };
  function tagOf(o) {                            // a changed setting in one to three words
    const [key, v] = parseOverride(o);
    const one = (cards) => { const u = [...new Set(cards)]; return u.length === 1 ? u[0] : 'Chosen reveals'; };
    if (key === 'deck.roles') return `${v.length} animals`;
    if (key === 'deck.flowers') return v.length ? plural(v.length, 'flower') : 'No flowers';
    if (key === 'game.start_pool') return 'Chosen pool';
    if (key === 'game.first_reveal') return one(v);
    if (key === 'game.reveal_plan') return one(v.flat());
    if (key === 'game.seat_roles') return 'Fixed animals';
    if (key === 'game.seat_sides') return 'Fixed sides';
    if (key === 'game.seat_rounds') return '';
    if (key.startsWith('text.')) return 'Reworded cards';
    if (key === 'rules.notes') return 'Extra notes';
    const m = settingMeta(key), t = m && m.tag;
    if (!t) return cap(key.split('.').pop().replace(/_/g, ' '));
    if (Array.isArray(t)) return t[v ? 0 : 1];
    if (typeof t === 'object') return t[v] || String(v);
    return t.replace('{}', m.kind === 'percent' ? Math.round(v * 100) : v);
  }
  // Games you have not opened yet get a "New" mark. Kept in this browser; the first visit starts with only the
  // latest game unread, so the list is not a wall of marks.
  function seenGames() {
    let seen = store.get('seen', null);
    if (!Array.isArray(seen)) { seen = D.games.slice(1).map((g) => g.id); store.set('seen', seen); }
    return seen;
  }
  const isNew = (g) => !seenGames().includes(g.id);
  function markSeen(id) { const seen = seenGames(); if (!seen.includes(id)) { seen.push(id); store.set('seen', seen); } }
  const gamePool = (g) => (g.pool || [...new Set(g.rounds.flatMap((r) => r.revealed))]).filter((n) => D.card[n] && !D.card[n].buffer);
  // One game in the list: the cards that were in play first, then a short title and its tags.
  function gameCard(g) {
    const title = g.title || g.headline || `${g.players.length} players, ${plural(g.rounds.length, 'round')}`;
    const tags = gameTags(g);
    return `<article class="grow"><div class="grow-pool">${gamePool(g).map(cdot).join('')}</div>
      <h2><a href="#/game/${encodeURIComponent(g.id)}"${g.headline && g.title ? ` title="${esc(g.headline)}"` : ''}>${esc(title)}</a>${isNew(g) ? '<span class="newmark">New</span>' : ''}</h2>
      <div class="grow-tags">${tags.map((t) => `<button type="button" class="pill tag${tags.indexOf(t) >= tags.length - gameChanges(g).length ? ' yolk' : ''}${GL.tags.includes(t) ? ' on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div></article>`;
  }
  function viewGames() {
    page(`<header class="page-head withlink"><h1>Games</h1><a class="btn small" href="#/health">${ui('scores', 14)}Game health</a></header>
      ${D.games.length ? `<div class="gfilter"><label class="search">${ui('search', 18)}<input type="search" id="gq" placeholder="Search titles, tags, animals or players" value="${esc(GL.q)}" autocomplete="off" aria-label="Search games"></label><div class="gactive" id="gactive"></div></div><div class="gdays" id="glist"></div>` : `<div class="empty"><b>No games yet.</b><span>Start the first one from the run page.</span><a class="btn primary" href="#/run">New run</a></div>`}`);
    if (!D.games.length) return;
    const draw = () => {
      const q = GL.q.trim().toLowerCase();
      const items = D.games.filter((g) => { const tags = gameTags(g); return GL.tags.every((t) => tags.includes(t)) && (!q || [g.title || '', g.headline || '', ...tags, ...gamePool(g), ...g.players].join(' ').toLowerCase().includes(q)); });
      const days = [];                             // grouped under the day they were played
      for (const g of items) { const d = when(g.started, true); if (!days.length || days[days.length - 1][0] !== d) days.push([d, []]); days[days.length - 1][1].push(g); }
      $('#glist').innerHTML = days.map(([d, gs]) => `<section class="gday"><h3>${esc(d)}</h3>${gs.map(gameCard).join('')}</section>`).join('') || '<p class="muted">No games match.</p>';
      $('#gactive').innerHTML = GL.tags.map((t) => `<button type="button" class="pill tag on" data-tag="${esc(t)}">${esc(t)}<b>×</b></button>`).join('') + (GL.tags.length || q ? `<span class="fine">${plural(items.length, 'game')}</span>` : '');
    };
    draw();
    $('#gq').oninput = (e) => { GL.q = e.target.value; draw(); };
    $('.page').onclick = (e) => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; GL.tags = GL.tags.includes(t) ? GL.tags.filter((x) => x !== t) : [...GL.tags, t]; draw(); };
  }

  /* ================= one game ================= */
  // view: 'all' shows every secret; 'table' shows only what the table saw; a player's name shows what they saw.
  const G = { game: null, tab: 'overview', view: store.get('view', 'all'), revealed: new Set(), open: new Set() };
  async function viewGame(id, tab) {
    if (!G.game || G.game.id !== id) {
      page('<div class="loading" role="status">Loading the game</div>');
      try { G.game = await getData(`games/${id}.json`); } catch (e) { page('<div class="empty"><b>This game could not be loaded.</b><a class="btn" href="#/">Back to the games</a></div>'); return; }
      G.revealed = new Set(); G.open = new Set();
      if (!['all', 'table'].includes(G.view)) G.view = 'all';
    }
    G.tab = tab || 'overview';
    markSeen(id);
    renderGame();
  }
  const spoil = (round) => G.view === 'all' || G.revealed.has(round) || G.revealed.has('all');
  const sees = (round, name) => spoil(round) || G.view === name;
  const gameHref = (g, tab) => `#/game/${encodeURIComponent(g.id)}${tab ? '/' + tab : ''}`;

  function renderGame() {
    const g = G.game, rv = g.review || {};
    const open = spoil('all');
    const title = open && (rv.title || rv.headline) ? rv.title || rv.headline : `${g.variant}, ${g.players.length} players`;
    document.title = title + ' · Meowfia Lab';
    const tabs = [['overview', 'Overview'], ...g.rounds.map((r) => ['r' + r.round, 'Round ' + r.round])];
    const viewLabel = G.view === 'all' ? 'Everything' : G.view === 'table' ? 'No spoilers' : 'As ' + G.view;
    page(`<a class="crumb" href="#/">${ui('back', 16)}Games</a>
      <header class="game-head"><h1>${esc(title)}</h1>
        <div class="meta-row"><span>${when(g.started)}</span><span>${esc(g.variant)}</span><span>${g.players.length} players</span><span>${esc(modelsOf(g))}</span></div></header>
      <div class="gamebar" id="gamebar">
        <div class="tabs" id="tabs" role="tablist">${tabs.map(([k, l]) => `<a role="tab" href="${gameHref(g, k === 'overview' ? '' : k)}" class="${G.tab === k ? 'on' : ''}" ${G.tab === k ? 'aria-selected="true"' : ''}>${l}</a>`).join('')}</div>
        <label class="viewpick" title="Choose what is revealed">${ui(G.view === 'table' ? 'eyeoff' : 'eye', 16)}<span>${esc(viewLabel)}</span>
          <select id="view" aria-label="What to show"><option value="all" ${G.view === 'all' ? 'selected' : ''}>Everything: all secrets shown</option><option value="table" ${G.view === 'table' ? 'selected' : ''}>No spoilers: what the table saw</option>
          <optgroup label="Through one player's eyes">${g.players.map((n) => `<option value="${esc(n)}" ${G.view === n ? 'selected' : ''}>As ${esc(n)}</option>`).join('')}</optgroup></select></label>
      </div>
      <div id="tabbody"></div>`, 'game');
    $('#view').onchange = (e) => { G.view = e.target.value; G.revealed = new Set(); store.set('view', G.view === 'all' || G.view === 'table' ? G.view : 'table'); const y = window.scrollY; renderGame(); window.scrollTo(0, y); };
    const body = $('#tabbody');
    if (G.tab === 'overview') body.innerHTML = overview(g);
    else {
      const rec = g.rounds.find((r) => 'r' + r.round === G.tab);
      body.innerHTML = rec ? roundView(g, rec) : '<div class="empty"><b>No such round.</b></div>';
    }
    body.onclick = (e) => {
      const b = e.target.closest('[data-reveal]');
      if (b) { G.revealed.add(b.dataset.reveal === 'all' ? 'all' : +b.dataset.reveal); const y = window.scrollY; renderGame(); window.scrollTo(0, y); return; }
      const j = e.target.closest('[data-jump]');
      if (j) { const el = document.getElementById(j.dataset.jump); if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
      const ps = e.target.closest('[data-pin-step]');
      if (ps) {                                    // the pinned table: step to an earlier or later moment of the round
        const pin = ps.closest('.pin'), st = $$('.pin-stage', pin), cur = st.findIndex((x) => !x.hidden);
        const nx = Math.max(0, Math.min(st.length - 1, cur + +ps.dataset.pinStep));
        st[cur].hidden = true; st[nx].hidden = false;
        $('.pin-bar b', pin).textContent = st[nx].dataset.label;
        $$('[data-pin-step]', pin).forEach((b) => { b.disabled = +b.dataset.pinStep < 0 ? nx === 0 : nx === st.length - 1; });
        drawLines();
      }
    };
    body.ontoggle = null;
    body.addEventListener('toggle', (e) => {       // a phase was opened or closed
      const d = e.target; if (!d.classList || !d.classList.contains('phase')) return;
      if (d.open) G.open.add(G.tab + d.id); else G.open.delete(G.tab + d.id);
      drawLines();
    }, true);
    const on = $('#tabs .on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    drawLines();
  }

  function standings(g, scores, gained, people) {
    const max = Math.max(1, ...Object.values(scores));
    return `<div class="standings">${Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([n, s], i) => `<div class="stand">
      <span class="rank">${i + 1}</span>${av(g, n, people && people[n])}<span class="stand-name">${esc(n)}</span>
      <span class="track"><i style="width:${Math.max(3, s / max * 100)}%;background:${SEAT[g.players.indexOf(n) % 8]}"></i></span>
      <span class="stand-val">${s}${gained && gained[n] ? `<small class="${gained[n] > 0 ? 'up' : 'down'}">${gained[n] > 0 ? '+' : ''}${gained[n]}</small>` : ''}</span></div>`).join('')}</div>`;
  }
  const listBlock = (title, items, empty) => `<section class="block"><h3>${title}</h3>${items.length ? `<ul class="notes">${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : `<p class="muted">${empty}</p>`}</section>`;

  // The overview folds like a round: every row is closed to start and says its one headline fact.
  function overview(g) {
    const rv = g.review, open = spoil('all');
    const secs = [];
    const add = (id, label, ic, hint, html) => secs.push({ id: 'ov-' + id, label, ic, hint, html });
    const top = Object.entries(g.scores).sort((x, y) => y[1] - x[1]);
    const result = (rec) => {
      const v = (rec.cycles[rec.cycles.length - 1] || {}).vote || {}, out = (v.eliminated || [])[0];
      return rec.skipped ? 'Skipped' : rec.exclusive_winner ? 'Won alone' : !out ? 'Nobody out' : v.corpse ? 'Kept hidden' : v.revealed[out] === 'Meowfia' ? 'Cat caught' : 'Cats escaped';
    };
    if (open && rv) add('story', 'Story', 'rules', rv.headline, `<p class="lead">${esc(rv.summary)}</p>
      ${(rv.highlights || []).length ? `<h4>Moments worth reading</h4><ul class="notes">${rv.highlights.map((x) => `<li><a href="${gameHref(g, 'r' + x.round)}">Round ${x.round}</a> ${esc(x.text)}</li>`).join('')}</ul>` : ''}`);
    if (open) add('scores', 'Scores', 'scores', `${list(g.winners || [top[0][0]])} won with ${top[0][1]}`, `${standings(g, g.scores)}
        <div class="breakdown">${top.map(([n]) => { const b = g.breakdown[n]; return `<div class="brow"><span class="brow-name">${dot(g, n)}${esc(n)}</span><span class="brow-parts">${pill(`${b.pile} banked`, 'yolk')}${pill(`${b.kept} kept`)}${b.bonus ? pill(`${b.bonus > 0 ? '+' : ''}${b.bonus} bonus`, 'flower') : ''}</span>${hand(g, b.pile_cards)}</div>`; }).join('')}</div>
        <p class="fine">A score is the value of every card banked, plus 1 for each card kept, plus bonuses.</p>`);
    add('rounds', 'Rounds', 'games', g.rounds.every((r) => spoil(r.round)) ? g.rounds.map(result).join(' · ') : plural(g.rounds.length, 'round'), `<div class="rlist">${g.rounds.map((rec) => {
      const cyc = rec.cycles[rec.cycles.length - 1] || {}, v = cyc.vote || {}, s = spoil(rec.round);
      const out = (v.eliminated || [])[0];
      const recap = open && rv ? ((rv.rounds || []).find((x) => x.round === rec.round) || {}).recap : '';
      const line = rec.skipped ? 'Skipped: the Cactus Flower showed there were no Meowfia.' : rec.exclusive_winner ? (s ? `${rec.exclusive_winner} won the round alone.` : 'Ended early by a challenge.') : out ? (s && !v.corpse ? `${out} was eggsecuted and turned out to be ${v.revealed[out] === 'Meowfia' ? 'a cat' : 'Farm'}.` : `${out} was eggsecuted.`) : 'Nobody was eggsecuted.';
      return `<a class="rcard" href="${gameHref(g, 'r' + rec.round)}"><div class="rcard-top"><b>Round ${rec.round}</b><span class="rcard-cards">${rec.revealed.filter((x) => !x.hidden || s).map((x) => `<span class="cdot">${icon(x.face)}</span>`).join('')}</span>${ui('next', 16)}</div>
        <div class="cast">${g.players.map((n) => av(g, n, s ? rec.players[n] : null, 's').replace(/ data-card="[^"]*"/, '')).join('')}</div>
        <p>${esc(recap || line)}</p></a>`;
    }).join('')}</div>`);
    if (open && rv && rv.scores) add('review', 'Review', 'minds', REVIEW.filter((k) => rv.scores[k] !== undefined).sort((x, y) => rv.scores[y] - rv.scores[x]).slice(0, 3).map((k) => `${cap(k)} ${rv.scores[k]}`).join(' · '), meters(rv.scores));
    if (open && rv) {
      const good = rv.worked || [], bad = [...(rv.problems || []), ...(rv.design_notes || [])], cf = rv.confusions || [];
      const talks = Object.entries(g.interviews || {});
      const ASK = [['fun', 'Enjoyed most'], ['confusing', 'Found confusing'], ['change', 'Would change'], ['regret', 'Would take back']];
      add('notes', 'Notes', 'info', `${good.length} worked · ${bad.length} to fix · ${plural(cf.length, 'misread rule')}`, `<div class="cols">${listBlock('What worked', good.map(esc), 'Nothing was singled out.')}
        ${listBlock('What to fix', bad.map(esc), 'Nothing was singled out.')}</div>
        ${listBlock('Rules players misread', cf.map((x) => `<b>${esc(x.player)}, round ${x.round}.</b> ${esc(x.what)}`), 'Nobody misread anything.')}
        ${talks.length ? `<section class="block"><h3>What the players said afterwards</h3><p class="fine">Each player was shown the hidden roles and asked four questions.</p><div class="talks">${talks.map(([n, t]) => `<div class="talk"><b>${dot(g, n)}${esc(n)}</b><dl>${ASK.filter(([k]) => t[k]).map(([k, l]) => `<dt>${l}</dt><dd>${esc(t[k])}</dd>`).join('')}</dl></div>`).join('')}</div></section>` : ''}`);
    }
    if (open && g.health) {
      const h = g.health, sm = h.summary, yes = (b) => (b ? ui('check', 14) : '<span class="muted">–</span>');
      const tile = (v, label, sub) => `<div class="tile"><b>${v}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
      const max = Math.max(1, ...Object.values(h.talk.words));
      add('health', 'Health', 'scores', [sm.vote_share !== null ? `${sm.vote_share}% of votes on target` : '', h.surveyed ? `${sm.lies_caught} of ${plural(sm.lies, 'lie')} caught` : ''].filter(Boolean).join(' · '), `
        <div class="tiles">
          ${tile(sm.vote_share === null ? '–' : sm.vote_share + '%', 'of votes on the player who went out', 'Near 100% means a pile-on; near 50% a real contest.')}
          ${tile(sm.named_at === null ? '–' : sm.named_at + '%', 'of the day gone when they were first named', 'Low means the table settled almost at once.')}
          ${tile(h.surveyed ? `${sm.lies_caught} of ${sm.lies}` : '–', 'false animal claims that ended in an eggsecution', h.surveyed ? 'From what each player said they had claimed.' : 'Needs the pre-vote survey.')}
          ${tile(sm.fired === null ? '–' : sm.fired + '%', 'of animals whose ability did something', '')}
          ${tile(h.spread.gap, 'points between first and last', h.spread.early_leader_won === null ? '' : h.spread.early_leader_won ? 'The leader after round 1 won.' : 'The leader after round 1 did not win.')}
          ${tile(h.talk.messages ? Math.round(100 * h.talk.questions / h.talk.messages) + '%' : '–', 'of messages asked a question', `${h.talk.messages} messages, ${h.talk.total} words`)}
        </div>
        <section class="block"><h3>Who did the talking</h3><div class="wbars">${g.players.map((n) => `<div class="wbar"><span>${dot(g, n)}${esc(n)}</span><i><u style="width:${Math.round(100 * h.talk.words[n] / max)}%"></u></i><b>${h.talk.words[n]}</b></div>`).join('')}</div><p class="fine">Words spoken aloud over the whole game.</p></section>
        <section class="block"><h3>What each animal did</h3><div class="scroll-x"><table class="data who"><thead><tr><th>Round</th><th>Player</th><th>Animal</th><th>Did something</th><th>Reached another player</th><th>Won the round</th></tr></thead><tbody>
          ${h.cards.map((c) => `<tr><td>${c.round}</td><td>${esc(c.player)}</td><td>${cchip(c.name)}</td><td>${yes(c.fired)}</td><td>${yes(c.reached)}</td><td>${yes(c.won)}</td></tr>`).join('')}</tbody></table></div>
          <p class="fine">"Did something": the ability produced any effect at night, even just telling its holder something. "Reached another player": it changed another player's nest, state or animal.</p></section>
        ${h.lies.length ? `<section class="block"><h3>False claims</h3><ul class="notes">${h.lies.map((x) => `<li><b>${esc(x.player)}, round ${x.round}.</b> Claimed the ${esc(x.claimed)}, was the ${esc(x.was)}. ${x.caught ? 'Eggsecuted.' : 'Got away with it.'}${x.suspicion === null ? '' : ` The table had them at ${x.suspicion}% likely Meowfia.`}</li>`).join('')}</ul></section>` : ''}`);
    }
    const ov = (g.overrides || []).map(describe).filter(Boolean);
    add('setup', 'Setup', 'run', gameChanges(g).join(' · ') || 'Standard game', `<dl class="facts">
      <dt>Version</dt><dd><a href="#/rules/${encodeURIComponent(g.variant)}">${esc(g.variant)}</a></dd>
      ${ov.length ? `<dt>Changes</dt><dd><ul class="plain">${ov.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></dd>` : ''}
      <dt>Players</dt><dd>${g.players.map((n) => `<span class="pname">${dot(g, n)}${esc(n)}${g.human === n ? ' <small>played by a person</small>' : (g.seat_models || {})[n] || (g.seat_efforts || {})[n] || (g.seat_styles || {})[n] ? ` <small>${esc([(g.seat_styles || {})[n] ? (STYLE[g.seat_styles[n]] || g.seat_styles[n]).toLowerCase() : '', (g.seat_models || {})[n] ? model(g.seat_models[n]) : '', (g.seat_efforts || {})[n] ? (EFFORT[g.seat_efforts[n]] || g.seat_efforts[n]).toLowerCase() + ' thinking' : ''].filter(Boolean).join(', '))}</small>` : ''}</span>`).join('')}</dd>
      <dt>Played by</dt><dd>${esc(model(g.model))}${g.effort ? `, ${esc((EFFORT[g.effort] || g.effort).toLowerCase())} thinking` : ''}${g.review_model && g.review ? `; reviewed by ${esc(model(g.review_model))}` : ''}</dd>
      <dt>Seed</dt><dd>${g.seed}</dd>
      <dt>Length</dt><dd>${g.minutes ? g.minutes + ' minutes' : 'unknown'}${g.usage ? `, ${g.usage.calls} turns` : ''}</dd>
      ${g.usage ? `<dt>Usage</dt><dd>About $${g.usage.api_equivalent_usd} at API prices, covered by the subscription</dd>` : ''}</dl>
      <div class="setup-load"><button type="button" class="btn" data-load-setup>${ui('run', 16)}New run with this setup</button><span class="fine">Opens the New run page with this game's cards, rules and players filled in. Nothing starts until you press Start.</span></div>`);
    return `${open ? '' : `<div class="spoiler"><div><b>Spoilers are hidden.</b><span>The story and final scores are tucked away. Read the rounds in order, then reveal.</span></div><button class="btn" data-reveal="all">Reveal the whole game</button></div>`}
      ${secs.map((x) => `<details class="phase" id="${x.id}" ${G.open.has(G.tab + x.id) ? 'open' : ''}><summary class="phase-head"><span class="phase-ic">${ui(x.ic, 18)}</span><h2>${esc(x.label)}</h2>${x.hint ? `<span class="phase-hint">${esc(x.hint)}</span>` : ''}${ui('down', 18)}</summary>${x.html}</details>`).join('')}`;
  }

  /* ----- the table diagram ----- */
  function seatPos(i, n) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n;
    return { x: 50 + Math.cos(a) * 39, y: 50 + Math.sin(a) * 37 };
  }
  function table(g, round, people, opts = {}) {
    const n = g.players.length;
    const seats = g.players.map((name, i) => {
      const p = people[name] || {}, pos = seatPos(i, n), show = opts.show ? opts.show(name) : true;
      const sub = opts.sub ? opts.sub(name) : '';
      return `<button type="button" class="seat${(opts.out || []).includes(name) ? ' out' : ''}" style="left:${pos.x}%;top:${pos.y}%" data-seat="${esc(name)}"${show && p.role ? ` data-card="${esc(p.role)}"` : ''}>
        <span class="seat-face">${av(g, name, show ? p : { dead: p.dead }, 'l')}${p.nest !== undefined ? `<span class="nest" title="Cards in nest">${p.nest}</span>` : ''}</span>
        <span class="seat-name">${esc(name)}</span>${sub ? `<span class="seat-sub">${sub}</span>` : ''}</button>`;
    }).join('');
    return `<div class="table ${opts.cls || ''}" data-arrows="${esc(JSON.stringify(opts.arrows || []))}"><div class="felt"><span>${esc(opts.label || '')}</span></div><svg class="lines" aria-hidden="true"></svg>${seats}</div>`;
  }
  function drawLines() {
    const css = getComputedStyle(document.documentElement);
    const col = { visit: css.getPropertyValue('--yolk-ink').trim() || '#c27d0e', dim: css.getPropertyValue('--ink-3').trim() || '#999', vote: css.getPropertyValue('--cat').trim() || '#b23', surface: css.getPropertyValue('--surface').trim() || '#fff', ink: css.getPropertyValue('--ink').trim() || '#000' };
    $$('.table').forEach((wrap) => {
      const svg = $('svg.lines', wrap), box = wrap.getBoundingClientRect();
      if (!box.width) return;
      let arrows = []; try { arrows = JSON.parse(wrap.dataset.arrows || '[]'); } catch { /* none */ }
      const centre = (name) => { const el = $(`[data-seat="${CSS.escape(name)}"] .av`, wrap); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, r: r.width / 2 + 5 }; };
      const kinds = ['visit', 'dim', 'vote'];
      let h = `<defs>${kinds.map((k) => `<marker id="ah-${k}" viewBox="0 0 10 10" refX="7.5" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${col[k]}"/></marker>`).join('')}</defs>`;
      arrows.forEach((a) => {
        const A = centre(a.from), B = a.to === a.from ? null : centre(a.to), c = col[a.kind] || col.visit, w = a.width || 2.4;
        if (!A) return;
        if (!B) { h += `<circle cx="${A.x}" cy="${A.y - A.r - 7}" r="9" fill="none" stroke="${c}" stroke-width="${w}"/>`; return; }
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const x1 = A.x + ux * A.r, y1 = A.y + uy * A.r, x2 = B.x - ux * (B.r + 4), y2 = B.y - uy * (B.r + 4);
        const bend = (a.bend ?? 0.14) * len, mx = (x1 + x2) / 2 - uy * bend, my = (y1 + y2) / 2 + ux * bend;
        h += `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" marker-end="url(#ah-${a.kind || 'visit'})" ${a.dash ? 'stroke-dasharray="5 5" opacity=".75"' : ''}/>`;
        if (a.label) {
          const lx = (x1 + 2 * mx + x2) / 4, ly = (y1 + 2 * my + y2) / 4;
          h += `<circle cx="${lx}" cy="${ly}" r="10" fill="${col.surface}" stroke="${c}" stroke-width="1.500"/><text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11.500" font-weight="700" fill="${col.ink}" font-family="Inter,system-ui,sans-serif">${esc(a.label)}</text>`;
        }
      });
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      svg.innerHTML = h;
    });
  }
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawLines, 150); });

  /* ----- a round ----- */
  const VERB = {
    lay: (e) => (e.src === e.to ? [`earned ${plural(e.n, 'egg')}`, 'good', 'self'] : [`laid ${plural(e.n, 'egg')} in ${e.to}'s nest`, 'good', 'eggs']),
    steal: (e) => [`stole ${plural(e.n, 'egg')} from ${e.to}${e.inverted ? ' (the Angel\'s Trumpet turned a gift into a theft)' : ''}`, 'bad', 'steal'],
    give: (e) => [`passed ${plural(e.n, 'stolen egg')} to ${e.to}`, '', 'eggs'],
    hugged: (e) => [`hugged ${e.to}, so their ability did nothing`, 'odd', 'hug'],
    confused: (e) => [e.by === e.to ? 'was visited and became confused' : `confused ${e.to}`, 'odd', 'confuse'],
    cure: (e) => [`cured ${e.to}`, 'good', 'hug'],
    kill: (e) => [`killed ${e.to}`, 'bad', 'kill'],
    wink: (e) => [`gave ${e.to} a Wink`, 'odd', 'wink'],
    swap_animals: (e) => [`made ${e.a} and ${e.b} swap animals and sides`, 'odd', 'swap'],
    swap_nests: (e) => [`made ${e.a} and ${e.b} swap nests`, 'odd', 'swap'],
    align: (e) => [e.by === e.to ? `became ${e.alignment}` : `turned ${e.to} ${e.alignment}`, e.alignment === 'Meowfia' ? 'bad' : 'good', 'swap'],
    rotate: (e) => [`moved every animal ${plural(e.k, 'seat')} clockwise`, 'odd', 'swap'],
    redirect: (e) => [`sent ${e.who}'s visit to ${e.to}`, 'odd', 'redirect'],
    copy: (e) => [`copied ${e.of}'s animal, the ${e.role}`, 'odd', 'copy'],
    info: (e) => [e.by === e.to ? `learned: ${e.text}` : `told ${e.to}: ${e.text}`, '', 'info'],
    blocked: () => ['was hugged, so their ability did nothing', 'odd', 'hug'],
  };
  function nightRows(night) {
    const events = [], rows = [];
    for (const e of night.events) {             // "laid 1 egg in A, B and C's nests" instead of three lines
      const prev = events[events.length - 1];
      if (prev && e.t === 'lay' && prev.t === 'lay' && prev.by === e.by && e.src !== e.to && prev.src !== prev.to0 && prev.n === e.n && !e.inverted) { prev.many.push(e.to); continue; }
      events.push(e.t === 'lay' ? { ...e, to0: e.to, many: [e.to] } : e);
    }
    let lastBlock = null;
    for (const e of events) {
      if (e.t === 'blocked') { if (lastBlock === e.to) continue; lastBlock = e.to; }
      const f = VERB[e.t]; if (!f) continue;
      let [text, cls, badge] = f(e);
      if (e.many && e.many.length > 1) text = `laid ${plural(e.n, 'egg')} in each of ${list(e.many)}'s nests`;
      rows.push({ actor: e.by || e.to, text, cls, badge, e });
    }
    return rows;
  }
  function nightEvents(g, night, people, canSee) {
    const rows = nightRows(night).filter((r) => canSee(r.actor));
    if (!rows.length) return '<p class="muted quiet-night">A quiet night: nothing happened.</p>';
    return `<ul class="events">${rows.map((r) => `<li class="ev ${r.cls}">${av(g, r.actor, people[r.actor], 's')}<span><b>${esc(r.actor)}</b> ${esc(r.text)}</span><i class="ev-ic">${ui(r.badge, 16)}</i></li>`).join('')}</ul>`;
  }
  function dayLog(g, entries, people, canSee) {
    let h = '';
    const thought = (e, who) => (e.note && canSee(who) ? `<div class="thought"><i>thinks</i>${esc(e.note)}</div>` : '');
    for (const e of entries) {
      if (e.k === 'beat') h += `<div class="beat"><span>${esc(e.label)} · ${e.live ? 'open discussion' : `${e.n} of ${e.of}`}</span></div>`;
      else if (e.k === 'system') { if (!e.text.startsWith('Nest sizes:')) h += `<div class="sys">${esc(e.text)}</div>`; }
      else if (e.k === 'say') {
        const hide = e.anon && !canSee(e.p);
        h += `<div class="msg">${hide ? '<span class="av anon">?</span>' : av(g, e.p, people[e.p])}<div class="msg-body"><div class="msg-from">${hide ? 'Someone' : esc(e.p)}${e.anon ? pill('eyes shut', 'flower') : ''}${e.at && !hide ? ` <small>to ${esc(e.at)}</small>` : ''}${e.bids && !hide ? ` <small>bids: ${Object.entries(e.bids).sort((x, y) => y[1] - x[1]).map(([n, v]) => `${esc(n)} ${v}`).join(' · ')}</small>` : ''}</div><div class="bubble">${esc(e.text)}</div>${thought(e, e.p)}</div></div>`;
      } else if (e.k === 'whisper') {
        if (canSee(e.p) || canSee(e.to)) h += `<div class="msg whisper">${av(g, e.p, people[e.p])}<div class="msg-body"><div class="msg-from">${esc(e.p)}${pill('whispers to ' + esc(e.to), 'flower')}</div><div class="bubble">${esc(e.text)}</div>${thought(e, e.p)}</div></div>`;
      } else if (e.k === 'quiet') {
        if (canSee(e.p) && e.note) h += `<div class="msg silent">${av(g, e.p, people[e.p])}<div class="msg-body"><div class="msg-from">${esc(e.p)} <small>says nothing</small></div>${thought(e, e.p)}</div></div>`;
      } else if (e.k === 'caw') h += `<div class="sys caw"><b>${esc(e.p)}: CAW CAW!</b>${e.bluebell ? ' The Bluebell ends the day.' : e.need ? ` ${e.count} of ${e.need}` : ''}</div>${e.note && canSee(e.p) ? `<div class="msg silent">${av(g, e.p, people[e.p])}<div class="msg-body">${thought(e, e.p)}</div></div>` : ''}`;
      else if (e.k === 'death') h += `<div class="sys death">${esc(e.text)}${e.by && !e.public_by && canSee(e.by) ? ` ${pill(esc(e.by) + ' did it', 'cat')}` : ''}</div>${e.note && e.by && canSee(e.by) ? `<div class="msg silent">${av(g, e.by, people[e.by])}<div class="msg-body">${thought(e, e.by)}</div></div>` : ''}`;
      else if (e.k === 'action') h += `<div class="sys act">${esc(e.text)}${e.secret && canSee(e.p) ? ` ${pill(esc(e.secret), 'flower')}` : ''}</div>${e.note && canSee(e.p) ? `<div class="msg silent">${av(g, e.p, people[e.p])}<div class="msg-body">${thought(e, e.p)}</div></div>` : ''}`;
    }
    return `<div class="chat">${h || '<div class="sys">Nobody said anything.</div>'}</div>`;
  }
  function susGrid(g, cyc, truth, people) {
    const b = cyc.beliefs || {}, names = g.players;
    const cell = (v) => (v === undefined ? '<td class="na">–</td>' : `<td class="${v >= 55 ? 'hi' : ''}" style="--p:${v}">${v}</td>`);
    return `<div class="scroll-x"><table class="sus"><thead><tr><th></th>${names.map((n) => `<th>${av(g, n, people[n], 's')}<span>${esc(n)}</span></th>`).join('')}</tr></thead><tbody>
      ${names.filter((n) => b[n]).map((n) => `<tr><th>${esc(n)}</th>${names.map((m) => (m === n ? '<td class="na">·</td>' : cell(b[n].meowfia[m]))).join('')}</tr>`).join('')}
      <tr class="truth"><th>Truth</th>${names.map((m) => `<td>${truth[m] === 'Meowfia' ? pill('Cat', 'cat') : pill('Farm', 'farm')}</td>`).join('')}</tr></tbody></table></div>
      <p class="fine">Each row is one player's private guess, just before the vote, of how likely each other player was Meowfia (%).</p>
      <ul class="feelings">${names.filter((n) => b[n] && b[n].feeling).map((n) => `<li>${av(g, n, people[n], 's')}<div><b>${esc(n)}</b> ${b[n].claimed ? `<small>claimed ${esc(b[n].claimed)}</small>` : '<small>claimed nothing</small>'}<p>${esc(b[n].feeling)}</p></div></li>`).join('')}</ul>`;
  }

  function roundView(g, rec) {
    const R = rec.round, s = spoil(R), see = (n) => sees(R, n);
    const start = rec.players;
    const sections = [];
    const add = (id, label, ic, hint, html) => sections.push({ id: 'ph-' + id + sections.length, label, ic, hint, html });
    const seen = (people) => Object.fromEntries(g.players.map((n) => [n, see(n) ? people[n] : { dead: people[n].dead }]));

    // the pool and the deal
    const pool = `<div class="newcards">${rec.revealed.length ? '' : rec.flowers.map((f) => mcard(D.card[f] || { name: f }, 'in play')).join('')}${rec.revealed.map((x) => {
      if (x.hidden && !s) return `<div class="mcard facedown"><div class="mcard-art">${MeowIcons.svg('?', 'unknown')}</div><div class="mcard-name">Face-down</div><div class="mcard-kind">Hidden by the Lotus</div></div>`;
      return mcard(D.card[x.face] || { name: x.face }, x.hidden ? 'was face-down' : '');
    }).join('')}</div>
      <div class="inpool"><span class="label">Animals in the pool</span>${rec.pool.map((a) => cchip(a)).join('')}</div>`;
    const startPeople = Object.fromEntries(g.players.map((n) => [n, { ...start[n], nest: start[n].hand.length }]));
    // every moment of the round as a table, for the window pinned beside the day's talk
    const stages = [{ label: 'The deal', html: table(g, R, startPeople, { show: see, label: 'Deal' }) }];
    const deal = `<div class="castgrid">${g.players.map((n) => {
      const p = start[n], v = see(n);
      return `<button type="button" class="pcard${v ? ' ' + sideClass(p.alignment) : ''}" data-seat="${esc(n)}"${v ? ` data-card="${esc(p.role)}"` : ''}>${av(g, n, v ? p : null, 'l')}
        <span class="pcard-name">${esc(n)}${n === rec.dealer ? '<small>dealer</small>' : ''}</span>
        <span class="pcard-role">${v ? esc(p.role) + (p.told !== p.role ? ` <small>thinks ${esc(p.told)}</small>` : '') : 'Secret'}</span>
        <span class="pcard-nest">${ui('eggs', 13)}${p.hand.length}</span></button>`;
    }).join('')}</div><p class="fine">${s ? 'Tap an animal to see its card.' : 'Each player knows only their own animal.'}</p>`;
    add('pool', 'Pool', 'pool', rec.revealed.length ? `${plural(rec.revealed.length, 'new card')}` : `${plural(rec.pool.length, 'animal')}${rec.flowers.length ? ' · ' + rec.flowers.join(', ') : ''}`, pool);
    add('deal', 'Deal', 'deal', s ? 'Who was secretly what' : 'Secret', deal);
    if (rec.dusk) add('dusk', 'Dusk', 'dawn', 'Talk before the night', dayLog(g, rec.dusk, seen(start), see));

    rec.cycles.forEach((cyc, ci) => {
      const again = ci > 0 ? ' again' : '';
      const after = cyc.after_night || start;
      const truth = Object.fromEntries(g.players.map((n) => [n, after[n].alignment]));
      const dayPeople = seen(after);
      (cyc.nights || []).forEach((night, ni) => {
        const label = 'Night' + again + (cyc.nights.length > 1 ? ` ${ni + 1}` : '');
        if (!s && !g.players.includes(G.view)) { add('night', label, 'night', 'Hidden', '<div class="locked">' + ui('night', 22) + '<b>Everyone closes their eyes.</b><span>What happened in the dark stays hidden until you reveal the round.</span></div>'); return; }
        const arrows = [];
        for (const n of g.players) {
          if (!see(n)) continue;
          const d = night.declared[n], v = night.visits[n];
          if (d && d !== v) arrows.push({ from: n, to: d, kind: 'dim', dash: true, width: 1.8 });
          if (v) arrows.push({ from: n, to: v, kind: 'visit' });
        }
        const thinking = Object.entries(night.choices).filter(([n, c]) => see(n) && c.note);
        stages.push({ label, html: table(g, R, startPeople, { show: see, arrows, label: 'Night' }) });
        add('night', label, 'night', 'Who visited whom', `<div class="split"><div class="split-a">${table(g, R, startPeople, { show: see, arrows, label: 'Night' })}
            <div class="legend"><span><i class="lg visit"></i>Visit</span><span><i class="lg dim"></i>Meant to go</span><span><i class="lg nestk"></i>Cards in nest</span></div></div>
          <div class="split-b">${nightEvents(g, night, seen(start), see)}</div></div>
          ${thinking.length ? `<details class="more"><summary>What they were thinking ${ui('down', 16)}</summary><ul class="thoughts">${thinking.map(([n, c]) => `<li>${av(g, n, seen(start)[n], 's')}<div><b>${esc(n)}</b> <small>chose ${esc(list(c.targets) || (c.role ? '' : 'nobody'))}${c.role ? ` naming the ${esc(c.role)}` : ''}</small><p>${esc(c.note)}</p></div></li>`).join('')}</ul></details>` : ''}`);
      });
      const reps = Object.entries(cyc.reports || {}).filter(([n]) => see(n));
      add('dawn', 'Dawn' + again, 'dawn', 'Private reports', (reps.length ? `<div class="reports">${reps.map(([n, r]) => `<div class="report">${av(g, n, dayPeople[n])}<div class="report-body"><div class="report-top"><b>${esc(n)}</b>${r.confused ? pill('confused', 'flower') : ''}<span class="delta ${r.reported > 0 ? 'up' : r.reported < 0 ? 'down' : ''}">${r.reported > 0 ? '+' : ''}${plural(r.reported, 'egg')}</span></div>
          <ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}${r.confused && r.eggs !== r.reported ? `<li class="truthline">In truth: ${r.eggs > 0 ? '+' : ''}${r.eggs}.</li>` : ''}</ul>
          ${r.discarded.length ? `<div class="discard"><span class="label">Discarded</span>${hand(g, r.discarded)}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="locked">' + ui('dawn', 22) + '<b>Reports are private.</b><span>Each player learns how many eggs their nest gained or lost, and what their animal found out.</span></div>')
        + ((cyc.night_deaths || []).length ? `<div class="sys death">${esc(list(cyc.night_deaths))} ${cyc.night_deaths.length === 1 ? 'was' : 'were'} found dead in the morning.</div>` : ''));
      if (rec.skipped && ci === rec.cycles.length - 1) { add('day', 'Day' + again, 'day', '', dayLog(g, cyc.day || [], dayPeople, see)); return; }
      const says = (cyc.day || []).filter((e) => e.k === 'say').length;
      const dayTable = Object.fromEntries(g.players.map((n) => [n, { ...after[n], nest: after[n].hand.length }]));
      stages.push({ label: 'Day' + again, html: table(g, R, dayTable, { show: see, label: 'Day' }) });
      add('day', 'Day' + again, 'day', plural(says, 'message'), `<div class="daysplit"><div>${dayLog(g, cyc.day || [], dayPeople, see)}</div>%%PIN${stages.length - 1}%%</div>`);
      if (cyc.beliefs && Object.keys(cyc.beliefs).length) add('minds', 'Suspicions', 'minds', 'Asked in private before the vote', s ? susGrid(g, cyc, truth, dayPeople) : '<div class="locked">' + ui('minds', 22) + '<b>What everyone privately believed</b><span>is revealed with the round.</span></div>');
      const v = cyc.vote;
      if (v) {
        const arrows = Object.entries(v.throws).filter(([, t]) => g.players.includes(t.target)).map(([n, t]) => ({ from: n, to: t.target, label: String(t.cards.length), kind: t.dead ? 'dim' : 'vote', width: 1.6 + Math.min(4, t.cards.length) * .9, dash: t.dead, bend: .1 }));
        const endPeople = Object.fromEntries(g.players.map((n) => [n, { ...after[n], nest: after[n].hand.length, dead: (v.throws[n] || {}).dead || after[n].dead }]));
        const showRes = s && !v.again;
        let verdict;
        if (v.again) verdict = '<div class="verdict none"><div><b>The Bottlebrush took the most eggs.</b><span>Nobody is eggsecuted. The round goes back to night.</span></div></div>';
        else if (v.nobody) verdict = s ? `<div class="verdict ${v.team === 'Meowfia' ? 'cat' : 'farm'}"><div><b>"Nobody" took the most eggs.</b><span>${v.team === 'Meowfia' ? 'But there were Meowfia at the table, so Meowfia wins the round.' : 'And there were no Meowfia: everyone who threw at Nobody banks their cards.'}</span></div></div>` : `<div class="verdict none"><div><b>"Nobody" took the most eggs.</b><span>No one is eggsecuted. Were there really no cats?</span></div><button class="btn primary" data-reveal="${R}">Reveal round ${R}</button></div>`;
        else if (!v.eliminated.length) verdict = '<div class="verdict none"><div><b>Nobody was eggsecuted.</b></div></div>';
        else if (!s) verdict = `<div class="verdict none"><div><b>${esc(list(v.eliminated))} ${v.eliminated.length > 1 ? 'are' : 'is'} eggsecuted.</b><span>A cat, or not? Make your guess, then reveal.</span></div><button class="btn primary" data-reveal="${R}">Reveal round ${R}</button></div>`;
        else verdict = v.eliminated.map((e) => { const a = v.revealed[e]; const none = Object.values(truth).every((x) => x === 'Farm'); return `<div class="verdict ${a === 'Meowfia' ? 'farm' : 'cat'}">${av(g, e, endPeople[e], 'l')}<div><b>${esc(e)} was ${a === 'Meowfia' ? 'a cat' : 'Farm'}.</b><span>${a === 'Meowfia' ? 'Farm wins the round.' : none ? 'There were no cats at all, so everyone loses their thrown eggs.' : 'Meowfia wins the round.'}${v.goose ? ' A player was the Goose, so winners and losers swap.' : ''}${v.corpse ? ' The Corpse Flower kept this hidden from the table.' : ''}</span></div></div>`; }).join('');
        const voteTable = table(g, R, endPeople, { show: see, arrows, out: v.eliminated, label: 'Eggsecution', sub: (n) => (v.tally[n] ? plural(v.tally[n], 'vote') : '') });
        stages.push({ label: 'Vote' + again, html: voteTable });
        add('vote', 'Vote' + again, 'vote', 'Who threw eggs at whom', `<div class="split"><div class="split-a">${voteTable}
            <div class="legend"><span><i class="lg vote"></i>Thrown eggs, with how many</span></div></div>
          <ul class="throws split-b">${Object.entries(v.throws).map(([n, t]) => {
            const res = (v.results || {})[n];
            const result = showRes && res ? (res.result === 'won' ? pill(`banked ${res.points}`, 'farm') : res.result === 'clownfish' ? pill('taken by the Clownfish', 'flower') : pill(res.result === 'nothing' ? 'scored nothing' : 'lost them', 'cat') + (res.back ? `<span class="back">got back ${egg(g, res.back)}</span>` : '')) : '';
            return `<li class="throw">${av(g, n, see(n) ? endPeople[n] : { dead: endPeople[n].dead }, 's')}<div><div class="throw-top"><b>${esc(n)}</b>${ui('next', 14)}<b>${esc(t.target)}</b>${see(n) ? hand(g, t.cards) : pill(plural(t.cards.length, 'card'))}${t.dead ? pill('dead, no votes', 'muted') : ''}${t.grudge ? pill('Grudge ×2', 'flower') : ''}${result}</div>
              ${t.note && see(n) ? `<div class="thought"><i>thinks</i>${esc(t.note)}</div>` : ''}</div></li>`;
          }).join('')}</ul></div>${verdict}`);
      }
    });
    if (rec.exclusive_winner) add('alone', 'Result', 'scores', '', `<div class="verdict farm">${av(g, rec.exclusive_winner, start[rec.exclusive_winner], 'l')}<div><b>${esc(rec.exclusive_winner)} won the round alone.</b><span>Every guess in the challenge was right. Nobody else scores this round.</span></div></div>`);
    if (s) {
      const end = rec.end;
      add('scores', 'Scores', 'scores', 'After round ' + R, `${standings(g, rec.scores, rec.gained, end)}
        ${rec.trimmed ? `<p class="fine">Nest limit: ${esc(Object.entries(rec.trimmed).map(([n, c]) => `${n} discarded ${c.length}`).join(', '))}.</p>` : ''}
        ${g.players.some((n) => end[n].role !== start[n].role || end[n].alignment !== start[n].alignment) ? `<ul class="changes">${g.players.filter((n) => end[n].role !== start[n].role || end[n].alignment !== start[n].alignment).map((n) => `<li>${dot(g, n)}<b>${esc(n)}</b> started as ${esc(start[n].alignment)} ${esc(start[n].role)} and ended as ${esc(end[n].alignment)} ${esc(end[n].role)}.</li>`).join('')}</ul>` : ''}`);
    }
    const idx = g.rounds.indexOf(rec);
    const prev = idx > 0 ? [gameHref(g, 'r' + g.rounds[idx - 1].round), 'Round ' + g.rounds[idx - 1].round] : [gameHref(g), 'Overview'];
    const next = idx < g.rounds.length - 1 ? [gameHref(g, 'r' + g.rounds[idx + 1].round), 'Round ' + g.rounds[idx + 1].round] : [gameHref(g), 'Overview'];
    const pin = (k) => `<aside class="pin"><div class="pin-bar"><button type="button" class="icon-btn" data-pin-step="-1" aria-label="Earlier in the round" ${k === 0 ? 'disabled' : ''}>${ui('back', 18)}</button><b>${esc(stages[k].label)}</b><button type="button" class="icon-btn" data-pin-step="1" aria-label="Later in the round" ${k === stages.length - 1 ? 'disabled' : ''}>${ui('next', 18)}</button></div>${stages.map((st, i) => `<div class="pin-stage" data-label="${esc(st.label)}" ${i === k ? '' : 'hidden'}>${st.html}</div>`).join('')}</aside>`;
    return `<div class="jump" id="jump">${sections.map((x) => `<button type="button" data-jump="${x.id}">${ui(x.ic, 15)}${esc(x.label)}</button>`).join('')}</div>
      ${sections.map((x) => `<details class="phase" id="${x.id}" ${G.open.has(G.tab + x.id) ? 'open' : ''}><summary class="phase-head"><span class="phase-ic">${ui(x.ic, 18)}</span><h2>${esc(x.label)}</h2>${x.hint ? `<span class="phase-hint">${esc(x.hint)}</span>` : ''}${ui('down', 18)}</summary>${x.html.replace(/%%PIN(\d+)%%/, (m, k) => pin(+k))}</details>`).join('')}
      ${s ? '' : `<div class="spoiler"><div><b>Finished round ${R}?</b><span>Reveal who was what, what happened at night and what everyone was thinking.</span></div><button class="btn primary" data-reveal="${R}">Reveal round ${R}</button></div>`}
      <nav class="pager"><a class="btn" href="${prev[0]}">${ui('back', 16)}${prev[1]}</a><a class="btn primary" href="${next[0]}">${next[1]}${ui('next', 16)}</a></nav>`;
  }

  /* ================= sheets (cards, players, pickers) ================= */
  let sheetOnClose = null;
  function openSheet(html, label, cls = '') {
    const sheet = $('#sheet');
    sheet.innerHTML = `<div class="sheet-panel ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label || '')}"><button type="button" class="sheet-x" data-close aria-label="Close">${ui('close', 20)}</button><div class="sheet-body">${html}</div></div>`;
    sheet.hidden = false;
    document.body.classList.add('sheet-open');
    $('.sheet-x', sheet).focus({ preventScroll: true });
  }
  function closeSheet() {
    const sheet = $('#sheet');
    if (sheet.hidden) return;
    sheet.hidden = true; sheet.innerHTML = '';
    document.body.classList.remove('sheet-open');
    const f = sheetOnClose; sheetOnClose = null; if (f) f();
  }
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet' || e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  const kindLine = (c) => (c.type === 'flower' ? `Flower · ${c.group}` : `${c.team} · ${D.cards.abilities[c.ability] || ''}`);
  // A card opens as a small pop-up over whatever is on screen (a sheet stays open underneath). It never touches
  // the page's scroll, and a tap anywhere outside it closes it.
  const cardPop = document.createElement('div');
  cardPop.id = 'cardpop'; cardPop.className = 'cardpop'; cardPop.hidden = true;
  document.body.appendChild(cardPop);
  function closeCard() { if (!cardPop.hidden) { cardPop.hidden = true; cardPop.innerHTML = ''; } }
  function openCard(name) {
    const c = D.card[name]; if (!c) return;
    const more = `${c.reading ? `<h4>How the simulator reads it</h4><p>${esc(c.reading)}</p>` : ''}${c.note ? `<h4>At a text table</h4><p>${esc(c.note)}</p>` : ''}${c.type !== 'flower' ? `<h4>When it acts at night</h4>${c.tiers && c.tiers.length ? `<div class="pills">${c.tiers.map((t) => pill(esc(t.name))).join('')}</div>` : '<p>It has no night effect of its own.</p>'}` : ''}`;
    cardPop.innerHTML = `<div class="cardpop-panel bigcard ${c.type}" role="dialog" aria-label="${esc(name)}"><div class="bigcard-art" style="background:${MeowIcons.bg(name)}">${icon(name)}</div>
        <div class="bigcard-text"><div class="bigcard-kind">${c.type === 'flower' ? ui('flower', 14) : ui(c.ability, 14)}${esc(kindLine(c))}</div><h2>${esc(name)}</h2><p>${esc(c.text)}</p>
        <div class="pills">${c.buffer ? pill('Always in the pool', 'yolk') : ''}${c.implemented === false ? pill('Not simulated yet', 'muted') : ''}</div>
        ${more ? `<details class="cardpop-more"><summary>More about this card</summary>${more}</details>` : ''}</div></div>`;
    cardPop.hidden = false;
  }
  cardPop.addEventListener('click', (e) => { if (!e.target.closest('.cardpop-more')) { e.stopPropagation(); closeCard(); } });
  for (const ev of ['touchmove', 'wheel']) cardPop.addEventListener(ev, (e) => { if (!e.target.closest('.cardpop-panel')) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cardPop.hidden) { e.stopImmediatePropagation(); closeCard(); } }, true);
  window.addEventListener('hashchange', closeCard);
  // Tap a card to inspect it. Where a tap already means something else (the run builder's toggles), hold it.
  let press = null, swallow = false;
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-card]'); if (!el || e.button > 0) return;
    press = { el, x: e.clientX, y: e.clientY, timer: setTimeout(() => { if (!press) return; swallow = true; press = null; if (navigator.vibrate) navigator.vibrate(8); openCard(el.dataset.card); }, 420) };
  });
  const endPress = () => { if (press) { clearTimeout(press.timer); press = null; } };
  document.addEventListener('pointermove', (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 9) endPress(); });
  document.addEventListener('pointerup', endPress);
  document.addEventListener('pointercancel', endPress);
  document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-card]')) e.preventDefault(); });
  document.addEventListener('click', (e) => {
    if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); return; }
    const el = e.target.closest('[data-card]');
    if (el && !el.closest('[data-hold]')) { e.preventDefault(); openCard(el.dataset.card); }
  }, true);

  /* ================= cards ================= */
  function mcard(c, note = '', attrs = '') {
    const off = c.implemented === false;
    return `<button type="button" class="mcard ${c.type || ''}${off ? ' off' : ''}" data-card="${esc(c.name)}" ${attrs}><span class="mcard-art">${icon(c.name)}</span>
      <span class="mcard-name">${esc(c.name)}</span><span class="mcard-kind">${esc(note || (c.type === 'flower' ? c.group : D.cards.abilities[c.ability] || ''))}</span></button>`;
  }
  const CF = { type: 'all', ability: '', q: '' };
  function viewCards(open) {
    const all = [...D.cards.roles, ...D.cards.flowers];
    const count = (t) => all.filter((c) => t === 'all' || c.type === t).length;
    page(`<header class="page-head"><h1>Cards</h1><p>Every animal and flower. Tap a card for its full text and how it behaves in play.</p></header>
      <div class="toolbar"><div class="seg" id="ctype" role="tablist">${[['all', 'All'], ['farm', 'Farm'], ['meowfia', 'Meowfia'], ['flower', 'Flowers']].map(([k, l]) => `<button type="button" data-t="${k}">${l}<small>${count(k)}</small></button>`).join('')}</div>
        <label class="search">${ui('search', 18)}<input type="search" id="cq" placeholder="Search cards" value="${esc(CF.q)}" aria-label="Search cards" autocomplete="off"></label></div>
      <div class="chiprow" id="abil"></div><div id="cardlist"></div>`);
    const draw = () => {
      const q = CF.q.trim().toLowerCase();
      const items = all.filter((c) => (CF.type === 'all' || c.type === CF.type) && (!CF.ability || c.ability === CF.ability || c.group === CF.ability) && (!q || c.name.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)));
      const groups = [['farm', 'Farm animals'], ['meowfia', 'Meowfia cats'], ['flower', 'Flowers']];
      $('#cardlist').innerHTML = groups.map(([t, label]) => { const it = items.filter((c) => c.type === t); return it.length ? `<section class="cardsec"><h2>${label}<small>${it.length}</small></h2><div class="mgrid">${it.map((c) => mcard(c)).join('')}</div></section>` : ''; }).join('') || '<div class="empty"><b>No cards match.</b><span>Try a different search or filter.</span></div>';
      const ab = CF.type === 'flower' ? [...new Set(D.cards.flowers.map((f) => f.group))].map((x) => [x, x, 'flower']) : CF.type === 'all' ? [] : Object.entries(D.cards.abilities).filter(([k]) => all.some((c) => c.type === CF.type && c.ability === k)).map(([k, l]) => [k, l, k]);
      $('#abil').innerHTML = ab.map(([k, l, ic]) => `<button type="button" class="fchip${CF.ability === k ? ' on' : ''}" data-ab="${esc(k)}">${CF.type === 'flower' ? '' : ui(ic, 14)}${esc(l)}</button>`).join('');
      $('#abil').hidden = !ab.length;
      $$('#ctype button').forEach((b) => b.classList.toggle('on', b.dataset.t === CF.type));
    };
    $('#ctype').onclick = (e) => { const b = e.target.closest('button'); if (b) { CF.type = b.dataset.t; CF.ability = ''; draw(); } };
    $('#abil').onclick = (e) => { const b = e.target.closest('button'); if (b) { CF.ability = CF.ability === b.dataset.ab ? '' : b.dataset.ab; draw(); } };
    $('#cq').oninput = (e) => { CF.q = e.target.value; draw(); };
    draw();
    if (open && D.card[open]) openCard(open);
  }

  /* ================= rules ================= */
  function rulesHTML(text) {
    const out = []; let cur = null;
    const flush = () => { if (cur) { out.push(`<${cur.tag}>${cur.items.map((i) => `<li>${i}</li>`).join('')}</${cur.tag}>`); cur = null; } };
    const rich = (s) => esc(s).replace(/^([A-Z][A-Za-z' ]{1,28}):/, '<b>$1:</b>');
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line) { flush(); continue; }
      if (line.startsWith('RULES:')) continue;
      if (/^[A-Z][A-Z :,']+$/.test(line) && line.length < 60) { flush(); out.push(`<h3>${esc(cap(line.replace(/^RULES: /, '').toLowerCase()))}</h3>`); continue; }
      const m = line.match(/^(-|\d+\.)\s+(.*)$/);
      if (m) { const tag = m[1] === '-' ? 'ul' : 'ol'; if (!cur || cur.tag !== tag) { flush(); cur = { tag, items: [] }; } cur.items.push(rich(m[2])); continue; }
      flush(); out.push(`<p>${rich(line)}</p>`);
    }
    flush();
    return out.join('');
  }
  const getPath = (obj, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  function viewRules(name) {
    const v = D.variants.find((x) => x.name === name) || D.variants[0];
    const base = v.extends ? D.variants.find((x) => x.name === v.extends) : null;
    const changed = new Set((v.changes || []).map((c) => c.key));
    page(`<header class="page-head"><h1>Rules</h1><p>The rules exactly as the players read them, and the settings behind them.</p></header>
      <section class="block lead-block"><h2>${esc(v.name)}</h2><p class="muted">${esc(v.description || '')}${base ? ` Based on ${esc(base.name)}.` : ''}</p>
        ${v.changes && v.changes.length ? `<ul class="plain diff">${v.changes.map((c) => { const m = settingMeta(c.key); if (c.key.startsWith('text.')) return `<li><b>${esc(c.key.slice(5))}</b> ${esc(c.to)}</li>`; if (c.key === 'rules.notes') return c.to.map((x) => `<li><b>Clarified</b> ${esc(x)}</li>`).join(''); if (c.key.startsWith('deck.')) { const gone = (c.from || []).filter((x) => !c.to.includes(x)), added = c.to.filter((x) => !(c.from || []).includes(x)); return `<li><b>${c.key === 'deck.roles' ? 'Animals' : 'Flowers'}</b> ${esc([gone.length ? 'without ' + list(gone) : '', added.length ? 'with ' + list(added) : ''].filter(Boolean).join('; '))}</li>`; } return `<li><b>${esc(m ? m.label : c.key)}</b> ${esc(showValue(m, c.to))} <small>was ${esc(c.from === undefined || c.from === null ? 'unset' : showValue(m, c.from))}</small></li>`; }).join('')}</ul>` : ''}
        <a class="btn small" href="#/run?variant=${encodeURIComponent(v.name)}">${ui('run', 14)}Play with these rules</a></section>
      <div class="rules-layout"><article class="rules-text">${rulesHTML(v.rules)}</article>
      <aside class="settings">${D.meta.groups.map((grp) => `<section class="block"><h3>${esc(grp.label)}</h3><dl class="facts tight">${D.meta.settings.filter((s) => s.group === grp.id).map((s) => `<dt>${esc(s.label)}</dt><dd class="${changed.has(s.key) ? 'changed' : ''}">${esc(showValue(s, getPath(v.settings, s.key)))}</dd>`).join('')}</dl></section>`).join('')}
        <section class="block"><h3>Deck</h3><dl class="facts tight"><dt>Animals</dt><dd>${v.settings.deck.roles.length + 2}</dd><dt>Flowers</dt><dd>${v.settings.deck.flowers.length}</dd><dt>Rounds</dt><dd>${v.settings.game.rounds}</dd><dt>Players</dt><dd>${v.settings.game.players}</dd></dl></section></aside></div>`);
  }

  /* ================= simulations ================= */
  const SUM = [['no_meowfia_rounds', 'Rounds with no Meowfia', 'p'], ['meowfia_per_round', 'Meowfia per round', 'n'], ['mean_nest_at_vote', 'Cards in a nest at the vote', 'n'],
    ['mean_egg_change', 'Eggs gained per player per night', 'n'], ['night_deaths_per_round', 'Night deaths per round', 'n'], ['day_deaths_per_round', 'Day deaths per round', 'n'],
    ['hugs_per_night', 'Hugs per night', 'n'], ['confusions_per_night', 'Confusions per night', 'n'], ['players_changing_animal_per_round', 'Animal changes per round', 'n'],
    ['players_changing_alignment_per_round', 'Side changes per round', 'n'], ['redirects_per_night', 'Redirected visits per night', 'n'], ['games_ended_early', 'Games cut short by the deck', 'n']];
  /* ================= game health: every game together ================= */
  const TREND = [['fun', 'Fun', 10, 'Reviewer, out of 10'], ['tension', 'Tension', 10, 'Reviewer, out of 10'], ['deduction', 'Deduction', 10, 'Reviewer, out of 10'], ['bluffing', 'Bluffing', 10, 'Reviewer, out of 10'], ['clarity', 'Clarity', 10, 'Reviewer, out of 10'],
    ['vote_share', 'Votes on the target', 100, '% of votes on the player who went out'], ['named_at', 'When the target was named', 100, '% of the day gone'], ['liecatch', 'Lies caught', 100, '% of false claims that ended in an eggsecution'],
    ['fired', 'Animals that did something', 100, '% of animals dealt'], ['gap', 'Score gap', 0, 'Points between first and last'], ['top_share', 'Loudest player', 100, '% of all words'], ['questions', 'Questions asked', 100, '% of messages']];
  // One measure over the games in order: a thin line, a dot per game, a dashed rule where the rules changed.
  function spark(rows, key, top, marks) {
    const W = 300, H = 84, px = 8, py = 10, vals = rows.map((r) => r[key]), known = vals.filter((v) => v !== null && v !== undefined);
    if (!known.length) return '<p class="muted">No data yet.</p>';
    const hi = top || Math.max(1, ...known), x = (i) => (rows.length < 2 ? W / 2 : px + i * (W - 2 * px) / (rows.length - 1)), y = (v) => H - py - (v / hi) * (H - 2 * py);
    let d = '', pen = false;
    vals.forEach((v, i) => { if (v === null || v === undefined) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`; pen = true; });
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(key)} over ${rows.length} games"><line x1="0" x2="${W}" y1="${H - py}" y2="${H - py}" class="sp-base"/>
      ${marks.map((i) => `<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="2" y2="${H - py}" class="sp-mark"/>`).join('')}
      <path d="${d}" class="sp-line"/>
      ${vals.map((v, i) => (v === null || v === undefined ? '' : `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" class="sp-dot"/><circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="13" class="sp-hit" data-tip="${esc(rows[i].title)}: ${v}" data-go="${esc(rows[i].id)}"/>`)).join('')}</svg>`;
  }
  // What the scripted Lab run found: each exploiter's win share and what the solver says about the rounds.
  function labBlock(lab) {
    if (!lab || !lab.kinds) return '';
    const pc = (v) => (v === null || v === undefined ? '–' : Math.round(v * 100) + '%');
    const NAME = { follower: 'Follows the crowd, stakes everything', silent: 'Never speaks', hoarder: 'Hoards until the last round', leader: 'Votes against the leader' };
    const sv = lab.solver || {};
    return `<h4 class="sub">Scripted players (${esc(String(lab.games))} games each, chance is ${pc(1 / 6)})</h4>
      <ul class="plain lablist">${Object.entries(lab.kinds).map(([k, v]) => `<li><span>${esc(NAME[k] || k)}</span><b>${pc(v)}</b></li>`).join('')}</ul>
      <p class="fine">The round solver over ${sv.rounds || 0} scripted rounds: a perfect table puts ${pc(sv.ceiling_mean)} on the true cats on average; ${pc(sv.ceiling_over_95)} of rounds are given away (above 95%); ${pc(sv.cover_nonzero)} of cats had a lie that fitted every honest report.</p>`;
  }

  // The structural analysis' Table 6: each measure against its target, for every game or only the frozen control.
  function measuresBlock(m) {
    const fmt = (v, u) => (v === null || v === undefined ? '–' : u === '%' ? Math.round(v * 100) + '%' : u === 'r' ? v.toFixed(2) : u === 'x' ? v.toFixed(2) : v.toFixed(1));
    const tgt = (r) => (r.lo !== null && r.hi !== null ? `${fmt(r.lo, r.unit)}–${fmt(r.hi, r.unit)}` : r.lo !== null ? `≥ ${fmt(r.lo, r.unit)}` : `≤ ${fmt(r.hi, r.unit)}`);
    const which = store.get('t6', 'all') === 'control' && m.control.n.games ? 'control' : 'all';
    const set = m[which];
    const lab = m.lab || {};
    return `<section class="block" id="t6"><h3>How the game measures up</h3>
      <p class="fine">The measures from the structural analysis (Table 6), each against its first target. ${which === 'control' ? `Games on the frozen control: ${set.n.games} games, ${set.n.rounds} rounds.` : `Every game: ${set.n.games} games, ${set.n.rounds} rounds.`} Scripted measures come from ${lab.when ? `the Lab run of ${esc(when(lab.when, true))}` : 'Lab runs, when there are any'}.</p>
      <div class="seg small t6pick">${[['all', 'Every game'], ['control', `Control (${m.control.n.games})`]].map(([k, l]) => `<button type="button" class="${which === k ? 'on' : ''}" data-t6="${k}" ${k === 'control' && !m.control.n.games ? 'disabled' : ''}>${l}</button>`).join('')}</div>
      <div class="scroll-x"><table class="data t6"><thead><tr><th>Measure</th><th>Now</th><th>Target</th><th>Property</th></tr></thead><tbody>
      ${set.rows.map((r) => `<tr class="${r.met === true ? 'met' : r.met === false ? 'miss' : ''}"><td><b>${esc(r.label)}</b><small>${esc(r.definition)}</small></td><td>${r.value === null || r.value === undefined ? '<span class="muted">not measured</span>' : `<b>${fmt(r.value, r.unit)}</b> ${r.met ? ui('check', 14) : ''}`}</td><td>${tgt(r)}</td><td>${esc(r.property)}</td></tr>`).join('')}</tbody></table></div>${labBlock(lab)}</section>`;
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-t6]'); if (b) { store.set('t6', b.dataset.t6); viewHealth(); } });

  // A rule change's registered hypothesis and the result of its paired test, if it has one.
  function changeTest(c) {
    if (!c.hypothesis && !c.result) return '';
    const r = c.result || {}, f = (v) => (v === null || v === undefined ? '–' : (Math.abs(v) < 1 ? (v * 100).toFixed(1) + ' pts' : v.toFixed(2)));
    const tone = { adopt: 'farm', reject: 'cat' }[r.verdict] || 'muted';
    return `<div class="ctest">${c.hypothesis ? `<span><b>Expected:</b> ${esc(c.hypothesis)}${c.measure ? ` (${esc(c.measure)} ${c.direction === 'down' ? 'down' : 'up'})` : ''}</span>` : ''}
      ${r.verdict ? `<span>${pill(esc(r.verdict), tone)} ${r.effect === null || r.effect === undefined ? '' : `effect ${f(r.effect)}, 95% interval ${f((r.interval || [])[0])} to ${f((r.interval || [])[1])}`}, ${r.rounds} rounds an arm, ${esc(r.seats || '')} seats</span>` : '<span class="muted">Not tested yet.</span>'}</div>`;
  }

  async function viewHealth() {
    document.title = 'Game health · Meowfia Lab';
    page('<div class="loading" role="status">Adding up the games</div>');
    let h; try { h = await getData('health.json'); } catch { page('<div class="empty"><b>No health figures yet.</b><span>They are worked out when the site is published.</span><a class="btn" href="#/">Back to the games</a></div>'); return; }
    const rows = h.trend.map((r) => ({ ...r, liecatch: r.lies ? Math.round(100 * r.lies_caught / r.lies) : null }));
    const idx = Object.fromEntries(rows.map((r, i) => [r.id, i]));
    const marks = [...new Set(h.changes.filter((c) => c.game in idx).map((c) => idx[c.game]))];
    const pct = (a, b) => (b ? Math.round(100 * a / b) + '%' : '–');
    const group = (title, list, empty) => `<section class="block"><h3>${title}</h3>${list.length ? list.map((x) => `<details class="issue"><summary>${x.about === 'General' ? '<span class="cchip plain"><span>General</span></span>' : `<span class="cchip ${typeOf(x.about)}"><span class="cchip-art">${icon(x.about)}</span><span>${esc(x.about)}</span></span>`}<b>${plural(x.count, 'note')}</b><span class="muted">in ${plural(x.games, 'game')}</span>${ui('down', 16)}</summary><ul class="notes">${x.items.map((n) => `<li>${esc(n.text)} <a href="#/game/${encodeURIComponent(n.game)}">${esc(n.title)}</a></li>`).join('')}</ul></details>`).join('') : `<p class="muted">${empty}</p>`}</section>`;
    page(`<a class="crumb" href="#/">${ui('back', 16)}Games</a>
      <header class="page-head"><h1>Game health</h1><p>Every finished game added together: how the measures move as the rules change, what each card does, and what keeps coming up. ${plural(rows.length, 'game')} so far, so read single dots as anecdotes.</p></header>
      <section class="block"><h3>Over time</h3><p class="fine">One dot per game, oldest on the left. A dashed line marks the first game after a rule change. Tap a dot for the game.</p>
        <div class="sparks">${TREND.map(([k, label, top, note]) => { const last = [...rows].reverse().find((r) => r[k] !== null && r[k] !== undefined); return `<figure class="sparkbox"><figcaption><b>${label}</b><span>${last ? last[k] + (top === 100 ? '%' : '') : '–'}</span></figcaption>${spark(rows, k, top, marks)}<small>${note}</small></figure>`; }).join('')}</div>
        <div class="sp-tip" id="sptip" hidden></div>
        <details class="issue"><summary><b>The numbers</b>${ui('down', 16)}</summary><div class="scroll-x"><table class="data"><thead><tr><th>Game</th>${TREND.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${[...rows].reverse().map((r) => `<tr><td><a href="#/game/${encodeURIComponent(r.id)}">${esc(r.title)}</a></td>${TREND.map(([k]) => `<td>${r[k] ?? '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></section>
      ${h.measures ? measuresBlock(h.measures) : ''}
      <section class="block"><h3>What each animal does</h3><div class="scroll-x"><table class="data"><thead><tr><th>Animal</th><th>Dealt</th><th>Games</th><th>Did something</th><th>Reached another player</th><th>Holder won the round</th></tr></thead><tbody>
        ${h.cards.map((c) => `<tr><td>${cchip(c.name)}</td><td>${c.dealt}</td><td>${c.games}</td><td>${pct(c.fired, c.dealt)}</td><td>${pct(c.reached, c.dealt)}</td><td>${pct(c.won, c.dealt)}</td></tr>`).join('')}</tbody></table></div>
        <p class="fine">Animals never dealt are not listed. A few deals say little: look at the "Dealt" column first.</p>
        ${h.flowers.length ? `<h4 class="sub">Flowers that have been in play</h4><div class="pills">${h.flowers.map((f) => cchip(f.name, ` <small>${plural(f.games, 'game')}</small>`)).join('')}</div>` : ''}</section>
      <div class="cols">${group('What keeps needing a fix', h.issues, 'No notes yet.')}${group('What keeps working', h.worked || [], 'Nothing has been singled out yet.')}</div>
      <section class="block"><h3>Rule changes</h3>${h.changes.length ? `<ol class="changes">${h.changes.map((c) => `<li><time>${esc(when(c.date, true))}</time><div><b>${esc(c.title)}</b>${c.experimental ? ' <span class="pill muted">experiment</span>' : ''}<p>${esc(c.detail)}</p>${changeTest(c)}${c.game ? `<a href="#/game/${encodeURIComponent(c.game)}">First game on it: ${esc(c.game_title)}</a>` : '<span class="muted">No game played on it yet.</span>'}</div></li>`).join('')}</ol>` : '<p class="muted">No changes logged.</p>'}</section>`);
    const tip = $('#sptip');
    app.onpointerover = (e) => { const t = e.target.closest('.sp-hit'); if (!t || !tip) return; tip.textContent = t.dataset.tip; tip.hidden = false; const r = t.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px'; tip.style.top = (r.top + window.scrollY - tip.offsetHeight - 6) + 'px'; };
    app.onpointerout = (e) => { if (e.target.closest('.sp-hit') && tip) tip.hidden = true; };
    app.onclick = (e) => { const t = e.target.closest('.sp-hit'); if (t) location.hash = '#/game/' + encodeURIComponent(t.dataset.go); };
  }

  function viewSims() {
    page(`<header class="page-head"><h1>Simulations</h1><p>Hundreds of games played by random bots in seconds. They show how the rules behave, not how people play: how often an ability matters, how big nests grow, how often nobody is Meowfia.</p></header>
      ${D.sims.length ? `<div class="glist">${D.sims.map((s) => `<a class="gcard" href="#/sim/${encodeURIComponent(s.id)}"><div class="gcard-meta"><span>${when(s.started, true)}</span><span>${esc(s.variant)}</span><span>${s.players} players</span>${changesPill(s.overrides)}</div>
        <h2>${s.games.toLocaleString()} games</h2>
        <div class="tiles small">${[[pct(s.summary.no_meowfia_rounds), 'no-cat rounds'], [s.summary.mean_nest_at_vote, 'cards in a nest'], [s.summary.night_deaths_per_round, 'night deaths a round']].map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join('')}</div>
        ${s.errors ? `<div class="gcard-foot">${pill(plural(s.errors, 'crash', 'crashes'), 'cat')}</div>` : ''}</a>`).join('')}</div>` : `<div class="empty"><b>No simulation sets yet.</b><span>They are free and take seconds.</span><a class="btn primary" href="#/run">New run</a></div>`}`);
  }
  const SORT = { key: 'effect_rate', dir: 1 };
  async function viewSim(id) {
    page('<div class="loading" role="status">Loading the simulation set</div>');
    let s; try { s = await getData(`sims/${id}.json`); } catch { page('<div class="empty"><b>This simulation set could not be loaded.</b><a class="btn" href="#/sims">Back</a></div>'); return; }
    const bars = (all, fmt = (v) => v) => { const rows = all.filter((r) => r.share >= .005); const max = Math.max(...rows.map((r) => r.share), .0001); return `<div class="dist">${rows.map((r) => `<div class="dist-row"><span>${fmt(r.value)}</span><i><b style="width:${r.share / max * 100}%"></b></i><em>${pct(r.share)}</em></div>`).join('')}</div>`; };
    const cols = [['name', 'Animal'], ['dealt', 'Dealt'], ['effect_rate', 'Did something'], ['blocked_rate', 'Hugged'], ['eggs_moved', 'Eggs moved'], ['eggs_self', 'Eggs for itself']];
    const rolesTable = () => {
      const rows = s.roles.filter((r) => r.dealt).sort((a, b) => { const x = a[SORT.key] ?? -1, y = b[SORT.key] ?? -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * SORT.dir; });
      return `<div class="scroll-x"><table class="data"><thead><tr>${cols.map(([k, l]) => `<th><button type="button" data-sort="${k}" class="${SORT.key === k ? 'on' : ''}">${l}${SORT.key === k ? (SORT.dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr><th>${cchip(r.name)}</th><td>${r.dealt}</td><td><span class="ibar"><i style="width:${r.effect_rate * 100}%"></i></span>${pct(r.effect_rate)}</td><td>${pct(r.blocked_rate)}</td><td>${r.eggs_moved}</td><td>${r.eggs_self}</td></tr>`).join('')}</tbody></table></div>`;
    };
    const dealt = s.roles.filter((r) => r.dealt >= Math.max(5, s.games / 25));
    const quiet = [...dealt].sort((a, b) => a.effect_rate - b.effect_rate).slice(0, 5);
    const movers = [...dealt].sort((a, b) => b.eggs_moved - a.eggs_moved).slice(0, 5);
    const ov = (((s.settings || {}).overrides) || []).map(describe).filter(Boolean);
    document.title = `${s.games} simulated games · Meowfia Lab`;
    page(`<a class="crumb" href="#/sims">${ui('back', 16)}Simulations</a>
      <header class="game-head"><h1>${s.games.toLocaleString()} games of ${esc(s.variant)}</h1>
        <div class="meta-row"><span>${when(s.started)}</span><span>${s.players} players</span><span>${plural(s.rounds_per_game, 'round')}</span><span>${s.seconds}s</span>${s.error_count ? pill(plural(s.error_count, 'crash', 'crashes'), 'cat') : ''}</div>
        ${ov.length ? `<ul class="plain diff">${ov.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</header>
      ${s.error_count ? `<section class="block warn"><h3>Crashes</h3><ul class="plain">${s.errors.map((e) => `<li>Seed ${e.seed}: ${esc(e.error)}</li>`).join('')}</ul></section>` : ''}
      <div class="tiles">${SUM.map(([k, l, f]) => `<div class="tile"><b>${f === 'p' ? pct(s.summary[k], 1) : s.summary[k]}</b><span>${l}</span></div>`).join('')}</div>
      <div class="cols three"><section class="block"><h3>Meowfia in a round</h3>${bars(s.meowfia_count)}</section>
        <section class="block"><h3>Cards in a nest at the vote</h3>${bars(s.nest_at_vote)}</section>
        <section class="block"><h3>Eggs gained or lost in a night</h3>${bars(s.egg_change, (v) => (v > 0 ? '+' : '') + v)}</section></div>
      <div class="cols"><section class="block"><h3>Quietest animals</h3><p class="fine">Their ability most often changed nothing and told nobody anything.</p><ul class="ranked">${quiet.map((r) => `<li>${cchip(r.name)}<b>${pct(r.effect_rate)}</b></li>`).join('')}</ul></section>
        <section class="block"><h3>Biggest egg movers</h3><p class="fine">Eggs laid, stolen or passed on per night.</p><ul class="ranked">${movers.map((r) => `<li>${cchip(r.name)}<b>${r.eggs_moved}</b></li>`).join('')}</ul></section></div>
      <section class="block"><h3>Every animal</h3><p class="fine">Per night the animal was in play. Tap a heading to sort.</p><div id="roles">${rolesTable()}</div></section>
      <section class="block"><h3>Flowers</h3><p class="fine">Share of rounds in which each flower was active.</p><div class="flowers">${[...s.flowers].sort((a, b) => b.rounds - a.rounds).map((f) => cchip(f.name, `<small>${pct(f.share, 1)}</small>`)).join('') || '<span class="muted">No flowers appeared.</span>'}</div></section>`);
    $('#roles').onclick = (e) => { const th = e.target.closest('[data-sort]'); if (!th) return; if (SORT.key === th.dataset.sort) SORT.dir *= -1; else { SORT.key = th.dataset.sort; SORT.dir = th.dataset.sort === 'name' ? 1 : -1; } $('#roles').innerHTML = rolesTable(); };
  }

  /* ================= the run page ================= */
  let poll = null;
  function stopPolling() { if (poll) { clearInterval(poll); poll = null; } }
  const MODELS = ['haiku', 'sonnet', 'opus', 'fable'];
  const MODEL_NOTE = { haiku: 'Fast and light on usage. Misreads rules more often.', sonnet: 'Plays well. The usual choice.', opus: 'Sharper deduction. Heavy on usage.', fable: 'The strongest player. Heaviest on usage.' };
  const EFFORT_OPTS = [['', 'Default'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'Very high'], ['max', 'Maximum']];
  const EFFORT = Object.fromEntries(EFFORT_OPTS);
  const STYLE_OPTS = [['', 'None'], ['team', 'Team first'], ['balanced', 'Balanced'], ['selfish', 'Out for themselves'], ['hoarder', 'Exploiter: hoards'], ['follower', 'Exploiter: follows']];
  const STYLE = Object.fromEntries(STYLE_OPTS);
  const blank = () => ({ kind: 'game', variant: '', players: null, rounds: null, seed: '', games: 500, model: 'sonnet', effort: '', review: 'opus', probes: true, human: '', opponents: 'claude', seats: {}, seatRounds: 'all', roles: null, flowers: null, startPool: [], reveals: [], rules: {}, raw: '' });
  let B = Object.assign(blank(), store.get('builder', {}));
  const R = { status: null, state: 'checking', cardTab: 'roles', q: '', go: false };
  const isPlay = () => B.kind === 'game' && seatNames().includes(B.human);
  const saveB = () => store.set('builder', B);
  // Fill the run builder from a finished game: its cards, rules, table size, models and seat choices (not its seed).
  function loadSetup(g) {
    const b = blank();
    b.variant = g.variant; b.players = g.players.length; b.rounds = (g.rounds || []).length || null;
    if (MODELS.includes(g.model)) b.model = g.model;
    b.effort = g.effort || ''; if ([...MODELS, 'none'].includes(g.review_model)) b.review = g.review_model;
    const seat = (n) => (b.seats[n] = b.seats[n] || {});
    for (const [n, m] of Object.entries(g.seat_models || {})) seat(n).model = m;
    for (const [n, e] of Object.entries(g.seat_efforts || {})) seat(n).effort = e;
    for (const [n, s] of Object.entries(g.seat_styles || {})) seat(n).style = s;
    const base = (D.variants.find((v) => v.name === g.variant) || D.variants[0]).settings, raw = [], old = {};
    for (const line of g.overrides || []) {
      const i = line.indexOf('='); if (i < 0) continue;
      const key = line.slice(0, i).trim(), text = line.slice(i + 1).trim();
      let v;
      try { v = JSON.parse(text.replace(/("(?:[^"\\]|\\.)*")\s*=/g, '$1:')); } catch { raw.push(line); continue; }
      if (key === 'deck.roles') b.roles = v;
      else if (key === 'deck.flowers') b.flowers = v;
      else if (key === 'game.start_pool') old.pool = v;
      else if (key === 'game.reveal_plan' || key === 'game.first_reveal') old.plan = v.flat();
      else if (key === 'game.pool_reveal') old.reveal = v;
      else if (key === 'scoring.goose') continue;
      else if (key === 'game.seat_roles') for (const [n, r] of Object.entries(v)) seat(n).role = r;
      else if (key === 'game.seat_sides') for (const [n, s] of Object.entries(v)) seat(n).side = s;
      else if (key === 'game.seat_rounds') b.seatRounds = v;
      else if (key === 'game.players' || key === 'game.rounds') continue;
      else if (D.meta && (D.meta.settings || []).some((s) => s.key === key) && getPath(base, key) !== undefined) b.rules[key] = v;
      else raw.push(line);
    }
    if (old.pool && old.reveal === 0) b.roles = old.pool;                 // a game from the reveal-three days
    if (old.plan) { const fl = [...new Set(old.plan.filter((x) => (D.card[x] || {}).type === 'flower'))]; if (fl.length) { b.flowers = fl; b.rules['game.max_flowers'] = fl.length; } }
    else if (old.reveal === 0) { b.flowers = []; }
    b.raw = raw.join('\n');
    B = b; saveB();
    location.hash = '#/run';
    toast('Setup loaded. Check it, then start the run.');
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-load-setup]') && G.game) loadSetup(G.game); });
  const variantOf = () => D.variants.find((v) => v.name === B.variant) || D.variants[0];
  const baseVal = (key) => getPath(variantOf().settings, key);
  const val = (key) => (key in B.rules ? B.rules[key] : baseVal(key));
  const nPlayers = () => B.players || baseVal('game.players');
  const nRounds = () => B.rounds || baseVal('game.rounds');
  const seatNames = () => D.cards.names.slice(0, nPlayers());
  const deckList = (k) => B[k] || variantOf().settings.deck[k];
  const allOf = (k) => (k === 'roles' ? D.cards.roles.filter((r) => !r.buffer) : D.cards.flowers.filter((f) => f.implemented !== false)).map((c) => c.name);
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const toml = (v) => JSON.stringify(v);
  const tomlTable = (o) => '{' + Object.entries(o).map(([k, v]) => `${JSON.stringify(k)} = ${JSON.stringify(v)}`).join(', ') + '}';

  // Everything the builder changed, as "section.key=value" lines the simulator understands.
  function overridesOf() {
    const out = [];
    for (const k of ['roles', 'flowers']) if (B[k] && !sameSet(B[k], variantOf().settings.deck[k])) out.push(`deck.${k}=${toml(B[k])}`);
    const roles = {}, sides = {};
    for (const n of seatNames()) { const s = B.seats[n] || {}; if (s.role) roles[n] = s.role; if (s.side) sides[n] = s.side; }
    if (Object.keys(roles).length) out.push(`game.seat_roles=${tomlTable(roles)}`);
    if (Object.keys(sides).length) out.push(`game.seat_sides=${tomlTable(sides)}`);
    if ((Object.keys(roles).length || Object.keys(sides).length) && B.seatRounds === 'first') out.push('game.seat_rounds="first"');
    for (const [k, v] of Object.entries(B.rules)) if (v !== baseVal(k)) out.push(`${k}=${toml(v)}`);
    for (const line of B.raw.split('\n').map((x) => x.trim()).filter((x) => x.includes('='))) out.push(line);
    return out;
  }
  function payload() {
    const seat_models = {};
    const seat_efforts = {}, seat_styles = {};
    for (const n of seatNames()) { const st = (B.seats[n] || {}).style; if (st) seat_styles[n] = st; }
    for (const n of seatNames()) { const m = (B.seats[n] || {}).model; if (m && m !== B.model) seat_models[n] = m; const e = (B.seats[n] || {}).effort; if (e && e !== B.effort) seat_efforts[n] = e; }
    const human = isPlay() ? B.human : null;
    return { type: B.kind, variant: variantOf().name, players: nPlayers(), rounds: nRounds(), seed: B.seed === '' ? null : +B.seed, human, opponents: human && B.opponents === 'random' ? 'random' : 'claude', model: B.model, effort: B.effort || null, review_model: B.review, probes: B.probes, games: B.games, seat_models, seat_efforts, seat_styles, set: overridesOf() };
  }
  function command() {
    const p = payload(), q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
    let c = `python3 -m meowsim ${p.type === 'sim' ? 'sim --games ' + p.games : 'play --model ' + p.model} --variant ${q(p.variant)} --players ${p.players} --rounds ${p.rounds}`;
    if (p.seed !== null) c += ` --seed ${p.seed}`;
    if (p.human) c += ` --human ${p.human}` + (p.opponents === 'random' ? ' --seats random' : '');
    if (p.type === 'game') { c += ` --review-model ${p.review_model}`; if (p.effort) c += ` --effort ${p.effort}`; if (!p.probes) c += ' --no-probes'; for (const [n, m] of Object.entries(p.seat_models)) c += ` --seat-model ${n}=${m}`; for (const [n, e] of Object.entries(p.seat_efforts)) c += ` --seat-effort ${n}=${e}`; for (const [n, st] of Object.entries(p.seat_styles)) c += ` --seat-style ${n}=${st}`; }
    for (const o of p.set) c += ` --set ${q(o)}`;
    return c;
  }

  function viewRun(query) {
    if (!B.variant || !D.variants.find((v) => v.name === B.variant)) B.variant = D.variants[0].name;
    if (query.get('variant') && D.variants.find((v) => v.name === query.get('variant'))) { B.variant = query.get('variant'); B.rules = {}; B.roles = B.flowers = null; saveB(); }
    if (query.get('c')) {                          // a setup handed over from the public site
      try { B = Object.assign(blank(), JSON.parse(decodeURIComponent(escape(atob(query.get('c').replace(/-/g, '+').replace(/_/g, '/')))))); saveB(); R.go = !!query.get('go'); if (!R.go) toast('Setup loaded. Check it and start the run.'); } catch { toast('That setup link could not be read.', true); }
      history.replaceState(null, '', '#/run');
    }
    document.title = 'New run · Meowfia Lab';
    page(`<header class="page-head"><h1>New run</h1><p>Set up a game exactly how you want it, then let it play on your PC.</p></header>
      <div id="conn"></div><div id="monitor"></div>
      <div class="builder" id="builder"><div class="builder-main">
        <section class="bsec" id="sec-kind"></section><section class="bsec shut" id="sec-game"></section><section class="bsec shut" id="sec-players"></section>
        <section class="bsec shut" id="sec-cards"></section><section class="bsec shut" id="sec-rules"></section></div>
        <aside class="builder-side" id="summary"></aside></div>
      <div class="startbar" id="startbar"></div>`, 'run');
    drawAll();
    wireBuilder();
    connect();
  }
  async function connect() {
    const box = $('#conn'); if (!box) return;
    const control = D.config.control;
    if (!control) { R.state = 'none'; box.innerHTML = `<div class="notice">${ui('info', 18)}<div><b>Runs are not set up on this copy of the site.</b><span>You can still build a setup and copy the command.</span></div></div>`; drawSummary(); return; }
    if (!canCall()) { R.state = 'handover'; box.innerHTML = `<div class="notice">${ui('link', 18)}<div><b>Runs start on your PC.</b><span>Build the setup here, then continue on the PC's copy of this site. It opens only on a device connected to your Tailscale network.</span></div></div>`; drawSummary(); return; }
    R.state = 'checking'; drawSummary();
    try {
      R.status = await ctl('/api/status', { timeout: 5000 });
      R.state = 'ok'; box.innerHTML = '';
      showMonitor(); drawSummary();
      poll = setInterval(refresh, 2500);
      if (R.go) { R.go = false; start(); }         // handed over from the public site with "start it": no second press
    } catch (e) {
      R.state = 'down';
      box.innerHTML = `<div class="notice bad">${ui('info', 18)}<div><b>Can't reach the PC.</b><span>Turn on Tailscale on this device and check the PC is on. Everything else on the site works without it.</span></div><button type="button" class="btn small" id="retry">Try again</button></div>`;
      $('#retry').onclick = connect;
      drawSummary();
    }
  }
  async function refresh() {
    try { R.status = await ctl('/api/status'); showMonitor(); } catch { /* keep the last view */ }
  }
  function runLine(r) {
    const what = r.type === 'sim' ? `${(r.games || 0).toLocaleString()} simulated games` : 'Real game';
    return `<b>${what}</b><span>${esc(r.variant)} · ${r.players} players${r.type === 'game' ? ' · ' + esc(r.practice ? 'practice bots' : r.seat_models ? 'mixed models' : model(r.model)) : ''}${r.human ? ' · you play ' + esc(r.human) : ''}${r.changes ? ' · ' + plural(r.changes, 'change') : ''}</span>`;
  }
  function showMonitor() {
    const box = $('#monitor'), st = R.status; if (!box || !st) return;
    const runs = st.runs || (st.running ? [st.running] : []), run = runs[0];
    const badge = { queued: pill('Queued', 'muted'), done: pill('Finished', 'farm'), stopped: pill('Stopped', 'yolk'), failed: pill('Failed', 'cat') };
    const item = (r) => `<li class="qitem">${badge[r.state] || ''}<div class="qitem-text">${runLine(r)}${r.message ? `<small>${esc(r.message)}</small>` : ''}</div>
      ${r.state === 'queued' ? `<button type="button" class="btn small" data-stop="${esc(r.id)}">Remove</button>` : ''}
      ${r.state === 'stopped' && r.type === 'game' && r.resumable ? `<button type="button" class="btn small" data-resume="${esc(r.id)}">Continue</button>` : ''}
      ${r.state === 'done' ? `<a class="btn small" href="#/${r.type === 'sim' ? 'sim' : 'game'}/${encodeURIComponent(r.id)}">Open</a>` : ''}</li>`;
    const tailKey = run && run.tail ? run.tail.length + '|' + run.tail[run.tail.length - 1] : '';
    const liveEl = $('#live'), stick = !liveEl || liveEl.scrollTop + liveEl.clientHeight >= liveEl.scrollHeight - 30;
    box.innerHTML = `${runs.map((x, i) => `<section class="live-run"><div class="live-head"><span class="pulse"></span><div class="qitem-text">${runLine(x)}</div>${x.human ? `<a class="btn small primary" href="#/play/${encodeURIComponent(x.id)}">Play</a>` : ''}<button type="button" class="btn small danger" data-stop="${esc(x.id)}">${ui('stop', 14)}Stop</button></div>
        <div class="progress" role="progressbar" aria-valuenow="${Math.round((x.progress || 0) * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round((x.progress || 0) * 100)}%"></i></div>
        <div class="live-meta"><span>${esc(x.phase || 'Starting')}</span><span>${esc(x.elapsed || '')}${x.calls ? ' · ' + x.calls + ' turns' : ''}</span></div>
        ${x.tail && x.tail.length ? (i === 0 && runs.length === 1 ? `<div class="live" id="live" data-key="${esc(tailKey)}">${x.tail.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : `<p class="live-last">${esc(x.tail[x.tail.length - 1])}</p>`) : ''}</section>`).join('')}
      ${st.queue.length ? `<section class="queue"><h3>Up next</h3><ul>${st.queue.map(item).join('')}</ul></section>` : ''}
      ${st.recent.length ? `<details class="queue recent"${run || st.queue.length ? '' : ''}><summary><h3>Recent runs</h3>${ui('down', 16)}</summary><ul>${st.recent.slice(0, 8).map(item).join('')}</ul></details>` : ''}`;
    const live = $('#live'); if (live && stick) live.scrollTop = live.scrollHeight;
    for (const x of st.finished_since || []) { const arr = x.type === 'sim' ? D.sims : D.games; if (x.entry && !arr.find((y) => y.id === x.id)) arr.unshift(x.entry); }
    box.onclick = async (e) => {
      const s = e.target.closest('[data-stop]'), r = e.target.closest('[data-resume]');
      if (s) { s.disabled = true; await ctl('/api/stop', { body: { id: s.dataset.stop } }).catch((err) => toast(err.message, true)); refresh(); }
      if (r) { r.disabled = true; await ctl('/api/resume', { body: { id: r.dataset.resume } }).catch((err) => toast(err.message, true)); refresh(); }
    };
  }

  /* ----- the builder's sections ----- */
  const stepper = (key, value, min, max, step = 1, label = '') => `<span class="stepper" data-stepper="${key}" data-min="${min}" data-max="${max}" data-step="${step}"><button type="button" data-dir="-1" aria-label="Less" ${value <= min ? 'disabled' : ''}>${ui('minus', 16)}</button><output>${label || value}</output><button type="button" data-dir="1" aria-label="More" ${value >= max ? 'disabled' : ''}>${ui('plus', 16)}</button></span>`;
  const toggle = (key, on) => `<button type="button" class="switch${on ? ' on' : ''}" role="switch" aria-checked="${on}" data-toggle="${key}"><i></i></button>`;
  // Every section after the first folds away, and starts folded.
  const secHead = (n, title, sub) => `<header class="bsec-head"${n > 1 ? ' data-fold role="button" tabindex="0"' : ''}><span class="step">${n}</span><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${n > 1 ? ui('down', 18) : ''}</header>`;

  function drawKind() {
    $('#sec-kind').innerHTML = `${secHead(1, 'What to run')}
      <div class="choice2 three">${[['game', 'Watch a game', 'Claude plays every seat. You get a full replay, private reasoning and a written review. Takes a few minutes and uses your subscription.', 'games'], ['play', 'Play a game', 'You take a seat and play from this device, against Claude or against practice bots.', 'run'], ['sim', 'Simulation set', 'Hundreds of random-bot games in seconds, reported as statistics about the mechanics. Free.', 'sims']].map(([k, t, d, ic]) => { const on = (B.kind === 'sim' ? 'sim' : isPlay() ? 'play' : 'game') === k; return `<button type="button" class="choice${on ? ' on' : ''}" data-kind="${k}" aria-pressed="${on}"><span class="choice-ic">${ui(ic, 22)}</span><b>${t}</b><span>${d}</span></button>`; }).join('')}</div>`;
  }
  function drawGame() {
    $('#sec-game').innerHTML = `${secHead(2, 'The game')}
      <div class="fgrid">
        <div class="fcell"><b>Players</b>${stepper('players', nPlayers(), 4, 8)}</div>
        <div class="fcell"><b>Rounds</b>${stepper('rounds', nRounds(), 1, 10)}</div>
        ${B.kind === 'sim' ? `<div class="fcell"><b>Games</b><div class="seg small">${[100, 500, 1000, 3000].map((n) => `<button type="button" class="${B.games === n ? 'on' : ''}" data-set="games" data-value="${n}">${n}</button>`).join('')}</div></div>` : ''}
        <div class="fcell seedcell"><b>Seed</b><div class="seedbox"><input type="number" inputmode="numeric" id="seed" value="${esc(B.seed)}" placeholder="Random" aria-label="Seed"><button type="button" class="icon-btn" data-act="dice" aria-label="Pick a random seed">${ui('dice', 18)}</button></div></div>
      </div><p class="fine">The same seed gives the same starting deck, hands and Meowfia rolls, so two setups can be compared fairly.</p>`;
  }
  function drawPlayers() {
    const box = $('#sec-players');
    box.hidden = false;
    const names = seatNames();
    const seatRow = (n, i) => {
      const s = B.seats[n] || {};
      return `<div class="seatrow"><span class="seatrow-name"><span class="av s tok">${eggToken(i)}</span>${esc(n)}</span>
        ${B.kind === 'game' ? `<label class="mini"><span>Model</span><select data-seat-model="${esc(n)}"><option value="">Table's</option>${MODELS.map((m) => `<option value="${m}" ${s.model === m ? 'selected' : ''}>${MODEL[m]}</option>`).join('')}</select></label>
        <label class="mini"><span>Thinking</span><select data-seat-effort="${esc(n)}">${EFFORT_OPTS.map(([k, l]) => `<option value="${k}" ${(s.effort || '') === k ? 'selected' : ''}>${k ? l : 'Table\'s'}</option>`).join('')}</select></label>
        <label class="mini"><span>Temperament</span><select data-seat-style="${esc(n)}">${STYLE_OPTS.map(([k, l]) => `<option value="${k}" ${(s.style || '') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        <div class="mini"><span>Animal</span>${s.role ? `<span class="picked"><button type="button" class="cchip ${typeOf(s.role)}" data-pick="seat:${esc(n)}"><span class="cchip-art">${icon(s.role)}</span><span>${esc(s.role)}</span></button><button type="button" class="x" data-act="clear-seat" data-name="${esc(n)}" aria-label="Clear">${ui('close', 14)}</button></span>` : `<button type="button" class="add" data-pick="seat:${esc(n)}">Dealt at random</button>`}</div>
        <div class="mini"><span>Side</span><div class="seg small">${[['', 'Rolled'], ['Farm', 'Farm'], ['Meowfia', 'Cat']].map(([k, l]) => `<button type="button" class="${(s.side || '') === k ? 'on' : ''}" data-seat-side="${esc(n)}" data-value="${k}">${l}</button>`).join('')}</div></div></div>`;
    };
    const anyFixed = names.some((n) => (B.seats[n] || {}).role || (B.seats[n] || {}).side);
    const nSet = names.filter((n) => { const x = B.seats[n] || {}; return x.role || x.side || (B.kind === 'game' && (x.model || x.effort || x.style)); }).length;
    box.innerHTML = `${secHead(3, 'The players', B.kind === 'game' ? 'Who plays, and anything you want to fix about a seat.' : 'Fix a seat\'s animal or side to test a matchup.')}
      ${isPlay() ? `<div class="frow"><div class="flabel"><b>Your seat</b><span>The others wait for you on your turn.</span></div><select data-bind="human" class="auto">${names.map((n) => `<option value="${n}" ${B.human === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="frow"><div class="flabel"><b>Your opponents</b><span>${B.opponents === 'random' ? 'Random bots answer at once and cost nothing. Good for learning the screens, not for a real game.' : 'Claude plays the other seats.'}</span></div><div class="seg">${[['claude', 'Claude'], ['random', 'Practice bots']].map(([k, l]) => `<button type="button" class="${B.opponents === k ? 'on' : ''}" data-set="opponents" data-value="${k}">${l}</button>`).join('')}</div></div>` : ''}
      ${B.kind === 'game' && !(isPlay() && B.opponents === 'random') ? `<div class="frow"><div class="flabel"><b>Model for the table</b><span>${MODEL_NOTE[B.model]}</span></div><div class="seg">${MODELS.map((m) => `<button type="button" class="${B.model === m ? 'on' : ''}" data-set="model" data-value="${m}">${MODEL[m]}</button>`).join('')}</div></div>
      <div class="fgrid">
        <label class="fcell"><b>Thinking effort</b><select data-bind="effort">${EFFORT_OPTS.map(([k, l]) => `<option value="${k}" ${B.effort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="fcell"><b>Review written by</b><select data-bind="review">${[...MODELS, 'none'].map((m) => `<option value="${m}" ${B.review === m ? 'selected' : ''}>${m === 'none' ? 'Nobody (skip)' : MODEL[m]}</option>`).join('')}</select></label>
        <div class="fcell wide"><div class="inline"><div><b>Ask who they suspect</b><span>One private question per player before each vote. It feeds the suspicion grid.</span></div>${toggle('probes', B.probes)}</div></div>
      </div>` : ''}
      <details class="rgroup seatgroup" data-group="seats" ${nSet || store.get('rg-seats', false) ? 'open' : ''}><summary><div><b>Seat by seat</b><span>Give each seat its own model, thinking level and temperament, a chosen animal or a chosen side.</span></div>${nSet ? pill(nSet + ' set', 'yolk') : ''}${ui('down', 18)}</summary>
      <div class="seats">${names.map(seatRow).join('')}</div>
      ${anyFixed ? `<div class="frow slim"><div class="flabel"><b>Fixed seats apply</b></div><div class="seg small">${[['all', 'Every round'], ['first', 'Round 1 only']].map(([k, l]) => `<button type="button" class="${B.seatRounds === k ? 'on' : ''}" data-set="seatRounds" data-value="${k}">${l}</button>`).join('')}</div></div>` : ''}</details>`;
  }
  function slotRow(label, hint, items, key, max, kinds) {
    return `<div class="slotrow"><div class="flabel"><b>${label}</b><span>${hint}</span></div><div class="slots">${items.map((n, i) => `<span class="picked"><button type="button" class="cchip ${typeOf(n)}" data-card="${esc(n)}"><span class="cchip-art">${icon(n)}</span><span>${esc(n)}</span></button><button type="button" class="x" data-act="drop" data-key="${key}" data-i="${i}" aria-label="Remove ${esc(n)}">${ui('close', 14)}</button></span>`).join('')}
      ${items.length < max ? `<button type="button" class="add" data-pick="${key}" data-kinds="${kinds}">${ui('plus', 14)}Add</button>` : ''}</div></div>`;
  }
  function drawCards() {
    const k = R.cardTab, on = deckList(k), all = allOf(k), q = R.q.trim().toLowerCase();
    const nfl = Math.min(val('game.max_flowers'), deckList('flowers').length);
    const tiles = all.filter((n) => !q || n.toLowerCase().includes(q)).map((n) => `<button type="button" class="tog ${typeOf(n)}${on.includes(n) ? ' on' : ''}" data-hold data-card="${esc(n)}" data-tog="${esc(n)}" aria-pressed="${on.includes(n)}"><span class="tog-art">${icon(n)}</span><span class="tog-name">${esc(n)}</span><i class="tog-check">${ui('check', 12)}</i></button>`).join('');
    $('#sec-cards').innerHTML = `${secHead(4, 'The cards', 'The animals in the pool, and the flowers that can be in play.')}
      <div class="cardtools"><div class="seg" id="cardtab">${[['roles', 'Animals'], ['flowers', 'Flowers']].map(([x, l]) => `<button type="button" class="${k === x ? 'on' : ''}" data-cardtab="${x}">${l}<small>${deckList(x).length}/${allOf(x).length}</small></button>`).join('')}</div>
        <label class="search">${ui('search', 18)}<input type="search" id="tq" placeholder="Find a card" value="${esc(R.q)}" autocomplete="off" aria-label="Find a card"></label></div>
      <div class="quick">${(D.meta.setups || {}).testing ? `<button type="button" class="btn small" data-act="setup-testing" title="${esc(D.meta.setups.testing.help)}">Basics only</button>` : ''}<button type="button" class="link" data-act="deck-all">All on</button><button type="button" class="link" data-act="deck-none">All off</button>${k === 'roles' ? '<button type="button" class="link" data-act="deck-farm">Farm only</button><button type="button" class="link" data-act="deck-cats">Cats only</button>' : ''}${B[k] ? '<button type="button" class="link" data-act="deck-reset">Reset to the version</button>' : ''}<span class="fine">Tap to switch a card on or off. Hold it to read it.</span></div>
      <div class="toggrid" id="toggrid">${tiles || '<p class="muted">No cards match.</p>'}</div>
      ${k === 'roles' ? `<p class="fine">Every animal switched on is in the pool from the first round, and each player is dealt a different one at random. The Pigeon and the House Cat are always in the pool.</p>`
    : `<div class="frow slim"><div class="flabel"><b>Flowers in play</b><span>${nfl ? `${nfl === 1 ? 'One' : nfl} of the ${on.length} switched on, picked at random when the game starts.` : 'No flowers in this game.'} A flower stays all game unless its card says to discard it.</span></div>${stepper('rule:game.max_flowers', val('game.max_flowers'), 0, 5)}</div>`}`;
  }
  function control(m) {
    const v = val(m.key), changed = m.key in B.rules && B.rules[m.key] !== baseVal(m.key);
    let c;
    if (m.kind === 'bool') c = toggle('rule:' + m.key, !!v);
    else if (m.kind === 'choice') c = `<select data-rule="${m.key}">${m.options.map((o) => `<option value="${esc(o.value)}" ${o.value === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    else if (m.kind === 'percent') c = stepper('rule:' + m.key, Math.round(v * 100), m.min, m.max, v * 100 % 5 === 0 ? 5 : 1, Math.round(v * 100) + '%');
    else c = stepper('rule:' + m.key, v, m.min, m.max, m.step);
    return `<div class="rule${changed ? ' changed' : ''}"><div class="rule-text"><b>${esc(m.label)}</b>${m.help ? `<span>${esc(m.help)}</span>` : ''}${changed ? `<button type="button" class="link" data-act="rule-reset" data-key="${m.key}">Reset (${esc(showValue(m, baseVal(m.key)))})</button>` : ''}</div><div class="rule-ctl">${c}</div></div>`;
  }
  function drawRules() {
    const n = Object.keys(B.rules).filter((k) => B.rules[k] !== baseVal(k)).length;
    $('#sec-rules').innerHTML = `${secHead(5, 'The rules', `Every setting, section by section. Switch any of them for this run. ${n ? plural(n, 'setting') + ' changed.' : 'Nothing changed yet.'}`)}
      ${D.meta.groups.map((g) => { const items = D.meta.settings.filter((s) => s.group === g.id); const ch = items.filter((s) => s.key in B.rules && B.rules[s.key] !== baseVal(s.key)).length; return `<details class="rgroup" data-group="${g.id}"><summary><div><b>${esc(g.label)}</b><span>${esc(g.help)}</span></div>${ch ? pill(ch + ' changed', 'yolk') : ''}${ui('down', 18)}</summary>${items.map(control).join('')}</details>`; }).join('')}
      <details class="rgroup" data-group="raw" ${B.raw ? 'open' : ''}><summary><div><b>Anything else</b><span>Settings written by hand, one per line.</span></div>${ui('down', 18)}</summary>
        <textarea id="raw" rows="3" spellcheck="false" placeholder="section.key=value, for example&#10;deck.duplicate_values=[1, 1, 13, 13]">${esc(B.raw)}</textarea></details>`;
  }
  function summaryLines() {
    const p = payload(), lines = [];
    lines.push(['Type', p.type === 'sim' ? `${p.games.toLocaleString()} simulated games` : 'Real game']);
    lines.push(['Table', `${p.players} players, ${plural(p.rounds, 'round')}`]);
    if (p.human) lines.push(['You play', p.human]);
    if (p.type === 'game') { const mixed = Object.keys(p.seat_models).length; lines.push([p.human ? 'Against' : 'Played by', p.opponents === 'random' ? 'Practice bots' : model(p.model) + (mixed ? ` and ${plural(mixed, 'other seat')}` : '')]); }
    lines.push(['Seed', p.seed === null ? 'Random' : p.seed]);
    return lines;
  }
  function drawSummary() {
    const side = $('#summary'), bar = $('#startbar'); if (!side) return;
    const p = payload(), ch = p.set.map(describe).filter(Boolean);
    let action, hint = '';
    if (R.state === 'ok') action = `<button type="button" class="btn primary big" data-act="start">${ui('run', 16)}${p.human ? 'Take your seat' : 'Start the run'}</button>`;
    else if (R.state === 'handover') { action = `<a class="btn primary big" id="handover" href="#">${ui('run', 16)}${p.human ? 'Take your seat' : 'Start the run'}</a>`; hint = 'It starts on your PC, which opens in this tab. Needs Tailscale.'; }
    else if (R.state === 'checking') action = '<button type="button" class="btn primary big" disabled>Looking for the PC…</button>';
    else action = `<button type="button" class="btn primary big" disabled>${R.state === 'down' ? 'The PC is unreachable' : 'Runs are not set up here'}</button>`;
    side.innerHTML = `<div class="sum"><h3>Your run</h3><dl class="facts tight">${summaryLines().map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${ch.length ? `<h4>${plural(ch.length, 'change')} from the standard game</h4><ul class="plain sumlist">${ch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="fine">Standard rules and cards.</p>'}
      ${action}${hint ? `<p class="fine">${hint}</p>` : ''}
      <div class="sum-more"><button type="button" class="link" data-act="copy">${ui('copy', 14)}Copy command</button><button type="button" class="link" data-act="reset">${ui('reset', 14)}Start over</button></div></div>`;
    bar.innerHTML = `<div class="startbar-in"><div><b>${p.type === 'sim' ? p.games.toLocaleString() + ' sim games' : 'Real game'}</b><span>${p.players} players · ${plural(p.rounds, 'round')}${ch.length ? ' · ' + plural(ch.length, 'change') : ''}</span></div>${action.replace(' big', '').replace('id="handover"', 'data-handover')}</div>`;
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(B)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    $$('#handover, [data-handover]').forEach((a) => { a.href = `${D.config.control}/#/run?c=${enc}&go=1`; });
  }
  function drawAll() { drawKind(); drawGame(); drawPlayers(); drawCards(); drawRules(); drawSummary(); }

  function openPicker(key, kinds) {
    const pool = kinds === 'roles' ? D.cards.roles.filter((r) => !r.buffer) : kinds === 'seat' ? D.cards.roles : [...D.cards.roles.filter((r) => !r.buffer), ...D.cards.flowers.filter((f) => f.implemented !== false)];
    const render = (q) => { const s = q.trim().toLowerCase(); const items = pool.filter((c) => !s || c.name.toLowerCase().includes(s) || c.text.toLowerCase().includes(s)); return items.map((c) => `<button type="button" class="mcard ${c.type}" data-hold data-card="${esc(c.name)}" data-choose="${esc(c.name)}"><span class="mcard-art">${icon(c.name)}</span><span class="mcard-name">${esc(c.name)}</span><span class="mcard-kind">${esc(c.type === 'flower' ? c.group : D.cards.abilities[c.ability])}</span></button>`).join('') || '<p class="muted">No cards match.</p>'; };
    openSheet(`<h2>Choose a card</h2><p class="fine">Tap to choose. Hold a card to read it first.</p><label class="search">${ui('search', 18)}<input type="search" id="pq" placeholder="Search" autocomplete="off" aria-label="Search cards"></label><div class="mgrid pick" id="pgrid">${render('')}</div>`, 'Choose a card', 'picker');
    $('#pq').oninput = (e) => { $('#pgrid').innerHTML = render(e.target.value); };
    $('#pgrid').onclick = (e) => {
      const b = e.target.closest('[data-choose]'); if (!b) return;
      const name = b.dataset.choose;
      if (key.startsWith('seat:')) { const n = key.slice(5); B.seats[n] = { ...(B.seats[n] || {}), role: name }; drawPlayers(); }
      else if (key === 'startPool') { if (!B.startPool.includes(name)) B.startPool.push(name); drawCards(); }
      else if (key.startsWith('reveal:')) { const i = +key.slice(7); while (B.reveals.length <= i) B.reveals.push([]); B.reveals[i] = [...(B.reveals[i] || []), name]; drawCards(); }
      saveB(); drawSummary(); closeSheet();
    };
  }
  function wireBuilder() {
    const root = $('.page.run');
    root.addEventListener('click', async (e) => {
      const t = e.target;
      let el;
      if ((el = t.closest('[data-fold]'))) { el.closest('.bsec').classList.toggle('shut'); return; }
      if ((el = t.closest('[data-kind]'))) {
        const k = el.dataset.kind;
        B.kind = k === 'sim' ? 'sim' : 'game';
        B.human = k === 'play' ? (seatNames().includes(B.human) ? B.human : seatNames()[0]) : '';
        saveB(); drawAll(); return;
      }
      if ((el = t.closest('[data-set]'))) {
        const k = el.dataset.set; let v = el.dataset.value;
        if (k === 'games') v = +v;
        if (k === 'variant' && v !== B.variant) { B.rules = {}; B.roles = B.flowers = null; B.players = B.rounds = null; }
        B[k] = v; saveB();
        if (k === 'kind' || k === 'variant') drawAll(); else if (k === 'games') { drawGame(); drawSummary(); } else { drawPlayers(); drawSummary(); }
        return;
      }
      if ((el = t.closest('[data-stepper] button'))) {
        const s = el.closest('[data-stepper]'), key = s.dataset.stepper, dir = +el.dataset.dir, min = +s.dataset.min, max = +s.dataset.max, step = +s.dataset.step;
        if (key === 'players' || key === 'rounds') {
          B[key] = Math.max(min, Math.min(max, (key === 'players' ? nPlayers() : nRounds()) + dir));
          drawKind(); drawGame(); drawPlayers(); drawCards();
        } else {
          const rk = key.slice(5), m = settingMeta(rk), cur = m.kind === 'percent' ? Math.round(val(rk) * 100) : val(rk);
          let next = Math.max(min, Math.min(max, Math.round((cur + dir * step) / step) * step));
          B.rules[rk] = m.kind === 'percent' ? next / 100 : next;
          if (B.rules[rk] === baseVal(rk)) delete B.rules[rk];
          redrawRule(rk); if (rk === 'game.max_flowers') drawCards();
        }
        saveB(); drawSummary(); return;
      }
      if ((el = t.closest('[data-toggle]'))) {
        const k = el.dataset.toggle;
        if (k === 'probes') { B.probes = !B.probes; drawPlayers(); }
        else { const rk = k.slice(5); B.rules[rk] = !val(rk); if (B.rules[rk] === baseVal(rk)) delete B.rules[rk]; redrawRule(rk); }
        saveB(); drawSummary(); return;
      }
      if ((el = t.closest('[data-seat-side]'))) { const n = el.dataset.seatSide; B.seats[n] = { ...(B.seats[n] || {}), side: el.dataset.value }; saveB(); drawPlayers(); drawSummary(); return; }
      if ((el = t.closest('[data-cardtab]'))) { R.cardTab = el.dataset.cardtab; R.q = ''; drawCards(); return; }
      if ((el = t.closest('[data-tog]'))) {
        const k = R.cardTab, name = el.dataset.tog, cur = [...deckList(k)];
        B[k] = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name];
        if (sameSet(B[k], variantOf().settings.deck[k])) B[k] = null;
        el.classList.toggle('on'); el.setAttribute('aria-pressed', el.classList.contains('on'));
        $$('#cardtab button').forEach((b) => { const x = b.dataset.cardtab; $('small', b).textContent = `${deckList(x).length}/${allOf(x).length}`; });
        saveB(); drawSummary(); return;
      }
      if ((el = t.closest('[data-pick]'))) { openPicker(el.dataset.pick, el.dataset.pick.startsWith('seat:') ? 'seat' : el.dataset.kinds); return; }
      if ((el = t.closest('[data-act]'))) {
        const a = el.dataset.act, k = R.cardTab;
        if (a === 'dice') { B.seed = String(Math.floor(Math.random() * 1e6)); $('#seed').value = B.seed; }
        else if (a === 'clear-seat') { const n = el.dataset.name; B.seats[n] = { ...(B.seats[n] || {}), role: '' }; drawPlayers(); }
        else if (a === 'drop') { const key = el.dataset.key, i = +el.dataset.i; if (key === 'startPool') B.startPool.splice(i, 1); else B.reveals[+key.slice(7)].splice(i, 1); drawCards(); }
        else if (a === 'deck-all') { B[k] = allOf(k); if (sameSet(B[k], variantOf().settings.deck[k])) B[k] = null; drawCards(); }
        else if (a === 'deck-none') { B[k] = []; drawCards(); }
        else if (a === 'deck-farm' || a === 'deck-cats') { B.roles = allOf('roles').filter((n) => (D.card[n].type === 'farm') === (a === 'deck-farm')); drawCards(); }
        else if (a === 'deck-reset') { B[k] = null; drawCards(); }
        else if (a === 'rule-reset') { delete B.rules[el.dataset.key]; redrawRule(el.dataset.key); if (el.dataset.key === 'game.max_flowers') drawCards(); }
        else if (a === 'setup-testing') { const s = D.meta.setups.testing; B.roles = [...s.roles]; B.flowers = [...s.flowers]; for (const [rk, v] of Object.entries(s.rules)) { if (v === baseVal(rk)) delete B.rules[rk]; else B.rules[rk] = v; } drawAll(); toast('Basics only: no flowers, and the simple animals.'); }
        else if (a === 'reset') { B = Object.assign(blank(), { variant: D.variants[0].name }); R.q = ''; drawAll(); toast('Back to the standard setup.'); }
        else if (a === 'copy') { try { await navigator.clipboard.writeText(command()); toast('Command copied. Run it in sim/ on the PC.'); } catch { openSheet(`<h2>Command</h2><p class="fine">Run it in the sim folder on the PC.</p><pre class="code">${esc(command())}</pre>`, 'Command'); } return; }
        else if (a === 'start') { start(el); return; }
        saveB(); drawSummary(); return;
      }
    });
    root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-fold]')) { e.preventDefault(); e.target.closest('.bsec').classList.toggle('shut'); } });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.bind) { B[t.dataset.bind] = t.value; if (t.dataset.bind === 'human') drawPlayers(); }
      else if (t.dataset.seatModel) { const n = t.dataset.seatModel; B.seats[n] = { ...(B.seats[n] || {}), model: t.value }; }
      else if (t.dataset.seatStyle) { const n = t.dataset.seatStyle; B.seats[n] = { ...(B.seats[n] || {}), style: t.value }; }
      else if (t.dataset.seatEffort) { const n = t.dataset.seatEffort; B.seats[n] = { ...(B.seats[n] || {}), effort: t.value }; }
      else if (t.dataset.rule) { const rk = t.dataset.rule; B.rules[rk] = t.value; if (B.rules[rk] === baseVal(rk)) delete B.rules[rk]; redrawRule(rk); }
      else return;
      saveB(); drawSummary();
    });
    root.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'seed') { B.seed = t.value.replace(/[^\d]/g, ''); saveB(); drawSummary(); }
      else if (t.id === 'raw') { B.raw = t.value; saveB(); drawSummary(); }
      else if (t.id === 'tq') { R.q = t.value; const k = R.cardTab, on = deckList(k), q = R.q.trim().toLowerCase(); $$('#toggrid .tog').forEach((b) => { b.hidden = !!q && !b.dataset.tog.toLowerCase().includes(q); }); void on; }
    });
    root.addEventListener('toggle', (e) => { const d = e.target; if (d.dataset && d.dataset.group) store.set('rg-' + d.dataset.group, d.open); }, true);
  }
  function redrawRule(key) {
    const open = $$('.rgroup').filter((d) => d.open).map((d) => d.dataset.group);
    drawRules();
    $$('.rgroup').forEach((d) => { d.open = open.includes(d.dataset.group); });
    void key;
  }
  async function start(btn) {
    $$('[data-act="start"]').forEach((b) => { b.disabled = true; });
    try {
      const p = payload(), res = await ctl('/api/run', { body: p });
      if (p.human) { location.hash = '#/play/' + encodeURIComponent(res.id); return; }
      toast(B.kind === 'sim' ? 'Simulation queued.' : 'Game queued. It starts in a moment.');
      await refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { toast('Could not start: ' + err.message, true); }
    $$('[data-act="start"]').forEach((b) => { b.disabled = false; });
    void btn;
  }

  /* ================= playing a seat ================= */
  // Laid out like a chat app: a slim bar of players, the conversation, and a dock at the bottom for your move.
  // The page holds one request open to the PC, which answers the moment anything changes: no polling lag.
  const P = { id: null, alive: false, total: 0, token: '', data: null, pendingId: null, sent: null, u: null, hud: '', turnKey: '', items: [], unseen: 0 };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let nameRx = null;
  function linkCards(html) {                     // card names in Storyteller text become tappable
    if (!nameRx) nameRx = new RegExp('\\b(' + Object.keys(D.card).sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, '(?:\'|&#39;)')).join('|') + ')\\b', 'g');
    return html.replace(nameRx, (m) => `<button type="button" class="tlink" data-card="${m}">${m}</button>`);
  }
  function tidy(text) {                          // card ids become values; the nest line goes (it is on screen)
    return text.split('\n').map((l) => l.replace(/\s*Your nest \(\d+ cards?\): .*$/, '').replace(/\s*Your nest \(0 cards\): empty\.?/, ''))
      .map((l) => l.replace(/\bW\d+ \(wild, 0\)/g, 'a Wild').replace(/\b([HDCS])\d+b? \((\d+)\)/g, (m, s, v) => v + SUIT[s]))
      .filter((l) => l.trim()).join('\n');
  }
  const para = (text, link) => tidy(text).split('\n').map((l) => `<p>${link ? linkCards(esc(l)) : esc(l)}</p>`).join('');
  const seatTok = (name) => `<span class="av s tok">${eggToken(P.data.players.indexOf(name))}</span>`;
  function feedItem(x, me) {
    const t = x.text;
    if (x.k === 'header') return `<div class="f-head"><span>${esc(cap(t.replace(/=/g, '').trim().replace(/^Round \d+: /, '')))}</span></div>`;
    if (x.k === 'beat') return '';
    if (x.k === 'say') {
      const anon = !t.startsWith(x.sp + ':'), who = anon ? 'Someone' : x.sp, mine = x.sp === me && !anon;
      const body = t.slice(t.indexOf(':') + 1).trim();
      return `<div class="f-msg${mine ? ' mine' : ''}">${mine ? '' : anon ? '<span class="av s tok anon">?</span>' : seatTok(who)}<div class="f-col">${mine ? '' : `<div class="f-who">${esc(who)}</div>`}<div class="bubble">${esc(body)}</div></div></div>`;
    }
    if (x.k === 'whisper') {
      const mine = x.sp === me, body = t.slice(t.indexOf(':') + 1).trim(), head = t.slice(0, t.indexOf(':'));
      return `<div class="f-msg whisper${mine ? ' mine' : ''}">${mine ? '' : seatTok(x.sp)}<div class="f-col"><div class="f-who">${esc(mine ? head.replace(x.sp + ' whispers', 'You whisper') : head.replace(' to ' + me, ' to you'))}</div><div class="bubble">${esc(body)}</div></div></div>`;
    }
    if (x.k === 'caw') return `<div class="f-sys caw">${esc(t)}</div>`;
    if (x.k === 'death') return `<div class="f-sys death">${esc(t)}</div>`;
    if (t.startsWith('Nest sizes:') || t.startsWith('The game begins')) return '';
    if (x.priv) return `<div class="f-priv"><div class="f-priv-top">${ui('eyeoff', 12)}Only you</div>${para(t, true)}</div>`;
    return `<div class="f-story">${para(t, true)}</div>`;
  }
  const phaseOf = (items) => { for (let i = items.length - 1; i >= 0; i--) if (items[i].k === 'header') { const m = items[i].text.replace(/=/g, '').trim().split(':'); return cap((m[1] || 'setup').trim()); } return 'Setup'; };
  const atBottom = (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 70;
  function toBottom(smooth) { const f = $('#feed'); if (f) { f.scrollTo({ top: f.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); P.unseen = 0; const b = $('#fnew'); if (b) b.hidden = true; } }

  async function viewPlay(id) {
    if (!canCall()) { page(`<div class="empty"><b>Playing happens on your PC's copy of the site.</b><span>Open it from a device on your Tailscale network.</span>${D.config.control && D.config.control !== 'SELF' ? `<a class="btn primary" href="${esc(D.config.control)}/#/play/${encodeURIComponent(id)}">Open it there</a>` : ''}</div>`); return; }
    document.body.classList.add('playing');
    document.title = 'Playing · Meowfia Lab';
    Object.assign(P, { id, alive: true, total: 0, token: '', data: null, pendingId: null, sent: null, u: null, hud: '', turnKey: '', items: [], phase: 'Setup', unseen: 0, ghost: '' });
    app.innerHTML = `<div class="play" id="play"><header class="play-top"><button type="button" class="icon-btn" id="pleave" aria-label="Leave, pause or quit">${ui('back', 20)}</button>
        <div class="play-phase" id="pphase"><b>Meowfia</b><span>Connecting</span></div>
        <button type="button" class="icon-btn" id="ppause" aria-label="Pause the game" hidden>${ui('pause', 20)}</button><button type="button" class="icon-btn" id="ptable" aria-label="The table and what you did">${ui('eye', 20)}</button><button type="button" class="icon-btn" id="ppool" aria-label="Cards in the pool">${ui('pool', 20)}</button><button type="button" class="icon-btn" id="prules" aria-label="Rules">${ui('rules', 20)}</button></header>
      <div class="play-body"><aside class="hud" id="hud"></aside>
        <section class="play-main"><div class="mhud" id="mhud"></div>
          <div class="feed-wrap"><div class="feed" id="feed"><div class="loading">Taking your seat</div></div>
            <button type="button" class="f-new" id="fnew" hidden>${ui('down', 14)}<span>New</span></button></div>
          <div class="turn" id="turn"></div></section></div></div>`;
    $('#prules').onclick = () => { const v = D.variants.find((x) => x.name === (P.data || {}).variant) || D.variants[0]; openSheet(`<h2>Rules</h2><div class="rules-text flat">${rulesHTML(v.rules)}</div>`, 'Rules'); };
    $('#ppool').onclick = () => { const st = (P.data || {}).state || {}; openSheet(`<h2>In the pool</h2><p class="fine">Tap a card to read it.</p>${(st.flowers || []).length ? `<h4>Flowers this round</h4><div class="pills">${st.flowers.map((f) => cchip(f)).join('')}</div>` : ''}<h4>Animals</h4><div class="pills">${(st.pool || []).map((x) => cchip(x)).join('')}</div>`, 'In the pool'); };
    $('#ptable').onclick = () => { const r = P.data; if (!r || !r.state) return; openSheet(`<h2>The table</h2>${playTable(r)}<h4>What you did this round</h4>${didList(r.state)}`, 'The table'); drawLines(); setTimeout(drawLines, 400); };
    $('#ppause').onclick = () => setPause(!(P.data || {}).paused);
    $('#pleave').onclick = () => {
      const r = P.data || {}, live = (r.status === 'running' || r.status === 'queued') && !r.over;   // once the game is over, leaving never stops the review
      if (!live) { location.hash = '#/run'; return; }
      openSheet(`<h2>Leave the table?</h2><div class="leave">
        <button type="button" class="c-opt" data-leave="pause"><b>${r.paused ? 'Carry on playing' : 'Pause the game'}</b><span>${r.paused ? 'The table picks up where it stopped.' : 'Nothing more happens until you come back. Replies already being written are held.'}</span></button>
        <button type="button" class="c-opt" data-leave="go"><b>Leave it running</b><span>The game waits at your next turn. Come back from the run page.</span></button>
        <button type="button" class="c-opt danger" data-leave="quit"><b>Quit the game</b><span>Ends it now. Finished rounds are kept, so it can be continued from the run page.</span></button></div>`, 'Leave the table');
      $('.leave').onclick = async (e) => {
        const b = e.target.closest('[data-leave]'); if (!b) return;
        const what = b.dataset.leave;
        if (what === 'pause') { closeSheet(); return setPause(!r.paused); }
        if (what === 'quit') {
          if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.querySelector('b').textContent = 'Tap again to quit'; return; }
          try { await ctl('/api/stop', { body: { id: P.id } }); } catch (err) { return toast(err.message, true); }
        }
        closeSheet(); location.hash = '#/run';
      };
    };
    $('#feed').addEventListener('scroll', () => { if (atBottom($('#feed'))) { P.unseen = 0; $('#fnew').hidden = true; } }, { passive: true });
    $('#fnew').onclick = () => toBottom(true);
    $('#mhud').addEventListener('click', (e) => { if (e.target.closest('[data-me]')) openMe(); });
    wireTurn();
    const mine = id;
    const hold = !store.get('nowait', false);      // a test switch: ask once a second instead of holding the line
    while (P.alive && P.id === mine) {
      try {
        const r = await ctl(`/api/play/${encodeURIComponent(id)}?since=${P.total}&token=${encodeURIComponent(P.token)}&wait=${hold ? 1 : 0}`, { timeout: 34000 });
        if (!P.alive || P.id !== mine) break;
        applyPlay(r);
        if (!hold) await sleep(1000);
        if (r.status !== 'running' && r.status !== 'queued') await sleep(4000);     // nothing more until it is resumed
      } catch (e) {
        if (!P.alive || P.id !== mine) break;
        if (!P.data) { $('#feed').innerHTML = `<div class="empty"><b>This game could not be opened.</b><span>${esc(e.message === 'unreachable' ? 'The PC is not reachable.' : e.message)}</span><a class="btn" href="#/run">Back</a></div>`; if (/no such|nobody/.test(e.message)) break; }
        await sleep(1500);
      }
    }
  }
  function leavePlay() { P.alive = false; document.body.classList.remove('playing'); }
  async function setPause(on) {
    try { await ctl(`/api/play/${encodeURIComponent(P.id)}/pause`, { body: { on } }); if (P.data) { P.data.paused = on; P.turnKey = ''; applyPlay({ ...P.data, items: [] }); } }
    catch (err) { toast(err.message, true); }
  }
  const signed = (n) => (n > 0 ? '+' + n : String(n));
  // The round that just ended: who went out, how you did, and (when the table shows it) everyone's animal and score.
  function resultsHTML(r) {
    const x = r.state.result, y = x.you, me = r.me, you = (n) => (n === me ? 'You' : esc(n));
    const out = x.eliminated.length ? `${list(x.eliminated.map((n) => (n === me ? 'You' : n)).map(esc))} ${x.eliminated.length > 1 || x.eliminated[0] === me ? 'were' : 'was'} eggsecuted${x.eliminated.map((n) => (x.revealed[n] ? ` (${esc(x.revealed[n])})` : '')).join('')}` : 'Nobody was eggsecuted';
    const side = x.alone ? `${you(x.alone)} won the round alone` : x.corpse ? 'Corpse Flower keeps the result hidden' : x.team && x.team !== 'Nobody' ? `${esc(x.team)} won the round${x.goose ? ', and a Goose swapped winners and losers for scoring' : ''}` : '';
    const verdict = x.final ? (x.winners.includes(me) ? (x.winners.length > 1 ? 'You tied for the win' : 'You won the game') : `${list(x.winners.map(esc))} won the game`)
      : x.corpse ? 'Result hidden' : y.result === 'won' ? 'You won the round' : y.result === 'lost' ? 'You lost the round' : y.result === 'clownfish' ? 'Your eggs went to the Clownfish' : 'No result for you';
    const tone = x.final ? (x.winners.includes(me) ? 'won' : 'lost') : y.result === 'won' ? 'won' : y.result === 'lost' ? 'lost' : '';
    const rows = [...x.players].sort((a, b) => (x.final ? (b.score ?? 0) - (a.score ?? 0) : 0)).map((p) => {
      const known = p.role !== undefined;
      return `<li class="rr${p.name === me ? ' me' : ''}${p.dead ? ' dead' : ''}"><${known ? `button type="button" data-card="${esc(p.role)}"` : 'span'} class="av tok ${known ? sideClass(p.alignment) : ''}">${known ? icon(p.role) : eggToken(r.players.indexOf(p.name))}</${known ? 'button' : 'span'}>
        <span class="rr-who"><b>${you(p.name)}</b><small>${known ? `${esc(p.role)} · ${esc(p.alignment)}` : 'Animal hidden'}${p.target ? ` · ${plural(p.cards, 'egg')} at ${p.target === me ? 'you' : esc(p.target)}` : ''}</small></span>
        ${known ? `<span class="rr-num"><b>${p.score}</b><small>${signed(p.gained)}</small></span>` : ''}</li>`;
    }).join('');
    return `<section class="results ${tone}"><header><small>${x.final ? 'Final result' : `Round ${x.round} of ${r.state.rounds}`}</small><h3>${verdict}</h3>
        <p>${x.corpse ? '' : `<b>${signed(y.gained)}</b> this round · `}<b>${y.score}</b> points in total</p></header>
      <p class="rr-out">${out}.${side ? ' ' + side + '.' : ''}</p>
      <ul class="plain rr-list">${rows}</ul>
      ${x.show ? '' : `<p class="fine">${x.corpse ? 'Animals and scores stay hidden in a Corpse Flower round.' : 'Other players\' animals and scores stay hidden until the game ends. To see them after every round, turn on “Show animals after each round” when you set up the game.'}</p>`}</section>`;
  }

  function applyPlay(r) {
    const first = !P.data;
    P.data = r; P.token = r.token;
    const feed = $('#feed'); if (!feed) return;
    const near = first || atBottom(feed);
    if (first) feed.innerHTML = '<div class="f-typing" id="ftyping" hidden></div>';
    if (r.items.length) {
      const html = r.items.map((x) => feedItem(x, r.me)).join('');
      if (P.ghost && r.items.some((x) => x.k === 'say' && x.sp === r.me)) { P.ghost = ''; const g = $('#fghost'); if (g) g.remove(); }
      $('#ftyping').insertAdjacentHTML('beforebegin', first ? html : html.replace(/class="f-/g, 'class="in f-'));
      P.items = P.items.concat(r.items);
      P.total = r.total;
      P.phase = phaseOf(P.items);
      if (!near && html) { P.unseen += r.items.length; $('#fnew').hidden = false; }
    }
    const s = r.state || {};
    $('#pphase').innerHTML = `<b>${s.round ? `Round ${s.round} of ${s.rounds}` : esc(r.variant)}</b><span>${esc(r.over ? 'Game over' : r.paused ? 'Paused' : P.phase)}</span>`;
    const pb = $('#ppause'); pb.hidden = r.status !== 'running' || r.over; pb.innerHTML = ui(r.paused ? 'play' : 'pause', 20); pb.classList.toggle('on', !!r.paused); pb.setAttribute('aria-label', r.paused ? 'Carry on playing' : 'Pause the game');
    drawHud(r);
    drawTurn(r);
    drawTyping(r);
    if (near) toBottom(!first);
  }
  function drawTyping(r) {                       // who is thinking, shown where the next message will appear
    const el = $('#ftyping'); if (!el) return;
    const others = ((r.state || {}).asking || []).filter((n) => n !== r.me);
    const on = r.status === 'running' && !r.over && others.length > 0;
    el.hidden = !on;
    if (on) el.innerHTML = `<span class="dots"><i></i><i></i><i></i></span>${esc(list(others))} ${others.length === 1 ? 'is' : 'are'} thinking`;
  }

  const eggOf = (c) => { const wild = c.id[0] === 'W'; return `<span class="egg ${wild ? 'wild' : 'HD'.includes(c.id[0]) ? 'red' : 'black'}">${wild ? 'W' : c.value}<i>${wild ? '' : SUIT[c.id[0]]}</i></span>`; };
  // The table as you see it: your own animal, everyone's nest, who is thinking, and where you went at night.
  function playTable(r) {
    const s = r.state, me = s.me, asking = new Set(s.asking || []);
    const people = Object.fromEntries(s.players.map((p) => [p.name, { nest: p.nest === null ? undefined : p.nest, dead: p.dead, ...(p.name === me.name && me.role ? { role: me.role, alignment: me.alignment } : {}) }]));
    return table({ players: r.players }, s.round, people, { cls: 'mini', label: r.over ? 'Game over' : P.phase, arrows: s.arrows || [], sub: (n) => (asking.has(n) ? (n === me.name ? 'your turn' : 'thinking') : n === s.dealer ? 'dealer' : '') });
  }
  const didList = (s) => ((s.did || []).length ? `<ul class="plain did">${s.did.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">Nothing yet this round.</p>');
  function drawHud(r) {
    const s = r.state; if (!s) return;
    const key = JSON.stringify(s) + P.phase + r.over;
    if (key === P.hud) return;
    P.hud = key;
    const me = s.me, cards = {}; for (const c of me.hand) cards[c.id] = c;
    P.cards = cards;
    const asking = new Set(s.asking || []);
    const side = sideClass(me.alignment);
    // phone: one rail of players and one line for your animal and nest
    $('#mhud').innerHTML = `<div class="mrail">${s.players.map((p) => { const mine = p.name === me.name; return `<${mine ? 'button type="button" data-me' : 'div'} class="mp${mine ? ' me' : ''}${p.dead ? ' dead' : ''}"><span class="mp-face"><span class="av tok ${mine ? side : ''}">${mine && me.role ? icon(me.role) : eggToken(r.players.indexOf(p.name))}</span>${asking.has(p.name) ? '<i class="think"></i>' : ''}${p.nest === null ? '' : `<i class="mp-n">${p.nest}</i>`}</span><b>${mine ? 'You' : esc(p.name)}</b></${mine ? 'button' : 'div'}>`; }).join('')}</div>
      <div class="mnest"><button type="button" class="mrole ${side}" data-me>${me.role ? esc(me.role) : 'Dealing'}${me.alignment ? `<small>${esc(me.alignment)}</small>` : ''}</button><div class="eggs">${me.hand.map(eggOf).join('') || '<span class="muted">Empty nest</span>'}</div></div>`;
    // wide screens: a side column with the same things spelled out
    $('#hud').innerHTML = `<section class="hud-you ${side}">
        <button type="button" class="hud-me" ${me.role ? `data-card="${esc(me.role)}"` : ''}><span class="av l ${side}">${me.role ? icon(me.role) : eggToken(r.players.indexOf(me.name))}</span>
          <span class="hud-me-text"><small>You are ${esc(me.name)}</small><b>${me.role ? 'The ' + esc(me.role) : 'Waiting for the deal'}</b><span class="pills">${sidePill(me.alignment)}${me.dead ? pill('Dead', 'muted') : ''}${me.winks ? pill(plural(me.winks, 'Wink'), 'yolk') : ''}</span></span></button>
        <div class="hud-nest"><span class="label">Your nest · ${me.hand.length}</span><div class="eggs">${me.hand.map(eggOf).join('') || '<span class="muted">Empty</span>'}</div></div>
        <div class="hud-bank">${ui('scores', 14)}<span><b>${me.banked + me.hand.length}</b> points so far</span><small>${me.banked} banked, ${me.hand.length} kept</small></div></section>
      <section class="hud-table"><span class="label">The table</span>${playTable(r)}</section>
      <section class="hud-did"><span class="label">What you did this round</span>${didList(s)}</section>
      <section class="hud-pool"><span class="label">In the pool</span><div class="hud-chips">${(s.flowers || []).map((f) => cchip(f)).join('')}${(s.pool || []).map((a) => cchip(a)).join('')}</div></section>`;
    drawLines();
  }
  function openMe() {
    const s = (P.data || {}).state; if (!s) return;
    const me = s.me, c = D.card[me.role];
    openSheet(`<header class="sheet-who"><span class="av xl ${sideClass(me.alignment)}">${me.role ? icon(me.role) : eggToken(0)}</span><div><h2>${me.role ? 'The ' + esc(me.role) : esc(me.name)}</h2><div class="pills">${sidePill(me.alignment)}${me.dead ? pill('Dead', 'muted') : ''}${me.winks ? pill(plural(me.winks, 'Wink'), 'yolk') : ''}</div></div></header>
      ${c ? `<p class="me-text">${esc(me.text || c.text)}</p>` : ''}
      <h4>Your nest · ${me.hand.length}</h4><div class="eggs roomy">${me.hand.map(eggOf).join('') || '<span class="muted">Empty</span>'}</div>
      <h4>What you did this round</h4>${didList(s)}
      <h4>Your score</h4><p><b>${me.banked + me.hand.length}</b> points so far: ${me.banked} banked and ${me.hand.length} for cards kept.</p>
      <p class="fine">${me.alignment === 'Meowfia' ? 'You are Meowfia this round: get a Farm player eggsecuted.' : me.alignment === 'Farm' ? 'You are Farm this round: get a Meowfia player eggsecuted.' : ''}</p>`, 'You');
  }

  /* ----- your move ----- */
  const blankTurn = () => ({ targets: [], role: null, number: null, cards: [], say: '', caw: false, more: false, wopen: false, wto: '', wtext: '', act: '', aplayer: '', aanimal: '', guesses: {} });
  const TARGET_LABELS = { Gecko: ['Copy whose animal?', 'then use it on whom?'], Copycat: ['Copy whose animal?', 'then use it on whom?'], 'Rag Doll': ['Visit whom?', 'then send them where?'], 'Cat Burgler': ['Steal from whom?', 'then who gets the eggs?'] };
  const ACTION = { wink: ['Wink', 'They die at once. Nobody is told it was you.'], bond: ['Handshake', 'Golden Wattle: bond with a player.'], touch: ['Touch', 'Stinging Bush: they die.'], sunflower: ['Sunflower', 'Spend an egg to learn if a player is a certain animal.'], challenge: ['Challenge', 'Guess every animal. Right: you win alone. Wrong: you die.'], double_down: ['Double down', 'Crimson Kunzea: throw your vote now and double your score this round.'] };
  function words(s) { return s.trim() ? s.trim().split(/\s+/).length : 0; }
  const liveTurn = (pd) => !!((pd || {}).meta || {}).live;
  function turnValid(pd, u) {
    const f = pd.fields;
    if (pd.kind === 'day' && liveTurn(pd) && dayIdle(u)) return false;
    if (pd.kind === 'handshake') return u.number === 0 || u.number === 1;
    if (f.targets && (u.targets.length < (f.targets.min ?? 1) || u.targets.length > (f.targets.max ?? 1))) return false;
    if (f.role && f.role.required !== false && f.role.options.length && !u.role) return false;
    if (f.cards && pd.kind !== 'day' && (u.cards.length < f.cards.min || u.cards.length > f.cards.max)) return false;
    if (pd.kind === 'day' && u.act) {
      if (['wink', 'bond', 'touch', 'sunflower'].includes(u.act) && !u.aplayer) return false;
      if (u.act === 'double_down' && f.special.pledge && (!u.aplayer || u.cards.length < Math.max(1, f.special.pledge.min) || u.cards.length > f.special.pledge.max)) return false;
      if (u.act === 'sunflower' && (!u.aanimal || u.cards.length !== 1)) return false;
      if (u.act === 'challenge' && f.special.players.some((p) => !u.guesses[p])) return false;
    }
    return true;
  }
  function submitLabel(pd, u) {
    if (pd.kind === 'results') return `Start round ${((P.data.state || {}).round || 0) + 1}`;
    if (pd.kind === 'night') return 'Confirm';
    if (pd.kind === 'point') return u.targets[0] ? `Point at ${u.targets[0]}` : 'Choose who to put on trial';
    if (pd.kind === 'discard') return `Discard ${plural(u.cards.length, 'card')}`;
    if (pd.kind === 'extend') return u.cards.length ? 'Pay one egg' : 'Don\'t pay';
    if (pd.kind === 'handshake') return u.number === 1 ? 'Shake hands' : u.number === 0 ? 'Decline the handshake' : 'Accept or decline';
    if (pd.kind === 'vote') { const n = pd.fields.cards ? u.cards.length : u.number; if (!u.targets[0]) return 'Choose who to egg'; return n ? `Throw ${plural(n, 'egg')} at ${u.targets[0]}` : `Vote for ${u.targets[0]}, staking nothing`; }
    return '';
  }
  const dayIdle = (u) => !u.say.trim() && !u.wtext.trim() && !u.act && !u.caw;
  const sendInner = (u, pd) => (dayIdle(u) && !liveTurn(pd) ? '<span>Pass</span>' : ui('send', 20));
  function playerPick(pd, u, s) {
    const f = pd.fields.targets, max = f.max ?? 1, labels = TARGET_LABELS[s.me.role];
    const head = pd.kind === 'vote' ? 'Throw at' : pd.kind === 'point' ? 'Point at' : max === 2 ? (labels ? labels[u.targets.length ? 1 : 0] : 'Choose two, in order') : 'Visit';
    return `<div class="t-field"><span class="label">${esc(cap(head))}</span><div class="t-players">${f.options.map((n) => {
      const i = u.targets.indexOf(n), p = s.players.find((x) => x.name === n) || {};
      const face = n === 'Bottlebrush' ? icon('Bottlebrush') : n === 'Nobody' ? MeowIcons.svg('?', 'unknown') : eggToken(P.data.players.indexOf(n));
      return `<button type="button" class="t-player${i >= 0 ? ' on' : ''}${p.dead ? ' dead' : ''}" data-target="${esc(n)}" aria-pressed="${i >= 0}"><span class="av tok">${face}</span><b>${esc(n)}</b>${max > 1 && i >= 0 ? `<i class="ord">${i + 1}</i>` : ''}</button>`;
    }).join('')}</div></div>`;
  }
  function cardPick(pd, u, label) {
    const f = pd.fields.cards, sum = u.cards.reduce((a, id) => a + ((P.cards[id] || {}).value || 0), 0);
    const range = f.min === f.max ? `pick ${f.min}` : f.max >= f.options.length ? (f.min ? `at least ${f.min}` : 'optional') : `${f.min} to ${f.max}`;
    return `<div class="t-field"><span class="label">${esc(label)} · ${u.cards.length ? `${u.cards.length} chosen, worth ${sum}` : range}</span><div class="t-cards">${[...f.options].sort((x, y) => (((P.cards[x] || {}).value || 0) - ((P.cards[y] || {}).value || 0)) || x.localeCompare(y)).map((id) => { const c = P.cards[id] || { id, value: '?' }; const wild = id[0] === 'W'; return `<button type="button" class="egg big ${wild ? 'wild' : 'HD'.includes(id[0]) ? 'red' : 'black'}${u.cards.includes(id) ? ' on' : ''}" data-egg="${esc(id)}" aria-pressed="${u.cards.includes(id)}">${wild ? 'W' : c.value}<i>${wild ? '' : SUIT[id[0]]}</i></button>`; }).join('')}</div></div>`;
  }
  const animalSelect = (attr, options, value, none) => `<select ${attr}><option value="">${esc(none)}</option>${options.map((a) => `<option ${a === value ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>`;
  function turnBody(pd, u, s, r) {
    const f = pd.fields, me = s.me;
    let h = '';
    if (pd.kind === 'results') {
      h += s.result ? resultsHTML(r) : '<div class="t-head"><b>The round is over</b></div>';
    } else if (pd.kind === 'night') {
      h += `<div class="t-head"><b>Night</b><button type="button" class="t-role" data-me>You are the ${esc(me.role)}${ui('info', 14)}</button></div>`;
      if (f.targets) h += playerPick(pd, u, s);
      if (f.role && f.role.options.length) h += `<div class="t-field"><span class="label">${f.role.required === false ? 'Name an animal (only if needed)' : 'Name an animal'}</span><div class="t-roles">${f.role.options.map((a) => `<button type="button" class="cchip ${typeOf(a)}${u.role === a ? ' on' : ''}" data-hold data-card="${esc(a)}" data-role="${esc(a)}"><span class="cchip-art">${icon(a)}</span><span>${esc(a)}</span></button>`).join('')}</div></div>`;
      if (f.number) h += `<div class="t-field row"><span class="label">Stolen eggs to pass on</span>${stepper('tnum', u.number ?? f.number.min, f.number.min, f.number.max)}</div>`;
    } else if (pd.kind === 'discard') {
      h += `<div class="t-head"><b>You lost ${plural(f.cards.min, 'egg')}</b><span>Choose what to discard.</span></div>${cardPick(pd, u, 'Your nest')}`;
    } else if (pd.kind === 'point') {
      h += `<div class="t-head"><b>Who goes on trial?</b><span>Everyone points at once, in the open. The two with the most fingers answer once each, then everyone votes between them.</span></div>${playerPick(pd, u, s)}`;
    } else if (pd.kind === 'handshake') {
      const who = (pd.meta || {}).from || 'A player';
      h += `<div class="t-head"><b>${esc(who)} offers you a handshake</b><span>Golden Wattle: bonded players each score +3 if they are on the same side. If not, the Meowfia player scores +3 and the Farm player loses 3.</span></div><div class="seg shake">${[[1, 'Accept'], [0, 'Decline']].map(([v, l]) => `<button type="button" class="${u.number === v ? 'on' : ''}" data-shake="${v}">${l}</button>`).join('')}</div>`;
    } else if (pd.kind === 'extend') {
      h += `<div class="t-head"><b>The day is ending</b><span>Mulberry: pay one egg for one more turn of talk?</span></div>${cardPick(pd, u, 'Pay with')}`;
    } else if (pd.kind === 'vote') {
      h += `<div class="t-head"><b>Eggsecution</b><span>${me.alignment === 'Meowfia' ? 'You are Meowfia: get a Farm player out.' : 'Egg who you think is Meowfia.'}${me.dead ? ' You are dead: your eggs score but are not votes.' : ''}</span></div>${playerPick(pd, u, s)}`;
      if (f.number && f.number.tokens) h += `<div class="t-field"><span class="label">Confidence token: multiplies what your stake banks</span><div class="seg shake">${f.number.tokens.map((v) => `<button type="button" class="${(u.number ?? f.number.min) === v ? 'on' : ''}" data-tok="${v}">${v}</button>`).join('')}</div></div>`;
      h += f.cards ? cardPick(pd, u, 'Eggs') : `<div class="t-field row"><span class="label">How many eggs (the Poppy picks which)</span>${stepper('tnum', u.number ?? f.number.min, f.number.min, f.number.max)}</div>`;
    } else {
      const limit = (f.say || {}).words || 80, n = words(u.say), acts = (f.special || {}).actions || [];
      const noise = /Banksia/.test(pd.prompt);
      const tags = (u.caw ? '<button type="button" class="c-tag" data-caw>CAW CAW<b>×</b></button>' : '') + (u.act ? `<button type="button" class="c-tag" data-action="${u.act}">${esc(ACTION[u.act][0])}<b>×</b></button>` : '') + (u.wopen ? '<button type="button" class="c-tag" data-wopen>Whisper<b>×</b></button>' : '');
      const kunzeaGone = (s.flowers || []).includes('Crimson Kunzea') && !acts.includes('double_down');
      if (u.more) h += `<div class="c-more">${f.caw ? `<button type="button" class="c-opt${u.caw ? ' on' : ''}" data-caw><b>CAW CAW</b><span>Ask to end the talk and vote. It takes ${r.day.caw_caw_needed} players.</span></button>` : `<button type="button" class="c-opt off" disabled><b>CAW CAW</b><span>${liveTurn(pd) ? 'Not open yet: it opens once the talk is half over.' : 'Not available right now.'}</span></button>`}
        ${kunzeaGone ? '<button type="button" class="c-opt off" disabled><b>Double down</b><span>Crimson Kunzea: only before your first message of the day, and only once a round.</span></button>' : ''}
        ${f.whisper ? `<button type="button" class="c-opt${u.wopen ? ' on' : ''}" data-wopen><b>Whisper</b><span>Say something only one player hears.</span></button>` : ''}
        ${acts.map((a) => `<button type="button" class="c-opt${u.act === a ? ' on' : ''}" data-action="${a}"><b>${esc(ACTION[a][0])}</b><span>${esc(ACTION[a][1])}</span></button>`).join('')}</div>`;
      if (f.whisper && u.wopen) h += `<div class="t-extra"><select data-wto><option value="">Whisper to…</option>${f.whisper.options.map((n2) => `<option ${u.wto === n2 ? 'selected' : ''}>${esc(n2)}</option>`).join('')}</select><input type="text" id="twtext" placeholder="Only they will hear this" value="${esc(u.wtext)}" autocomplete="off"></div>`;
      if (u.act) {
        const sp = f.special;
        h += '<div class="t-extra col">';
        const early = u.act === 'double_down' && sp.pledge;
        if (['wink', 'bond', 'touch', 'sunflower'].includes(u.act) || early) h += `<select data-aplayer><option value="">${esc(ACTION[u.act][0])}: choose a player…</option>${sp.players.map((n2) => `<option ${u.aplayer === n2 ? 'selected' : ''}>${esc(n2)}</option>`).join('')}</select>`;
        if (u.act === 'sunflower') h += animalSelect('data-aanimal', s.pool, u.aanimal, 'Are they the…') + cardPick(pd, u, 'Egg to spend');
        if (early) h += cardPick(pd, u, 'Eggs you throw now, as your vote');
        if (u.act === 'challenge') h += `<div class="t-guess">${sp.players.map((n2) => `<label><span>${esc(n2)}</span>${animalSelect(`data-guess="${esc(n2)}"`, s.pool, u.guesses[n2], 'is the…')}</label>`).join('')}</div>${f.cards ? cardPick(pd, u, 'Your bet') : ''}`;
        h += '</div>';
      }
      if (tags) h += `<div class="c-tags">${tags}</div>`;
      h += `<div class="composer"><button type="button" class="c-plus${u.more ? ' on' : ''}" data-more aria-label="More actions" aria-expanded="${u.more}">${ui('plus', 20)}</button>
        <div class="c-box"><textarea id="tsay" rows="1" enterkeyhint="send" placeholder="${noise ? 'Only bird or cat noises' : liveTurn(pd) ? 'Speak whenever you like' : 'Message the table'}" aria-label="Message the table">${esc(u.say)}</textarea><span class="t-count${n > limit ? ' over' : ''}" id="tcount" ${n > limit * .7 ? '' : 'hidden'}>${n}/${limit}</span></div>
        <button type="button" class="c-send${dayIdle(u) && !liveTurn(pd) ? ' pass' : ''}" id="tsend" aria-label="Send" ${turnValid(pd, u) ? '' : 'disabled'}>${sendInner(u, pd)}</button></div>`;
    }
    return h;
  }
  function grow(t) { if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 116) + 'px'; }
  function drawTurn(r, force) {
    const box = $('#turn'); if (!box) return;
    const s = r.state, pd = r.pending;
    let key, html;
    if (r.paused) {
      key = 'paused';
      if (!force && key === P.turnKey) return;
      html = '<div class="turn-in waiting"><b>Paused</b><button type="button" class="btn primary small" data-unpause>Carry on</button></div>';
      document.title = 'Paused · Meowfia Lab';
    } else if (pd && s && P.sent !== pd.id) {
      if (P.pendingId !== pd.id) {
        if (P.u && P.u.say) P.draft = P.u.say;
        const typed = liveTurn(pd) ? (P.draft || '') : '';
        if (liveTurn(pd)) P.draft = '';      // live talk can reopen your turn: keep what you were typing
        P.pendingId = pd.id; P.u = blankTurn(); P.u.say = typed;
        if (pd.fields.number) P.u.number = pd.kind === 'handshake' ? null : pd.fields.number.min;
        if (navigator.vibrate) navigator.vibrate(25);
        force = true;
      }
      key = 'turn:' + pd.id;
      if (!force && key === P.turnKey) return;
      const day = pd.kind === 'day';
      html = `<div class="turn-in yours ${day ? 'day' : 'pick'}">${turnBody(pd, P.u, s, r)}${day ? '' : `<button type="button" class="btn primary big" id="tsend" ${turnValid(pd, P.u) ? '' : 'disabled'}>${esc(submitLabel(pd, P.u))}</button>`}</div>`;
      document.title = '● Your turn · Meowfia Lab';
    } else {
      document.title = 'Playing · Meowfia Lab';
      const others = ((s || {}).asking || []).filter((n) => n !== r.me);
      let line, extra = '';
      if (r.status === 'queued') line = 'Setting the table…';
      else if (r.status === 'done') { line = 'The game is over'; extra = r.seats === 'claude' ? `<a class="btn primary small" href="#/game/${encodeURIComponent(r.id)}">Read the replay</a>` : '<a class="btn small" href="#/run">Play again</a>'; }
      else if (r.status === 'stopped' || r.status === 'failed') { line = r.status === 'failed' ? 'The game hit a problem' : 'The game is stopped'; extra = '<a class="btn small" href="#/run">Run page</a>'; }
      else if (r.over) line = 'Game over. The review is being written…';
      else if (others.length) line = P.sent ? 'Your move is in' : 'Waiting for the others';
      else line = 'The Storyteller is working…';
      const fin = s && s.result && s.result.final && (r.over || r.status === 'done') ? resultsHTML(r) : '';
      key = 'wait:' + line + r.status + (fin ? 'final' : '');
      if (key === P.turnKey) return;
      html = `<div class="turn-in${fin ? ' yours pick' : ''}">${fin}<div class="turn-in waiting"><b>${esc(line)}</b>${extra}</div></div>`;
    }
    P.turnKey = key;
    const ta = document.activeElement, id = ta && box.contains(ta) ? ta.id : '', pos = id && ta.selectionStart;
    const feed = $('#feed'), near = feed && atBottom(feed);
    box.innerHTML = html;
    grow($('#tsay'));
    if (id && $('#' + id)) { const el = $('#' + id); el.focus({ preventScroll: true }); try { el.setSelectionRange(pos, pos); } catch { /* not a text field */ } }
    if (near) toBottom(false);
  }
  function refreshSend() {
    const pd = P.data && P.data.pending, b = $('#tsend'); if (!pd || !b) return;
    b.disabled = !turnValid(pd, P.u);
    if (pd.kind === 'day') { b.innerHTML = sendInner(P.u, pd); b.classList.toggle('pass', dayIdle(P.u) && !liveTurn(pd)); } else b.textContent = submitLabel(pd, P.u);
  }
  function wireTurn() {
    const box = $('#turn');
    const redraw = () => drawTurn(P.data, true);
    box.addEventListener('click', async (e) => {
      const pd = P.data && P.data.pending, u = P.u, t = e.target;
      if (t.closest('[data-me]')) return openMe();
      if (t.closest('[data-unpause]')) return setPause(false);
      if (!pd || !u) return;
      const f = pd.fields;
      let el;
      if ((el = t.closest('[data-target]'))) {
        const n = el.dataset.target, max = f.targets.max ?? 1;
        if (u.targets.includes(n)) u.targets = u.targets.filter((x) => x !== n);
        else if (max === 1) u.targets = [n];
        else if (u.targets.length < max) u.targets.push(n);
        else u.targets = [u.targets[0], n];
        return redraw();
      }
      if ((el = t.closest('[data-egg]'))) {
        const id = el.dataset.egg, max = pd.kind === 'day' && u.act === 'sunflower' ? 1 : pd.kind === 'day' && u.act === 'double_down' && f.special.pledge ? f.special.pledge.max : f.cards.max;
        if (u.cards.includes(id)) u.cards = u.cards.filter((x) => x !== id);
        else if (max === 1) u.cards = [id];
        else if (u.cards.length < max) u.cards.push(id);
        else { toast(`You can choose at most ${max}.`); return; }
        return redraw();
      }
      if ((el = t.closest('[data-role]'))) { u.role = u.role === el.dataset.role ? null : el.dataset.role; return redraw(); }
      if ((el = t.closest('[data-stepper] button'))) { const st = el.closest('[data-stepper]'); u.number = Math.max(+st.dataset.min, Math.min(+st.dataset.max, (u.number ?? +st.dataset.min) + +el.dataset.dir)); return redraw(); }
      if ((el = t.closest('[data-tok]'))) { u.number = +el.dataset.tok; return redraw(); }
      if ((el = t.closest('[data-shake]'))) { u.number = +el.dataset.shake; return redraw(); }
      if (t.closest('[data-more]')) { u.more = !u.more; return redraw(); }
      if (t.closest('[data-caw]')) { u.caw = !u.caw; u.more = false; return redraw(); }
      if (t.closest('[data-wopen]')) { u.wopen = !u.wopen; u.more = false; if (!u.wopen) { u.wto = ''; u.wtext = ''; } return redraw(); }
      if ((el = t.closest('[data-action]'))) { u.act = u.act === el.dataset.action ? '' : el.dataset.action; u.cards = []; u.more = false; return redraw(); }
      if ((el = t.closest('#tsend'))) {
        if (!turnValid(pd, u)) return;
        const limit = (f.say || {}).words || 80;
        let say = u.say.trim().split(/\s+/).slice(0, limit).join(' ');
        if (pd.kind === 'day' && /\bcaw\W+caw\b/i.test(say)) {
          if (f.caw) { u.caw = true; say = say.replace(/\W*\bcaw\W+caw\b\W*/ig, ' ').trim(); }
          else { toast(liveTurn(pd) ? 'CAW CAW is not open yet: it opens once the talk is half over.' : 'CAW CAW cannot be called right now.', true); return; }
        }
        const action = { targets: u.targets, role: u.role, number: f.number ? u.number : null, cards: u.cards, say, caw: u.caw, note: '',
          whisper: u.wto && u.wtext.trim() ? { to: [u.wto], text: u.wtext.trim() } : null,
          special: u.act ? { action: u.act, player: u.aplayer || null, animal: u.aanimal || null, guesses: Object.entries(u.guesses).map(([player, animal]) => ({ player, animal })) } : null };
        el.disabled = true;
        P.sent = pd.id; P.turnKey = ''; u.say = '';
        if (pd.kind === 'day' && say) {              // show your message at once; the real one replaces it
          P.ghost = say;
          $('#ftyping').insertAdjacentHTML('beforebegin', `<div class="in f-msg mine ghost" id="fghost"><div class="f-col"><div class="bubble">${esc(say)}</div></div></div>`);
        }
        drawTurn(P.data); toBottom(true);
        try { await ctl(`/api/play/${encodeURIComponent(P.id)}/answer`, { body: { id: pd.id, action } }); }
        catch (err) { toast(err.message, true); P.sent = null; P.turnKey = ''; P.ghost = ''; u.say = say; const g = $('#fghost'); if (g) g.remove(); drawTurn(P.data, true); }
      }
    });
    box.addEventListener('input', (e) => {
      const u = P.u, t = e.target; if (!u) return;
      if (t.id === 'tsay') {
        u.say = t.value; grow(t);
        const pd = P.data.pending, limit = ((pd.fields.say || {}).words) || 80, n = words(u.say), c = $('#tcount');
        c.textContent = `${n}/${limit}`; c.hidden = n <= limit * .7; c.classList.toggle('over', n > limit);
        refreshSend();
      } else if (t.id === 'twtext') { u.wtext = t.value; refreshSend(); }
    });
    box.addEventListener('change', (e) => {
      const u = P.u, t = e.target; if (!u) return;
      if ('wto' in t.dataset) u.wto = t.value;
      else if ('aplayer' in t.dataset) u.aplayer = t.value;
      else if ('aanimal' in t.dataset) u.aanimal = t.value;
      else if (t.dataset.guess) u.guesses[t.dataset.guess] = t.value;
      else return;
      refreshSend();
    });
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'tsay') { e.preventDefault(); const b = $('#tsend'); if (b && !b.disabled) b.click(); } });
    box.addEventListener('focusin', (e) => { if (e.target.id === 'tsay') setTimeout(() => toBottom(false), 250); });
  }

  boot();
})();
