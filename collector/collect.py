"""Valorant custom maç toplayıcı.

GitHub Actions üzerinde çalışır. HenrikDev API'den lig oyuncularının son custom
maçlarını çeker, sadeleştirir ve data/matches.json dosyasına ekler.
Anahtar HENRIK_KEY ortam değişkeninden (GitHub secret) okunur.
"""
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

BASE = "https://api.henrikdev.xyz"
REGION = "eu"
PLATFORM = "console"
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MATCHES_FILE = DATA / "matches.json"
CONFIG_FILE = DATA / "config.json"
SCHEMA = 2  # veri biçimi sürümü; eski kayıtlar yeniden çekilir
SLEEP = 4  # istekler arası bekleme (dakikada 30 istek sınırı)

KEY = os.environ.get("HENRIK_KEY", "").strip()


def get(path):
    for attempt in range(5):
        req = urllib.request.Request(
            BASE + path, headers={"Authorization": KEY, "User-Agent": "valorant-lig"}
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                reset = e.headers.get("x-ratelimit-reset") or "60"
                try:
                    wait = int(float(reset))
                except ValueError:
                    wait = 60
                wait = min(max(wait, 5), 120) + 2
                print(f"  sınır aşıldı, {wait} sn bekleniyor")
                time.sleep(wait)
                continue
            if e.code in (400, 403, 404):
                print(f"  HTTP {e.code}: {path}")
                return None
            print(f"  HTTP {e.code}, tekrar deneniyor")
            time.sleep(10)
        except Exception as e:  # ağ hatası
            print(f"  hata: {e}, tekrar deneniyor")
            time.sleep(10)
    return None


def is_custom(m):
    q = (m.get("metadata") or {}).get("queue") or {}
    name = (q.get("name") or "").lower()
    return "custom" in name or (q.get("id") or "") in ("", "custom")


def map_name(m):
    return (((m.get("metadata") or {}).get("map")) or {}).get("name") or "?"


def weapon_label(w):
    w = w or {}
    name, typ = w.get("name"), (w.get("type") or "")
    if name:
        return name, typ
    if typ == "Melee":
        return "Bıçak", typ
    if typ == "Bomb":
        return "Spike", typ
    return "Diğer", typ


def slim(m):
    md = m["metadata"]
    teams = {}
    for t in m.get("teams") or []:
        rounds = t.get("rounds") or {}
        teams[t["team_id"]] = {"won": bool(t.get("won")), "rw": rounds.get("won", 0)}
    max_rw = max([t["rw"] for t in teams.values()] or [0])
    players = []
    for p in m.get("players") or []:
        st = p.get("stats") or {}
        dmg = st.get("damage") or {}
        players.append({
            "p": p["puuid"], "n": p.get("name"), "t": p.get("tag"),
            "team": p.get("team_id"),
            "ag": (p.get("agent") or {}).get("name"),
            "sc": st.get("score", 0), "k": st.get("kills", 0),
            "d": st.get("deaths", 0), "a": st.get("assists", 0),
            "hs": st.get("headshots", 0), "bs": st.get("bodyshots", 0),
            "ls": st.get("legshots", 0),
            "dd": dmg.get("dealt", 0), "dr": dmg.get("received", 0),
        })
    rounds = []
    for r in m.get("rounds") or []:
        plant = r.get("plant") or {}
        defuse = r.get("defuse") or {}
        lv = {}
        for s in r.get("stats") or []:
            pu = (s.get("player") or {}).get("puuid")
            if pu:
                lv[pu] = ((s.get("economy") or {}).get("loadout_value")) or 0
        rounds.append({
            "w": r.get("winning_team"), "res": r.get("result"),
            "ps": ((plant.get("player") or {}).get("puuid")) if plant else None,
            "site": plant.get("site") if plant else None,
            "df": ((defuse.get("player") or {}).get("puuid")) if defuse else None,
            "lv": lv,
        })
    kills = []
    for k in m.get("kills") or []:
        killer = (k.get("killer") or {}).get("puuid")
        loc = k.get("location") or {}
        kx = ky = None
        for pl in k.get("player_locations") or []:
            if (pl.get("player") or {}).get("puuid") == killer:
                kx, ky = (pl.get("location") or {}).get("x"), (pl.get("location") or {}).get("y")
        wname, wtype = weapon_label(k.get("weapon"))
        victim = (k.get("victim") or {}).get("puuid")
        vteam = (k.get("victim") or {}).get("team")
        nd = None
        if loc.get("x") is not None:
            for pl in k.get("player_locations") or []:
                pp = pl.get("player") or {}
                if pp.get("team") == vteam and pp.get("puuid") != victim:
                    l2 = pl.get("location") or {}
                    if l2.get("x") is None:
                        continue
                    d = ((l2["x"] - loc["x"]) ** 2 + (l2["y"] - loc["y"]) ** 2) ** 0.5
                    nd = d if nd is None or d < nd else nd
        kills.append({
            "r": k.get("round", 0), "t": k.get("time_in_round_in_ms", 0),
            "k": killer, "v": (k.get("victim") or {}).get("puuid"),
            "a": [a.get("puuid") for a in (k.get("assistants") or []) if a.get("puuid")],
            "w": wname, "wt": wtype,
            "x": loc.get("x"), "y": loc.get("y"), "kx": kx, "ky": ky,
            "nd": round(nd) if nd is not None else None,
        })
    return {
        "v": SCHEMA, "id": md["match_id"], "start": md.get("started_at"), "map": map_name(m),
        "completed": max_rw >= 13, "teams": teams, "players": players,
        "rounds": rounds, "kills": kills,
    }


def accept(m):
    if not m or "metadata" not in m:
        return False
    if not is_custom(m):
        return False
    if map_name(m).lower().startswith("skirmish"):
        return False
    return True


def main():
    if not KEY:
        print("HENRIK_KEY tanımlı değil (GitHub > Settings > Secrets).")
        sys.exit(1)
    config = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    store = {"meta": {}, "matches": []}
    if MATCHES_FILE.exists():
        store = json.loads(MATCHES_FILE.read_text(encoding="utf-8"))
    have = {m["id"]: m for m in store.get("matches", [])}
    excluded = set(config.get("exclude_match_ids", []))
    before = len(have)
    changed = [False]

    def add(raw):
        if not accept(raw):
            return
        mid = raw["metadata"]["match_id"]
        if mid in have or mid in excluded:
            return
        have[mid] = slim(raw)
        print(f"  + {have[mid]['start'][:16]} {have[mid]['map']}")

    # 0) Eski biçimdeki kayıtları ID ile yeniden çek
    for mid, m in list(have.items()):
        if m.get("v") == SCHEMA:
            continue
        print(f"Yeniden çekiliyor: {mid}")
        j = get(f"/valorant/v4/match/{REGION}/{mid}")
        if j and j.get("data") and accept(j["data"]):
            have[mid] = slim(j["data"])
            changed[0] = True
        time.sleep(SLEEP)

    # 1) ID ile bilinen eski maçlar
    for mid in config.get("seed_match_ids", []):
        if mid in have or mid in excluded:
            continue
        print(f"ID ile maç: {mid}")
        j = get(f"/valorant/v4/match/{REGION}/{mid}")
        if j and j.get("data"):
            add(j["data"])
        time.sleep(SLEEP)

    # 2) Oyuncuların son custom maçları
    count = {}
    latest = {}
    for m in have.values():
        for p in m["players"]:
            count[p["p"]] = count.get(p["p"], 0) + 1
            latest[p["p"]] = (p["n"], p["t"])
    names = [tuple(s.split("#", 1)) for s in config.get("seed_players", [])]
    min_games = config.get("collect_min_games", 2)
    for pu, c in sorted(count.items(), key=lambda x: -x[1]):
        if c >= min_games and latest[pu] not in names:
            names.append(latest[pu])
    for name, tag in names:
        print(f"Oyuncu: {name}#{tag}")
        path = (f"/valorant/v4/matches/{REGION}/{PLATFORM}/"
                f"{urllib.parse.quote(name)}/{urllib.parse.quote(tag)}?mode=custom&size=10")
        j = get(path)
        for raw in (j or {}).get("data") or []:
            add(raw)
        time.sleep(SLEEP)

    matches = sorted(have.values(), key=lambda m: m["start"] or "")
    if len(matches) == before and not changed[0] and MATCHES_FILE.exists():
        print("Yeni maç yok")
        return
    store = {
        "meta": {"updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                 "count": len(matches)},
        "matches": matches,
    }
    MATCHES_FILE.write_text(json.dumps(store, ensure_ascii=False, separators=(",", ":")),
                            encoding="utf-8")
    print(f"Bitti: {before} -> {len(matches)} maç")


if __name__ == "__main__":
    main()
