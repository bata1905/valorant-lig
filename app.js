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
  return `<svg class="spark" width="${w}" height="${h}"><polyline fill="none" stroke="${up ? '#18e5b0' : '#ff4655'}" stroke-width="1.8" points="${xy}"/></svg>`;
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
  const head = cols.map((c) => `<th class="${c.cls || ''} ${c.nosort ? 'nosort' : ''}" data-k="${c.key}" title="${esc(c.title || '')}">${c.label}${c.key === st.key ? (st.dir === -1 ? ' ▾' : ' ▴') : ''}</th>`).join('');
  const body = sorted.map((r, i) => `<tr class="${opt.rowCls ? opt.rowCls(r) : ''}" ${opt.href ? `data-href="${opt.href(r)}"` : ''}>${cols.map((c) => `<td class="${c.cls || ''}">${c.fmt ? c.fmt(r, i) : esc(val(r, c))}</td>`).join('')}</tr>`).join('');
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
  if (!S.st.matches.length) { app.innerHTML = '<div class="loading">Henüz maç yok.</div>'; return; }
  const upd = S.data.meta && S.data.meta.updated;
  document.getElementById('foot').innerHTML = `${S.st.matches.length} maç · son güncelleme ${upd ? new Date(upd).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '–'} · Riot Games ile bağlantılı değildir`;
  window.addEventListener('hashchange', route);
  route();
  loadAssets().then(route);
}

// ---------- yönlendirme ----------
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [r, arg] = h.split('/');
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === (r === 'oyuncu' || r === 'mac' ? '' : r || '')));
  const views = { '': vHome, kafa: vH2H, silahlar: vWeapons, haritalar: vMaps, maclar: vMatches, mac: vMatch, oyuncu: vPlayer, takim: vTeams, rekorlar: vRecords };
  (views[r] || vHome)(decodeURIComponent(arg || ''));
}

