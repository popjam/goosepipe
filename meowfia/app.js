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
    if (p && p.role) return `<span class="av ${size} ${sideClass(p.alignment)}${p.dead ? ' dead' : ''}" title="${esc(name)}, the ${esc(p.role)}">${icon(p.role)}</span>`;
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
    const section = { game: 'games', sim: 'sims' }[view] || view;
    $$('[data-nav]').forEach((a) => { const on = a.dataset.nav === section; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    stopPolling(); closeSheet();
    const key = view + '/' + (parts[1] || '');
    if (key !== lastView) window.scrollTo(0, 0);
    lastView = key;
    document.title = 'Meowfia Lab';
    if (view === 'games') return viewGames();
    if (view === 'game') return viewGame(parts[1], parts[2]);
    if (view === 'cards') return viewCards(parts[1]);
    if (view === 'rules') return viewRules(parts[1]);
    if (view === 'sims') return viewSims();
    if (view === 'sim') return viewSim(parts[1]);
    if (view === 'run') return viewRun(new URLSearchParams(query));
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
  function gameCard(g) {
    const top = Object.entries(g.scores).sort((a, b) => b[1] - a[1]);
    const title = g.headline || `${g.players.length} players, ${plural(g.rounds.length, 'round')}`;
    return `<a class="gcard" href="#/game/${encodeURIComponent(g.id)}">
      <div class="gcard-meta"><span>${when(g.started, true)}</span><span>${esc(g.variant)}</span><span>${g.players.length} players</span><span>${esc(modelsOf(g))}</span>${changesPill(g.overrides)}</div>
      <h2>${esc(title)}</h2>
      ${g.summary ? `<p class="gcard-sum">${esc(g.summary)}</p>` : ''}
      <div class="gcard-rounds">${g.rounds.map((r) => { const [cls, text] = outcome(r); return `<span class="rpill ${cls}"><b>R${r.round}</b>${esc(text)}</span>`; }).join('')}</div>
      <div class="gcard-foot"><span class="winner">${ui('scores', 16)}<b>${esc(list(g.winners || [top[0][0]]))}</b> won with ${top[0][1]}</span>
        ${g.review ? `<span class="mini-scores">${REVIEW.slice(0, 3).map((k) => `<span>${cap(k)} <b>${g.review[k] ?? '–'}</b></span>`).join('')}</span>` : ''}</div></a>`;
  }
  function viewGames() {
    page(`<header class="page-head"><h1>Games</h1><p>AI players sit down to Meowfia, bluff, deduce and throw eggs. Open a game to read it like you were at the table.</p></header>
      ${D.games.length ? `<div class="glist">${D.games.map(gameCard).join('')}</div>` : `<div class="empty"><b>No games yet.</b><span>Start the first one from the run page.</span><a class="btn primary" href="#/run">New run</a></div>`}`);
  }

  /* ================= one game ================= */
  // view: 'all' shows every secret; 'table' shows only what the table saw; a player's name shows what they saw.
  const G = { game: null, tab: 'overview', view: store.get('view', 'all'), revealed: new Set() };
  async function viewGame(id, tab) {
    if (!G.game || G.game.id !== id) {
      page('<div class="loading" role="status">Loading the game</div>');
      try { G.game = await getData(`games/${id}.json`); } catch (e) { page('<div class="empty"><b>This game could not be loaded.</b><a class="btn" href="#/">Back to the games</a></div>'); return; }
      G.revealed = new Set();
      if (!['all', 'table'].includes(G.view)) G.view = 'all';
    }
    G.tab = tab || 'overview';
    renderGame();
  }
  const spoil = (round) => G.view === 'all' || G.revealed.has(round) || G.revealed.has('all');
  const sees = (round, name) => spoil(round) || G.view === name;
  const gameHref = (g, tab) => `#/game/${encodeURIComponent(g.id)}${tab ? '/' + tab : ''}`;

  function renderGame() {
    const g = G.game, rv = g.review || {};
    const open = spoil('all');
    const title = open && rv.headline ? rv.headline : `${g.variant}, ${g.players.length} players`;
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
      const s = e.target.closest('[data-seat]');
      if (s && s.dataset.round) { openPlayer(g, +s.dataset.round, s.dataset.seat); return; }
      const j = e.target.closest('[data-jump]');
      if (j) { const el = document.getElementById(j.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
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

  function overview(g) {
    const rv = g.review, open = spoil('all');
    let h = '';
    if (!open) h += `<div class="spoiler"><div><b>Spoilers are hidden.</b><span>The recap and final scores are tucked away. Read the rounds in order, then reveal.</span></div><button class="btn" data-reveal="all">Reveal the whole game</button></div>`;
    if (open && rv) h += `<section class="recap"><p class="lead">${esc(rv.summary)}</p>${meters(rv.scores)}</section>`;
    if (open) {
      h += `<section class="block"><h3>Final scores</h3>${standings(g, g.scores)}
        <div class="breakdown">${Object.entries(g.scores).sort((a, b) => b[1] - a[1]).map(([n]) => { const b = g.breakdown[n]; return `<div class="brow"><span class="brow-name">${dot(g, n)}${esc(n)}</span><span class="brow-parts">${pill(`${b.pile} banked`, 'yolk')}${pill(`${b.kept} kept`)}${b.bonus ? pill(`${b.bonus > 0 ? '+' : ''}${b.bonus} bonus`, 'flower') : ''}</span>${hand(g, b.pile_cards)}</div>`; }).join('')}</div>
        <p class="fine">A score is the value of every card banked, plus 1 for each card kept, plus bonuses.</p></section>`;
    }
    h += `<section class="block"><h3>Rounds</h3><div class="rlist">${g.rounds.map((rec) => {
      const cyc = rec.cycles[rec.cycles.length - 1] || {}, v = cyc.vote || {}, s = spoil(rec.round);
      const out = (v.eliminated || [])[0];
      const recap = open && rv ? ((rv.rounds || []).find((x) => x.round === rec.round) || {}).recap : '';
      const line = rec.skipped ? 'Skipped: the Cactus Flower showed there were no Meowfia.' : rec.exclusive_winner ? (s ? `${rec.exclusive_winner} won the round alone.` : 'Ended early by a challenge.') : out ? (s && !v.corpse ? `${out} was eggsecuted and turned out to be ${v.revealed[out] === 'Meowfia' ? 'a cat' : 'Farm'}.` : `${out} was eggsecuted.`) : 'Nobody was eggsecuted.';
      return `<a class="rcard" href="${gameHref(g, 'r' + rec.round)}"><div class="rcard-top"><b>Round ${rec.round}</b><span class="rcard-cards">${rec.revealed.filter((x) => !x.hidden || s).map((x) => `<span class="cdot">${icon(x.face)}</span>`).join('')}</span>${ui('next', 16)}</div>
        <div class="cast">${g.players.map((n) => av(g, n, s ? rec.players[n] : null, 's')).join('')}</div>
        <p>${esc(recap || line)}</p></a>`;
    }).join('')}</div></section>`;
    if (open && rv) {
      h += `<div class="cols">${listBlock('Notes for the designer', (rv.design_notes || []).map(esc), 'None.')}
        ${listBlock('Rules players misread', (rv.confusions || []).map((x) => `<b>${esc(x.player)}, round ${x.round}.</b> ${esc(x.what)}`), 'Nobody misread anything.')}</div>
        ${listBlock('Moments worth reading', (rv.highlights || []).map((x) => `<a href="${gameHref(g, 'r' + x.round)}">Round ${x.round}</a> ${esc(x.text)}`), 'None noted.')}`;
    } else if (open) h += '<p class="muted">This game has no written review.</p>';
    const ov = (g.overrides || []).map(describe).filter(Boolean);
    h += `<section class="block"><h3>Setup</h3><dl class="facts">
      <dt>Version</dt><dd><a href="#/rules/${encodeURIComponent(g.variant)}">${esc(g.variant)}</a></dd>
      ${ov.length ? `<dt>Changes</dt><dd><ul class="plain">${ov.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></dd>` : ''}
      <dt>Players</dt><dd>${g.players.map((n) => `<span class="pname">${dot(g, n)}${esc(n)}${(g.seat_models || {})[n] ? ` <small>${esc(model(g.seat_models[n]))}</small>` : ''}</span>`).join('')}</dd>
      <dt>Played by</dt><dd>${esc(model(g.model))}${g.effort ? `, ${esc(g.effort)} effort` : ''}${g.review_model && g.review ? `; reviewed by ${esc(model(g.review_model))}` : ''}</dd>
      <dt>Seed</dt><dd>${g.seed}</dd>
      <dt>Length</dt><dd>${g.minutes ? g.minutes + ' minutes' : 'unknown'}${g.usage ? `, ${g.usage.calls} turns` : ''}</dd>
      ${g.usage ? `<dt>Usage</dt><dd>About $${g.usage.api_equivalent_usd} at API prices, covered by the subscription</dd>` : ''}</dl></section>`;
    return h;
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
      return `<button type="button" class="seat${(opts.out || []).includes(name) ? ' out' : ''}" style="left:${pos.x}%;top:${pos.y}%" data-seat="${esc(name)}" data-round="${round}">
        <span class="seat-face">${av(g, name, show ? p : { dead: p.dead }, 'l')}${p.nest !== undefined ? `<span class="nest" title="Cards in nest">${p.nest}</span>` : ''}</span>
        <span class="seat-name">${esc(name)}</span>${sub ? `<span class="seat-sub">${sub}</span>` : ''}</button>`;
    }).join('');
    return `<div class="table" data-arrows="${esc(JSON.stringify(opts.arrows || []))}"><div class="felt"><span>${esc(opts.label || '')}</span></div><svg class="lines" aria-hidden="true"></svg>${seats}</div>`;
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
      if (e.k === 'beat') h += `<div class="beat"><span>${esc(e.label)} · ${e.n} of ${e.of}</span></div>`;
      else if (e.k === 'system') { if (!e.text.startsWith('Nest sizes:')) h += `<div class="sys">${esc(e.text)}</div>`; }
      else if (e.k === 'say') {
        const hide = e.anon && !canSee(e.p);
        h += `<div class="msg">${hide ? '<span class="av anon">?</span>' : av(g, e.p, people[e.p])}<div class="msg-body"><div class="msg-from">${hide ? 'Someone' : esc(e.p)}${e.anon ? pill('eyes shut', 'flower') : ''}</div><div class="bubble">${esc(e.text)}</div>${thought(e, e.p)}</div></div>`;
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
    const pool = `<div class="newcards">${rec.revealed.map((x) => {
      if (x.hidden && !s) return `<div class="mcard facedown"><div class="mcard-art">${MeowIcons.svg('?', 'unknown')}</div><div class="mcard-name">Face-down</div><div class="mcard-kind">Hidden by the Lotus</div></div>`;
      return mcard(D.card[x.face] || { name: x.face }, x.hidden ? 'was face-down' : '');
    }).join('')}</div>
      <div class="inpool"><span class="label">Animals in the pool</span>${rec.pool.map((a) => cchip(a)).join('')}</div>`;
    const startPeople = Object.fromEntries(g.players.map((n) => [n, { ...start[n], nest: start[n].hand.length }]));
    const deal = `<div class="castgrid">${g.players.map((n) => {
      const p = start[n], v = see(n);
      return `<button type="button" class="pcard${v ? ' ' + sideClass(p.alignment) : ''}" data-seat="${esc(n)}" data-round="${R}">${av(g, n, v ? p : null, 'l')}
        <span class="pcard-name">${esc(n)}${n === rec.dealer ? '<small>dealer</small>' : ''}</span>
        <span class="pcard-role">${v ? esc(p.role) + (p.told !== p.role ? ` <small>thinks ${esc(p.told)}</small>` : '') : 'Secret'}</span>
        <span class="pcard-nest">${ui('eggs', 13)}${p.hand.length}</span></button>`;
    }).join('')}</div><p class="fine">${s ? 'Tap a player to follow their round.' : 'Each player knows only their own animal. Tap a player to see what the table could see.'}</p>`;
    add('pool', 'Pool', 'pool', `${plural(rec.revealed.length, 'new card')}`, pool);
    add('deal', 'Deal', 'deal', s ? 'Who was secretly what' : 'Secret', deal);
    if (rec.dusk) add('dusk', 'Dusk', 'dawn', 'Nightshade: talk before the night', dayLog(g, rec.dusk, seen(start), see));

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
      add('day', 'Day' + again, 'day', plural(says, 'message'), `<div class="nests"><span class="label">Nests</span>${g.players.map((n) => `<span class="nestpill">${dot(g, n)}${esc(n)} <b>${after[n].hand.length}</b></span>`).join('')}</div>${dayLog(g, cyc.day || [], dayPeople, see)}`);
      if (cyc.beliefs && Object.keys(cyc.beliefs).length) add('minds', 'Suspicions', 'minds', 'Asked in private before the vote', s ? susGrid(g, cyc, truth, dayPeople) : '<div class="locked">' + ui('minds', 22) + '<b>What everyone privately believed</b><span>is revealed with the round.</span></div>');
      const v = cyc.vote;
      if (v) {
        const arrows = Object.entries(v.throws).filter(([, t]) => g.players.includes(t.target)).map(([n, t]) => ({ from: n, to: t.target, label: String(t.cards.length), kind: t.dead ? 'dim' : 'vote', width: 1.6 + Math.min(4, t.cards.length) * .9, dash: t.dead, bend: .1 }));
        const endPeople = Object.fromEntries(g.players.map((n) => [n, { ...after[n], nest: after[n].hand.length, dead: (v.throws[n] || {}).dead || after[n].dead }]));
        const showRes = s && !v.again;
        let verdict;
        if (v.again) verdict = '<div class="verdict none"><div><b>The Bottlebrush took the most eggs.</b><span>Nobody is eggsecuted. The round goes back to night.</span></div></div>';
        else if (!v.eliminated.length) verdict = '<div class="verdict none"><div><b>Nobody was eggsecuted.</b></div></div>';
        else if (!s) verdict = `<div class="verdict none"><div><b>${esc(list(v.eliminated))} ${v.eliminated.length > 1 ? 'are' : 'is'} eggsecuted.</b><span>A cat, or not? Make your guess, then reveal.</span></div><button class="btn primary" data-reveal="${R}">Reveal round ${R}</button></div>`;
        else verdict = v.eliminated.map((e) => { const a = v.revealed[e]; const none = Object.values(truth).every((x) => x === 'Farm'); return `<div class="verdict ${a === 'Meowfia' ? 'farm' : 'cat'}">${av(g, e, endPeople[e], 'l')}<div><b>${esc(e)} was ${a === 'Meowfia' ? 'a cat' : 'Farm'}.</b><span>${a === 'Meowfia' ? 'Farm wins the round.' : none ? 'There were no cats at all, so everyone loses their thrown eggs.' : 'Meowfia wins the round.'}${v.goose ? ' The Goose is in the pool, so winners and losers swap.' : ''}${v.corpse ? ' The Corpse Flower kept this hidden from the table.' : ''}</span></div></div>`; }).join('');
        add('vote', 'Vote' + again, 'vote', 'Who threw eggs at whom', `<div class="split"><div class="split-a">${table(g, R, endPeople, { show: see, arrows, out: v.eliminated, label: 'Eggsecution', sub: (n) => (v.tally[n] ? plural(v.tally[n], 'vote') : '') })}
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
        ${g.players.some((n) => end[n].role !== start[n].role || end[n].alignment !== start[n].alignment) ? `<ul class="changes">${g.players.filter((n) => end[n].role !== start[n].role || end[n].alignment !== start[n].alignment).map((n) => `<li>${dot(g, n)}<b>${esc(n)}</b> started as ${esc(start[n].alignment)} ${esc(start[n].role)} and ended as ${esc(end[n].alignment)} ${esc(end[n].role)}.</li>`).join('')}</ul>` : ''}`);
    }
    const idx = g.rounds.indexOf(rec);
    const prev = idx > 0 ? [gameHref(g, 'r' + g.rounds[idx - 1].round), 'Round ' + g.rounds[idx - 1].round] : [gameHref(g), 'Overview'];
    const next = idx < g.rounds.length - 1 ? [gameHref(g, 'r' + g.rounds[idx + 1].round), 'Round ' + g.rounds[idx + 1].round] : [gameHref(g), 'Overview'];
    return `<div class="jump" id="jump">${sections.map((x) => `<button type="button" data-jump="${x.id}">${ui(x.ic, 15)}${esc(x.label)}</button>`).join('')}</div>
      ${sections.map((x, i) => `<section class="phase" id="${x.id}"><header class="phase-head"><span class="phase-ic">${ui(x.ic, 18)}</span><h2>${esc(x.label)}</h2>${x.hint ? `<span class="phase-hint">${esc(x.hint)}</span>` : ''}</header>${x.html}</section>`).join('')}
      ${s ? '' : `<div class="spoiler"><div><b>Finished round ${R}?</b><span>Reveal who was what, what happened at night and what everyone was thinking.</span></div><button class="btn primary" data-reveal="${R}">Reveal round ${R}</button></div>`}
      <nav class="pager"><a class="btn" href="${prev[0]}">${ui('back', 16)}${prev[1]}</a><a class="btn primary" href="${next[0]}">${next[1]}${ui('next', 16)}</a></nav>`;
  }

  /* ----- one player's round (tap a seat) ----- */
  function openPlayer(g, R, name) {
    const rec = g.rounds.find((r) => r.round === R); if (!rec) return;
    const v = sees(R, name), start = rec.players[name];
    let h = `<header class="sheet-who">${av(g, name, v ? start : null, 'xl')}<div><h2>${esc(name)}</h2><div class="pills">${v ? sidePill(start.alignment) + cchip(start.role) : pill('Animal hidden', 'muted')}${v && start.told !== start.role ? pill('believes they are the ' + esc(start.told), 'flower') : ''}${v && start.winks ? pill('holds a Wink', 'yolk') : ''}</div></div></header>`;
    h += `<h4>Nest at the start</h4>${v ? hand(g, start.hand) : `<p>${plural(start.hand.length, 'card')}</p>`}`;
    rec.cycles.forEach((cyc, ci) => {
      const tag = rec.cycles.length > 1 ? ` (${ci + 1})` : '';
      (cyc.nights || []).forEach((night) => {
        if (!v) return;
        const c = night.choices[name], rows = nightRows(night).filter((r) => r.actor === name || r.e.to === name);
        h += `<h4>Night${tag}</h4>`;
        if (c) h += `<p>Chose ${esc(list(c.targets) || 'nobody')}${c.role ? `, naming the ${esc(c.role)}` : ''}${night.visits[name] && night.declared[name] !== night.visits[name] ? `; actually visited ${esc(night.visits[name])}` : ''}.</p>${c.note ? `<div class="thought"><i>thinks</i>${esc(c.note)}</div>` : ''}`;
        if (rows.length) h += `<ul class="events">${rows.map((r) => `<li class="ev ${r.cls}"><span><b>${esc(r.actor)}</b> ${esc(r.text)}</span><i class="ev-ic">${ui(r.badge, 16)}</i></li>`).join('')}</ul>`;
      });
      const r = (cyc.reports || {})[name];
      if (r && v) h += `<h4>Dawn report${tag}</h4><ul class="plain">${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
      const said = (cyc.day || []).filter((e) => e.k === 'say' && e.p === name && !(e.anon && !v));
      if (said.length) h += `<h4>What they said${tag}</h4>${said.map((e) => `<div class="quote">${esc(e.text)}${e.note && v ? `<div class="thought"><i>thinks</i>${esc(e.note)}</div>` : ''}</div>`).join('')}`;
      const t = cyc.vote && cyc.vote.throws[name];
      if (t) {
        const res = (cyc.vote.results || {})[name];
        h += `<h4>Eggsecution${tag}</h4><p>Threw ${v ? hand(g, t.cards) : plural(t.cards.length, 'card')} at <b>${esc(t.target)}</b>.${spoil(R) && res && !cyc.vote.again ? ` ${res.result === 'won' ? `Banked ${res.points}.` : res.result === 'clownfish' ? 'The Clownfish took them.' : 'Lost them.'}` : ''}</p>${t.note && v ? `<div class="thought"><i>thinks</i>${esc(t.note)}</div>` : ''}`;
      }
    });
    if (spoil(R) && rec.gained) h += `<h4>Score</h4><p>${rec.gained[name] > 0 ? '+' : ''}${rec.gained[name] || 0} this round, ${rec.scores[name]} in total.</p>`;
    openSheet(h, name);
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

  async function latestSim() {
    if (D.sim !== null) return D.sim;
    D.sim = false;
    if (D.sims.length) { try { D.sim = await getData(`sims/${D.sims[0].id}.json`); } catch { /* none */ } }
    return D.sim;
  }
  const kindLine = (c) => (c.type === 'flower' ? `Flower · ${c.group}` : `${c.team} · ${D.cards.abilities[c.ability] || ''}`);
  async function openCard(name) {
    const c = D.card[name]; if (!c) return;
    const seen = D.games.reduce((n, g) => n + g.rounds.filter((r) => (r.revealed || []).includes(name)).length, 0);
    const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    const body = (stats, foot = '') => `<div class="bigcard ${c.type}"><div class="bigcard-art" style="background:${MeowIcons.bg(name)}">${icon(name)}</div>
        <div class="bigcard-text"><div class="bigcard-kind">${c.type === 'flower' ? ui('flower', 14) : ui(c.ability, 14)}${esc(kindLine(c))}</div><h2>${esc(name)}</h2><p>${esc(c.text)}</p>
        <div class="pills">${c.buffer ? pill('Always in the pool', 'yolk') : ''}${c.implemented === false ? pill('Not simulated yet', 'muted') : ''}</div></div></div>
      ${c.reading ? `<h4>How the simulator reads it</h4><p>${esc(c.reading)}</p>` : ''}
      ${c.note ? `<h4>At a text table</h4><p>${esc(c.note)}</p>` : ''}
      ${c.type !== 'flower' ? `<h4>When it acts at night</h4>${c.tiers && c.tiers.length ? `<div class="pills">${c.tiers.map((t) => pill(esc(t.name))).join('')}</div>` : '<p>It has no night effect of its own.</p>'}` : ''}
      <h4>In play</h4><div class="stats" id="cardstats">${stats}</div>${foot}`;
    openSheet(body(stat(seen, 'times revealed in real games')), name, 'card-sheet');
    const sim = await latestSim();
    const box = $('#cardstats');
    if (!sim || !box || $('.bigcard h2').textContent !== name) return;
    let st = stat(seen, 'times revealed in real games');
    if (c.type === 'flower') { const f = sim.flowers.find((x) => x.name === name); st += stat(f ? pct(f.share, 1) : '0%', 'of simulated rounds had it'); }
    else {
      const r = sim.roles.find((x) => x.name === name);
      if (r && r.dealt) st += stat(pct(r.effect_rate), 'of nights it did something') + stat(pct(r.blocked_rate), 'of nights it was hugged') + stat(r.eggs_moved, 'eggs moved per night') + stat(r.dealt, `times dealt in ${sim.games} simulated games`);
    }
    box.innerHTML = st;
    box.insertAdjacentHTML('afterend', `<p class="fine">Simulation figures come from random bots playing ${esc(sim.variant)}: they show what the card does, not how well people use it.</p>`);
  }
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
      <div class="chiprow" id="vpick">${D.variants.map((x) => `<a class="fchip${x.name === v.name ? ' on' : ''}" href="#/rules/${encodeURIComponent(x.name)}">${esc(x.name)}</a>`).join('')}</div>
      <section class="block lead-block"><h2>${esc(v.name)}</h2><p class="muted">${esc(v.description || '')}${base ? ` Based on ${esc(base.name)}.` : ''}</p>
        ${v.changes && v.changes.length ? `<ul class="plain diff">${v.changes.map((c) => { const m = settingMeta(c.key); return `<li><b>${esc(m ? m.label : c.key)}</b> ${esc(showValue(m, c.to))} <small>was ${esc(c.from === undefined || c.from === null ? 'unset' : showValue(m, c.from))}</small></li>`; }).join('')}</ul>` : ''}
        <a class="btn small" href="#/run?variant=${encodeURIComponent(v.name)}">${ui('run', 14)}Play this version</a></section>
      <div class="rules-layout"><article class="rules-text">${rulesHTML(v.rules)}</article>
      <aside class="settings">${D.meta.groups.map((grp) => `<section class="block"><h3>${esc(grp.label)}</h3><dl class="facts tight">${D.meta.settings.filter((s) => s.group === grp.id).map((s) => `<dt>${esc(s.label)}</dt><dd class="${changed.has(s.key) ? 'changed' : ''}">${esc(showValue(s, getPath(v.settings, s.key)))}</dd>`).join('')}</dl></section>`).join('')}
        <section class="block"><h3>Deck</h3><dl class="facts tight"><dt>Animals</dt><dd>${v.settings.deck.roles.length + 2}</dd><dt>Flowers</dt><dd>${v.settings.deck.flowers.length}</dd><dt>Rounds</dt><dd>${v.settings.game.rounds}</dd><dt>Players</dt><dd>${v.settings.game.players}</dd></dl></section></aside></div>`);
    const on = $('#vpick .on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /* ================= simulations ================= */
  const SUM = [['no_meowfia_rounds', 'Rounds with no Meowfia', 'p'], ['meowfia_per_round', 'Meowfia per round', 'n'], ['mean_nest_at_vote', 'Cards in a nest at the vote', 'n'],
    ['mean_egg_change', 'Eggs gained per player per night', 'n'], ['night_deaths_per_round', 'Night deaths per round', 'n'], ['day_deaths_per_round', 'Day deaths per round', 'n'],
    ['hugs_per_night', 'Hugs per night', 'n'], ['confusions_per_night', 'Confusions per night', 'n'], ['players_changing_animal_per_round', 'Animal changes per round', 'n'],
    ['players_changing_alignment_per_round', 'Side changes per round', 'n'], ['redirects_per_night', 'Redirected visits per night', 'n'], ['games_ended_early', 'Games cut short by the deck', 'n']];
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
    const bars = (rows, fmt = (v) => v) => { const max = Math.max(...rows.map((r) => r.share), .0001); return `<div class="dist">${rows.map((r) => `<div class="dist-row"><span>${fmt(r.value)}</span><i><b style="width:${r.share / max * 100}%"></b></i><em>${pct(r.share)}</em></div>`).join('')}</div>`; };
    const cols = [['name', 'Animal'], ['dealt', 'Dealt'], ['effect_rate', 'Did something'], ['blocked_rate', 'Hugged'], ['eggs_moved', 'Eggs moved'], ['eggs_self', 'Eggs for itself']];
    const rolesTable = () => {
      const rows = s.roles.filter((r) => r.dealt).sort((a, b) => { const x = a[SORT.key] ?? -1, y = b[SORT.key] ?? -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * SORT.dir; });
      return `<div class="scroll-x"><table class="data"><thead><tr>${cols.map(([k, l]) => `<th><button type="button" data-sort="${k}" class="${SORT.key === k ? 'on' : ''}">${l}${SORT.key === k ? (SORT.dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr><th>${cchip(r.name)}</th><td>${r.dealt}</td><td><span class="ibar"><i style="width:${r.effect_rate * 100}%"></i></span>${pct(r.effect_rate)}</td><td>${pct(r.blocked_rate)}</td><td>${r.eggs_moved}</td><td>${r.eggs_self}</td></tr>`).join('')}</tbody></table></div>`;
    };
    const dealt = s.roles.filter((r) => r.dealt >= 20);
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
  const blank = () => ({ kind: 'game', variant: '', players: null, rounds: null, seed: '', games: 500, model: 'sonnet', effort: '', review: 'opus', probes: true, seats: {}, seatRounds: 'all', roles: null, flowers: null, startPool: [], reveals: [], rules: {}, raw: '' });
  let B = Object.assign(blank(), store.get('builder', {}));
  const R = { status: null, state: 'checking', cardTab: 'roles', q: '' };
  const saveB = () => store.set('builder', B);
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
    if (B.startPool.length) out.push(`game.start_pool=${toml(B.startPool)}`);
    const plan = B.reveals.slice(0, nRounds()).map((r) => (r || []).slice(0, val('game.pool_reveal')));
    while (plan.length && !plan[plan.length - 1].length) plan.pop();
    if (plan.length) out.push(`game.reveal_plan=${toml(plan)}`);
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
    for (const n of seatNames()) { const m = (B.seats[n] || {}).model; if (m && m !== B.model) seat_models[n] = m; }
    return { type: B.kind, variant: variantOf().name, players: nPlayers(), rounds: nRounds(), seed: B.seed === '' ? null : +B.seed, model: B.model, effort: B.effort || null, review_model: B.review, probes: B.probes, games: B.games, seat_models, set: overridesOf() };
  }
  function command() {
    const p = payload(), q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
    let c = `python3 -m meowsim ${p.type === 'sim' ? 'sim --games ' + p.games : 'play --model ' + p.model} --variant ${q(p.variant)} --players ${p.players} --rounds ${p.rounds}`;
    if (p.seed !== null) c += ` --seed ${p.seed}`;
    if (p.type === 'game') { c += ` --review-model ${p.review_model}`; if (p.effort) c += ` --effort ${p.effort}`; if (!p.probes) c += ' --no-probes'; for (const [n, m] of Object.entries(p.seat_models)) c += ` --seat-model ${n}=${m}`; }
    for (const o of p.set) c += ` --set ${q(o)}`;
    return c;
  }

  function viewRun(query) {
    if (!B.variant || !D.variants.find((v) => v.name === B.variant)) B.variant = D.variants[0].name;
    if (query.get('variant') && D.variants.find((v) => v.name === query.get('variant'))) { B.variant = query.get('variant'); B.rules = {}; B.roles = B.flowers = null; saveB(); }
    if (query.get('c')) {                          // a setup handed over from the public site
      try { B = Object.assign(blank(), JSON.parse(decodeURIComponent(escape(atob(query.get('c').replace(/-/g, '+').replace(/_/g, '/')))))); saveB(); toast('Setup loaded. Check it and start the run.'); } catch { toast('That setup link could not be read.', true); }
      history.replaceState(null, '', '#/run');
    }
    document.title = 'New run · Meowfia Lab';
    page(`<header class="page-head"><h1>New run</h1><p>Set up a game exactly how you want it, then let it play on your PC.</p></header>
      <div id="conn"></div><div id="monitor"></div>
      <div class="builder" id="builder"><div class="builder-main">
        <section class="bsec" id="sec-kind"></section><section class="bsec" id="sec-game"></section><section class="bsec" id="sec-players"></section>
        <section class="bsec" id="sec-cards"></section><section class="bsec" id="sec-rules"></section></div>
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
    return `<b>${what}</b><span>${esc(r.variant)} · ${r.players} players${r.type === 'game' ? ' · ' + esc(r.seat_models ? 'mixed models' : model(r.model)) : ''}${r.changes ? ' · ' + plural(r.changes, 'change') : ''}</span>`;
  }
  function showMonitor() {
    const box = $('#monitor'), st = R.status; if (!box || !st) return;
    const run = st.running;
    const badge = { queued: pill('Queued', 'muted'), done: pill('Finished', 'farm'), stopped: pill('Stopped', 'yolk'), failed: pill('Failed', 'cat') };
    const item = (r) => `<li class="qitem">${badge[r.state] || ''}<div class="qitem-text">${runLine(r)}${r.message ? `<small>${esc(r.message)}</small>` : ''}</div>
      ${r.state === 'queued' ? `<button type="button" class="btn small" data-stop="${esc(r.id)}">Remove</button>` : ''}
      ${r.state === 'stopped' && r.type === 'game' && r.resumable ? `<button type="button" class="btn small" data-resume="${esc(r.id)}">Continue</button>` : ''}
      ${r.state === 'done' ? `<a class="btn small" href="#/${r.type === 'sim' ? 'sim' : 'game'}/${encodeURIComponent(r.id)}">Open</a>` : ''}</li>`;
    const tailKey = run && run.tail ? run.tail.length + '|' + run.tail[run.tail.length - 1] : '';
    const liveEl = $('#live'), stick = !liveEl || liveEl.scrollTop + liveEl.clientHeight >= liveEl.scrollHeight - 30;
    box.innerHTML = `${run ? `<section class="live-run"><div class="live-head"><span class="pulse"></span><div class="qitem-text">${runLine(run)}</div><button type="button" class="btn small danger" data-stop="${esc(run.id)}">${ui('stop', 14)}Stop</button></div>
        <div class="progress" role="progressbar" aria-valuenow="${Math.round((run.progress || 0) * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round((run.progress || 0) * 100)}%"></i></div>
        <div class="live-meta"><span>${esc(run.phase || 'Starting')}</span><span>${esc(run.elapsed || '')}${run.calls ? ' · ' + run.calls + ' turns' : ''}</span></div>
        ${run.tail && run.tail.length ? `<div class="live" id="live" data-key="${esc(tailKey)}">${run.tail.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : ''}</section>` : ''}
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
  const secHead = (n, title, sub) => `<header class="bsec-head"><span class="step">${n}</span><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div></header>`;

  function drawKind() {
    $('#sec-kind').innerHTML = `${secHead(1, 'What to run')}
      <div class="choice2">${[['game', 'Real game', 'Claude plays every seat. You get a full replay, private reasoning and a written review. Takes a few minutes and uses your subscription.'], ['sim', 'Simulation set', 'Hundreds of random-bot games in seconds, reported as statistics about the mechanics. Free.']].map(([k, t, d]) => `<button type="button" class="choice${B.kind === k ? ' on' : ''}" data-set="kind" data-value="${k}" aria-pressed="${B.kind === k}"><span class="choice-ic">${ui(k === 'game' ? 'games' : 'sims', 22)}</span><b>${t}</b><span>${d}</span></button>`).join('')}</div>`;
  }
  function drawGame() {
    const v = variantOf();
    $('#sec-game').innerHTML = `${secHead(2, 'The game')}
      <div class="frow"><div class="flabel"><b>Version</b><span>${esc(v.description || '')}</span></div>
        <div class="vpick">${D.variants.map((x) => `<button type="button" class="fchip${x.name === v.name ? ' on' : ''}" data-set="variant" data-value="${esc(x.name)}">${esc(x.name)}</button>`).join('')}</div></div>
      <div class="fgrid">
        <div class="fcell"><b>Players</b>${stepper('players', nPlayers(), 4, 8)}</div>
        <div class="fcell"><b>Rounds</b>${stepper('rounds', nRounds(), 1, 10)}</div>
        ${B.kind === 'sim' ? `<div class="fcell"><b>Games</b><div class="seg small">${[100, 500, 1000, 3000].map((n) => `<button type="button" class="${B.games === n ? 'on' : ''}" data-set="games" data-value="${n}">${n}</button>`).join('')}</div></div>` : ''}
        <div class="fcell"><b>Seed</b><div class="seedbox"><input type="number" inputmode="numeric" id="seed" value="${esc(B.seed)}" placeholder="Random" aria-label="Seed"><button type="button" class="icon-btn" data-act="dice" aria-label="Pick a random seed">${ui('dice', 18)}</button></div></div>
      </div><p class="fine">The same seed gives the same starting deck, hands and Meowfia rolls, so two versions can be compared fairly.</p>`;
  }
  function drawPlayers() {
    const box = $('#sec-players');
    box.hidden = false;
    const names = seatNames();
    const seatRow = (n, i) => {
      const s = B.seats[n] || {};
      return `<div class="seatrow"><span class="seatrow-name"><span class="av s tok">${eggToken(i)}</span>${esc(n)}</span>
        ${B.kind === 'game' ? `<label class="mini"><span>Model</span><select data-seat-model="${esc(n)}"><option value="">Default</option>${MODELS.map((m) => `<option value="${m}" ${s.model === m ? 'selected' : ''}>${MODEL[m]}</option>`).join('')}</select></label>` : ''}
        <div class="mini"><span>Animal</span>${s.role ? `<span class="picked"><button type="button" class="cchip ${typeOf(s.role)}" data-pick="seat:${esc(n)}"><span class="cchip-art">${icon(s.role)}</span><span>${esc(s.role)}</span></button><button type="button" class="x" data-act="clear-seat" data-name="${esc(n)}" aria-label="Clear">${ui('close', 14)}</button></span>` : `<button type="button" class="add" data-pick="seat:${esc(n)}">Dealt at random</button>`}</div>
        <div class="mini"><span>Side</span><div class="seg small">${[['', 'Rolled'], ['Farm', 'Farm'], ['Meowfia', 'Cat']].map(([k, l]) => `<button type="button" class="${(s.side || '') === k ? 'on' : ''}" data-seat-side="${esc(n)}" data-value="${k}">${l}</button>`).join('')}</div></div></div>`;
    };
    const anyFixed = names.some((n) => (B.seats[n] || {}).role || (B.seats[n] || {}).side);
    const nSet = names.filter((n) => { const x = B.seats[n] || {}; return x.role || x.side || (B.kind === 'game' && x.model); }).length;
    box.innerHTML = `${secHead(3, 'The players', B.kind === 'game' ? 'Who plays, and anything you want to fix about a seat.' : 'Fix a seat\'s animal or side to test a matchup.')}
      ${B.kind === 'game' ? `<div class="frow"><div class="flabel"><b>Model for the table</b><span>${MODEL_NOTE[B.model]}</span></div><div class="seg">${MODELS.map((m) => `<button type="button" class="${B.model === m ? 'on' : ''}" data-set="model" data-value="${m}">${MODEL[m]}</button>`).join('')}</div></div>
      <div class="fgrid">
        <label class="fcell"><b>Thinking effort</b><select data-bind="effort">${[['', 'Default'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']].map(([k, l]) => `<option value="${k}" ${B.effort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="fcell"><b>Review written by</b><select data-bind="review">${[...MODELS, 'none'].map((m) => `<option value="${m}" ${B.review === m ? 'selected' : ''}>${m === 'none' ? 'Nobody (skip)' : MODEL[m]}</option>`).join('')}</select></label>
        <div class="fcell wide"><div class="inline"><div><b>Ask who they suspect</b><span>One private question per player before each vote. It feeds the suspicion grid.</span></div>${toggle('probes', B.probes)}</div></div>
      </div>` : ''}
      <details class="rgroup seatgroup" data-group="seats" ${nSet || store.get('rg-seats', false) ? 'open' : ''}><summary><div><b>Seat by seat</b><span>Give one seat a different model, a chosen animal or a chosen side.</span></div>${nSet ? pill(nSet + ' set', 'yolk') : ''}${ui('down', 18)}</summary>
      <div class="seats">${names.map(seatRow).join('')}</div>
      ${anyFixed ? `<div class="frow slim"><div class="flabel"><b>Fixed seats apply</b></div><div class="seg small">${[['all', 'Every round'], ['first', 'Round 1 only']].map(([k, l]) => `<button type="button" class="${B.seatRounds === k ? 'on' : ''}" data-set="seatRounds" data-value="${k}">${l}</button>`).join('')}</div></div>` : ''}</details>`;
  }
  function slotRow(label, hint, items, key, max, kinds) {
    return `<div class="slotrow"><div class="flabel"><b>${label}</b><span>${hint}</span></div><div class="slots">${items.map((n, i) => `<span class="picked"><button type="button" class="cchip ${typeOf(n)}" data-card="${esc(n)}"><span class="cchip-art">${icon(n)}</span><span>${esc(n)}</span></button><button type="button" class="x" data-act="drop" data-key="${key}" data-i="${i}" aria-label="Remove ${esc(n)}">${ui('close', 14)}</button></span>`).join('')}
      ${items.length < max ? `<button type="button" class="add" data-pick="${key}" data-kinds="${kinds}">${ui('plus', 14)}Add</button>` : ''}</div></div>`;
  }
  function drawCards() {
    const k = R.cardTab, on = deckList(k), all = allOf(k), q = R.q.trim().toLowerCase();
    const reveal = val('game.pool_reveal');
    const tiles = all.filter((n) => !q || n.toLowerCase().includes(q)).map((n) => `<button type="button" class="tog ${typeOf(n)}${on.includes(n) ? ' on' : ''}" data-hold data-card="${esc(n)}" data-tog="${esc(n)}" aria-pressed="${on.includes(n)}"><span class="tog-art">${icon(n)}</span><span class="tog-name">${esc(n)}</span><i class="tog-check">${ui('check', 12)}</i></button>`).join('');
    $('#sec-cards').innerHTML = `${secHead(4, 'The cards', 'Which cards can turn up, and any you want to see for certain.')}
      <div class="cardtools"><div class="seg" id="cardtab">${[['roles', 'Animals'], ['flowers', 'Flowers']].map(([x, l]) => `<button type="button" class="${k === x ? 'on' : ''}" data-cardtab="${x}">${l}<small>${deckList(x).length}/${allOf(x).length}</small></button>`).join('')}</div>
        <label class="search">${ui('search', 18)}<input type="search" id="tq" placeholder="Find a card" value="${esc(R.q)}" autocomplete="off" aria-label="Find a card"></label></div>
      <div class="quick"><button type="button" class="link" data-act="deck-all">All on</button><button type="button" class="link" data-act="deck-none">All off</button>${k === 'roles' ? '<button type="button" class="link" data-act="deck-farm">Farm only</button><button type="button" class="link" data-act="deck-cats">Cats only</button>' : ''}${B[k] ? '<button type="button" class="link" data-act="deck-reset">Reset to the version</button>' : ''}<span class="fine">Tap to switch a card on or off. Hold it to read it.</span></div>
      <div class="toggrid" id="toggrid">${tiles || '<p class="muted">No cards match.</p>'}</div>
      ${k === 'roles' ? '<p class="fine">The Pigeon and the House Cat are always in the pool.</p>' : ''}
      <h3 class="sub">Guaranteed cards</h3>
      ${slotRow('In the pool from the start', 'Animals available from round 1.', B.startPool, 'startPool', 12, 'roles')}
      ${reveal > 0 ? Array.from({ length: nRounds() }, (_, i) => slotRow(`Revealed in round ${i + 1}`, i === 0 ? `Up to ${reveal}. The rest are drawn from the deck.` : '', (B.reveals[i] || []).slice(0, reveal), 'reveal:' + i, reveal, 'both')).join('') : ''}`;
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
    $('#sec-rules').innerHTML = `${secHead(5, 'The rules', `Change any rule for this run. ${n ? plural(n, 'rule') + ' changed.' : 'Nothing changed yet.'}`)}
      ${D.meta.groups.map((g, i) => { const items = D.meta.settings.filter((s) => s.group === g.id); const ch = items.filter((s) => s.key in B.rules && B.rules[s.key] !== baseVal(s.key)).length; return `<details class="rgroup" data-group="${g.id}" ${store.get('rg-' + g.id, i === 0) ? 'open' : ''}><summary><div><b>${esc(g.label)}</b><span>${esc(g.help)}</span></div>${ch ? pill(ch + ' changed', 'yolk') : ''}${ui('down', 18)}</summary>${items.map(control).join('')}</details>`; }).join('')}
      <details class="rgroup" data-group="raw" ${B.raw ? 'open' : ''}><summary><div><b>Anything else</b><span>Settings written by hand, one per line.</span></div>${ui('down', 18)}</summary>
        <textarea id="raw" rows="3" spellcheck="false" placeholder="section.key=value, for example&#10;deck.duplicate_values=[1, 1, 13, 13]">${esc(B.raw)}</textarea></details>`;
  }
  function summaryLines() {
    const p = payload(), lines = [];
    lines.push(['Type', p.type === 'sim' ? `${p.games.toLocaleString()} simulated games` : 'Real game']);
    lines.push(['Version', p.variant]);
    lines.push(['Table', `${p.players} players, ${plural(p.rounds, 'round')}`]);
    if (p.type === 'game') { const mixed = Object.keys(p.seat_models).length; lines.push(['Played by', model(p.model) + (mixed ? ` and ${plural(mixed, 'other seat')}` : '')]); }
    lines.push(['Seed', p.seed === null ? 'Random' : p.seed]);
    return lines;
  }
  function drawSummary() {
    const side = $('#summary'), bar = $('#startbar'); if (!side) return;
    const p = payload(), ch = p.set.map(describe).filter(Boolean);
    let action, hint = '';
    if (R.state === 'ok') action = `<button type="button" class="btn primary big" data-act="start">${ui('run', 16)}Start the run</button>`;
    else if (R.state === 'handover') { action = `<a class="btn primary big" id="handover" href="#">${ui('link', 16)}Continue on your PC</a>`; hint = 'Opens the PC\'s copy of this page with this setup. Needs Tailscale.'; }
    else if (R.state === 'checking') action = '<button type="button" class="btn primary big" disabled>Looking for the PC…</button>';
    else action = `<button type="button" class="btn primary big" disabled>${R.state === 'down' ? 'The PC is unreachable' : 'Runs are not set up here'}</button>`;
    side.innerHTML = `<div class="sum"><h3>Your run</h3><dl class="facts tight">${summaryLines().map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${ch.length ? `<h4>${plural(ch.length, 'change')} from ${esc(p.variant)}</h4><ul class="plain sumlist">${ch.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="fine">Standard rules and cards.</p>'}
      ${action}${hint ? `<p class="fine">${hint}</p>` : ''}
      <div class="sum-more">${R.state === 'ok' && p.set.length ? `<button type="button" class="link" data-act="save">${ui('save', 14)}Save as a version</button>` : ''}<button type="button" class="link" data-act="copy">${ui('copy', 14)}Copy command</button><button type="button" class="link" data-act="reset">${ui('reset', 14)}Start over</button></div></div>`;
    bar.innerHTML = `<div class="startbar-in"><div><b>${p.type === 'sim' ? p.games.toLocaleString() + ' sim games' : 'Real game'}</b><span>${p.players} players · ${plural(p.rounds, 'round')}${ch.length ? ' · ' + plural(ch.length, 'change') : ''}</span></div>${action.replace(' big', '').replace('id="handover"', 'data-handover')}</div>`;
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(B)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    $$('#handover, [data-handover]').forEach((a) => { a.href = `${D.config.control}/#/run?c=${enc}`; });
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
          drawGame(); drawPlayers(); drawCards();
        } else {
          const rk = key.slice(5), m = settingMeta(rk), cur = m.kind === 'percent' ? Math.round(val(rk) * 100) : val(rk);
          let next = Math.max(min, Math.min(max, Math.round((cur + dir * step) / step) * step));
          B.rules[rk] = m.kind === 'percent' ? next / 100 : next;
          if (B.rules[rk] === baseVal(rk)) delete B.rules[rk];
          redrawRule(rk); if (rk === 'game.pool_reveal') drawCards();
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
        else if (a === 'rule-reset') { delete B.rules[el.dataset.key]; redrawRule(el.dataset.key); if (el.dataset.key === 'game.pool_reveal') drawCards(); }
        else if (a === 'reset') { B = Object.assign(blank(), { variant: D.variants[0].name }); R.q = ''; drawAll(); toast('Back to the standard setup.'); }
        else if (a === 'copy') { try { await navigator.clipboard.writeText(command()); toast('Command copied. Run it in sim/ on the PC.'); } catch { openSheet(`<h2>Command</h2><p class="fine">Run it in the sim folder on the PC.</p><pre class="code">${esc(command())}</pre>`, 'Command'); } return; }
        else if (a === 'save') { saveVersion(); return; }
        else if (a === 'start') { start(el); return; }
        saveB(); drawSummary(); return;
      }
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.bind) { B[t.dataset.bind] = t.value; }
      else if (t.dataset.seatModel) { const n = t.dataset.seatModel; B.seats[n] = { ...(B.seats[n] || {}), model: t.value }; }
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
      await ctl('/api/run', { body: payload() });
      toast(B.kind === 'sim' ? 'Simulation queued.' : 'Game queued. It starts in a moment.');
      await refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { toast('Could not start: ' + err.message, true); }
    $$('[data-act="start"]').forEach((b) => { b.disabled = false; });
    void btn;
  }
  function saveVersion() {
    const p = payload();
    openSheet(`<h2>Save as a version</h2><p class="fine">Keeps these ${plural(p.set.length, 'change')} under a name, so you can run it again and compare it with ${esc(p.variant)}.</p>
      <label class="field"><span>Name</span><input type="text" id="vname" maxlength="60" placeholder="Meowfia v8.1" autocomplete="off"></label>
      <label class="field"><span>What it tries</span><input type="text" id="vdesc" maxlength="200" placeholder="Throw at most 3 cards" autocomplete="off"></label>
      <ul class="plain sumlist">${p.set.map(describe).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <button type="button" class="btn primary big" id="vsave">Save version</button>`, 'Save as a version', 'form-sheet');
    $('#vname').focus();
    $('#vsave').onclick = async () => {
      try {
        const res = await ctl('/api/variant', { body: { name: $('#vname').value, description: $('#vdesc').value, extends: p.variant, set: p.set } });
        D.variants = res.variants;
        B = Object.assign(B, { variant: res.name, rules: {}, roles: null, flowers: null, startPool: [], reveals: [], raw: '', seats: Object.fromEntries(Object.entries(B.seats).map(([n, s]) => [n, { model: s.model }])) });
        saveB(); closeSheet(); drawAll(); toast(`Saved as ${res.name}.`);
      } catch (err) { toast(err.message, true); }
    };
  }

  boot();
})();
