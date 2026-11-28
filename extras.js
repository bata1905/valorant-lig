/* Ek özellikler: gecenin ödülleri, WhatsApp özeti, ekonomi analizi, rozet koleksiyonu, "baba" listesi.
   app.js'deki yardımcıları (S, P, pLink, esc, f0, f2, pct, table, leaguePlayers...) kullanır. */

// ---------- Gecenin ödülleri ----------
function nightAwards(ms) {
  const imp = {}, cnt = {}, thr = {}, amb = {};
  let bestRound = null, absurd = null;
  ms.forEach((m) => {
    Object.entries(m._impact || {}).forEach(([id, v]) => { imp[id] = (imp[id] || 0) + v; cnt[id] = (cnt[id] || 0) + 1; });
    if (m._throw) thr[m._throw.p] = (thr[m._throw.p] || 0) + 1;
    const team = {}; m.players.forEach((p) => (team[p.p] = p.team));
    const byR = {};
    m.kills.forEach((k) => {
      if (!k.k || team[k.k] === team[k.v]) return;
      const key = k.r + '|' + k.k;
      byR[key] = (byR[key] || 0) + 1;
      if (k._ambush) amb[k.k] = (amb[k.k] || 0) + 1;
      const rd = m.rounds[k.r];
      if (rd && rd.lv) {
        const a = rd.lv[k.k], b = rd.lv[k.v];
        if (a != null && b != null && b - a >= 2000 && (!absurd || b - a > absurd.gap)) absurd = { gap: b - a, k: k.k, v: k.v, a, b, w: k.w, m, r: k.r };
      }
    });
    Object.entries(byR).forEach(([key, n]) => {
      const [r, id] = key.split('|');
      if (!bestRound || n > bestRound.n) bestRound = { n, p: id, m, r: +r };
    });
  });
  const avg = (id) => imp[id] / cnt[id];
  const ids = Object.keys(cnt);
  if (!ids.length) return null;
  const mvp = ids.slice().sort((a, b) => avg(b) - avg(a))[0];
  const seller = ids.slice().sort((a, b) => (thr[b] || 0) - (thr[a] || 0) || avg(a) - avg(b))[0];
  const rat = Object.entries(amb).sort((a, b) => b[1] - a[1])[0];
  return {
    mvp: { p: mvp, v: avg(mvp), g: cnt[mvp] },
    seller: { p: seller, n: thr[seller] || 0, v: avg(seller) },
    bestRound,
    absurd,
    rat: rat && rat[1] >= 2 ? { p: rat[0], n: rat[1] } : null,
  };
}

// Tüm gecelerin ödülleri (rozet koleksiyonu için)
function allNightAwards() {
  if (S._nightAw) return S._nightAw;
  const out = {};
  Object.entries(S.st.nights).forEach(([n, ms]) => (out[n] = nightAwards(ms)));
  S._nightAw = out;
  return out;
}

const roundLabel = (x) => `${esc(x.m.map)} ${x.r + 1}. raund`;
const multiName = (n) => (n >= 5 ? 'ace' : n === 4 ? '4 kill' : n === 3 ? '3 kill' : n + ' kill');

function awardsHtml(night, ms) {
  const a = (allNightAwards()[night]) || nightAwards(ms);
  if (!a) return '';
  const item = (ico, title, who, why) => `<div class="award"><span class="ico">${ico}</span><div><div class="t">${title}</div><div class="w">${who}</div><div class="why">${why}</div></div></div>`;
  const cards = [
    item('🏆', 'Gecenin MVP\'si', pLink(a.mvp.p), `${a.mvp.g} maçta ortalama etki ${f2(a.mvp.v)}`),
    item('🧯', 'Gecenin satıcısı', pLink(a.seller.p), a.seller.n ? `${a.seller.n} maçta "maçı satan" seçildi` : `gecenin en düşük etkisi, ${f2(a.seller.v)}`),
    a.bestRound ? item('💥', 'En iyi raund', pLink(a.bestRound.p), `${roundLabel(a.bestRound)}, ${multiName(a.bestRound.n)}`) : '',
    a.absurd ? item('🤡', 'En saçma ölüm', pLink(a.absurd.v), `${f0(a.absurd.b)} kredilik ekipmanla, ${f0(a.absurd.a)} kredilik ${pLink(a.absurd.k)}'a ${esc(weaponLabel(a.absurd.w))} ile öldü (${roundLabel(a.absurd)})`) : '',
    a.rat ? item('🐀', 'Gecenin faresi', pLink(a.rat.p), `${a.rat.n} pusu kill`) : '',
  ].join('');
  return `<section class="section awards-wrap" aria-label="Gecenin ödülleri">
    <div class="awards-head"><h2>Gecenin ödülleri</h2>
      <div class="share"><a class="btn wa" href="https://wa.me/?text=${encodeURIComponent(nightText(night, ms, a))}" target="_blank" rel="noopener">WhatsApp'ta paylaş</a>
      <button class="btn ghost" type="button" onclick="copyNight(this)">Metni kopyala</button></div></div>
    <div class="awards">${cards}</div></section>`;
}
function weaponLabel(w) { return w === 'Spike' ? 'spike' : w; }

