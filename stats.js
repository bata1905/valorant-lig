// Saf istatistik hesapları (DOM yok). Tarayıcıda window.VStats, Node'da module.exports.
(function (root) {
  const START_RATING = 1000;
  const RATING_SCALE = 50; // lobi ortalamasının %10 üstü = +5 puan
  const WIN_BONUS = 10; // güçlü takımı yenen ~+8, favori olarak kazanan ~+2
  const ISO_DIST = 2500; // ~25 metre: en yakın takım arkadaşından bu kadar uzakta ölmek 'yalnız ölüm'
  const TRADE_MS = 5000;

  function emptyPlayer(p) {
    return {
      puuid: p.p, name: p.n, tag: p.t,
      games: 0, completed: 0, wins: 0, losses: 0,
      kills: 0, deaths: 0, assists: 0, score: 0, rounds: 0,
      hs: 0, bs: 0, ls: 0, dmg: 0, dmgRecv: 0,
      fb: 0, fd: 0, kastRounds: 0, k3: 0, k4: 0, aces: 0,
      clutchAtt: 0, clutchWon: 0, plants: 0, defuses: 0,
      ecoKills: 0,
      agents: {}, maps: {}, weapons: {}, killsOn: {}, deathsBy: {}, mates: {},
      rating: START_RATING, ratingHist: [], form: [],
      streak: 0, bestWinStreak: 0, matchIds: [], best: {},
    };
  }

  function nightKey(iso) {
    // Gece 06:00'ya kadar oynanan maçlar önceki günün gecesine sayılır (İstanbul, UTC+3)
    const d = new Date(new Date(iso).getTime() + 3 * 3600e3 - 6 * 3600e3);
    return d.toISOString().slice(0, 10);
  }

  // İki geçiş: önce herkesin ortalama Etki'si bulunur, sonra kill'ler ölen oyuncunun
  // gücüne göre ağırlıklandırılarak puan yeniden hesaplanır (güçlü oyuncuyu öldürmek daha değerli).
  function compute(matches, opts) {
    opts = opts || {};
    const first = computeInner(matches, opts, null);
    const w = {};
    Object.values(first.players).forEach((p) => {
      w[p.puuid] = Math.max(0.6, Math.min(1.6, p.games >= 2 ? p.impact : 1));
    });
    const res = computeInner(matches, opts, w);
    res.victimWeight = w;
    res.viewCal = calibrateView(matches);
    return res;
  }

  // Ölenin baktığı yönün hangi eksen düzenine göre verildiğini veriden bulur:
  // çoğu düelloda ölen katile bakıyordur, ortalama açıyı en küçük yapan düzen doğrudur.
  function calibrateView(matches) {
    const samples = [];
    matches.forEach((m) => m.kills.forEach((k) => {
      if (k.vv == null || k.kx == null || k.x == null) return;
      const dx = k.kx - k.x, dy = k.ky - k.y;
      if (dx * dx + dy * dy < 300 * 300) return;
      samples.push([k.vv, Math.atan2(dy, dx)]);
    }));
    if (samples.length < 30) return null;
    let best = null;
    [1, -1].forEach((sg) => [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((off) => {
      let sum = 0;
      samples.forEach(([v, a]) => { sum += angDiff(sg * v + off, a); });
      const mean = sum / samples.length;
      if (!best || mean < best.mean) best = { sg, off, mean };
    }));
    return best;
  }
  function angDiff(a, b) { let d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; }
  const AMBUSH_ANGLE = (110 * Math.PI) / 180; // ölen, katile 110°'den fazla sırtını dönmüşse pusu

  function computeInner(matches, opts, vw) {
    const viewCal = calibrateView(matches);
    const minGames = opts.minGames || 3;
    const P = {};
    const ms = matches.slice().sort((a, b) => (a.start < b.start ? -1 : 1));
    const weaponTotals = {};
    const mapTotals = {};
    const records = [];
    const pairStats = {}; // "a|b" -> {g,w}

    for (const m of ms) {
      // Teslim (FF) edilen maçlar: "Surrendered" raundları gerçekte oynanmadı, atılır;
      // maç teslim alan takımın galibiyeti sayılır.
      if (m.rounds.some((r) => r.res === 'Surrendered')) {
        m.ff = true;
        m.rounds = m.rounds.filter((r) => r.res !== 'Surrendered');
        if (Object.values(m.teams).some((t) => t.won)) m.completed = true;
      }
      const roundsTotal = m.rounds.length || Object.values(m.teams).reduce((s, t) => s + t.rw, 0) || 1;
      const teamOf = {};
      const teamSize = {};
      m.players.forEach((p) => {
        teamOf[p.p] = p.team;
        teamSize[p.team] = (teamSize[p.team] || 0) + 1;
        if (!P[p.p]) P[p.p] = emptyPlayer(p);
        P[p.p].name = p.n; P[p.p].tag = p.t;
      });
      const winner = Object.keys(m.teams).find((t) => m.teams[t].won) || null;
      m._roundsTotal = roundsTotal;
      m._winner = winner;
      m._acs = {};
      m._extra = {};

      mapTotals[m.map] = mapTotals[m.map] || { games: 0, completed: 0, kills: 0, matches: [] };
      mapTotals[m.map].games++;
      if (m.completed) mapTotals[m.map].completed++;
      mapTotals[m.map].kills += m.kills.length;
      mapTotals[m.map].matches.push(m.id);

      // Oyuncu temel istatistikleri
      for (const p of m.players) {
        const s = P[p.p];
        s.games++; s.kills += p.k; s.deaths += p.d; s.assists += p.a;
        s.score += p.sc; s.rounds += roundsTotal;
        s.hs += p.hs; s.bs += p.bs; s.ls += p.ls; s.dmg += p.dd; s.dmgRecv += p.dr;
        s.matchIds.push(m.id);
        if (p.ag) s.agents[p.ag] = (s.agents[p.ag] || { g: 0, w: 0, k: 0, d: 0 }), s.agents[p.ag].g++, s.agents[p.ag].k += p.k, s.agents[p.ag].d += p.d;
        const mp = (s.maps[m.map] = s.maps[m.map] || { g: 0, w: 0, l: 0, k: 0, d: 0, score: 0, rounds: 0 });
        mp.g++; mp.k += p.k; mp.d += p.d; mp.score += p.sc; mp.rounds += roundsTotal;
        const acs = p.sc / roundsTotal;
        m._acs[p.p] = acs;
        m._extra[p.p] = { fb: 0, fd: 0, kast: 0, k3: 0, k4: 0, aces: 0, clutch: 0, untraded: 0, iso: 0, critFd: 0, critTxt: null, clutchLost: 0 };
        records.push({ type: 'kills', val: p.k, p: p.p, m: m.id });
        records.push({ type: 'acs', val: acs, p: p.p, m: m.id });
        records.push({ type: 'dmg', val: p.dd, p: p.p, m: m.id });
        records.push({ type: 'deaths', val: p.d, p: p.p, m: m.id });
      }

      // Kill olayları
      const byRound = {};
      m._wk = {};
      m.players.forEach((p) => (m._wk[p.p] = 0));
      for (const k of m.kills) {
        (byRound[k.r] = byRound[k.r] || []).push(k);
        weaponTotals[k.w] = weaponTotals[k.w] || { kills: 0, by: {} };
        weaponTotals[k.w].kills++;
        if (k.k && P[k.k]) {
          weaponTotals[k.w].by[k.k] = (weaponTotals[k.w].by[k.k] || 0) + 1;
          if (teamOf[k.k] !== teamOf[k.v]) {
            m._wk[k.k] += vw ? vw[k.v] || 1 : 1;
            const s = P[k.k];
            // Pusu (fare) kill: katil, en yakın takım arkadaşından 25 metreden uzakta tek başına
            if (k.knd != null && k.knd > ISO_DIST) {
              s.ambush = (s.ambush || 0) + 1;
              k._ambush = true;
            }
            s.weapons[k.w] = (s.weapons[k.w] || 0) + 1;
            const on = (s.killsOn[k.v] = s.killsOn[k.v] || { total: 0, w: {} });
            on.total++; on.w[k.w] = (on.w[k.w] || 0) + 1;
            if (P[k.v]) {
              const by = (P[k.v].deathsBy[k.k] = P[k.v].deathsBy[k.k] || { total: 0, w: {} });
              by.total++; by.w[k.w] = (by.w[k.w] || 0) + 1;
            }
          }
        }
      }

      // Raund bazlı: ilk kan, KAST, çoklu kill, clutch, eko
      const runScore = {}; Object.keys(m.teams).forEach((t) => (runScore[t] = 0));
      for (let r = 0; r < roundsTotal; r++) {
        const rk = (byRound[r] || []).slice().sort((a, b) => a.t - b.t);
        const rd = m.rounds[r] || {};
        const killsBy = {}, assisted = new Set(), died = {};
        rk.forEach((k) => {
          if (k.k && teamOf[k.k] !== teamOf[k.v]) killsBy[k.k] = (killsBy[k.k] || 0) + 1;
          (k.a || []).forEach((a) => assisted.add(a));
          died[k.v] = k;
        });
        const first = rk.find((k) => k.k && teamOf[k.k] !== teamOf[k.v]);
        if (first) {
          if (P[first.k]) { P[first.k].fb++; m._extra[first.k].fb++; }
          if (P[first.v]) { P[first.v].fd++; m._extra[first.v].fd++; }
          const sc = Object.values(runScore);
          const crit = Math.min(...sc) >= 10 || Math.max(...sc) >= 12;
          if (crit && m._extra[first.v]) {
            const ex = m._extra[first.v];
            ex.critFd++;
            if (!ex.critTxt) { const t = teamOf[first.v], o = Object.keys(runScore).find((x) => x !== t); ex.critTxt = `${runScore[t]}-${runScore[o]}`; }
          }
        }
        // Trade: ölen oyuncunun katili 5 sn içinde ölen oyuncunun takımı tarafından öldürüldüyse
        const traded = new Set();
        rk.forEach((k) => {
          if (!k.k) return;
          const revenge = rk.find((k2) => k2.v === k.k && k2.t >= k.t && k2.t - k.t <= TRADE_MS && teamOf[k2.k] === teamOf[k.v]);
          if (revenge) traded.add(k.v);
        });
        for (const p of m.players) {
          const kast = killsBy[p.p] || assisted.has(p.p) || !died[p.p] || traded.has(p.p);
          if (died[p.p]) {
            const ex = m._extra[p.p];
            if (!traded.has(p.p)) ex.untraded++;
            if (died[p.p].nd != null && died[p.p].nd > ISO_DIST) ex.iso++;
          }
          if (kast) { P[p.p].kastRounds++; m._extra[p.p].kast++; }
          const n = killsBy[p.p] || 0;
          const enemies = Object.keys(teamSize).filter((t) => t !== p.team).reduce((s, t) => s + teamSize[t], 0);
          if (n >= enemies && enemies > 0) { P[p.p].aces++; m._extra[p.p].aces++; }
          else if (n === 4) { P[p.p].k4++; m._extra[p.p].k4++; }
          else if (n === 3) { P[p.p].k3++; m._extra[p.p].k3++; }
        }
        // Clutch: takımda tek kişi kaldığında rakipte en az 1 kişi varsa
        const alive = {};
        m.players.forEach((p) => { alive[p.team] = alive[p.team] || new Set(); alive[p.team].add(p.p); });
        const clutchOf = {};
        for (const k of rk) {
          const vt = teamOf[k.v];
          if (alive[vt]) alive[vt].delete(k.v);
          for (const t of Object.keys(alive)) {
            if (clutchOf[t]) continue;
            const enemiesAlive = Object.keys(alive).filter((x) => x !== t).reduce((s, x) => s + alive[x].size, 0);
            if (alive[t].size === 1 && enemiesAlive >= 1 && teamSize[t] > 1) {
              clutchOf[t] = { p: [...alive[t]][0], vs: enemiesAlive };
            }
          }
        }
        for (const t of Object.keys(clutchOf)) {
          const c = clutchOf[t];
          if (!P[c.p]) continue;
          P[c.p].clutchAtt++;
          if (rd.w === t) { P[c.p].clutchWon++; m._extra[c.p].clutch++; }
          else m._extra[c.p].clutchLost++;
        }
        if (rd.w && runScore[rd.w] != null) runScore[rd.w]++;
        if (rd.ps && P[rd.ps]) P[rd.ps].plants++;
        if (rd.df && P[rd.df]) P[rd.df].defuses++;
        // Eko kill: oyuncunun kıyafet değeri rakibinin yarısından azken aldığı kill
        if (rd.lv) {
          rk.forEach((k) => {
            if (k.k && P[k.k] && teamOf[k.k] !== teamOf[k.v]) {
              const a = rd.lv[k.k], b = rd.lv[k.v];
              if (a != null && b != null && b > 0 && a < b * 0.5) P[k.k].ecoKills++;
            }
          });
        }
      }

      for (const p of m.players) {
        const e = m._extra[p.p];
        records.push({ type: 'fb', val: e.fb, p: p.p, m: m.id });
        records.push({ type: 'aces', val: e.aces, p: p.p, m: m.id });
      }

      // Performans puanı: her maçta lobi ortalamasına göre kill (ağırlıklı), hasar, KAST ve ilk kan.
      // Takım sonucu sadece küçük bir bonus/ceza; kötü takıma düşmek puanı fazla etkilemez.
      const n = m.players.length;
      const avgWk = m.players.reduce((x, p) => x + m._wk[p.p], 0) / n || 1;
      const avgAdr = m.players.reduce((x, p) => x + p.dd, 0) / n / roundsTotal || 1;
      const avgKast = m.players.reduce((x, p) => x + m._extra[p.p].kast, 0) / n / roundsTotal || 1;
      const weight = Math.min(1, roundsTotal / 20);
      m._ratingDelta = {};
      m._impact = {};
      const teamAvg = {};
      Object.keys(m.teams).forEach((t) => {
        const ps = m.players.filter((p) => p.team === t);
        teamAvg[t] = ps.reduce((x, p) => x + P[p.p].rating, 0) / (ps.length || 1);
      });
      m._winProb = {};
      Object.keys(m.teams).forEach((t) => {
        const o = Object.keys(m.teams).find((x) => x !== t);
        m._winProb[t] = 1 / (1 + Math.pow(10, ((teamAvg[o] || 1000) - teamAvg[t]) / 400));
      });
      for (const p of m.players) {
        const s = P[p.p], e = m._extra[p.p];
        const impact = 0.55 * (m._wk[p.p] / avgWk) + 0.25 * (p.dd / roundsTotal / avgAdr)
          + 0.12 * (e.kast / roundsTotal / avgKast) + 0.08 * (1 + (3 * (e.fb - e.fd)) / roundsTotal);
        m._impact[p.p] = impact;
        let delta = RATING_SCALE * (impact - 1);
        if (m.completed && winner) delta += WIN_BONUS * ((p.team === winner ? 1 : 0) - m._winProb[p.team]) * 2;
        delta = Math.max(-40, Math.min(40, delta)) * weight;
        s.rating += delta;
        s.impactSum = (s.impactSum || 0) + impact;
        s.impHist = s.impHist || [];
        s.impHist.push({ m: m.id, v: impact, date: m.start, map: m.map });
        s.untraded = (s.untraded || 0) + e.untraded;
        s.isoDeaths = (s.isoDeaths || 0) + e.iso;
        m._ratingDelta[p.p] = delta;
        s.ratingHist.push({ m: m.id, r: s.rating, d: delta, date: m.start });
      }

      // Maçı satan / taşıyan analizi
      const per20 = 20 / roundsTotal;
      const reasonsOf = (p) => {
        const e = m._extra[p.p], imp = m._impact[p.p];
        const r = [];
        if (e.critFd) r.push({ w: 3 * e.critFd, t: `${e.critTxt}'de ilk kanı verdi` });
        if (e.fd >= 2) r.push({ w: 1.2 * e.fd * per20, t: `${e.fd} raundda ilk ölen oldu` });
        if (e.iso >= 2) r.push({ w: 1.1 * e.iso * per20, t: `${e.iso} kez takımından uzakta tek başına öldü` });
        if (e.untraded >= 4) r.push({ w: 0.5 * e.untraded * per20, t: `${e.untraded} ölümünün intikamı alınmadı` });
        if (e.clutchLost) r.push({ w: 1.5 * e.clutchLost, t: `${e.clutchLost} clutch kaybetti` });
        if (imp < 0.85) r.push({ w: 12 * (0.85 - imp), t: `lobi ortalamasının %${Math.round((1 - imp) * 100)} altında oynadı` });
        return r.sort((a, b) => b.w - a.w);
      };
      const pool = m.completed && winner ? m.players.filter((p) => p.team !== winner) : m.players;
      let worst = null;
      pool.forEach((p) => {
        const rs = reasonsOf(p);
        const ts = rs.reduce((x, y) => x + y.w, 0);
        if (!worst || ts > worst.ts) worst = { p: p.p, ts, reasons: rs.slice(0, 3).map((x) => x.t) };
      });
      if (worst && worst.ts > 0) {
        m._throw = worst;
        P[worst.p].throws = (P[worst.p].throws || 0) + 1;
      }
      const carryPool = m.completed && winner ? m.players.filter((p) => p.team === winner) : m.players;
      const carry = carryPool.slice().sort((a, b) => m._impact[b.p] - m._impact[a.p])[0];
      if (carry) {
        const e = m._extra[carry.p];
        const bits = [`${carry.k} kill`];
        if (e.fb >= 3) bits.push(`${e.fb} ilk kan`);
        if (e.clutch) bits.push(`${e.clutch} clutch`);
        if (e.aces) bits.push('ace');
        m._carry = { p: carry.p, impact: m._impact[carry.p], txt: bits.join(', ') };
        P[carry.p].carries = (P[carry.p].carries || 0) + 1;
      }

      // Tamamlanan maçlar: galibiyet, ikili sinerji
      if (m.completed && winner) {
        mapTotals[m.map].lastWinner = winner;
        const teams = {};
        m.players.forEach((p) => { (teams[p.team] = teams[p.team] || []).push(p); });
        for (const p of m.players) {
          const s = P[p.p];
          const won = p.team === winner;
          s.completed++;
          if (won) { s.wins++; s.streak = s.streak >= 0 ? s.streak + 1 : 1; }
          else { s.losses++; s.streak = s.streak <= 0 ? s.streak - 1 : -1; }
          s.bestWinStreak = Math.max(s.bestWinStreak, s.streak);
          s.form.push(won ? 'W' : 'L');
          s.maps[m.map][won ? 'w' : 'l']++;
          if (p.ag && s.agents[p.ag]) s.agents[p.ag].w += won ? 1 : 0;
          for (const q of teams[p.team]) {
            if (q.p === p.p) continue;
            const mt = (s.mates[q.p] = s.mates[q.p] || { g: 0, w: 0 });
            mt.g++; if (won) mt.w++;
            if (p.p < q.p) {
              const key = p.p + '|' + q.p;
              const ps = (pairStats[key] = pairStats[key] || { g: 0, w: 0 });
              ps.g++; if (won) ps.w++;
            }
          }
        }
        records.push(...m.players.map((p) => ({ type: 'streak', val: P[p.p].streak, p: p.p, m: m.id })));
      }
    }

    // Türetilmiş değerler
    const totalWeaponKills = Object.values(weaponTotals).reduce((s, w) => s + w.kills, 0) || 1;
    for (const s of Object.values(P)) {
      s.kd = s.kills / Math.max(1, s.deaths);
      s.acs = s.score / Math.max(1, s.rounds);
      s.adr = s.dmg / Math.max(1, s.rounds);
      s.hsPct = (100 * s.hs) / Math.max(1, s.hs + s.bs + s.ls);
      s.kast = (100 * s.kastRounds) / Math.max(1, s.rounds);
      s.winPct = (100 * s.wins) / Math.max(1, s.completed);
      s.kpr = s.kills / Math.max(1, s.rounds);
      s.impact = (s.impactSum || 0) / Math.max(1, s.games);
      s.league = s.games >= minGames;
      let nem = null, vic = null;
      for (const [q, v] of Object.entries(s.deathsBy)) if (!nem || v.total > nem.n) nem = { p: q, n: v.total };
      for (const [q, v] of Object.entries(s.killsOn)) if (!vic || v.total > vic.n) vic = { p: q, n: v.total };
      s.nemesis = nem; s.victim = vic;
      const fav = Object.entries(s.weapons).sort((a, b) => b[1] - a[1])[0];
      s.favWeapon = fav ? fav[0] : null;
      const favAg = Object.entries(s.agents).sort((a, b) => b[1].g - a[1].g)[0];
      s.favAgent = favAg ? favAg[0] : null;
    }
    Object.values(weaponTotals).forEach((w) => (w.share = (100 * w.kills) / totalWeaponKills));

    const nights = {};
    ms.forEach((m) => { const n = nightKey(m.start); (nights[n] = nights[n] || []).push(m); });

    return { players: P, matches: ms, weapons: weaponTotals, maps: mapTotals, records, pairs: pairStats, nights };
  }

  // Elo'ya göre A takımının kazanma olasılığı
  function winProb(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }

  function synergy(pairs, a, b) {
    const key = a < b ? a + '|' + b : b + '|' + a;
    const s = pairs[key];
    if (!s) return 0;
    return (s.w - s.g / 2) / (s.g + 2); // -0.5..0.5 arası, az maçta küçük
  }

  // Oyuncunun gerçek gücü: maç başına Etki'den türetilir (birikmiş puan değil).
  // 1.00 etki = 1000; her 0.10 etki = 50 güç. Az maçı olanın etkisi ortalamaya çekilir.
  function strength(P, id) {
    const p = P[id];
    if (!p || !p.games || !p.impact) return START_RATING;
    const imp = (p.impact * p.games + 1 * 2) / (p.games + 2);
    return START_RATING + 500 * (imp - 1);
  }
  // Takım gücü: düz ortalama değil, iyi oyunculara daha çok ağırlık veren "yumuşak maksimum".
  // Geçmiş maçlarla test edildi: tek bir yıldız oyuncu takımı ortalamanın gösterdiğinden fazla taşıyor.
  // (Eski "kimin kiminle kazandığı" sinerjisi testte tahmini bozduğu için çıkarıldı.)
  const STAR_T = 150, PROB_SCALE = 300;
  function teamPower(P, pairs, t) {
    const ss = t.map((id) => strength(P, id));
    const avg = ss.reduce((a, b) => a + b, 0) / (ss.length || 1);
    const soft = START_RATING + STAR_T * Math.log(ss.reduce((a, x) => a + Math.exp((x - START_RATING) / STAR_T), 0) / (ss.length || 1));
    return { avg, power: soft };
  }
  function matchup(P, pairs, A, B) {
    const a = teamPower(P, pairs, A), b = teamPower(P, pairs, B);
    const prob = 1 / (1 + Math.pow(10, (b.power - a.power) / PROB_SCALE));
    return { ra: a.avg, rb: b.avg, pa: a.power, pb: b.power, prob };
  }

  // Dengeli takımlar: tüm bölünmeleri dener, kurallara (birlikte/ayrı) uymayanları atar,
  // en dengeli N tanesini döndürür.
  function balance(ids, P, pairs, top, rules) {
    top = top || 5;
    rules = rules || [];
    const n = ids.length;
    if (n < 2) return [];
    const half = Math.floor(n / 2);
    const results = [];
    const first = ids[0];
    const rest = ids.slice(1);
    const sizes = n % 2 === 0 ? [half] : [half, half + 1];
    const ok = (A) => rules.every((r) => {
      if (!ids.includes(r.a) || !ids.includes(r.b)) return true;
      const same = A.includes(r.a) === A.includes(r.b);
      return r.type === 'together' ? same : !same;
    });
    function rec(start, cur, size) {
      if (cur.length === size) {
        const A = [first, ...cur];
        if (!ok(A)) return;
        const B = ids.filter((x) => !A.includes(x));
        const mu = matchup(P, pairs, A, B);
        results.push({ A, B, ...mu, score: Math.abs(mu.prob - 0.5) });
        return;
      }
      for (let i = start; i < rest.length; i++) { cur.push(rest[i]); rec(i + 1, cur, size); cur.pop(); }
    }
    sizes.forEach((sz) => rec(0, [], sz - 1));
    results.sort((a, b) => a.score - b.score);
    return results.slice(0, top);
  }

  const api = { compute, winProb, balance, synergy, nightKey, strength, matchup, START_RATING };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VStats = api;
})(typeof window !== 'undefined' ? window : globalThis);
