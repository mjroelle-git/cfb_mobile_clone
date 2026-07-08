/* ============================================================
   Dynasty HQ — recruiting funnel & dealbreakers (DHQ.recruit) v0.9
   Open -> Top 8 -> Top 5 -> Top 3 -> Deciding, Top-5 gating,
   dealbreaker satisfaction, and recruiting-battle detection.
   ============================================================ */
window.DHQ = window.DHQ || {};
(() => {
  const GR = { A:4, B:3, C:2, D:1, F:0 };
  const NEED = { 5:120, 4:96, 3:72, 2:54, 1:42 };

  function totalPoints(r){ return r.suitors.reduce((s,x)=>s+x.points,0); }
  function need(stars){ return NEED[stars] || 72; }

  function stage(r){
    const T = totalPoints(r), nd = need(r.stars);
    if (T < nd*0.35) return "Open";
    if (T < nd*0.60) return "Top 8";
    if (T < nd*0.80) return "Top 5";
    if (T < nd*1.00) return "Top 3";
    return "Deciding";
  }
  const STAGE_RANK = { "Open":0, "Top 8":1, "Top 5":2, "Top 3":3, "Deciding":4 };

  function ranked(r){ return r.suitors.slice().sort((a,b)=>b.points-a.points); }
  function inTopN(r, suitor, n){ return ranked(r).slice(0,n).indexOf(suitor) >= 0; }

  // does a school (with these motivation grades) satisfy the recruit's dealbreaker?
  function dealbreakerOK(r, grades){
    const db = r.dealbreaker; if (!db) return true;
    if (GR[grades[db]||"C"] >= 2) return true;                 // C+ on the dealbreaker
    if (r.swayMot && GR[grades[r.swayMot]||"F"] >= 3) return true; // swayed in a B+ alternative
    return false;
  }

  // tight race near commitment = a recruiting battle
  function battle(r){
    const rk = ranked(r); if (rk.length < 2) return false;
    const T = totalPoints(r); if (T < need(r.stars)*0.70) return false;
    return (rk[0].points - rk[1].points) / Math.max(1, rk[0].points) < 0.15;
  }

  DHQ.recruit = { GR, NEED, totalPoints, need, stage, STAGE_RANK, ranked, inTopN, dealbreakerOK, battle };
})();