// ---------- WhatsApp özeti ----------
function nightText(night, ms, a) {
  a = a || nightAwards(ms);
  const delta = {};
  ms.forEach((m) => Object.entries(m._ratingDelta || {}).forEach(([id, d]) => (delta[id] = (delta[id] || 0) + d)));
  const ds = Object.entries(delta).sort((x, y) => y[1] - x[1]);
  const sign = (d) => (d >= 0 ? '+' : '') + Math.round(d);
  const lines = [`🎮 CUSTOM LEAGUE, ${nightTR(night)}`, ''];
  ms.forEach((m) => {
    const t = Object.keys(m.teams);
    const win = t.find((x) => m.teams[x].won);
    const names = (team) => m.players.filter((p) => p.team === team).map((p) => nm(p.p)).join(', ');
    lines.push(`🗺️ ${m.map} ${t.map((x) => m.teams[x].rw).join('-')}${m.ff ? ' (FF)' : ''}`);
    if (win) lines.push(`   Kazanan: ${names(win)}`);
  });
  lines.push('');
  if (a) {
    lines.push(`🏆 MVP: ${nm(a.mvp.p)} (etki ${f2(a.mvp.v)})`);
    lines.push(`🧯 Satıcı: ${nm(a.seller.p)}`);
    if (a.bestRound) lines.push(`💥 En iyi raund: ${nm(a.bestRound.p)}, ${a.bestRound.m.map} ${a.bestRound.r + 1}. raund ${multiName(a.bestRound.n)}`);
    if (a.absurd) lines.push(`🤡 En saçma ölüm: ${nm(a.absurd.v)}, ${nm(a.absurd.k)}'a ${weaponLabel(a.absurd.w)} ile öldü`);
    if (a.rat) lines.push(`🐀 Fare: ${nm(a.rat.p)} (${a.rat.n} pusu kill)`);
  }
  if (ds.length) {
    lines.push('');
    lines.push(`📈 En çok puan kazanan: ${nm(ds[0][0])} ${sign(ds[0][1])}`);
    lines.push(`📉 En çok kaybeden: ${nm(ds[ds.length - 1][0])} ${sign(ds[ds.length - 1][1])}`);
  }
  const lead = leaguePlayers()[0];
  if (lead) lines.push(`👑 Lider: ${lead.name}`);
  lines.push('', location.origin + location.pathname);
  return lines.join('\n');
}
function copyNight(btn) {
  const nights = Object.keys(S.st.nights).sort();
  const last = nights[nights.length - 1];
  const txt = nightText(last, S.st.nights[last]);
  const done = () => { btn.textContent = 'Kopyalandı'; setTimeout(() => (btn.textContent = 'Metni kopyala'), 2000); };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => window.prompt('Kopyala:', txt));
  else window.prompt('Kopyala:', txt);
}

// ---------- Ekonomi ----------
const ECON = [['pistol', 'Tabanca raundu'], ['eco', 'Eko (2000 altı)'], ['half', 'Yarım alım'], ['full', 'Tam alım (3900+)']];
const kprOf = (e) => (e.r ? e.k / e.r : null);
function econCards(p) {
  if (!p.econ) return '';
  return `<h2 class="section">Ekonomi</h2>
    <p class="lead">Raund başına kill, o raundda senin üstündeki ekipmanın değerine göre. Parantez içi: kaç raund oynandığı ve o raundların kazanma yüzdesi.</p>
    <div class="grid g4">${ECON.map(([k, l]) => { const e = p.econ[k]; return `<div class="card stat"><span class="l">${l}</span><span class="v">${e.r ? f2(kprOf(e)) : '–'}</span><span class="muted">${e.r} raund, ${e.r ? pct((100 * e.w) / e.r) : '–'} kazanma</span></div>`; }).join('')}</div>`;
}
function econTable() {
  const L = leaguePlayers();
  const rows = L.map((p) => {
    const e = p.econ || {};
    const full = kprOf(e.full || { r: 0 }), eco = kprOf(e.eco || { r: 0 });
    return {
      id: p.puuid, name: p.name,
      pistol: kprOf(e.pistol || { r: 0 }), eco, half: kprOf(e.half || { r: 0 }), full,
      ecoWin: e.eco && e.eco.r ? (100 * e.eco.w) / e.eco.r : null,
      ratio: full && eco != null ? eco / full : null,
    };
  });
  const n = (v) => (v == null ? -1 : v);
  return `<h2 class="section">Ekonomi</h2>
    <p class="lead">Raund başına kill, oyuncunun o raunddaki ekipman değerine göre. "Eko verimi" eko raund KPR'sinin tam alım KPR'sine oranı: 1'e ne kadar yakınsa parasız kaldığında o kadar az düşüyor.</p>
    <div class="card tight">${table('econ', [
      { key: 'name', label: 'Oyuncu', cls: 'l', fmt: (r) => pLink(r.id, true) },
      { key: 'pistol', label: 'Tabanca', val: (r) => n(r.pistol), fmt: (r) => f2(r.pistol) },
      { key: 'eco', label: 'Eko', val: (r) => n(r.eco), fmt: (r) => f2(r.eco) },
      { key: 'half', label: 'Yarım', val: (r) => n(r.half), fmt: (r) => f2(r.half) },
      { key: 'full', label: 'Tam alım', val: (r) => n(r.full), fmt: (r) => f2(r.full) },
      { key: 'ecoWin', label: 'Eko kazanma', opt: true, val: (r) => n(r.ecoWin), fmt: (r) => pct(r.ecoWin) },
      { key: 'ratio', label: 'Eko verimi', val: (r) => n(r.ratio), fmt: (r) => f2(r.ratio) },
    ], rows, { sort: 'ratio' })}</div>`;
}