// ---------- Sıralama ----------
function vHome() {
  const nights = Object.keys(S.st.nights).sort();
  const last = nights[nights.length - 1];
  const lm = S.st.nights[last] || [];
  // Gecenin özeti
  const agg = {};
  lm.forEach((m) => m.players.forEach((p) => {
    const a = (agg[p.p] = agg[p.p] || { k: 0, d: 0, sc: 0, r: 0, g: 0, w: 0, delta: 0 });
    a.k += p.k; a.d += p.d; a.sc += p.sc; a.r += m._roundsTotal; a.g++;
    if (m.completed && m._winner === p.team) a.w++;
    if (m._ratingDelta && m._ratingDelta[p.p]) a.delta += m._ratingDelta[p.p];
  }));
  const ranked = Object.entries(agg).map(([id, a]) => ({ id, ...a, acs: a.sc / a.r })).sort((a, b) => b.acs - a.acs);
  const mvp = ranked[0], low = ranked[ranked.length - 1];
  const climber = ranked.slice().sort((a, b) => b.delta - a.delta)[0];
  const night = last ? `<div class="night">
      <h3>Son gece · ${esc(nightTR(last))} · ${lm.length} maç</h3>
      <div class="grid g4">
        <div class="stat"><span class="l">Gecenin MVP'si</span><span class="v">${pLink(mvp.id)}</span><span class="muted">${f0(mvp.acs)} ACS · ${mvp.k}/${mvp.d}</span></div>
        <div class="stat"><span class="l">En çok puan kazanan</span><span class="v">${pLink(climber.id)}</span><span class="up">+${f1(climber.delta)} puan</span></div>
        <div class="stat"><span class="l">Haritalar</span><span class="v" style="font-size:18px">${lm.map((m) => esc(m.map)).join(', ')}</span></div>
        <div class="stat"><span class="l">Zor gece geçiren</span><span class="v">${pLink(low.id)}</span><span class="muted">${f0(low.acs)} ACS · ${low.k}/${low.d}</span></div>
      </div></div>` : '';

  const rows = allPlayers().filter((p) => p.games > 0);
  const lp = leaguePlayers();
  const rankOf = {}; lp.forEach((p, i) => (rankOf[p.puuid] = i + 1));
  const cols = [
    { key: 'rank', label: '#', val: (p) => (rankOf[p.puuid] ? -rankOf[p.puuid] : -999), fmt: (p) => `<span class="rank r${rankOf[p.puuid] || ''}">${rankOf[p.puuid] || '–'}</span>` },
    { key: 'name', label: 'Oyuncu', cls: 'l', val: (p) => p.name, fmt: (p) => pLink(p.puuid, true) + (p.league ? '' : ' <span class="tag">misafir</span>') },
    { key: 'rating', label: 'Puan', fmt: (p) => { const h = p.ratingHist[p.ratingHist.length - 1]; return `<span class="rating">${f0(p.rating)}</span>${h ? `<span class="delta ${h.d >= 0 ? 'up' : 'down'}">${h.d >= 0 ? '+' : ''}${f0(h.d)}</span>` : ''}`; } },
    { key: 'trend', label: 'Gidişat', nosort: true, fmt: (p) => spark(p.ratingHist) },
    { key: 'games', label: 'Maç' },
    { key: 'wl', label: 'G-M', val: (p) => p.wins - p.losses, fmt: (p) => `${p.wins}-${p.losses}` },
    { key: 'winPct', label: 'Kazanma', fmt: (p) => pct(p.winPct) },
    { key: 'form', label: 'Form', nosort: true, fmt: (p) => formHtml(p.form) },
    { key: 'kd', label: 'K/D', fmt: (p) => f2(p.kd) },
    { key: 'impact', label: 'Etki', title: 'Maç başına ortalama performans (1.00 = lobi ortalaması)', fmt: (p) => f2(p.impact) },
    { key: 'kpr', label: 'KPR', title: 'Raund başına kill', fmt: (p) => f2(p.kpr) },
    { key: 'acs', label: 'ACS', title: 'Raund başına ortalama skor', fmt: (p) => f0(p.acs) },
    { key: 'adr', label: 'ADR', title: 'Raund başına hasar', fmt: (p) => f0(p.adr) },
    { key: 'hsPct', label: 'HS%', fmt: (p) => pct(p.hsPct) },
    { key: 'kast', label: 'KAST', title: 'Kill, asist, hayatta kalma veya trade olunan raund yüzdesi', fmt: (p) => pct(p.kast) },
    { key: 'fb', label: 'İlk Kan' },
    { key: 'clutchWon', label: 'Clutch' },
  ];
  app.innerHTML = `${night}
    <h1>Lig Sıralaması</h1>
    <p class="muted">Puan bireysel performansa göre hesaplanır: her maçta lobinin ortalamasına göre kill (en ağırlıklı; güçlü oyuncuyu öldürmek daha değerli, zayıf oyuncuyu öldürmek daha az), hasar, KAST ve ilk kan/ilk ölüm farkına bakılır. Ortalamanın üstünde oynayan puan kazanır. Maçı kazanmak sadece küçük bir bonus (±4) verir, yani kötü takıma düşmek seni fazla cezalandırmaz. Yarıda kalan maçlar oynanan raund kadar sayılır. Sıralamaya girmek için en az ${S.cfg.league_min_games || 3} maç gerekir.</p>
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
      <div class="muted">${rank ? rank + '. sırada' : 'Misafir oyuncu'} · ${p.games} maç · ${formHtml(p.form)}</div></div>
      <div style="margin-left:auto;text-align:right"><div class="big">${f0(p.rating)}</div><div class="muted">lig puanı</div></div>
    </div>
    <div class="card" style="margin-bottom:16px"><h3>Puan gidişatı</h3>${ratingChart(p)}</div>
    <div class="grid g4">
      ${[['G-M', `${p.wins}-${p.losses}`], ['Kazanma', pct(p.winPct)], ['K/D', f2(p.kd)], ['ACS', f0(p.acs)], ['ADR', f0(p.adr)], ['HS%', pct(p.hsPct)], ['KAST', pct(p.kast)], ['Kill/Ölüm/Asist', `${p.kills}/${p.deaths}/${p.assists}`], ['İlk kan / İlk ölüm', `${p.fb} / ${p.fd}`], ['Clutch', `${p.clutchWon}/${p.clutchAtt}`], ['3K · 4K · Ace', `${p.k3} · ${p.k4} · ${p.aces}`], ['Eko kill', p.ecoKills]].map(([l, v]) => `<div class="card stat"><span class="l">${l}</span><span class="v">${v}</span></div>`).join('')}
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
    <line x1="${pad}" x2="${W - pad}" y1="${base}" y2="${base}" stroke="#2a3b4b" stroke-dasharray="4 4"/>
    <text x="${pad}" y="${base - 4}" fill="#8b9aa8" font-size="10">${V.START_RATING}</text>
    <polyline fill="none" stroke="#ff4655" stroke-width="2.5" points="${line}"/>
    ${pts.map((x, i) => (i ? `<circle cx="${X(i)}" cy="${Y(x.r)}" r="3.5" fill="${x.d >= 0 ? '#18e5b0' : '#ff4655'}"><title>${dateTR(x.date)} · ${f0(x.r)} (${x.d >= 0 ? '+' : ''}${f1(x.d)})</title></circle>` : '')).join('')}
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
  add(p.aces > 0, `🃏 Ace × ${p.aces}`);
  add(p.bestWinStreak >= 3, `🔥 ${p.bestWinStreak} maçlık galibiyet serisi`);
  add(p.streak <= -3, `🥶 ${-p.streak} maçtır kazanamıyor`);
  return out;
}

function weaponName(w) {
  const a = S.assets.weapons[w];
  return a && a.icon ? `<span class="pname"><img src="${a.icon}" style="width:56px;height:20px;object-fit:contain;background:none">${esc(w)}</span>` : esc(w);
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
    <div class="legend"><span><i style="background:#18e5b0"></i>Kill alınan pozisyon</span><span><i style="background:#ff4655"></i>Ölünen yer</span></div></div>`;
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
      if (st.mode !== 'kills' && k.x != null && (!who || k.v === who)) pts.push([k.x, k.y, '255,70,85']);
      if (st.mode !== 'deaths' && k.kx != null && (!who || k.k === who)) pts.push([k.kx, k.ky, '24,229,176']);
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
    return `<td class="${sel}" data-c="${a}>${b}" style="background:rgba(255,70,85,${alpha})">${n || '<span class="muted">·</span>'}</td>`;
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
  app.innerHTML = `<h1>Kafa Kafaya</h1>
    <p class="muted">Satırdaki oyuncunun sütundaki oyuncuyu kaç kez öldürdüğü. Bir hücreye tıklayınca iki oyuncunun birbirine karşı silah dökümü açılır.</p>
    <div class="filters">
      <select id="fw"><option value="">Tüm silahlar</option>${weapons.map((w) => `<option ${w === st.weapon ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select>
      <select id="fm"><option value="">Tüm haritalar</option>${maps.map((m) => `<option ${m === st.map ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <label class="muted"><input type="checkbox" id="fa" ${st.all ? 'checked' : ''}> Misafirleri de göster</label>
    </div>
    <div class="card scroll"><table class="matrix"><thead><tr><th class="nosort">Öldüren ↓ / Ölen →</th>${ps.map((p) => `<th class="nosort" title="${esc(p.name)}">${esc(p.name.slice(0, 9))}</th>`).join('')}<th class="nosort">Toplam</th></tr></thead>
    <tbody>${ps.map((a) => `<tr><th class="l nosort" style="text-align:left">${esc(a.name)}</th>${ps.map((b) => cell(a.puuid, b.puuid)).join('')}<td><b>${ps.reduce((s, b) => s + ((M[a.puuid + '>' + b.puuid] || {}).n || 0), 0)}</b></td></tr>`).join('')}</tbody></table></div>
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
    ${ps.map((p) => `<tr><td class="l">${pLink(p.puuid)}</td>${topW.map((w) => { const k = p.weapons[w] || 0, s = (100 * k) / Math.max(1, p.kills); return `<td style="background:rgba(255,70,85,${(s / 100) * 1.4})">${k ? pct(s) : '<span class="muted">·</span>'}</td>`; }).join('')}</tr>`).join('')}
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
      <div class="muted">${x.games} maç · ${x.kills} kill</div>
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
  const res = me && m.completed ? (m._winner === me.team ? '<span class="up">Galibiyet</span>' : '<span class="down">Mağlubiyet</span>') : !m.completed ? '<span class="muted">Yarıda kaldı</span>' : '';
  return `<a class="card tight mcard" href="#/mac/${m.id}">
    <div class="mimg" style="background-image:url('${a ? a.splash : ''}')"><span>${esc(m.map)}</span></div>
    <div class="mbody"><div style="display:flex;justify-content:space-between"><span class="score">${score}</span><span>${res}</span></div>
    <div class="muted">${dateTR(m.start)} ${timeTR(m.start)} · ${m.players.length / 2}v${m.players.length / 2}</div>
    ${me ? `<div>${me.ag ? esc(me.ag) + ' · ' : ''}${me.k}/${me.d}/${me.a} · ${f0(m._acs[me.p])} ACS</div>` : ''}</div></a>`;
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
    return `<div class="card tight"><div style="padding:12px 16px 0"><h2 class="team-${t}">${t === 'Red' ? 'Kırmızı' : 'Mavi'} · ${m.teams[t].rw} ${m.completed ? (m._winner === t ? '<span class="tag">KAZANDI</span>' : '') : ''}</h2></div>
      ${table('mb' + t + id, [
        { key: 'n', label: 'Oyuncu', cls: 'l', fmt: (r) => `<span class="pname">${agentImg(r.ag)}<a href="#/oyuncu/${r.p}">${esc(r.n)}</a></span>` },
        { key: 'acs', label: 'ACS', fmt: (r) => f0(r.acs) },
        { key: 'k', label: 'K' }, { key: 'd', label: 'D' }, { key: 'a', label: 'A' },
        { key: 'dd', label: 'Hasar' }, { key: 'hsp', label: 'HS%', fmt: (r) => pct(r.hsp) },
        { key: 'fb', label: 'İK', val: (r) => r.e.fb, fmt: (r) => r.e.fb },
        { key: 'dl', label: 'Puan', fmt: (r) => (r.dl == null ? '–' : `<span class="${r.dl >= 0 ? 'up' : 'down'}">${r.dl >= 0 ? '+' : ''}${f1(r.dl)}</span>`) },
      ], rows, { sort: 'acs' })}</div>`;
  };
  const team = {}; m.players.forEach((p) => (team[p.p] = p.team));
  const feedRounds = st.round == null ? [...Array(m._roundsTotal).keys()] : [st.round];
  const feed = feedRounds.map((r) => {
    const ks = m.kills.filter((k) => k.r === r).sort((a, b) => a.t - b.t);
    const rd = m.rounds[r] || {};
    return `<div style="margin-top:10px"><b>Raund ${r + 1}</b> <span class="muted">· ${rd.w ? (rd.w === 'Red' ? 'Kırmızı' : 'Mavi') : ''} ${esc(rd.res || '')}</span></div>` +
      ks.map((k) => `<div><span class="w">${(k.t / 1000).toFixed(0)}sn</span><span class="team-${team[k.k]}">${esc(nm(k.k))}</span><span class="muted">[${esc(k.w)}]</span><span class="team-${team[k.v]}">${esc(nm(k.v))}</span></div>`).join('');
  }).join('');
  app.innerHTML = `<div class="hero"><div><h1 style="margin:0">${esc(m.map)}</h1><div class="muted">${dateTR(m.start)} ${timeTR(m.start)} · ${m.completed ? 'Tamamlandı' : 'Yarıda kaldı (puanı etkilemez)'}</div></div>
      <div style="margin-left:auto" class="big">${tids.map((t) => `<span class="team-${t}">${m.teams[t].rw}</span>`).join(' : ')}</div></div>
    <div class="grid g2">${tids.map(board).join('')}</div>
    <div class="card section"><h3>Raundlar (tıkla: o raundun kill akışı)</h3>
      <div class="roundstrip">${[...Array(m._roundsTotal).keys()].map((r) => `<i class="${(m.rounds[r] || {}).w || ''} ${st.round === r ? 'sel' : ''}" data-r="${r}">${r + 1}</i>`).join('')}</div>
      <div class="feed">${feed}</div></div>`;
  app.querySelectorAll('.roundstrip i').forEach((i) => (i.onclick = () => { const r = +i.dataset.r; st.round = st.round === r ? null : r; vMatch(id); }));
  wireTables(() => vMatch(id));
}

// ---------- Takım kurucu ----------
function vTeams() {
  // Varsayılan seçim: son maçta oynayanlar
  const lastM = S.st.matches[S.st.matches.length - 1];
  const st = (S.ui.tb = S.ui.tb || { sel: new Set(lastM.players.map((p) => p.p)), res: null, pick: 0 });
  const ps = allPlayers();
  const res = st.sel.size >= 2 ? V.balance([...st.sel], S.st.players, S.st.pairs, 5) : [];
  const r = res[st.pick] || res[0];
  const li = (id) => `<li>${pLink(id, true)} <span class="muted">${f0(P(id).rating)}</span></li>`;
  app.innerHTML = `<h1>Takım Kur</h1>
    <p class="muted">Bu gece kimler var? Seç, sistem lig puanlarına ve kimin kiminle birlikte daha çok kazandığına bakarak en dengeli takımları önersin.</p>
    <div class="card"><div class="picker">${ps.map((p) => `<label class="${st.sel.has(p.puuid) ? 'on' : ''}"><input type="checkbox" data-p="${p.puuid}" ${st.sel.has(p.puuid) ? 'checked' : ''}>${esc(p.name)} <span class="muted">${f0(p.rating)}</span></label>`).join('')}</div>
    <div class="muted" style="margin-top:10px">${st.sel.size} oyuncu seçili</div></div>
    ${r ? `<div class="card section">
      <div class="filters">${res.map((x, i) => `<button data-i="${i}" class="${i === st.pick ? 'primary' : ''}">Seçenek ${i + 1} · %${Math.round(x.prob * 100)}-%${Math.round((1 - x.prob) * 100)}</button>`).join('')}</div>
      <div class="split"><div><h2 class="team-Red">Takım A</h2><ul>${r.A.map(li).join('')}</ul><div class="muted">Ort. ${f0(r.ra)}</div></div>
        <div class="vs">VS</div>
        <div><h2 class="team-Blue">Takım B</h2><ul>${r.B.map(li).join('')}</ul><div class="muted">Ort. ${f0(r.rb)}</div></div></div>
      <div class="probbar"><span style="width:${r.prob * 100}%"></span><span style="width:${(1 - r.prob) * 100}%"></span></div>
      <div class="muted" style="margin-top:6px">Tahmini kazanma şansı: A %${Math.round(r.prob * 100)} · B %${Math.round((1 - r.prob) * 100)}</div>
    </div>` : ''}`;
  app.querySelectorAll('[data-p]').forEach((c) => (c.onchange = () => { c.checked ? st.sel.add(c.dataset.p) : st.sel.delete(c.dataset.p); st.pick = 0; vTeams(); }));
  app.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { st.pick = +b.dataset.i; vTeams(); }));
}

// ---------- Rekorlar ----------
function vRecords() {
  const R = S.st.records;
  const top = (type, label, fmt = f0, n = 5) => {
    let list = R.filter((r) => r.type === type && r.val > 0).sort((a, b) => b.val - a.val);
    if (type === 'streak') { const seen = new Set(); list = list.filter((r) => !seen.has(r.p) && seen.add(r.p)); }
    list = list.slice(0, n);
    return `<div class="card"><h3>${label}</h3>${list.map((r, i) => { const m = matchById(r.m); return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(42,59,75,.5)"><span><span class="rank r${i + 1}" style="font-size:14px">${i + 1}</span> ${pLink(r.p)}</span><span><b>${fmt(r.val)}</b> <a class="muted" href="#/mac/${r.m}">${esc(m.map)} · ${dateTR(m.start)}</a></span></div>`; }).join('') || '<span class="muted">–</span>'}</div>`;
  };
  const L = leaguePlayers();
  const career = (label, fn, fmt = f0) => {
    const list = L.slice().sort((a, b) => fn(b) - fn(a)).slice(0, 5);
    return `<div class="card"><h3>${label}</h3>${list.map((p, i) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(42,59,75,.5)"><span><span class="rank r${i + 1}" style="font-size:14px">${i + 1}</span> ${pLink(p.puuid)}</span><b>${fmt(fn(p))}</b></div>`).join('')}</div>`;
  };
  app.innerHTML = `<h1>Rekorlar</h1>
    <h2 class="section">Tek maçta</h2>
    <div class="grid g3">${top('kills', 'En çok kill')}${top('acs', 'En yüksek ACS')}${top('dmg', 'En çok hasar')}${top('fb', 'En çok ilk kan')}${top('deaths', 'En çok ölüm (utanç köşesi)')}${top('streak', 'En uzun galibiyet serisi')}</div>
    <h2 class="section">Kariyer</h2>
    <div class="grid g3">
      ${career('Toplam kill', (p) => p.kills)}${career('Ace', (p) => p.aces)}${career('Clutch kazanılan', (p) => p.clutchWon)}
      ${career('İlk kan', (p) => p.fb)}${career('Eko kill', (p) => p.ecoKills)}${career('Spike kuran', (p) => p.plants)}
      ${career('Operator kill', (p) => p.weapons.Operator || 0)}${career('Sheriff kill', (p) => p.weapons.Sheriff || 0)}${career('Bıçak kill', (p) => p.weapons['Bıçak'] || 0)}
    </div>`;
}

init();
