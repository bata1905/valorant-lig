/* Valorant Custom Lig — arayüz */
const V = window.VStats;
const app = document.getElementById('app');
const S = { data: null, st: null, cfg: {}, assets: { maps: {}, agents: {}, weapons: {} }, ui: {} };

// ---------- yardımcılar ----------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f0 = (x) => (x == null || isNaN(x) ? '–' : Math.round(x).toString());
const f1 = (x) => (x == null || isNaN(x) ? '–' : x.toFixed(1));
const f2 = (x) => (x == null || isNaN(x) ? '–' : x.toFixed(2));
const pct = (x) => (x == null || isNaN(x) ? '–' : Math.round(x) + '%');
const P = (id) => S.st.players[id];
const nm = (id) => (P(id) ? P(id).name : '?');
const dateTR = (iso) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' });
const timeTR = (iso) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
const nightTR = (key) => new Date(key + 'T12:00:00Z').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
const agentImg = (a) => (S.assets.agents[a] ? `<img src="${S.assets.agents[a].icon}" alt="${esc(a)}" title="${esc(a)}">` : '');
const pLink = (id, withImg) => {
  const p = P(id);
  if (!p) return '?';
  return `<a class="pname" href="#/oyuncu/${id}">${withImg && p.favAgent ? agentImg(p.favAgent) : ''}<span>${esc(p.name)}</span></a>`;
};
const leaguePlayers = () => Object.values(S.st.players).filter((p) => p.league).sort((a, b) => b.rating - a.rating);
const allPlayers = () => Object.values(S.st.players).sort((a, b) => b.games - a.games);
const matchById = (id) => S.st.matches.find((m) => m.id === id);
const formHtml = (f) => `<span class="form">${f.slice(-8).map((x) => `<i class="${x}"></i>`).join('')}</span>`;

function spark(hist, w = 90, h = 24) {
  const pts = [V.START_RATING, ...hist.map((x) => x.r)];
  if (pts.length < 2) return '';
  const mn = Math.min(...pts), mx = Math.max(...pts), rg = mx - mn || 1;
  const xy = pts.map((v, i) => `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - mn) / rg) * (h - 4)).toFixed(1)}`).join(' ');
  const up = pts[pts.length - 1] >= pts[0];
  return `<svg class="spark" width="${w}" height="${h}"><polyline fill="none" stroke="${up ? '#4fe3b5' : '#ff5c7a'}" stroke-width="1.8" points="${xy}"/></svg>`;
}

// Sıralanabilir tablo
function table(id, cols, rows, opt = {}) {
  const st = (S.ui[id] = S.ui[id] || { key: opt.sort || cols[1].key, dir: -1 });
  const col = cols.find((c) => c.key === st.key) || cols[1];
  const val = (r, c) => (c.val ? c.val(r) : r[c.key]);
  const sorted = rows.slice().sort((a, b) => {
    const x = val(a, col), y = val(b, col);
    if (typeof x === 'string') return st.dir === -1 ? x.localeCompare(y, 'tr') : y.localeCompare(x, 'tr');
    const xa = x ?? -1e9, yb = y ?? -1e9;
    return st.dir === -1 ? yb - xa : xa - yb;
  });
  const cc = (c) => `${c.cls || ''} ${c.opt ? 'opt' : ''}`;
  const head = cols.map((c) => `<th class="${cc(c)} ${c.nosort ? 'nosort' : ''} ${c.key === st.key ? 'on' : ''}" data-k="${c.key}" title="${esc(c.title || '')}">${c.label}${c.key === st.key && c.key !== 'rank' ? (st.dir === -1 ? ' ↓' : ' ↑') : ''}</th>`).join('');
  const body = sorted.map((r, i) => `<tr class="${opt.rowCls ? opt.rowCls(r) : ''}" ${opt.href ? `data-href="${opt.href(r)}"` : ''}>${cols.map((c) => `<td class="${cc(c)}">${c.fmt ? c.fmt(r, i) : esc(val(r, c))}</td>`).join('')}</tr>`).join('');
  return `<div class="scroll"><table data-tid="${id}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function wireTables(rerender) {
  app.querySelectorAll('table[data-tid] th[data-k]:not(.nosort)').forEach((th) => {
    th.onclick = () => {
      const id = th.closest('table').dataset.tid, k = th.dataset.k, st = S.ui[id];
      if (st.key === k) st.dir *= -1; else { st.key = k; st.dir = -1; }
      rerender();
    };
  });
  app.querySelectorAll('tr[data-href]').forEach((tr) => { tr.classList.add('click'); tr.onclick = () => (location.hash = tr.dataset.href); });
}

// ---------- veri ----------
async function loadAssets() {
  const get = (u) => fetch(u).then((r) => r.json()).then((j) => j.data).catch(() => []);
  const [maps, agents, weapons] = await Promise.all([
    get('https://valorant-api.com/v1/maps'),
    get('https://valorant-api.com/v1/agents?isPlayableCharacter=true'),
    get('https://valorant-api.com/v1/weapons'),
  ]);
  (maps || []).forEach((m) => {
    S.assets.maps[m.displayName] = { mini: m.displayIcon, splash: m.listViewIcon || m.splash, xm: m.xMultiplier, ym: m.yMultiplier, xa: m.xScalarToAdd, ya: m.yScalarToAdd };
  });
  (agents || []).forEach((a) => { S.assets.agents[a.displayName] = { icon: a.displayIcon }; });
  (weapons || []).forEach((w) => { S.assets.weapons[w.displayName] = { icon: w.killStreamIcon || w.displayIcon, cat: (w.category || '').split('::').pop() }; });
}

async function init() {
  try {
    const [d, cfg] = await Promise.all([
      fetch('data/matches.json?v=' + Date.now()).then((r) => r.json()),
      fetch('data/config.json?v=' + Date.now()).then((r) => r.json()).catch(() => ({})),
    ]);
    S.data = d; S.cfg = cfg;
  } catch (e) {
    app.innerHTML = '<div class="loading">Veri henüz yok. Toplayıcı ilk kez çalıştığında burada görünecek.</div>';
    return;
  }
  S.st = V.compute(S.data.matches, { minGames: S.cfg.league_min_games || 3 });
  S._attrs = null;
  if (!S.st.matches.length) { app.innerHTML = '<div class="loading">Henüz maç yok.</div>'; return; }
  const upd = S.data.meta && S.data.meta.updated;
  document.getElementById('foot').innerHTML = `${S.st.matches.length} maç. Son güncelleme ${upd ? new Date(upd).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' }) : '–'}. Riot Games ile bağlantısı yoktur.`;
  window.addEventListener('hashchange', route);
  setupMusic();
  route();
  loadAssets().then(route);
}

// ---------- müzik ----------
// config.json içinde "music": "music/nakarat.mp3" varsa ilk dokunuşta çalar.
function setupMusic() {
  const src = S.cfg.music;
  const btn = document.getElementById('music');
  if (!src || !btn) return;
  let off = false;
  try { off = localStorage.getItem('musicOff') === '1'; } catch (e) {}
  const a = new Audio(src);
  a.loop = true; a.volume = 0.55;
  btn.hidden = false;
  const sync = () => btn.classList.toggle('playing', !a.paused);
  a.onplay = sync; a.onpause = sync;
  const start = () => { if (!off && a.paused) a.play().catch(() => {}); };
  start(); // bazı tarayıcılar izin verirse hemen çalar
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, start, { once: true, capture: true }));
  btn.onclick = (e) => {
    e.stopPropagation();
    if (a.paused) { off = false; a.play().catch(() => {}); } else { off = true; a.pause(); }
    try { localStorage.setItem('musicOff', off ? '1' : '0'); } catch (err) {}
  };
}

// ---------- yönlendirme ----------
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [r, arg] = h.split('/');
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === (r === 'oyuncu' ? '' : r === 'mac' ? 'maclar' : r || '')));
  const views = { '': vHome, kafa: vH2H, silahlar: vWeapons, haritalar: vMaps, maclar: vMatches, mac: vMatch, oyuncu: vPlayer, takim: vTeams, rekorlar: vRecords };
  (views[r] || vHome)(decodeURIComponent(arg || ''));
}