// ---------- Rozet koleksiyonu ----------
function badgeCollection(p) {
  const aw = allNightAwards();
  let mvp = 0, seller = 0, best = 0, absurdV = 0;
  Object.values(aw).forEach((a) => {
    if (!a) return;
    if (a.mvp.p === p.puuid) mvp++;
    if (a.seller.p === p.puuid) seller++;
    if (a.bestRound && a.bestRound.p === p.puuid) best++;
    if (a.absurd && a.absurd.v === p.puuid) absurdV++;
  });
  const list = [
    ['🃏', 'Ace', 'Raundda rakip takımın hepsini tek başına öldür', p.aces],
    ['🔥', '4 kill', 'Bir raundda 4 kill', p.k4],
    ['🧊', '1v3 clutch', 'En az 3 kişiye karşı tek kalıp raundu kazan', p.clutchBig || 0],
    ['🏆', 'Gecenin MVP\'si', 'Bir gecenin en yüksek ortalama etkisi', mvp],
    ['💥', 'Gecenin raundu', 'Bir gecenin en çok kill alınan raundu', best],
    ['🎒', 'Sırtlayan', 'Kaybeden ya da kazanan takımı sırtla', p.carries || 0],
    ['🐀', 'Pusucu', '25 metreden uzakta, tek başına aldığın kill', p.ambush || 0],
    ['🔫', 'Tabanca raundu', 'Tabanca raundunda alınan kill', p.pistolRoundKills || 0],
    ['💸', 'Eko kill', 'Rakibin ekipmanının yarısından ucuzla kill', p.ecoKills],
    ['💣', 'Spike kuran', 'Spike kur', p.plants],
    ['🧯', 'Gecenin satıcısı', 'Utanç rozeti', seller],
    ['🤡', 'Saçma ölüm', 'Gecenin en pahalı ekipmanla en ucuza ölümü', absurdV],
  ];
  const got = list.filter((b) => b[3] > 0).length;
  return `<div class="coll-head"><span class="muted">${got}/${list.length} rozet toplandı</span></div>
    <div class="coll">${list.map(([i, t, d, n]) => `<div class="cb ${n > 0 ? 'on' : ''}" title="${esc(d)}"><span class="ico">${i}</span><span class="t">${esc(t)}</span><span class="n">${n > 0 ? '×' + n : 'yok'}</span></div>`).join('')}</div>`;
}

// ---------- Kim kimin babası ----------
function fathersHtml(ps) {
  const out = [];
  ps.forEach((a) => ps.forEach((b) => {
    if (a.puuid >= b.puuid) return;
    const ab = (a.killsOn[b.puuid] || { total: 0 }).total, ba = (b.killsOn[a.puuid] || { total: 0 }).total;
    const [hi, lo, hk, lk] = ab >= ba ? [a, b, ab, ba] : [b, a, ba, ab];
    if (hk - lk >= 6 && hk >= 1.6 * Math.max(1, lk)) out.push({ hi, lo, hk, lk, d: hk - lk });
  }));
  out.sort((x, y) => y.d - x.d);
  if (!out.length) return '';
  return `<h2 class="section">Kim kimin babası</h2>
    <p class="lead">Birbirlerine karşı belirgin üstünlüğü olan ikililer (en az 6 kill fark ve 1.6 kat).</p>
    <div class="grid g3">${out.slice(0, 12).map((x) => `<div class="card father"><div>${pLink(x.hi.puuid)} <span class="muted">→</span> ${pLink(x.lo.puuid)}</div><div class="sc"><span class="teal">${x.hk}</span><span class="dim">-</span><span class="red">${x.lk}</span></div></div>`).join('')}</div>`;
}

// ---------- Düellolar, trade ve hasar farkı ----------
function duelCards(p) {
  const fb = p.fb, fdT = p.fdTraded || 0, fdU = Math.max(0, p.fd - fdT), tot = fb + p.fd;
  const w = (n) => (tot ? (100 * n) / tot : 0);
  const per = (n) => f1(n / Math.max(1, p.games));
  return `<h2 class="section">Düellolar ve trade</h2>
    <div class="card" style="margin-bottom:12px"><h3>İlk düellolar (${tot})</h3>
        <div class="duelbar" role="img" aria-label="İlk düello dağılımı">
          <span class="dw" style="width:${w(fb)}%"></span><span class="dt" style="width:${w(fdT)}%"></span><span class="du" style="width:${w(fdU)}%"></span>
        </div>
        <div class="legend"><span><i style="background:var(--win)"></i>Kazandı ${fb} (${pct(w(fb))})</span><span><i style="background:#ffb238"></i>Öldü, intikamı alındı ${fdT}</span><span><i style="background:var(--loss)"></i>Öldü, intikamı alınmadı ${fdU}</span></div>
    </div>
      <div class="grid g4">
        <div class="card stat"><span class="l">Trade kill</span><span class="v">${p.tradeKills || 0}</span><span class="muted">maç başına ${per(p.tradeKills || 0)}, arkadaşının katilini 5 sn içinde vurdu</span></div>
        <div class="card stat"><span class="l">İntikamı alınan ölüm</span><span class="v">${pct(p.tradePct)}</span><span class="muted">öldüğünde takımın hemen karşılık verdi</span></div>
        <div class="card stat"><span class="l">Hasar farkı</span><span class="v ${p.dmgDelta >= 0 ? 'up' : 'down'}">${p.dmgDelta >= 0 ? '+' : ''}${f0(p.dmgDelta)}</span><span class="muted">raund başına verilen eksi alınan hasar</span></div>
        <div class="card stat"><span class="l">İlk düello kazanma</span><span class="v">${pct(p.fbPct)}</span><span class="muted">raundun ilk çatışması</span></div>
      </div>`;
}

