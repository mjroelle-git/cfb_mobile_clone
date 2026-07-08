/* ============================================================
   Dynasty HQ — recruiting pipelines (DHQ.pipeline) — v0.10
   Geographic territories (Tier 1-5), TX/CA/FL sub-regions,
   home-field influence boost, close-to-home grades, and
   pipelines that strengthen as you sign from a region.
   ============================================================ */
window.DHQ = window.DHQ || {};
(() => {
  const { clamp, shuffle, randint } = DHQ.rng;

  // sub-region mapping for the three big states (by city)
  const TX = { Houston:"Houston TX", Katy:"Houston TX", Dallas:"DFW", "Fort Worth":"DFW", Allen:"DFW",
    Austin:"Central TX", "San Antonio":"Central TX", Waco:"Central TX", Tyler:"East TX", Midland:"West TX" };
  const CA = { "Los Angeles":"SoCal", "Long Beach":"SoCal", "Santa Ana":"SoCal", "San Diego":"San Diego",
    Sacramento:"NorCal", Oakland:"NorCal", Fresno:"Central CA" };
  const FL = { Miami:"South FL", "Fort Lauderdale":"South FL", Tampa:"West FL", Naples:"West FL", Bradenton:"West FL",
    Orlando:"Central FL", Lakeland:"Central FL", Jacksonville:"North FL" };
  const SUBREGIONS = { TX:["Houston TX","DFW","Central TX","East TX","West TX"], CA:["SoCal","San Diego","NorCal","Central CA"], FL:["South FL","West FL","Central FL","North FL"] };

  function regionOf(state, city){
    if (state==="TX") return TX[city] || "Central TX";
    if (state==="CA") return CA[city] || "SoCal";
    if (state==="FL") return FL[city] || "Central FL";
    return state || "??";
  }

  // recruit-rich regions used to build a program's national footprint
  const TALENT = ["Houston TX","DFW","Central TX","South FL","West FL","Central FL","SoCal","San Diego",
    "GA","OH","AL","LA","NC","VA","NJ","TN","MI","PA"];

  function initPipelines(school, team){
    const st = team ? team.st : "??", city = team ? team.city : "";
    const p = team ? team.p : (school.prestige||3);
    const home = regionOf(st, city);
    school.homeRegion = home;
    const pipes = {}; pipes[home] = 5;
    if (SUBREGIONS[st]) SUBREGIONS[st].forEach(r=>{ if (r!==home) pipes[r] = 3.5; });
    const nFoot = ({5:8,4:5,3:3,2:1,1:0})[p] || 0;
    const tierBase = ({5:4,4:3.5,3:3,2:2.5,1:2})[p] || 2.5;
    shuffle(TALENT.filter(r=>r!==home && !pipes[r])).slice(0, nFoot).forEach((r,i)=>{ pipes[r] = clamp(tierBase - i*0.25, 1.5, 4.5); });
    school.pipelines = pipes;
    return pipes;
  }

  function tierOf(school, region){ return (school.pipelines && school.pipelines[region]) || 1; }
  function influenceFactor(tier){ return 1 + clamp((tier-1),0,4)*0.13; }   // T1=1.00 … T5=1.52
  function closeToHomeGrade(tier){ return tier>=4.5?"A" : tier>=3.5?"B" : tier>=2.5?"C" : tier>=1.5?"D":"F"; }
  function strengthen(school, region, amt){
    if (!school.pipelines) school.pipelines = {};
    school.pipelines[region] = clamp((school.pipelines[region]||1) + (amt||0.35), 1, 5);
  }
  function tierLabel(tier){ return tier>=4.5?"T5" : tier>=3.5?"T4" : tier>=2.5?"T3" : tier>=1.5?"T2":"T1"; }

  DHQ.pipeline = { regionOf, SUBREGIONS, TALENT, initPipelines, tierOf, influenceFactor, closeToHomeGrade, strengthen, tierLabel };
})();