// ---------- Sıralama ----------
function verdictHtml(m) {
  if (!m) return '';
  const t = m._throw, c = m._carry;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return `<div class="verdict"><span class="ico">🧯</span><div><div class="tagline">Maçı satan: ${t ? pLink(t.p) : 'yok'}</div>
      <div class="why">${t ? esc(cap(t.reasons.join(', '))) + '.' : 'Herkes elinden geleni yaptı.'}</div></div></div>
    <div class="verdict"><span class="ico">🎒</span><div><div class="tagline">Sırtlayan: ${c ? pLink(c.p) : '–'}</div>
      <div class="why">${c ? `${esc(c.txt)}, etki ${f2(c.impact)}.` : ''}</div></div></div>`;
}

function vHome() {
  const nights = Object.keys(S.st.nights).sort();
  const last = nights[nights.length - 1];
  const lm = S.st.nights[last] || [];
  const lastMatch = lm[lm.length - 1];
  const leader = leaguePlayers()[0];
  const board = last ? `<section class="board" aria-label="Son gece">
      <div>
        <div class="night-title">Son gece, ${esc(nightTR(last))}</div>
        <div class="results">${lm.map((m) => {
          const tids = Object.keys(m.teams);
          return `<a class="res" href="#/mac/${m.id}"><span class="map">${esc(m.map)}</span>
            <span class="sc">${tids.map((t) => `<span class="team-${t}">${m.teams[t].rw}</span>`).join('<span class="dim">:</span>')}</span>
            <span class="dim">${m.ff ? 'FF' : m.completed ? '' : 'yarıda kaldı'}</span></a>`;
        }).join('')}</div>
      </div>
      <div class="leader">
        <span class="muted">Ligin lideri</span>
        <a href="#/oyuncu/${leader.puuid}" style="font-weight:800;font-size:22px">${esc(leader.name)}</a>
        <span class="big">${f0(leader.rating)}</span>
        <span class="muted">${leader.games} maçta etki ${f2(leader.impact)}</span>
      </div>
      <div class="verdicts">${verdictHtml(lastMatch)}</div>
    </section>` : '';

  const rows = allPlayers().filter((p) => p.games > 0);
  const lp = leaguePlayers();
  const rankOf = {}; lp.forEach((p, i) => (rankOf[p.puuid] = i + 1));
  const maxImp = Math.max(...rows.map((p) => p.impact || 0), 1);
  const cols = [
    { key: 'rank', label: '#', val: (p) => (rankOf[p.puuid] ? -rankOf[p.puuid] : -999), fmt: (p) => `<span class="rank r${rankOf[p.puuid] || ''}">${rankOf[p.puuid] || '–'}</span>` },
    { key: 'name', label: 'Oyuncu', cls: 'l', val: (p) => p.name, fmt: (p) => pLink(p.puuid, true) + (p.league ? '' : ' <span class="tag">misafir</span>') },
    { key: 'rating', label: 'Puan', fmt: (p) => { const h = p.ratingHist[p.ratingHist.length - 1]; return `<span class="rating">${f0(p.rating)}</span>${h ? `<span class="delta ${h.d >= 0 ? 'up' : 'down'}">${h.d >= 0 ? '+' : ''}${f0(h.d)}</span>` : ''}`; } },
    { key: 'impact', label: 'Etki', title: 'Maç başına ortalama performans (1.00 = lobi ortalaması)', fmt: (p) => `<span class="imp">${f2(p.impact)}<span class="bar opt"><span style="width:${(100 * (p.impact || 0)) / maxImp}%"></span></span></span>` },
    { key: 'trend', label: 'Gidişat', nosort: true, opt: true, fmt: (p) => spark(p.ratingHist) },
    { key: 'games', label: 'Maç', opt: true },
    { key: 'wl', label: 'G-M', val: (p) => p.wins - p.losses, fmt: (p) => `${p.wins}-${p.losses}` },
    { key: 'form', label: 'Form', nosort: true, opt: true, fmt: (p) => formHtml(p.form) },
    { key: 'kd', label: 'K/D', opt: true, fmt: (p) => f2(p.kd) },
    { key: 'kpr', label: 'KPR', opt: true, title: 'Raund başına kill', fmt: (p) => f2(p.kpr) },
    { key: 'acs', label: 'ACS', opt: true, title: 'Raund başına ortalama skor', fmt: (p) => f0(p.acs) },
    { key: 'adr', label: 'ADR', opt: true, title: 'Raund başına hasar', fmt: (p) => f0(p.adr) },
    { key: 'hsPct', label: 'HS%', opt: true, fmt: (p) => pct(p.hsPct) },
    { key: 'kast', label: 'KAST', opt: true, title: 'Kill, asist, hayatta kalma veya trade olunan raund yüzdesi', fmt: (p) => pct(p.kast) },
    { key: 'fb', label: 'İlk kan', opt: true },
    { key: 'clutchWon', label: 'Clutch', opt: true },
  ];
  app.innerHTML = `${board}
    <h1>Sıralama</h1>
    <p class="lead">Puan, her maçta lobinin ortalamasına göre ne kadar iyi oynadığına bakar. Kill en ağırlıklı kısım ve güçlü birini öldürmek daha değerli. Hasar, KAST ve ilk kan da sayılır. Güçlü takımı yenmek iyi bonus getirir, favoriyken kazanmak az. Sıralamaya girmek için ${S.cfg.league_min_games || 3} maç gerekir.</p>
    <div class="card tight" id="tbl">${table('lb', cols, rows, { sort: 'rank', rowCls: (p) => (p.league ? '' : 'guest'), href: (p) => '#/oyuncu/' + p.puuid })}</div>`;
  wireTables(vHome);
}