// ---------- En iyi / en kötü arkadaş ----------
function friendsOf(p, minG = 3) {
  const list = Object.entries(p.mates || {}).filter(([, x]) => x.g >= minG).map(([id, x]) => ({ id, g: x.g, w: x.w, wp: (100 * x.w) / x.g }));
  if (!list.length) return null;
  list.sort((a, b) => b.wp - a.wp || b.g - a.g);
  const best = list[0];
  const worst = list.slice().sort((a, b) => a.wp - b.wp || b.g - a.g)[0];
  return { best, worst: worst.id !== best.id ? worst : null };
}
function friendCards(p) {
  const f = friendsOf(p);
  if (!f) return '';
  const c = (t, x, cls) => `<div class="card"><h3>${t}</h3><div class="stat"><span class="v">${pLink(x.id)}</span><span class="muted">aynı takımda ${x.g} maç, <b class="${cls}">${pct(x.wp)}</b> kazanma (${x.w}-${x.g - x.w})</span></div></div>`;
  return `<div class="grid g2 section">${c('En iyi arkadaşın', f.best, 'up')}${f.worst ? c('En kötü arkadaşın', f.worst, 'down') : ''}</div>`;
}

// ---------- Haritaya göre en iyi ajan ----------
function mapAgentTable(p) {
  const rows = [];
  Object.entries(p.mapAgents || {}).forEach(([map, ags]) => {
    const list = Object.entries(ags).map(([ag, x]) => ({ ag, ...x, acs: x.score / Math.max(1, x.rounds) }));
    // en az 2 maç oynanan ajanlar arasından en yüksek ACS; yoksa en çok oynanan
    const pool = list.filter((x) => x.g >= 2);
    const best = (pool.length ? pool : list).sort((a, b) => (pool.length ? b.acs - a.acs : b.g - a.g))[0];
    if (best) rows.push({ map, ag: best.ag, g: best.g, w: best.w, acs: best.acs, kd: best.k / Math.max(1, best.d), n: list.length });
  });
  if (!rows.length) return '';
  return `<div class="card tight section"><div style="padding:14px 16px 0"><h3>Haritaya göre en iyi ajanın</h3><p class="muted" style="margin:0 0 6px">O haritada en az 2 maç oynadığın ajanlar arasından en yüksek ACS.</p></div>${table('pma', [
    { key: 'map', label: 'Harita', cls: 'l' },
    { key: 'ag', label: 'Ajan', cls: 'l', fmt: (r) => `<span class="pname">${agentImg(r.ag)}${esc(r.ag)}</span>` },
    { key: 'g', label: 'Maç', fmt: (r) => `${r.g}` },
    { key: 'wl', label: 'G-M', val: (r) => r.w - (r.g - r.w), fmt: (r) => `${r.w}-${r.g - r.w}` },
    { key: 'acs', label: 'ACS', fmt: (r) => f0(r.acs) },
    { key: 'kd', label: 'K/D', fmt: (r) => f2(r.kd) },
  ], rows, { sort: 'acs' })}</div>`;
}

