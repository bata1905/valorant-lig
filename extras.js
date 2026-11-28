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