// ---------- Oyuncu ----------
function vPlayer(id) {
  const p = P(id);
  if (!p) return (app.innerHTML = '<div class="loading">Oyuncu bulunamadı.</div>');
  const rank = leaguePlayers().findIndex((x) => x.puuid === id) + 1;
  const badges = playerBadges(p);
  const others = allPlayers().filter((q) => q.puuid !== id);

  const weaponRows = Object.entries(p.weapons).map(([w, k]) => ({ w, k, share: (100 * k) / Math.max(1, p.kills) }));
  const mapRows = Object.entries(p.maps).map(([m, x]) => ({ m, ...x, acs: x.score / Math.max(1, x.rounds), kd: x.k / Math.max(1, x.d), wp: x.w + x.l ? (100 * x.w) / (x.w + x.l) : null }));
  const agentRows = Object.entries(p.agents).map(([a, x]) => ({ a, ...x, kd: x.k / Math.max(1, x.d) }));
  const vsRows = others.map((q) => {
    const k = (p.killsOn[q.puuid] || { total: 0 }).total, d = (p.deathsBy[q.puuid] || { total: 0 }).total;
    const mate = p.mates[q.puuid] || { g: 0, w: 0 };
    return { id: q.puuid, name: q.name, k, d, diff: k - d, mg: mate.g, mw: mate.w, mwp: mate.g ? (100 * mate.w) / mate.g : null };
  }).filter((r) => r.k + r.d + r.mg > 0);

  app.innerHTML = `
    <div class="hero">
      ${p.favAgent && S.assets.agents[p.favAgent] ? `<img src="${S.assets.agents[p.favAgent].icon}">` : ''}
      <div><h1 style="margin:0">${esc(p.name)} <span class="tag">#${esc(p.tag)}</span></h1>
      <div class="muted">${rank ? rank + '. sırada' : 'Misafir oyuncu'}, ${p.games} maç ${formHtml(p.form)}</div></div>
      <div style="margin-left:auto;text-align:right"><div class="big">${f0(p.rating)}</div><div class="muted">lig puanı</div></div>
    </div>
    <h2>Oyuncu kartı</h2>
    ${fmProfile(p)}
    <div class="card section" style="margin-bottom:16px"><h3>Puan gidişatı</h3>${ratingChart(p)}</div>
    <div class="grid g4">
      ${[['Etki', f2(p.impact)], ['G-M', `${p.wins}-${p.losses}`], ['Kazanma', pct(p.winPct)], ['K/D', f2(p.kd)], ['ACS', f0(p.acs)], ['ADR', f0(p.adr)], ['HS%', pct(p.hsPct)], ['KAST', pct(p.kast)], ['Kill/Ölüm/Asist', `${p.kills}/${p.deaths}/${p.assists}`], ['İlk kan / İlk ölüm', `${p.fb} / ${p.fd}`], ['Clutch', `${p.clutchWon}/${p.clutchAtt}`], ['3K, 4K, ace', `${p.k3}, ${p.k4}, ${p.aces}`], ['Eko kill', p.ecoKills], ['Pusu kill', p.ambush || 0], ['Maçı sattı', p.throws || 0], ['Takımı sırtladı', p.carries || 0]].map(([l, v]) => `<div class="card stat"><span class="l">${l}</span><span class="v">${v}</span></div>`).join('')}
    </div>
    ${badges.length ? `<div class="section"><h2>Rozetler</h2>${badges.map((b) => `<span class="badge">${b}</span>`).join('')}</div>` : ''}
    <div class="grid g2 section">
      <div class="card"><h3>Ezeli düşman</h3>${p.nemesis ? `<div class="stat"><span class="v">${pLink(p.nemesis.p)}</span><span class="muted">seni ${p.nemesis.n} kez öldürdü</span></div>` : '–'}</div>
      <div class="card"><h3>En sevdiğin kurban</h3>${p.victim ? `<div class="stat"><span class="v">${pLink(p.victim.p)}</span><span class="muted">${p.victim.n} kez öldürdün</span></div>` : '–'}</div>
    </div>
    <h2 class="section">Oyunculara karşı ve birlikte</h2>
    <div class="card tight">${table('pvs', [
      { key: 'name', label: 'Oyuncu', cls: 'l', fmt: (r) => pLink(r.id) },
      { key: 'k', label: 'Öldürdüğü' }, { key: 'd', label: 'Öldüren' },
      { key: 'diff', label: 'Fark', fmt: (r) => `<span class="${r.diff > 0 ? 'up' : r.diff < 0 ? 'down' : ''}">${r.diff > 0 ? '+' : ''}${r.diff}</span>` },
      { key: 'mg', label: 'Aynı takım maç' },
      { key: 'mwp', label: 'Birlikte kazanma', fmt: (r) => (r.mg ? `${pct(r.mwp)} <span class="muted">(${r.mw}-${r.mg - r.mw})</span>` : '–') },
    ], vsRows, { sort: 'k' })}</div>
    <div class="grid g2 section">
      <div class="card tight"><div style="padding:14px 16px 0"><h3>Silahlar</h3></div>${table('pw', [
        { key: 'w', label: 'Silah', cls: 'l', fmt: (r) => weaponName(r.w) },
        { key: 'k', label: 'Kill' },
        { key: 'share', label: 'Pay', fmt: (r) => `<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">${pct(r.share)}<div class="bar"><span style="width:${r.share}%"></span></div></div>` },
      ], weaponRows, { sort: 'k' })}</div>
      <div class="card tight"><div style="padding:14px 16px 0"><h3>Haritalar</h3></div>${table('pm', [
        { key: 'm', label: 'Harita', cls: 'l' }, { key: 'g', label: 'Maç' },
        { key: 'wl', label: 'G-M', val: (r) => r.w - r.l, fmt: (r) => `${r.w}-${r.l}` },
        { key: 'acs', label: 'ACS', fmt: (r) => f0(r.acs) }, { key: 'kd', label: 'K/D', fmt: (r) => f2(r.kd) },
      ], mapRows, { sort: 'g' })}</div>
    </div>
    <div class="card tight section"><div style="padding:14px 16px 0"><h3>Ajanlar</h3></div>${table('pa', [
      { key: 'a', label: 'Ajan', cls: 'l', fmt: (r) => `<span class="pname">${agentImg(r.a)}${esc(r.a)}</span>` },
      { key: 'g', label: 'Maç' }, { key: 'w', label: 'Galibiyet' }, { key: 'kd', label: 'K/D', fmt: (r) => f2(r.kd) },
    ], agentRows, { sort: 'g' })}</div>
    <h2 class="section">Isı haritası</h2>
    ${heatBlock('ph', { player: id })}
    <h2 class="section">Maçları</h2>
    <div class="grid g2">${p.matchIds.slice().reverse().map((mid) => matchCard(matchById(mid), id)).join('')}</div>`;
  wireTables(() => vPlayer(id));
  wireHeat('ph', { player: id });
}

function ratingChart(p) {
  const pts = [{ r: V.START_RATING, date: null }, ...p.ratingHist];
  if (pts.length < 2) return '<div class="muted">Henüz tamamlanmış maç yok.</div>';
  const W = 900, H = 160, pad = 30;
  const vals = pts.map((x) => x.r);
  const mn = Math.min(...vals) - 10, mx = Math.max(...vals) + 10;
  const X = (i) => pad + (i / (pts.length - 1)) * (W - pad * 2);
  const Y = (v) => H - 20 - ((v - mn) / (mx - mn)) * (H - 40);
  const line = pts.map((x, i) => `${X(i).toFixed(1)},${Y(x.r).toFixed(1)}`).join(' ');
  const base = Y(V.START_RATING);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
    <line x1="${pad}" x2="${W - pad}" y1="${base}" y2="${base}" stroke="#3a2f66" stroke-dasharray="4 4"/>
    <text x="${pad}" y="${base - 4}" fill="#8b9aa8" font-size="10">${V.START_RATING}</text>
    <polyline fill="none" stroke="#ffb238" stroke-width="2.5" points="${line}"/>
    ${pts.map((x, i) => (i ? `<circle cx="${X(i)}" cy="${Y(x.r)}" r="3.5" fill="${x.d >= 0 ? '#4fe3b5' : '#ff5c7a'}"><title>${dateTR(x.date)}: ${f0(x.r)} (${x.d >= 0 ? '+' : ''}${f1(x.d)})</title></circle>` : '')).join('')}
  </svg>`;
}

function playerBadges(p) {
  const L = leaguePlayers();
  if (!p.league || L.length < 3) return [];
  const top = (fn) => L.slice().sort((a, b) => fn(b) - fn(a))[0];
  const out = [];
  const add = (cond, txt) => cond && out.push(txt);
  add(top((x) => x.rating).puuid === p.puuid, '👑 Ligin lideri');
  add(top((x) => x.hsPct).puuid === p.puuid, '🎯 Keskin nişancı (en yüksek HS%)');
  add(top((x) => x.fb / x.rounds).puuid === p.puuid, '⚡ Giriş ustası (en çok ilk kan)');
  add(top((x) => x.clutchWon).puuid === p.puuid && p.clutchWon > 0, '🧊 Clutch kralı');
  add(top((x) => x.kast).puuid === p.puuid, '🤝 Takım oyuncusu (en yüksek KAST)');
  add(top((x) => x.ecoKills).puuid === p.puuid, '💸 Eko canavarı');
  add(top((x) => x.weapons.Operator || 0).puuid === p.puuid && (p.weapons.Operator || 0) > 0, '🔭 Op\'çu');
  add(top((x) => x.weapons.Sheriff || 0).puuid === p.puuid && (p.weapons.Sheriff || 0) > 0, '🤠 Şerif');
  add(top((x) => x.adr).puuid === p.puuid, '💥 Hasar makinesi');
  add(top((x) => x.ambush || 0).puuid === p.puuid && (p.ambush || 0) > 0, `🐀 Fare (en çok pusu kill: ${p.ambush})`);
  add(p.aces > 0, `🃏 Ace × ${p.aces}`);
  add(p.bestWinStreak >= 3, `🔥 ${p.bestWinStreak} maçlık galibiyet serisi`);
  add(p.streak <= -3, `🥶 ${-p.streak} maçtır kazanamıyor`);
  return out;
}

function weaponName(w) {
  const a = S.assets.weapons[w];
  return a && a.icon ? `<span class="pname"><img src="${a.icon}" style="width:56px;height:20px;object-fit:contain;background:none">${esc(w)}</span>` : esc(w);
}