// ---------- Maç filtresi ----------
function matchFilterBar() {
  const st = (S.ui.mf = S.ui.mf || { player: '', map: '', agent: '', minK: '' });
  const maps = Object.keys(S.st.maps).sort();
  const agents = [...new Set(S.st.matches.flatMap((m) => m.players.map((p) => p.ag).filter(Boolean)))].sort();
  return `<div class="filters">
    <select id="mf-player"><option value="">Tüm oyuncular</option>${allPlayers().map((p) => `<option value="${p.puuid}" ${st.player === p.puuid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
    <select id="mf-map"><option value="">Tüm haritalar</option>${maps.map((m) => `<option ${m === st.map ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
    <select id="mf-agent" ${st.player ? '' : 'disabled title="Önce oyuncu seç"'}><option value="">Tüm ajanlar</option>${agents.map((a) => `<option ${a === st.agent ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
    <select id="mf-k" ${st.player ? '' : 'disabled title="Önce oyuncu seç"'}><option value="">Kill sınırı yok</option>${[15, 20, 25, 30, 35].map((k) => `<option value="${k}" ${String(k) === String(st.minK) ? 'selected' : ''}>${k}+ kill</option>`).join('')}</select>
    ${st.player || st.map ? '<button class="btn ghost" id="mf-clear" type="button">Temizle</button>' : ''}
  </div>`;
}
function matchFilterApply(ms) {
  const st = S.ui.mf || {};
  return ms.filter((m) => {
    if (st.map && m.map !== st.map) return false;
    if (st.player) {
      const me = m.players.find((p) => p.p === st.player);
      if (!me) return false;
      if (st.agent && me.ag !== st.agent) return false;
      if (st.minK && me.k < +st.minK) return false;
    }
    return true;
  });
}
function wireMatchFilter(rerender) {
  const st = S.ui.mf;
  [['mf-player', 'player'], ['mf-map', 'map'], ['mf-agent', 'agent'], ['mf-k', 'minK']].forEach(([id, k]) => {
    const el = document.getElementById(id);
    if (el) el.onchange = () => { st[k] = el.value; if (k === 'player' && !el.value) { st.agent = ''; st.minK = ''; } rerender(); };
  });
  const c = document.getElementById('mf-clear');
  if (c) c.onclick = () => { S.ui.mf = { player: '', map: '', agent: '', minK: '' }; rerender(); };
}

// ---------- Ay özeti kartı (WhatsApp'a görsel) ----------
const monthKey = (iso) => nightKeyTR(iso).slice(0, 7);
function nightKeyTR(iso) { return V.nightKey(iso); }
const monthName = (key) => (key === 'all' ? 'Tüm zamanlar' : new Date(key + '-15T12:00:00Z').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }));
function monthsOf(p) {
  const ms = [...new Set(S.st.matches.filter((m) => m.players.some((x) => x.p === p.puuid)).map((m) => monthKey(m.start)))].sort().reverse();
  return ms.length ? [...ms, 'all'] : ms;
}
function wrappedData(p, month) {
  const ms = S.st.matches.filter((m) => (month === 'all' || monthKey(m.start) === month) && m.players.some((x) => x.p === p.puuid));
  let w = 0, l = 0, k = 0, d = 0, a = 0, imp = 0, best = null;
  const victims = {}, killers = {}, mates = {}, maps = {}, weapons = {}, agents = {};
  ms.forEach((m) => {
    const me = m.players.find((x) => x.p === p.puuid);
    k += me.k; d += me.d; a += me.a;
    if (me.ag) agents[me.ag] = (agents[me.ag] || 0) + 1;
    const v = (m._impact || {})[p.puuid] || 1; imp += v;
    if (!best || v > best.v) best = { v, m, me };
    if (m.completed || m.ff) { if (m._winner === me.team) w++; else l++; }
    maps[m.map] = (maps[m.map] || 0) + 1;
    const team = {}; m.players.forEach((x) => (team[x.p] = x.team));
    m.players.forEach((x) => { if (x.p !== p.puuid && x.team === me.team) { const t = (mates[x.p] = mates[x.p] || { g: 0, w: 0 }); t.g++; if (m._winner === me.team) t.w++; } });
    m.kills.forEach((kk) => {
      if (!kk.k || team[kk.k] === team[kk.v]) return;
      if (kk.k === p.puuid) { victims[kk.v] = (victims[kk.v] || 0) + 1; weapons[kk.w] = (weapons[kk.w] || 0) + 1; }
      if (kk.v === p.puuid) killers[kk.k] = (killers[kk.k] || 0) + 1;
    });
  });
  const top = (o) => Object.entries(o).sort((x, y) => y[1] - x[1])[0];
  const mateList = Object.entries(mates).filter(([, x]) => x.g >= 2).map(([id, x]) => ({ id, ...x, wp: x.w / x.g })).sort((x, y) => y.wp - x.wp || y.g - x.g);
  return { ms, w, l, k, d, a, imp: imp / Math.max(1, ms.length), best, victim: top(victims), killer: top(killers), mate: mateList[0], map: top(maps), weapon: top(weapons), agent: top(agents) };
}
// config.json "player_photos": {"isim#tag": "assets/players/dosya.jpg"}
function photoOf(p) {
  const ph = S.cfg.player_photos || {};
  const key = Object.keys(ph).find((k) => k.toLowerCase() === (p.name + '#' + p.tag).toLowerCase() || k.toLowerCase() === p.name.toLowerCase());
  return key ? ph[key] : null;
}
const _imgCache = {};
function loadImg(src) {
  if (!src) return Promise.resolve(null);
  if (!_imgCache[src]) _imgCache[src] = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  return _imgCache[src];
}
function wrappedBlock(p) {
  const months = monthsOf(p);
  if (!months.length) return '';
  const st = (S.ui.wr = S.ui.wr || {});
  if (!st.month || !months.includes(st.month)) st.month = months[0];
  return `<h2 class="section">Ay özeti kartı</h2>
    <div class="card"><div class="filters">
      <select id="wr-month">${months.map((m) => `<option value="${m}" ${m === st.month ? 'selected' : ''}>${esc(monthName(m))}</option>`).join('')}</select>
      <button class="btn wa" id="wr-share" type="button">Kartı paylaş</button>
      <button class="btn ghost" id="wr-dl" type="button">İndir</button>
    </div>
    <canvas id="wr-cv" width="1080" height="1350" class="wrapped" role="img" aria-label="${esc(p.name)} ay özeti kartı"></canvas></div>`;
}
// Fotoğrafı olmayanlar için üst görsel. Hepsi isimden türetilir: her oyuncuda farklı, ama hep aynı.
const ROLE_COL = { Duelist: '#ff4655', Controller: '#9b7bff', Initiator: '#3fe0b0', Sentinel: '#ffc145' };
// Her oyuncuya ayrı renk ve çizim: isme göre sıralanınca sırası belirler, böylece kimse aynı renk+çizimi almaz
const CARD_COLORS = ['#ff4655', '#3fe0b0', '#9b7bff', '#ffc145', '#4fa8ff', '#ff7ad9', '#a6e22e', '#ff9a3c', '#38e0e0', '#e8e8e8', '#c77dff', '#ffd166'];
const CARD_STYLES = ['hud', 'topo', 'pusula'];
// config.json "card_looks": {"isim#tag": {"color": "#ff4655", "style": "hud"}} ile elle seçilebilir
function cardLook(p) {
  const fixed = S.cfg.card_looks || {};
  const keyOf = (x) => Object.keys(fixed).find((k) => k.toLowerCase() === (x.name + '#' + x.tag).toLowerCase() || k.toLowerCase() === x.name.toLowerCase());
  const own = keyOf(p);
  if (own) return { color: fixed[own].color || '#ff4655', style: fixed[own].style || 'hud' };
  const taken = new Set(Object.values(fixed).map((v) => (v.color || '').toLowerCase()));
  const pool = CARD_COLORS.filter((c) => !taken.has(c.toLowerCase()));
  const names = Object.values(S.st.players).filter((x) => !keyOf(x)).map((x) => x.name.toLowerCase()).sort();
  const i = Math.max(0, names.indexOf(p.name.toLowerCase()));
  return { color: pool[i % pool.length], style: CARD_STYLES[i % CARD_STYLES.length] };
}
function heroArt(c, p, D, W, HERO, style) {
  const BG = '#0f1923', TXT = '#ece8e1';
  const disp = '"Big Shoulders Display", "Barlow", sans-serif';
  const up = (x) => String(x).toLocaleUpperCase('tr-TR');
  const agName = D.agent ? D.agent[0] : p.favAgent;
  const roleName = agName && S.assets.agents[agName] ? S.assets.agents[agName].role : null;
  const look = cardLook(p);
  const acc = look.color;
  if (style === 'auto') style = look.style;
  let seed = 0; for (const ch of p.name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const g = c.createLinearGradient(0, 0, W, HERO);
  g.addColorStop(0, '#1e2f3d'); g.addColorStop(1, BG);
  c.fillStyle = g; c.fillRect(0, 0, W, HERO);
  c.save(); c.beginPath(); c.rect(0, 0, W, HERO - 120); c.clip();
  const bigText = (txt, y, rot, maxW, start = 300, fill = 0.08, line = 4) => {
    if (!txt) return;
    c.save(); c.translate(W / 2, y); c.rotate(rot); c.textAlign = 'center';
    let fs = start; c.font = `900 ${fs}px ${disp}`;
    while (c.measureText(up(txt)).width > maxW && fs > 100) { fs -= 10; c.font = `900 ${fs}px ${disp}`; }
    c.lineWidth = line; c.strokeStyle = acc; c.globalAlpha = 0.85; c.strokeText(up(txt), 0, 0);
    c.globalAlpha = fill; c.fillStyle = acc; c.fillText(up(txt), 0, 0);
    c.restore();
  };
  if (style === 'topo') {
    // Topoğrafik harita çizgileri
    const cx = W * (0.35 + rnd() * 0.3), cy = HERO * (0.3 + rnd() * 0.2);
    const k1 = 2 + Math.floor(rnd() * 3), k2 = 3 + Math.floor(rnd() * 3), ph = rnd() * 6;
    for (let i = 0; i < 26; i++) {
      const r0 = 30 + i * 34;
      c.beginPath();
      for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.04) {
        const r = r0 * (1 + 0.12 * Math.sin(k1 * t + ph + i * 0.15) + 0.07 * Math.sin(k2 * t - ph));
        const x = cx + Math.cos(t) * r * 1.25, y = cy + Math.sin(t) * r;
        t === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.strokeStyle = i % 5 === 0 ? acc : 'rgba(236,232,225,.14)';
      c.lineWidth = i % 5 === 0 ? 3 : 1.5; c.globalAlpha = i % 5 === 0 ? 0.7 : 1; c.stroke(); c.globalAlpha = 1;
    }
    c.fillStyle = acc; c.beginPath(); c.arc(cx, cy, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = TXT; c.font = `700 22px "Barlow", sans-serif`; c.fillText(`${(cx / 10).toFixed(0)}.${(cy / 10).toFixed(0)}`, cx + 20, cy - 14);
  } else if (style === 'hud') {
    // Nişangâh / taktik ekran
    const cx = W * 0.62, cy = HERO * 0.4;
    c.strokeStyle = 'rgba(236,232,225,.08)'; c.lineWidth = 1;
    for (let x = 0; x < W; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, HERO); c.stroke(); }
    for (let y = 0; y < HERO; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    [90, 170, 260, 360].forEach((r, i) => { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.strokeStyle = i === 1 ? acc : 'rgba(236,232,225,.22)'; c.lineWidth = i === 1 ? 4 : 2; c.stroke(); });
    c.strokeStyle = acc; c.lineWidth = 4;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => { c.beginPath(); c.moveTo(cx + dx * 40, cy + dy * 40); c.lineTo(cx + dx * 130, cy + dy * 130); c.stroke(); });
    c.fillStyle = acc; c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI * 2); c.fill();
    // tarama dilimi
    const a0 = rnd() * Math.PI * 2; const sg = c.createRadialGradient(cx, cy, 0, cx, cy, 360);
    sg.addColorStop(0, acc + '55'); sg.addColorStop(1, acc + '00');
    c.fillStyle = sg; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 360, a0, a0 + 0.7); c.closePath(); c.fill();
    // hedef noktaları (isimden)
    for (let i = 0; i < 6; i++) { const t = rnd() * Math.PI * 2, r = 100 + rnd() * 250; c.fillStyle = i < 2 ? acc : 'rgba(236,232,225,.5)'; c.fillRect(cx + Math.cos(t) * r - 6, cy + Math.sin(t) * r - 6, 12, 12); }
    c.fillStyle = 'rgba(236,232,225,.6)'; c.font = `700 22px "Barlow", sans-serif`;
    c.fillText(`HEDEF: ${up(p.name)}`, 60, 300); c.fillText(`AJAN: ${up(agName || '-')}`, 60, 332);
  } else if (style === 'pusula') {
    // Pusula: derece işaretleri, yön çizgileri ve rota
    const cx = W * 0.6, cy = HERO * 0.38, R = 300;
    c.strokeStyle = 'rgba(236,232,225,.10)'; c.lineWidth = 1;
    for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(t) * W, cy + Math.sin(t) * W); c.stroke(); }
    [R, R * 0.72, R * 0.4].forEach((r, i) => { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.strokeStyle = i === 0 ? acc : 'rgba(236,232,225,.25)'; c.lineWidth = i === 0 ? 4 : 2; c.globalAlpha = i === 0 ? 0.8 : 1; c.stroke(); c.globalAlpha = 1; });
    for (let d = 0; d < 360; d += 5) {
      const t = (d / 180) * Math.PI - Math.PI / 2, long = d % 30 === 0;
      c.beginPath(); c.moveTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); c.lineTo(cx + Math.cos(t) * (R - (long ? 30 : 14)), cy + Math.sin(t) * (R - (long ? 30 : 14)));
      c.strokeStyle = long ? acc : 'rgba(236,232,225,.4)'; c.lineWidth = long ? 3 : 1.5; c.stroke();
      if (long) { c.fillStyle = 'rgba(236,232,225,.55)'; c.font = `700 20px "Barlow", sans-serif`; c.textAlign = 'center'; c.fillText(String(d), cx + Math.cos(t) * (R + 28), cy + Math.sin(t) * (R + 28) + 7); c.textAlign = 'left'; }
    }
    // yön oku (isimden)
    const bearing = Math.floor(rnd() * 360), bt = (bearing / 180) * Math.PI - Math.PI / 2;
    c.fillStyle = acc; c.beginPath();
    c.moveTo(cx + Math.cos(bt) * (R - 40), cy + Math.sin(bt) * (R - 40));
    c.lineTo(cx + Math.cos(bt + 2.6) * 34, cy + Math.sin(bt + 2.6) * 34);
    c.lineTo(cx + Math.cos(bt - 2.6) * 34, cy + Math.sin(bt - 2.6) * 34); c.closePath(); c.fill();
    c.fillStyle = 'rgba(236,232,225,.35)'; c.beginPath();
    c.moveTo(cx - Math.cos(bt) * (R * 0.55), cy - Math.sin(bt) * (R * 0.55));
    c.lineTo(cx + Math.cos(bt + 2.6 - Math.PI) * 26, cy + Math.sin(bt + 2.6 - Math.PI) * 26);
    c.lineTo(cx + Math.cos(bt - 2.6 - Math.PI) * 26, cy + Math.sin(bt - 2.6 - Math.PI) * 26); c.closePath(); c.fill();
    c.fillStyle = BG; c.beginPath(); c.arc(cx, cy, 12, 0, Math.PI * 2); c.fill(); c.strokeStyle = acc; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(236,232,225,.6)'; c.font = `700 22px "Barlow", sans-serif`;
    c.fillText(`ROTA ${String(bearing).padStart(3, '0')}°`, 60, 300); c.fillText(`AJAN: ${up(agName || '-')}`, 60, 332);
  } else if (style === 'halftone') {
    // Yarım ton nokta posteri + tekrar eden ajan adı
    const ang = -0.35 + rnd() * 0.2;
    for (let y = 0; y < HERO; y += 26) for (let x = 0; x < W; x += 26) {
      const tt = (x * Math.cos(ang) + y * Math.sin(ang)) / W;
      const r = Math.max(0, 11 * (tt - 0.15));
      if (r < 0.6) continue;
      c.fillStyle = acc; c.globalAlpha = 0.55; c.beginPath(); c.arc(x, y, Math.min(11, r), 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    if (agName) {
      c.save(); c.translate(70, 40); c.font = `900 150px ${disp}`; c.globalAlpha = 0.09; c.fillStyle = TXT;
      for (let i = 0; i < 3; i++) c.fillText(up(agName), (i % 2) * 120, 300 + i * 140);
      c.restore();
    }
  } else {
    // Üçgen ızgara (varsayılan)
    const T = 90;
    for (let y = -T; y < HERO; y += T * 0.866) for (let x = -T; x < W + T; x += T) {
      const off = (Math.round(y / (T * 0.866)) % 2) * T / 2;
      const a = rnd();
      if (a < 0.55) continue;
      c.fillStyle = a > 0.93 ? acc : `rgba(236,232,225,${(a - 0.55) * 0.12})`;
      c.globalAlpha = a > 0.93 ? 0.55 : 1;
      c.beginPath(); c.moveTo(x + off, y); c.lineTo(x + off + T, y); c.lineTo(x + off + T / 2, y + T * 0.866); c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
    c.fillStyle = acc; c.globalAlpha = 0.22; c.beginPath(); c.moveTo(W * 0.5, 0); c.lineTo(W, 0); c.lineTo(W, HERO * 0.85); c.closePath(); c.fill(); c.globalAlpha = 1;
    bigText(agName, HERO * 0.5, -0.08, W * 1.05);
  }
  c.restore();
}
async function drawWrapped(p) {
  const cv = document.getElementById('wr-cv');
  if (!cv) return;
  const st = S.ui.wr, D = wrappedData(p, st.month);
  const photo = await loadImg(photoOf(p));
  if (!document.body.contains(cv)) return;
  const c = cv.getContext('2d');
  const W = 1080, H = 1350, RED = '#ff4655', TEAL = '#3fe0b0', TXT = '#ece8e1', MUT = '#96a3ad', BG = '#0f1923', PANEL = '#16232f', LINE = '#2c4152';
  const disp = '"Big Shoulders Display", "Barlow", sans-serif', body = '"Barlow", system-ui, sans-serif';
  const up = (s) => String(s).toLocaleUpperCase('tr-TR');
  const fit = (txt, maxW, weight, size, font, min = 18) => { let s = size; c.font = `${weight} ${s}px ${font}`; while (c.measureText(txt).width > maxW && s > min) { s -= 2; c.font = `${weight} ${s}px ${font}`; } return s; };
  const HERO = 700;
  c.fillStyle = BG; c.fillRect(0, 0, W, H);

  // --- Üst görsel: fotoğraf varsa fotoğraf, yoksa isimden üretilmiş poster ---
  if (photo) {
    // Fotoğraf boyuna göre sığdırılır; dar kalırsa iki yan siyah (portre fotoğraflar için)
    c.save(); c.beginPath(); c.rect(0, 0, W, HERO); c.clip();
    c.fillStyle = '#000'; c.fillRect(0, 0, W, HERO);
    let r = HERO / photo.height;
    if (photo.width * r > W * 0.9) r = Math.max(W / photo.width, HERO / photo.height);
    const pw = photo.width * r, phh = photo.height * r;
    c.drawImage(photo, (W - pw) / 2, HERO - phh, pw, phh);
    c.restore();
  } else {
    heroArt(c, p, D, W, HERO, (window.CARD_STYLE || S.cfg.card_style || 'auto'));
  }
  // alt kısma doğru koyulaşma
  const fade = c.createLinearGradient(0, HERO - 110, 0, HERO);
  fade.addColorStop(0, 'rgba(15,25,35,0)'); fade.addColorStop(1, BG);
  c.fillStyle = fade; c.fillRect(0, HERO - 110, W, 110);
  const topFade = c.createLinearGradient(0, 0, 0, 200);
  topFade.addColorStop(0, 'rgba(15,25,35,.75)'); topFade.addColorStop(1, 'rgba(15,25,35,0)');
  c.fillStyle = topFade; c.fillRect(0, 0, W, 200);

  // --- Sol üst: OVR rozeti (kesik köşeli) ---
  const ovr = V.ovr(S.st.players, p.puuid);
  let role = '';
  try { if (p.league) role = roleOf(attrTable()[p.puuid]); } catch (e) {}
  c.fillStyle = RED;
  c.beginPath(); c.moveTo(60, 56); c.lineTo(250, 56); c.lineTo(250, 220); c.lineTo(226, 244); c.lineTo(60, 244); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.textAlign = 'center';
  c.font = `900 120px ${disp}`; c.fillText(String(ovr), 155, 178);
  c.font = `700 22px ${body}`; c.fillText('GENEL GÜÇ', 155, 222);
  c.textAlign = 'left';
  // --- Sağ üst: lig ve ay ---
  c.textAlign = 'right';
  c.fillStyle = TXT; c.font = `800 30px ${disp}`; c.fillText('CUSTOM LEAGUE', W - 60, 92);
  c.fillStyle = MUT; c.font = `600 26px ${body}`; c.fillText(up(monthName(st.month)), W - 60, 128);
  if (role) { c.fillStyle = TXT; c.font = `700 24px ${body}`; c.fillText(up(role), W - 60, 164); }
  c.textAlign = 'left';

  // --- İsim ve ajan ---
  const name = up(p.name);
  const ns = fit(name, W - 120, 900, 124, disp, 60);
  c.fillStyle = TXT; c.font = `900 ${ns}px ${disp}`; c.fillText(name, 60, HERO + 100);
  c.fillStyle = RED; c.fillRect(60, HERO + 122, 120, 8);
  c.fillStyle = MUT; c.font = `600 28px ${body}`;
  const agTxt = D.agent ? `En çok oynadığı ajan: ` : '';
  c.fillText(agTxt, 200, HERO + 135);
  if (D.agent) { const w0 = c.measureText(agTxt).width; c.fillStyle = TXT; c.font = `700 28px ${body}`; c.fillText(`${D.agent[0]} (${D.agent[1]} maç)`, 200 + w0, HERO + 135); }

  // --- Büyük sayılar ---
  const Y = HERO + 165;
  const cols = [[60, 'MAÇ', String(D.ms.length), TXT], [380, 'G - M', `${D.w}-${D.l}`, D.w >= D.l ? TEAL : RED], [700, 'ORT. ETKİ', f2(D.imp), RED]];
  cols.forEach(([x, l, v, col]) => {
    c.fillStyle = PANEL; c.fillRect(x, Y, 300, 130);
    c.fillStyle = col; c.font = `900 84px ${disp}`; c.fillText(v, x + 24, Y + 86);
    c.fillStyle = MUT; c.font = `600 22px ${body}`; c.fillText(l, x + 24, Y + 116);
  });
  // --- Detay kutuları (2 sütun x 3 satır) ---
  const tiles = [
    ['En iyi maçı', D.best ? `${D.best.m.map}, ${D.best.me.k} kill` : '–'],
    ['En sevdiği silah', D.weapon ? `${D.weapon[0]} (${D.weapon[1]})` : '–'],
    ['En çok öldürdüğü', D.victim ? `${nm(D.victim[0])} (${D.victim[1]})` : '–'],
    ['Onu en çok öldüren', D.killer ? `${nm(D.killer[0])} (${D.killer[1]})` : '–'],
    ['En iyi arkadaşı', D.mate ? `${nm(D.mate.id)} (%${Math.round(100 * D.mate.wp)})` : '–'],
    ['K / D / A', `${D.k} / ${D.d} / ${D.a}`],
  ];
  const TY = Y + 146, TW = 470, TH = 80;
  tiles.forEach(([l, v], i) => {
    const x = 60 + (i % 2) * (TW + 20), y = TY + Math.floor(i / 2) * (TH + 12);
    c.fillStyle = PANEL; c.fillRect(x, y, TW, TH);
    c.fillStyle = RED; c.fillRect(x, y, 5, TH);
    c.fillStyle = MUT; c.font = `600 19px ${body}`; c.fillText(up(l), x + 22, y + 29);
    c.fillStyle = TXT; fit(v, TW - 44, 700, 30, body, 18); c.fillText(v, x + 22, y + 64);
  });
  c.fillStyle = MUT; c.font = `500 20px ${body}`; c.fillText(location.host + location.pathname, 60, H - 18);
}
function wireWrapped(p) {
  const cv = document.getElementById('wr-cv');
  if (!cv) return;
  const draw = () => drawWrapped(p);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(draw);
  draw();
  document.getElementById('wr-month').onchange = (e) => { S.ui.wr.month = e.target.value; draw(); };
  const file = () => `${p.name}-${S.ui.wr.month}.png`.replace(/[^\w.-]+/g, '_');
  document.getElementById('wr-dl').onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = file(); a.click(); };
  document.getElementById('wr-share').onclick = () => cv.toBlob(async (b) => {
    const f = new File([b], file(), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: `${p.name}, ${monthName(S.ui.wr.month)}` }); } catch (e) {}
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = file(); a.click();
      alertBox('Bu tarayıcı doğrudan paylaşımı desteklemiyor, kart indirildi. WhatsApp\'tan görsel olarak gönderebilirsin.');
    }
  }, 'image/png');
}
function alertBox(msg) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.appendChild(d);
  setTimeout(() => d.remove(), 4500);
}
