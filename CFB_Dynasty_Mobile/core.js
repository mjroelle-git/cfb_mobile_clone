/* ============================================================
   Dynasty HQ — core: namespace, RNG, versioned save/load
   ============================================================ */
window.DHQ = window.DHQ || {};
(() => {
  // ---- RNG & helpers ----
  const rand = (a, b) => Math.random() * (b - a) + a;
  const randint = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randint(0, i);[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const weightedPick = (arr, wfn) => {
    let tot = 0; arr.forEach(x => tot += wfn(x));
    let r = Math.random() * tot;
    for (const x of arr){ r -= wfn(x); if (r <= 0) return x; }
    return arr[arr.length - 1];
  };

  DHQ.rng = { rand, randint, pick, chance, shuffle, clamp, weightedPick };

  // ---- Save / load with versioned migrations ----
  const SAVE_KEY = "dynastyHQ_save_v1";   // key kept stable; we migrate by data version
  const SAVE_VERSION = 3;

  // migrations[from] upgrades a save of version `from` to `from+1`
  const migrations = {
    2: (s) => {
      // v2 (pre-real-teams) -> v3: enrich school with team metadata
      s.school = s.school || {};
      if (!s.school.id) s.school.id = null;
      if (!s.school.nick) s.school.nick = s.school.nick || "";
      if (!s.school.abbr) s.school.abbr = (s.school.name||"D").replace(/[^A-Za-z]/g,"").slice(0,3).toUpperCase();
      if (!s.school.c1) s.school.c1 = "#ffb81c";
      if (!s.school.c2) s.school.c2 = "#0b1020";
      if (!s.school.conf) s.school.conf = s.school.conf || "IND";
      s.v = 3;
      return s;
    }
  };

  function migrate(s){
    let guard = 0;
    while ((s.v || 1) < SAVE_VERSION && guard++ < 20){
      const fn = migrations[s.v || 1];
      if (!fn) { s.v = SAVE_VERSION; break; }  // no path: stamp current (best effort)
      s = fn(s);
    }
    return s;
  }

  function save(state){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e){} }
  function load(){
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      let s = JSON.parse(raw);
      if ((s.v || 1) < SAVE_VERSION) s = migrate(s);
      return s;
    } catch(e){ return null; }
  }
  function wipe(){ try { localStorage.removeItem(SAVE_KEY); } catch(e){} }

  DHQ.store = { SAVE_KEY, SAVE_VERSION, save, load, wipe, migrate };
})();