// ---------- FM tarzı profil ----------
const PISTOLS = ['Classic', 'Shorty', 'Frenzy', 'Ghost', 'Sheriff'];
const LONG = ['Operator', 'Marshal', 'Outlaw', 'Guardian'];
function rawAttrs(p) {
  const r = Math.max(1, p.rounds), k = Math.max(1, p.kills), d = Math.max(1, p.deaths);
  const sum = (list) => list.reduce((x, w) => x + (p.weapons[w] || 0), 0);
  const imps = (p.impHist || []).map((x) => x.v);
  const mean = imps.reduce((a, b) => a + b, 0) / Math.max(1, imps.length);
  const sd = Math.sqrt(imps.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, imps.length));
  return {
    'Nişancılık': p.hsPct,
    'Öldürücülük': p.kpr,
    'Hasar': p.adr,
    'Uzun menzil': sum(LONG) / k,
    'Tabanca': sum(PISTOLS) / k,
    'Giriş': p.fb / r,
    'Soğukkanlılık': (p.clutchWon + 1) / (p.clutchAtt + 3),
    'Hayatta kalma': -p.deaths / r,
    'Pozisyon alma': -(p.isoDeaths || 0) / d,
    'Sinsilik': (p.ambush || 0) / k,
    'Takım oyunu': p.assists / r,
    'KAST': p.kast,
    'Destek bekleme': -(p.untraded || 0) / d,
    'Ekonomi': p.ecoKills / r,
    'Tutarlılık': -sd,
    'Kazanma': p.winPct,
  };
}
const ATTR_GROUPS = [
  ['Silah', ['Nişancılık', 'Öldürücülük', 'Hasar', 'Uzun menzil', 'Tabanca']],
  ['Oyun zekası', ['Giriş', 'Soğukkanlılık', 'Hayatta kalma', 'Pozisyon alma', 'Sinsilik']],
  ['Takım', ['Takım oyunu', 'KAST', 'Destek bekleme', 'Ekonomi', 'Tutarlılık', 'Kazanma']],
];
const ATTR_HELP = {
  'Nişancılık': 'Kafa vuruşu yüzdesi', 'Öldürücülük': 'Raund başına kill', 'Hasar': 'Raund başına hasar',
  'Uzun menzil': 'Operator, Marshal, Outlaw ve Guardian ile alınan kill payı', 'Tabanca': 'Tabancalarla alınan kill payı',
  'Giriş': 'Raund başına ilk kan', 'Soğukkanlılık': 'Clutch kazanma oranı', 'Hayatta kalma': 'Raund başına ne kadar az öldüğü',
  'Pozisyon alma': 'Takımından uzakta yalnız ölmeme', 'Sinsilik': 'Arkadan, pusudan aldığı kill payı',
  'Takım oyunu': 'Raund başına asist', 'KAST': 'Katkı yaptığı raund yüzdesi', 'Destek bekleme': 'Ölümlerinin ne kadarının intikamı alındığı',
  'Ekonomi': 'Daha ucuz silahla pahalı rakibi öldürme', 'Tutarlılık': 'Maçtan maça performansının ne kadar az oynadığı', 'Kazanma': 'Kazanma yüzdesi',
};
function attrTable() {
  if (S._attrs) return S._attrs;
  const L = leaguePlayers();
  const raws = {}; L.forEach((p) => (raws[p.puuid] = rawAttrs(p)));
  const out = {};
  L.forEach((p) => (out[p.puuid] = {}));
  Object.keys(raws[L[0].puuid] || {}).forEach((a) => {
    const vals = L.map((p) => raws[p.puuid][a]);
    L.forEach((p) => {
      const v = raws[p.puuid][a];
      const below = vals.filter((x) => x < v).length, eq = vals.filter((x) => x === v).length;
      const pctl = (below + (eq - 1) / 2) / Math.max(1, vals.length - 1);
      out[p.puuid][a] = Math.max(1, Math.min(20, Math.round(1 + 19 * pctl)));
    });
  });
  S._attrs = out;
  return out;
}
const attrCls = (v) => (v >= 16 ? 'a4' : v >= 11 ? 'a3' : v >= 6 ? 'a2' : 'a1');
function matchRating(imp) { return Math.max(4, Math.min(10, 6.5 + (imp - 1) * 4)); }
function roleOf(at) {
  const roles = [
    ['Giriş oyuncusu', at['Giriş'] * 2 + at['Öldürücülük']],
    ['Fare (lurker)', at['Sinsilik'] * 2 + at['Pozisyon alma'] * 0.2],
    ['Keskin nişancı', at['Uzun menzil'] * 2 + at['Nişancılık']],
    ['Destekçi', at['Takım oyunu'] * 2 + at['KAST']],
    ['Çapa', at['Hayatta kalma'] * 2 + at['Pozisyon alma']],
  ];
  return roles.sort((a, b) => b[1] - a[1])[0][0];
}
function traitsOf(p, at) {
  const t = [];
  if (at['Sinsilik'] >= 16) t.push('Arkadan dolanmayı sever');
  if (at['Uzun menzil'] >= 16) t.push("Op'u bırakmaz");
  if (at['Giriş'] >= 16) t.push('Siteye ilk o girer');
  if (at['Tabanca'] >= 16) t.push('Tabanca raundlarında tehlikeli');
  if (at['Ekonomi'] >= 16) t.push('Eko raundlarda pahalı silah toplar');
  if (at['Soğukkanlılık'] >= 16) t.push('Baskı altında parlar');
  if (at['Soğukkanlılık'] <= 4) t.push('Clutch anında titrer');
  if (at['Pozisyon alma'] <= 4) t.push('Takımından kopup yalnız ölür');
  if (at['Tutarlılık'] <= 4) t.push('Bir gün kral, bir gün yok');
  if (at['Tutarlılık'] >= 17) t.push('Her maç aynı seviyede');
  if (at['Takım oyunu'] >= 16) t.push('Asist makinesi');
  if ((p.weapons.Sheriff || 0) >= 8) t.push('Sheriff ile kafa avcısı');
  return t;
}
function radar(at) {
  const cats = ATTR_GROUPS.flatMap(([, list]) => list).filter((a) => ['Nişancılık', 'Öldürücülük', 'Giriş', 'Soğukkanlılık', 'Hayatta kalma', 'Takım oyunu', 'Sinsilik', 'Tutarlılık'].includes(a));
  const R = 90, cx = 120, cy = 112, n = cats.length;
  const pt = (i, v) => { const ang = -Math.PI / 2 + (2 * Math.PI * i) / n; return [cx + Math.cos(ang) * R * v, cy + Math.sin(ang) * R * v]; };
  const ring = (f) => cats.map((_, i) => pt(i, f).join(',')).join(' ');
  const poly = cats.map((a, i) => pt(i, at[a] / 20).join(',')).join(' ');
  return `<svg viewBox="-36 -6 312 240" class="radar" role="img" aria-label="Özellik radarı">
    ${[0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${ring(f)}" fill="none" stroke="#2c4152"/>`).join('')}
    <polygon points="${poly}" fill="rgba(255,70,85,.28)" stroke="#ff4655" stroke-width="2"/>
    ${cats.map((a, i) => { const [x, y] = pt(i, 1.2); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#96a3ad" font-size="9">${a}</text>`; }).join('')}
  </svg>`;
}
function fmProfile(p) {
  if (!p.league) return `<div class="card muted">Özellik kartı için en az ${S.cfg.league_min_games || 3} maç gerekiyor.</div>`;
  const at = attrTable()[p.puuid];
  const last = (p.impHist || []).slice(-6);
  const avgR = (p.impHist || []).reduce((x, h) => x + matchRating(h.v), 0) / Math.max(1, (p.impHist || []).length);
  const stars = Math.max(0.5, Math.min(5, Math.round(((V.strength(S.st.players, p.puuid) - 800) / 80) * 2) / 2));
  const starHtml = [1, 2, 3, 4, 5].map((i) => `<span class="${stars >= i ? 'on' : stars >= i - 0.5 ? 'half' : ''}">★</span>`).join('');
  const traits = traitsOf(p, at);
  return `<div class="fm">
    <div class="fm-side">
      <div class="fm-role"><span class="muted">Rol</span><b>${roleOf(at)}</b></div>
      <div class="fm-role"><span class="muted">Güç</span><span class="stars" title="Maç başına etkiden">${starHtml}</span></div>
      <div class="fm-role"><span class="muted">Ortalama maç notu</span><b class="num" style="font-size:28px">${avgR.toFixed(2)}</b></div>
      <div><span class="muted">Son maçlar</span><div class="fm-form">${last.map((h) => { const r = matchRating(h.v); return `<a href="#/mac/${h.m}" title="${esc(h.map)}, ${dateTR(h.date)}" class="rt ${r >= 7.5 ? 'hi' : r >= 6.5 ? 'mid' : 'lo'}">${r.toFixed(1)}</a>`; }).join('')}</div></div>
      ${radar(at)}
      ${traits.length ? `<div><span class="muted">Özellikler</span><ul class="fm-traits">${traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
    </div>
    <div class="fm-attrs">${ATTR_GROUPS.map(([g, list]) => `<div class="fm-group"><h3>${g}</h3>${list.map((a) => `<div class="fm-row" title="${esc(ATTR_HELP[a])}"><span>${a}</span><b class="${attrCls(at[a])}">${at[a]}</b></div>`).join('')}</div>`).join('')}</div>
  </div>
  <p class="muted" style="font-size:13px;margin-top:8px">Özellikler 1-20 arası, ligdeki diğer oyunculara göre hesaplanır. 20 en iyisi demek. Bir özelliğin üstüne gelince neyi ölçtüğü görünür.</p>`;
}

// ---------- Isı haritası ----------
function heatBlock(key, fixed) {
  const st = (S.ui[key] = S.ui[key] || {});
  const maps = Object.keys(S.st.maps).filter((m) => S.st.matches.some((x) => x.map === m && (!fixed.player || x.players.some((p) => p.p === fixed.player))));
  if (!st.map || !maps.includes(st.map)) st.map = maps[0];
  st.mode = st.mode || 'both';
  const pl = fixed.player ? '' : `<select data-h="player"><option value="">Herkes</option>${allPlayers().map((p) => `<option value="${p.puuid}" ${st.player === p.puuid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`;
  return `<div class="card"><div class="filters">
      <select data-h="map">${maps.map((m) => `<option ${m === st.map ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
      ${pl}
      <select data-h="mode"><option value="both" ${st.mode === 'both' ? 'selected' : ''}>Kill + ölüm</option><option value="deaths" ${st.mode === 'deaths' ? 'selected' : ''}>Sadece ölümler</option><option value="kills" ${st.mode === 'kills' ? 'selected' : ''}>Sadece kill pozisyonları</option></select>
    </div>
    <div class="heat" id="heat-${key}"></div>
    <div class="legend"><span><i style="background:#4fe3b5"></i>Kill alınan pozisyon</span><span><i style="background:#ff5c7a"></i>Ölünen yer</span></div></div>`;
}
function wireHeat(key, fixed) {
  const st = S.ui[key];
  app.querySelectorAll(`[data-h]`).forEach((s) => (s.onchange = () => { st[s.dataset.h] = s.value; drawHeat(key, fixed); }));
  drawHeat(key, fixed);
}
function drawHeat(key, fixed) {
  const st = S.ui[key];
  const box = document.getElementById('heat-' + key);
  if (!box) return;
  const a = S.assets.maps[st.map];
  if (!a || !a.mini) { box.innerHTML = '<div class="muted">Harita görseli yükleniyor ya da bulunamadı.</div>'; return; }
  box.innerHTML = `<img src="${a.mini}" crossorigin="anonymous"><canvas></canvas>`;
  const img = box.querySelector('img'), cv = box.querySelector('canvas');
  img.onload = () => {
    const N = 600; cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    const who = fixed.player || st.player;
    const pts = [];
    S.st.matches.filter((m) => m.map === st.map).forEach((m) => m.kills.forEach((k) => {
      if (st.mode !== 'kills' && k.x != null && (!who || k.v === who)) pts.push([k.x, k.y, '255,92,122']);
      if (st.mode !== 'deaths' && k.kx != null && (!who || k.k === who)) pts.push([k.kx, k.ky, '79,227,181']);
    }));
    ctx.globalCompositeOperation = 'lighter';
    pts.forEach(([gx, gy, c]) => {
      const x = (gy * a.xm + a.xa) * N, y = (gx * a.ym + a.ya) * N;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
      g.addColorStop(0, `rgba(${c},.55)`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
    });
  };
}

// ---------- Kafa kafaya ----------
function vH2H() {
  const st = (S.ui.h2h = S.ui.h2h || { weapon: '', map: '', sel: null, all: false });
  const ps = (st.all ? allPlayers() : leaguePlayers());
  const weapons = Object.entries(S.st.weapons).sort((a, b) => b[1].kills - a[1].kills).map((x) => x[0]);
  const maps = Object.keys(S.st.maps).sort();
  const M = {};
  S.st.matches.filter((m) => !st.map || m.map === st.map).forEach((m) => {
    const team = {}; m.players.forEach((p) => (team[p.p] = p.team));
    m.kills.forEach((k) => {
      if (!k.k || team[k.k] === team[k.v]) return;
      if (st.weapon && k.w !== st.weapon) return;
      const key = k.k + '>' + k.v;
      M[key] = M[key] || { n: 0, w: {} };
      M[key].n++; M[key].w[k.w] = (M[key].w[k.w] || 0) + 1;
    });
  });
  const max = Math.max(1, ...Object.values(M).map((x) => x.n));
  const cell = (a, b) => {
    if (a === b) return '<td class="self"></td>';
    const x = M[a + '>' + b];
    const n = x ? x.n : 0;
    const alpha = n ? 0.12 + 0.75 * (n / max) : 0;
    const sel = st.sel === a + '>' + b ? 'sel' : '';
    return `<td class="${sel}" data-c="${a}>${b}" style="background:rgba(255,178,56,${alpha})">${n || '<span class="muted">·</span>'}</td>`;
  };
  let detail = '';
  if (st.sel) {
    const [a, b] = st.sel.split('>');
    const ab = M[a + '>' + b] || { n: 0, w: {} }, ba = M[b + '>' + a] || { n: 0, w: {} };
    const ws = [...new Set([...Object.keys(ab.w), ...Object.keys(ba.w)])].sort((x, y) => (ab.w[y] || 0) + (ba.w[y] || 0) - (ab.w[x] || 0) - (ba.w[x] || 0));
    detail = `<div class="card section"><h2>${esc(nm(a))} <span class="red">${ab.n}</span> – <span class="teal">${ba.n}</span> ${esc(nm(b))}</h2>
      <table><thead><tr><th class="l nosort">Silah</th><th class="nosort">${esc(nm(a))} → ${esc(nm(b))}</th><th class="nosort">${esc(nm(b))} → ${esc(nm(a))}</th></tr></thead>
      <tbody>${ws.map((w) => `<tr><td class="l">${weaponName(w)}</td><td>${ab.w[w] || 0}</td><td>${ba.w[w] || 0}</td></tr>`).join('')}</tbody></table></div>`;
  }
  app.innerHTML = `<h1>Kafa kafaya</h1>
    <p class="lead">Satırdaki oyuncu, sütundaki oyuncuyu kaç kez öldürdü. Bir hücreye dokun, ikisinin birbirine karşı silah dökümü açılsın.</p>
    <div class="filters">
      <select id="fw"><option value="">Tüm silahlar</option>${weapons.map((w) => `<option ${w === st.weapon ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select>
      <select id="fm"><option value="">Tüm haritalar</option>${maps.map((m) => `<option ${m === st.map ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <label class="chk"><input type="checkbox" id="fa" ${st.all ? 'checked' : ''}> Misafirleri de göster</label>
    </div>
    <div class="card scroll"><table class="matrix"><thead><tr><th class="nosort">Öldüren ↓ / Ölen →</th>${ps.map((p) => `<th class="nosort" title="${esc(p.name)}">${esc(p.name.slice(0, 9))}</th>`).join('')}<th class="nosort">Toplam</th></tr></thead>
    <tbody>${ps.map((a) => `<tr><th class="rowh nosort">${esc(a.name)}</th>${ps.map((b) => cell(a.puuid, b.puuid)).join('')}<td><b>${ps.reduce((s, b) => s + ((M[a.puuid + '>' + b.puuid] || {}).n || 0), 0)}</b></td></tr>`).join('')}</tbody></table></div>
    ${detail}`;
  document.getElementById('fw').onchange = (e) => { st.weapon = e.target.value; vH2H(); };
  document.getElementById('fm').onchange = (e) => { st.map = e.target.value; vH2H(); };
  document.getElementById('fa').onchange = (e) => { st.all = e.target.checked; vH2H(); };
  app.querySelectorAll('td[data-c]').forEach((td) => (td.onclick = () => { st.sel = td.dataset.c; vH2H(); }));
}

// ---------- Silahlar ----------
function vWeapons() {
  const st = (S.ui.wp = S.ui.wp || { player: '' });
  const rows = Object.entries(S.st.weapons).map(([w, x]) => {
    const topP = Object.entries(x.by).sort((a, b) => b[1] - a[1])[0];
    const mine = st.player ? (P(st.player).weapons[w] || 0) : null;
    return { w, kills: x.kills, share: x.share, top: topP ? topP[0] : null, topN: topP ? topP[1] : 0, mine, mineShare: st.player ? (100 * (mine || 0)) / Math.max(1, P(st.player).kills) : null };
  });
  const ps = leaguePlayers();
  const topW = rows.slice().sort((a, b) => b.kills - a.kills).slice(0, 8).map((r) => r.w);
  const cols = [
    { key: 'w', label: 'Silah', cls: 'l', fmt: (r) => weaponName(r.w) },
    { key: 'kills', label: 'Kill' },
    { key: 'share', label: 'Pay', fmt: (r) => `<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end">${pct(r.share)}<div class="bar"><span style="width:${r.share}%"></span></div></div>` },
    { key: 'topN', label: 'En çok kullanan', fmt: (r) => (r.top ? `${pLink(r.top)} <span class="muted">${r.topN}</span>` : '–') },
  ];
  if (st.player) cols.push({ key: 'mineShare', label: esc(nm(st.player)), fmt: (r) => `${r.mine || 0} <span class="muted">(${pct(r.mineShare)})</span>` });
  app.innerHTML = `<h1>Silahlar</h1>
    <div class="filters"><select id="wpp"><option value="">Oyuncu karşılaştır…</option>${allPlayers().map((p) => `<option value="${p.puuid}" ${st.player === p.puuid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    <div class="card tight">${table('wt', cols, rows, { sort: 'kills' })}</div>
    <h2 class="section">Oyuncu × silah (kill payı)</h2>
    <div class="card scroll"><table><thead><tr><th class="l nosort">Oyuncu</th>${topW.map((w) => `<th class="nosort">${esc(w)}</th>`).join('')}</tr></thead><tbody>
    ${ps.map((p) => `<tr><td class="l">${pLink(p.puuid)}</td>${topW.map((w) => { const k = p.weapons[w] || 0, s = (100 * k) / Math.max(1, p.kills); return `<td style="background:rgba(255,178,56,${(s / 100) * 1.4})">${k ? pct(s) : '<span class="muted">·</span>'}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div>`;
  document.getElementById('wpp').onchange = (e) => { st.player = e.target.value; vWeapons(); };
  wireTables(vWeapons);
}

// ---------- Haritalar ----------
function vMaps() {
  const maps = Object.entries(S.st.maps).sort((a, b) => b[1].games - a[1].games);
  const best = (map) => {
    let b = null;
    allPlayers().forEach((p) => { const x = p.maps[map]; if (x && x.g >= 1) { const acs = x.score / x.rounds; if (!b || acs > b.acs) b = { p: p.puuid, acs }; } });
    return b;
  };
  app.innerHTML = `<h1>Haritalar</h1>
    <div class="grid g3">${maps.map(([m, x]) => {
      const a = S.assets.maps[m], b = best(m);
      return `<div class="card tight"><div style="height:90px;background:#1c2b39 url('${a ? a.splash : ''}') center/cover"></div>
      <div style="padding:12px 14px"><h2 style="margin:0">${esc(m)}</h2>
      <div class="muted">${x.games} maç, ${x.kills} kill</div>
      ${b ? `<div style="margin-top:8px">En iyi: ${pLink(b.p)} <span class="muted">${f0(b.acs)} ACS</span></div>` : ''}</div></div>`;
    }).join('')}</div>
    <h2 class="section">Isı haritası</h2>
    ${heatBlock('mh', {})}`;
  wireHeat('mh', {});
}

// ---------- Maçlar ----------
function matchCard(m, focus) {
  if (!m) return '';
  const a = S.assets.maps[m.map];
  const tids = Object.keys(m.teams);
  const score = tids.map((t) => `<span class="team-${t}">${m.teams[t].rw}</span>`).join(' : ');
  const me = focus && m.players.find((p) => p.p === focus);
  const res = (me && m.completed ? (m._winner === me.team ? '<span class="up">Galibiyet</span>' : '<span class="down">Mağlubiyet</span>') : !m.completed ? '<span class="muted">Yarıda kaldı</span>' : '') + (m.ff ? ' <span class="tag">FF</span>' : '');
  return `<a class="card tight mcard" href="#/mac/${m.id}">
    <div class="mimg" style="background-image:url('${a ? a.splash : ''}')"><span>${esc(m.map)}</span></div>
    <div class="mbody"><div style="display:flex;justify-content:space-between"><span class="score">${score}</span><span>${res}</span></div>
    <div class="muted">${dateTR(m.start)}, ${timeTR(m.start)}, ${m.players.length / 2}v${m.players.length / 2}</div>
    ${me ? `<div>${me.ag ? esc(me.ag) + ', ' : ''}${me.k}/${me.d}/${me.a}, etki ${f2(m._impact[me.p])}</div>` : ''}
    ${m._throw ? `<div class="sell">Satan: <b>${esc(nm(m._throw.p))}</b></div>` : ''}</div></a>`;
}
function vMatches() {
  const nights = Object.keys(S.st.nights).sort().reverse();
  app.innerHTML = `<h1>Maçlar</h1>` + nights.map((n) => `<h3 class="section">${esc(nightTR(n))}</h3><div class="grid g2">${S.st.nights[n].slice().reverse().map((m) => matchCard(m)).join('')}</div>`).join('');
}
function vMatch(id) {
  const m = matchById(id);
  if (!m) return (app.innerHTML = '<div class="loading">Maç bulunamadı.</div>');
  const st = (S.ui['m' + id] = S.ui['m' + id] || { round: null });
  const tids = Object.keys(m.teams).sort((a) => (a === 'Red' ? -1 : 1));
  const board = (t) => {
    const rows = m.players.filter((p) => p.team === t).map((p) => ({ ...p, acs: m._acs[p.p], e: m._extra[p.p], hsp: (100 * p.hs) / Math.max(1, p.hs + p.bs + p.ls), dl: m._ratingDelta ? m._ratingDelta[p.p] : null }));
    return `<div class="card tight"><div style="padding:12px 16px 0"><h2 class="team-${t}">${t === 'Red' ? 'Kırmızı' : 'Mavi'} ${m.teams[t].rw} ${m.completed ? (m._winner === t ? '<span class="tag">kazandı</span>' : '') : ''} <span class="tag">maç öncesi şans %${Math.round((m._winProb[t] || 0.5) * 100)}</span></h2></div>
      ${table('mb' + t + id, [
        { key: 'n', label: 'Oyuncu', cls: 'l', fmt: (r) => `<span class="pname">${agentImg(r.ag)}<a href="#/oyuncu/${r.p}">${esc(r.n)}</a></span>` },
        { key: 'imp', label: 'Etki', val: (r) => m._impact[r.p], fmt: (r) => f2(m._impact[r.p]) },
        { key: 'acs', label: 'ACS', opt: true, fmt: (r) => f0(r.acs) },
        { key: 'k', label: 'K' }, { key: 'd', label: 'D' }, { key: 'a', label: 'A' },
        { key: 'dd', label: 'Hasar', opt: true }, { key: 'hsp', label: 'HS%', opt: true, fmt: (r) => pct(r.hsp) },
        { key: 'fb', label: 'İK', opt: true, title: 'İlk kan', val: (r) => r.e.fb, fmt: (r) => r.e.fb },
        { key: 'dl', label: 'Puan', fmt: (r) => (r.dl == null ? '–' : `<span class="${r.dl >= 0 ? 'up' : 'down'}">${r.dl >= 0 ? '+' : ''}${f1(r.dl)}</span>`) },
      ], rows, { sort: 'imp' })}</div>`;
  };
  const team = {}; m.players.forEach((p) => (team[p.p] = p.team));
  const feedRounds = st.round == null ? [...Array(m._roundsTotal).keys()] : [st.round];
  const feed = feedRounds.map((r) => {
    const ks = m.kills.filter((k) => k.r === r).sort((a, b) => a.t - b.t);
    const rd = m.rounds[r] || {};
    return `<div style="margin-top:10px"><b>Raund ${r + 1}</b> <span class="muted">${rd.w ? (rd.w === 'Red' ? 'Kırmızı kazandı' : 'Mavi kazandı') : ''}${rd.res ? ', ' + esc(rd.res) : ''}</span></div>` +
      ks.map((k) => `<div><span class="w">${(k.t / 1000).toFixed(0)}sn</span><span class="team-${team[k.k]}">${esc(nm(k.k))}</span><span class="muted">[${esc(k.w)}]${k._ambush ? ' 🐀' : ''}</span><span class="team-${team[k.v]}">${esc(nm(k.v))}</span></div>`).join('');
  }).join('');
  app.innerHTML = `<div class="hero"><div><h1 style="margin:0">${esc(m.map)}</h1><div class="muted">${dateTR(m.start)}, ${timeTR(m.start)}${m.ff ? ', FF ile bitti (oynanan raund oranında sayılır)' : m.completed ? '' : ', yarıda kaldı (raund oranında sayılır)'}</div></div>
      <div style="margin-left:auto" class="big">${tids.map((t) => `<span class="team-${t}">${m.teams[t].rw}</span>`).join(' : ')}</div></div>
    <div class="board" style="grid-template-columns:1fr;margin-bottom:18px"><div class="verdicts" style="border-top:none">${verdictHtml(m)}</div></div>
    <div class="grid g2">${tids.map(board).join('')}</div>
    <div class="card section"><h3>Raundlar. Birine dokun, o raundun kill akışı açılsın.</h3>
      <div class="roundstrip">${[...Array(m._roundsTotal).keys()].map((r) => `<i class="${(m.rounds[r] || {}).w || ''} ${st.round === r ? 'sel' : ''}" data-r="${r}">${r + 1}</i>`).join('')}</div>
      <div class="feed">${feed}</div></div>`;
  app.querySelectorAll('.roundstrip i').forEach((i) => (i.onclick = () => { const r = +i.dataset.r; st.round = st.round === r ? null : r; vMatch(id); }));
  wireTables(() => vMatch(id));
}

// ---------- Takım kurucu ----------
const pow = (id) => V.strength(S.st.players, id);
function teamList(ids, cls) {
  return `<ul>${ids.map((id) => `<li>${pLink(id, true)} <span class="num muted" title="Güç (etkiden)">${f0(pow(id))}</span></li>`).join('')}</ul>`;
}
function probBar(prob) {
  return `<div class="probbar"><span style="width:${prob * 100}%"></span><span style="width:${(1 - prob) * 100}%"></span></div>
    <div class="muted" style="margin-top:6px">Kazanma şansı: A %${Math.round(prob * 100)}, B %${Math.round((1 - prob) * 100)}</div>`;
}

function vTeams() {
  const lastM = S.st.matches[S.st.matches.length - 1];
  const st = (S.ui.tb = S.ui.tb || { sel: new Set(lastM.players.map((p) => p.p)), pick: 0, mode: 'auto', rules: [], draft: null });
  const ps = allPlayers().slice().sort((a, b) => pow(b.puuid) - pow(a.puuid));
  const sel = ps.map((p) => p.puuid).filter((id) => st.sel.has(id));
  const opts = (chosen) => sel.map((id) => `<option value="${id}" ${id === chosen ? 'selected' : ''}>${esc(nm(id))}</option>`).join('');

  const picker = `<div class="card"><div class="picker">${ps.map((p) => `<label class="${st.sel.has(p.puuid) ? 'on' : ''}"><input type="checkbox" data-p="${p.puuid}" ${st.sel.has(p.puuid) ? 'checked' : ''}>${esc(p.name)} <span class="num muted">${f0(pow(p.puuid))}</span></label>`).join('')}</div>
    <div class="muted" style="margin-top:10px">${st.sel.size} oyuncu seçili. Yanındaki sayı oyuncunun gücü: maç başına etkisinden hesaplanır, 1000 lobi ortalaması.</div></div>`;

  const modeBar = `<div class="filters section">
    <button data-mode="auto" class="${st.mode === 'auto' ? 'primary' : ''}">Otomatik dengele</button>
    <button data-mode="draft" class="${st.mode === 'draft' ? 'primary' : ''}">Kaptan seçimi</button></div>`;

  let body = '';
  if (st.mode === 'auto') {
    const rules = st.rules.filter((r) => st.sel.has(r.a) && st.sel.has(r.b));
    const res = sel.length >= 2 ? V.balance(sel, S.st.players, S.st.pairs, 5, rules) : [];
    const r = res[st.pick] || res[0];
    body = `<div class="card">
        <h3>Kurallar</h3>
        <div class="filters" style="margin-bottom:8px">
          <select id="ra">${opts(st.ra)}</select>
          <select id="rt"><option value="together">aynı takımda olsun</option><option value="apart">ayrı takımlarda olsun</option></select>
          <select id="rb">${opts(st.rb || sel[1])}</select>
          <button id="radd">Kural ekle</button>
        </div>
        ${st.rules.length ? st.rules.map((x, i) => `<span class="badge">${esc(nm(x.a))} ve ${esc(nm(x.b))} ${x.type === 'together' ? 'aynı takımda' : 'ayrı takımlarda'} <button data-rdel="${i}" style="padding:0 6px;border:none;background:none" aria-label="Kuralı sil">✕</button></span>`).join('') : '<span class="muted">Kural yok. İstersen iki kişiyi aynı ya da ayrı takıma zorlayabilirsin.</span>'}
      </div>
      ${r ? `<div class="card section">
        <div class="filters">${res.map((x, i) => `<button data-i="${i}" class="${i === st.pick ? 'primary' : ''}">Seçenek ${i + 1}: %${Math.round(x.prob * 100)}-%${Math.round((1 - x.prob) * 100)}</button>`).join('')}</div>
        <div class="split"><div><h2 class="team-Red">Takım A</h2>${teamList(r.A)}<div class="muted">Ortalama güç ${f0(r.ra)}</div></div>
          <div class="vs">VS</div>
          <div><h2 class="team-Blue">Takım B</h2>${teamList(r.B)}<div class="muted">Ortalama güç ${f0(r.rb)}</div></div></div>
        ${probBar(r.prob)}
      </div>` : `<div class="card section muted">${sel.length < 2 ? 'En az 2 oyuncu seç.' : 'Bu kurallarla takım kurulamıyor. Bir kuralı sil.'}</div>`}`;
  } else {
    const d = st.draft;
    if (!d) {
      body = `<div class="card"><h3>Kaptanları seç</h3>
        <div class="filters"><span class="team-Red" style="font-weight:700">Kaptan A</span><select id="ca">${opts(sel[0])}</select>
        <span class="team-Blue" style="font-weight:700">Kaptan B</span><select id="cb">${opts(sel[1])}</select>
        <button class="primary" id="dstart">Seçimi başlat</button></div>
        <p class="muted">Sıra yılan düzeninde gider: A, B, B, A, A, B... Her sırada site iki öneri verir: en güçlü oyuncu ve maçı en dengeli tutacak oyuncu.</p></div>`;
    } else {
      const pool = sel.filter((id) => !d.A.includes(id) && !d.B.includes(id));
      const total = d.A.length + d.B.length + pool.length;
      const order = []; // yılan sırası
      for (let i = 0; order.length < total - 2; i++) order.push([0, 1, 1, 0][i % 4] === 0 ? 'A' : 'B');
      const turn = pool.length ? order[d.A.length + d.B.length - 2] : null;
      const sizeA = Math.ceil(total / 2), sizeB = Math.floor(total / 2);
      // Dengeyi koruyan öneri: adayı ekledikten sonra kalanların en iyi dağılımıyla ulaşılabilecek en dengeli sonuç
      const bestFinish = (A, B, rest) => {
        let best = 1;
        const needA = Math.max(0, sizeA - A.length);
        const rec = (i, a, b) => {
          if (a.length === needA) {
            const fa = [...A, ...a], fb = [...B, ...b, ...rest.slice(i)];
            if (fb.length > sizeB + 1) return;
            best = Math.min(best, Math.abs(V.matchup(S.st.players, S.st.pairs, fa, fb).prob - 0.5));
            return;
          }
          if (i >= rest.length) return;
          rec(i + 1, [...a, rest[i]], b);
          rec(i + 1, a, [...b, rest[i]]);
        };
        rec(0, [], []);
        return best;
      };
      let strongest = null, fairest = null;
      if (turn) {
        strongest = pool[0];
        let bf = 2;
        pool.forEach((c) => {
          const A = turn === 'A' ? [...d.A, c] : d.A, B = turn === 'B' ? [...d.B, c] : d.B;
          const v = bestFinish(A, B, pool.filter((x) => x !== c));
          if (v < bf) { bf = v; fairest = c; }
        });
      }
      const mu = V.matchup(S.st.players, S.st.pairs, d.A, d.B);
      body = `<div class="card">
        <div class="split"><div><h2 class="team-Red">Takım A</h2>${teamList(d.A)}</div><div class="vs">VS</div><div><h2 class="team-Blue">Takım B</h2>${teamList(d.B)}</div></div>
        ${probBar(mu.prob)}
      </div>
      ${turn ? `<div class="card section"><h2 class="team-${turn === 'A' ? 'Red' : 'Blue'}">Sıra: Kaptan ${turn} (${esc(nm(d[turn][0]))})</h2>
        <p class="muted">En güçlü kalan: <b>${esc(nm(strongest))}</b>. Maçı dengeli tutmak için öneri: <b>${esc(nm(fairest))}</b>.</p>
        <div class="picker">${pool.map((id) => `<label data-dpick="${id}" class="${id === fairest ? 'on' : ''}">${esc(nm(id))} <span class="num muted">${f0(pow(id))}</span></label>`).join('')}</div>
      </div>` : `<div class="card section"><h2>Seçim tamamlandı</h2></div>`}
      <div class="filters section"><button id="dundo">Geri al</button><button id="dreset">Baştan başla</button></div>`;
    }
  }

  app.innerHTML = `<h1>Takım kur</h1>
    <p class="lead">Bu gece gelenleri seç. Takımlar oyuncuların maç başına gerçek gücüne ve kimin kiminle daha çok kazandığına göre dengelenir.</p>
    ${picker}${modeBar}${body}`;

  const rerender = () => vTeams();
  app.querySelectorAll('[data-p]').forEach((c) => (c.onchange = () => { c.checked ? st.sel.add(c.dataset.p) : st.sel.delete(c.dataset.p); st.pick = 0; st.draft = null; rerender(); }));
  app.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { st.pick = +b.dataset.i; rerender(); }));
  app.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { st.mode = b.dataset.mode; rerender(); }));
  app.querySelectorAll('[data-rdel]').forEach((b) => (b.onclick = () => { st.rules.splice(+b.dataset.rdel, 1); st.pick = 0; rerender(); }));
  const q = (id) => document.getElementById(id);
  if (q('radd')) q('radd').onclick = () => {
    const a = q('ra').value, b = q('rb').value, type = q('rt').value;
    st.ra = a; st.rb = b;
    if (a && b && a !== b) { st.rules.push({ a, b, type }); st.pick = 0; }
    rerender();
  };
  if (q('dstart')) q('dstart').onclick = () => {
    const a = q('ca').value, b = q('cb').value;
    if (a === b) return;
    st.draft = { A: [a], B: [b], log: [] };
    rerender();
  };
  app.querySelectorAll('[data-dpick]').forEach((l) => (l.onclick = () => {
    const d = st.draft; const id = l.dataset.dpick;
    const total = sel.length, order = [];
    for (let i = 0; order.length < total - 2; i++) order.push([0, 1, 1, 0][i % 4] === 0 ? 'A' : 'B');
    const turn = order[d.A.length + d.B.length - 2];
    d[turn].push(id); d.log.push(turn);
    rerender();
  }));
  if (q('dundo')) q('dundo').onclick = () => { const d = st.draft; const t = d.log.pop(); if (t) d[t].pop(); rerender(); };
  if (q('dreset')) q('dreset').onclick = () => { st.draft = null; rerender(); };
}

// ---------- Rekorlar ----------
function vRecords() {
  const R = S.st.records;
  const top = (type, label, fmt = f0, n = 5) => {
    let list = R.filter((r) => r.type === type && r.val > 0).sort((a, b) => b.val - a.val);
    if (type === 'streak') { const seen = new Set(); list = list.filter((r) => !seen.has(r.p) && seen.add(r.p)); }
    list = list.slice(0, n);
    return `<div class="card"><h3>${label}</h3>${list.map((r, i) => { const m = matchById(r.m); return `<div class="rec-row"><span><span class="rank r${i + 1}" style="font-size:16px;width:24px">${i + 1}</span> ${pLink(r.p)}</span><span><b>${fmt(r.val)}</b> <a class="muted" href="#/mac/${r.m}">${esc(m.map)}, ${dateTR(m.start)}</a></span></div>`; }).join('') || '<span class="muted">–</span>'}</div>`;
  };
  const L = leaguePlayers();
  const career = (label, fn, fmt = f0) => {
    const list = L.slice().sort((a, b) => fn(b) - fn(a)).slice(0, 5);
    return `<div class="card"><h3>${label}</h3>${list.map((p, i) => `<div class="rec-row"><span><span class="rank r${i + 1}" style="font-size:16px;width:24px">${i + 1}</span> ${pLink(p.puuid)}</span><b>${fmt(fn(p))}</b></div>`).join('')}</div>`;
  };
  app.innerHTML = `<h1>Rekorlar</h1>
    <h2 class="section">Tek maçta</h2>
    <div class="grid g3">${top('kills', 'En çok kill')}${top('acs', 'En yüksek ACS')}${top('dmg', 'En çok hasar')}${top('fb', 'En çok ilk kan')}${top('deaths', 'En çok ölüm (utanç köşesi)')}${top('streak', 'En uzun galibiyet serisi')}</div>
    <h2 class="section">Kariyer</h2>
    <div class="grid g3">
      ${career('Toplam kill', (p) => p.kills)}${career('Ace', (p) => p.aces)}${career('Clutch kazanılan', (p) => p.clutchWon)}
      ${career('Fare (pusu kill)', (p) => p.ambush || 0)}${career('Takımı sırtlayan', (p) => p.carries || 0)}${career('Maçı satan', (p) => p.throws || 0)}${career('İlk kan', (p) => p.fb)}
      ${career('Eko kill', (p) => p.ecoKills)}${career('Spike kuran', (p) => p.plants)}
      ${career('Operator kill', (p) => p.weapons.Operator || 0)}${career('Sheriff kill', (p) => p.weapons.Sheriff || 0)}${career('Bıçak kill', (p) => p.weapons['Bıçak'] || 0)}
    </div>`;
}

init();
