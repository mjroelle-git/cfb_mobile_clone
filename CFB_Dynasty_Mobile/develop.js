/* ============================================================
   Dynasty HQ — player development (DHQ.develop) — v0.7
   XP-based growth: dev trait (~3x spread), age curve,
   position-specific rates, playing time + real game
   performance; trait upgrades; offseason weight gain.
   Guardrails: XP always allocates; no position-change penalty.
   ============================================================ */
window.DHQ = window.DHQ || {};
(() => {
  const { randint, rand, chance, clamp, pick } = DHQ.rng;

  // ~3x spread Normal -> Elite (deep dive §8)
  const DEV_MULT = { Normal:0.9, Impact:1.6, Star:2.5, Elite:3.4 };
  // age: younger develops much faster (FR fastest, SR slowest)
  const AGE_MULT = { FR:1.30, "RS-FR":1.25, SO:1.15, JR:1.0, SR:0.70 };
  // position-specific XP (OL up, QB slight up, DE/LB down) — flat adjustments
  const POS_XP  = { OT:6, IOL:6, QB:2, TE:1, RB:0, WR:0, CB:-1, S:-1, DT:-2, EDGE:-4, LB:-4, ATH:0, K:0, P:0 };
  // offseason weight gain by position; younger players bulk up more
  const WT_GAIN = { OT:[4,9], IOL:[4,9], DT:[3,8], EDGE:[2,6], TE:[2,6], LB:[2,5], RB:[1,4], S:[1,4], QB:[1,3], WR:[1,3], CB:[1,3], ATH:[1,4], K:[0,1], P:[0,1] };

  // performance contribution from a player's season stat line
  function perfScore(p){
    const s = p.seasonStats; if (!s || !s.gp) return 0;
    let v = 0;
    v += (s.passYd||0)*0.010 + (s.passTD||0)*2 - (s.int||0)*1;
    v += (s.rushYd||0)*0.015 + (s.rushTD||0)*2.5;
    v += (s.recYd||0)*0.015 + (s.recTD||0)*2.5;
    v += (s.tkl||0)*0.40 + (s.sack||0)*3 + (s.intD||0)*4;
    return v;
  }

  // total offseason XP — ALWAYS > 0 (no zero-XP bug)
  function xpFor(p, devPerk, isStarter, facMult, rsdev){
    const base = 100;
    const dev  = DEV_MULT[p.dev] || 1;
    const age  = AGE_MULT[p.year] || 1;
    const motivator = 1 + (devPerk||0)*0.08;      // Player Developer (Motivator) coach bonus
    const fac  = facMult || 1;                    // Athletic Facilities attribute
    const rs   = (["FR","RS-FR"].includes(p.year)) ? (1 + (rsdev||0)*0.08) : 1;  // Redshirt Guru perk
    const pos  = POS_XP[p.pos] || 0;
    const pt   = isStarter ? 45 : 12;             // playing time: starters earn more
    const perf = clamp(perfScore(p), 0, 120);     // real in-game performance
    return Math.max(40, Math.round(base*dev*age*motivator*fac*rs + pos + pt + perf));
  }

  // convert XP -> OVR growth; smooth, with diminishing returns near the ceiling (20-tier feel)
  function growthFromXP(p, xp){
    const room = Math.max(0, p.pot - p.ovr);
    if (room <= 0) return 0;
    let g = xp / 55;
    g = g * (room / (room + 3));                   // taper as you approach potential
    return clamp(Math.round(g), 0, room);
  }

  // trait upgrades — harder at higher tiers; helped by Motivator, performance & youth
  function tryTrait(p, devPerk, perf, breakout){
    const up = { Normal:"Impact", Impact:"Star", Star:"Elite" }[p.dev];
    if (!up) return null;
    const base  = { Normal:0.12, Impact:0.07, Star:0.03 }[p.dev];
    const bonus = (devPerk||0)*0.02 + (breakout||0)*0.03 + clamp(perf/300, 0, 0.08) + (["FR","RS-FR","SO"].includes(p.year) ? 0.02 : 0);
    if (chance(base + bonus)){ p.dev = up; return up; }
    return null;
  }

  function weightGain(p){
    if (p.weight == null) return 0;
    const youth = ["FR","RS-FR","SO"].includes(p.year) ? 1.0 : 0.5;
    const r = WT_GAIN[p.pos] || [1,3];
    const g = Math.round(randint(r[0], r[1]) * youth);
    p.weight += g;
    return g;
  }

  // 20 skill-group tiers (display): OVR 50..99 -> tier 1..20
  function tier(ovr){ return clamp(Math.round((ovr - 50) / 2.5) + 1, 1, 20); }

  // Apply a full offseason of development to every active player; returns a report.
  function developRoster(st, devPerk){
    const report = [];
    const facMult = (DHQ.program && st.school) ? DHQ.program.facilitiesXpMult(st.school) : 1;
    const cp = (st.coach && st.coach.perks) || {};
    const breakout = cp.breakout||0, rsdev = cp.rsdev||0;
    const byPos = {};
    st.roster.forEach(p=>{ if (p.status==="active") (byPos[p.pos]=byPos[p.pos]||[]).push(p); });
    Object.values(byPos).forEach(arr=>{ arr.sort((a,b)=>b.ovr-a.ovr); arr.forEach((p,i)=> p.starter = i<2); });

    st.roster.forEach(p=>{
      if (p.status!=="active") return;
      const perf = perfScore(p);
      const xp = xpFor(p, devPerk, p.starter, facMult, rsdev);
      const g  = growthFromXP(p, xp);
      p.lastOvr = p.ovr;
      p.devXP = xp;
      p.ovr = clamp(Math.min(p.pot, p.ovr + g), p.ovr, 99);
      const traitUp = tryTrait(p, devPerk, perf, breakout);
      const wg = weightGain(p);
      report.push({ id:p.id, name:p.name, pos:p.pos, year:p.year, from:p.lastOvr, to:p.ovr, gain:g, xp, traitUp, wg, dev:p.dev });
    });
    report.sort((a,b)=> b.gain-a.gain || b.xp-a.xp);
    return report;
  }

  DHQ.develop = { developRoster, xpFor, perfScore, growthFromXP, tier, DEV_MULT, AGE_MULT, POS_XP };
})();
