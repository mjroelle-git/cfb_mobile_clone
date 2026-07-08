/* ============================================================
   Dynasty HQ — program & school attributes (DHQ.program) — v0.8
   14-ish school attributes (fixed / dynamic / derived) that
   drive recruit motivation grades, development, and hours.
   Prestige RISES with success (designs out the regression bug).
   ============================================================ */
window.DHQ = window.DHQ || {};
(() => {
  const { randint, rand, clamp } = DHQ.rng;
  function hash(s){ let h=0; for(let i=0;i<(s||"").length;i++) h=(h*31 + s.charCodeAt(i))>>>0; return h; }

  const CONF_PRESTIGE = { SEC:92, B1G:90, B12:80, ACC:80, PAC:66, AAC:58, MWC:56, SBC:50, MAC:48, CUSA:46, IND:76 };

  const ATTR = [
    { id:"tradition",     name:"Program Tradition",  type:"fixed" },
    { id:"confPrestige",  name:"Conference Prestige",type:"fixed" },
    { id:"stadium",       name:"Stadium Atmosphere", type:"fixed" },
    { id:"academics",     name:"Academic Prestige",  type:"fixed" },
    { id:"campus",        name:"Campus Lifestyle",   type:"fixed" },
    { id:"facilities",    name:"Athletic Facilities",type:"dynamic" },
    { id:"brand",         name:"Brand Exposure",     type:"dynamic" },
    { id:"recruiting",    name:"Recruiting",         type:"dynamic" },
    { id:"proPotential",  name:"Pro Potential",      type:"dynamic" },
    { id:"coachPrestige", name:"Coach Prestige",     type:"derived" },
  ];

  function init(school, team){
    const p = team ? team.p : (school.prestige || 3);
    const h1 = hash(school.id||school.name), h2 = hash((school.id||"")+"x");
    school.attr = {
      tradition:    clamp(p*16 + randint(-6,6), 25, 99),
      confPrestige: CONF_PRESTIGE[school.conf] || 60,
      stadium:      clamp(p*15 + (h1%16), 30, 99),
      academics:    clamp(45 + (h1%45), 30, 99),
      campus:       clamp(45 + (h2%45), 30, 99),
      facilities:   clamp(p*14 + randint(-4,6), 25, 95),
      brand:        clamp(p*15 + (["SEC","B1G"].includes(school.conf)?6:0) + randint(-4,4), 22, 95),
      recruiting:   clamp(p*14 + randint(-4,4), 25, 92),
      proPotential: clamp(p*15 + randint(-4,4), 22, 95),
      coachPrestige: 40,
    };
    school.prestigeF = p;
    school.upgradePoints = school.upgradePoints || 0;
    return school.attr;
  }

  function valueToGrade(v){ return v>=86?"A":v>=76?"B":v>=66?"C":v>=56?"D":"F"; }
  function grade(school, id){ return valueToGrade((school.attr&&school.attr[id])||50); }

  // per-motivation A-F grades used by recruiting fit
  function motivationGrades(school, offPb){
    const a = school.attr || {};
    const contender = clamp((school.prestigeF||school.prestige||3)*15 + ((a.tradition||50)-50)*0.3, 0, 100);
    const proStyle = ["prostyle","westcoast","smashmouth"].includes(offPb) ? 80 : 60;
    const map = {
      "Brand Exposure": a.brand, "Path to the Pros": a.proPotential, "Academic Prestige": a.academics,
      "Conference Prestige": a.confPrestige, "Program Tradition": a.tradition, "Campus Lifestyle": a.campus,
      "Title Contender": contender, "Coach Stability": a.coachPrestige, "Pro-Style Scheme": proStyle,
      "Playing Time": 66, "Close to Home": 64
    };
    const g = {}; for (const m in map) g[m] = valueToGrade(map[m]==null?50:map[m]); return g;
  }

  function facilitiesXpMult(school){ const f=(school.attr&&school.attr.facilities)||50; return clamp(1 + (f-50)/280, 0.9, 1.18); }
  function recruitingHoursBonus(school){ const r=(school.attr&&school.attr.recruiting)||50; return Math.round(clamp((r-50)/4, -10, 30)); }
  function recruitingInfluenceMult(school){ const r=(school.attr&&school.attr.recruiting)||50; return clamp(1 + (r-50)/400, 0.88, 1.15); }

  function upgradeCost(v){ return 1 + Math.floor(clamp((v-50)/10, 0, 5)); }
  function canUpgrade(school, id){ const at=ATTR.find(a=>a.id===id); if(!at||at.type!=="dynamic") return false; const v=school.attr[id]; return v<95 && (school.upgradePoints||0) >= upgradeCost(v); }
  function upgrade(school, id){ if(!canUpgrade(school,id)) return false; const v=school.attr[id]; school.upgradePoints -= upgradeCost(v); school.attr[id]=clamp(v+4,0,95); return true; }

  // end-of-season: update derived attrs, prestige momentum, award upgrade points, re-derive grades
  function endSeasonUpdate(S, f){
    const a = S.school.attr; const c = S.coach;
    a.coachPrestige = clamp(35 + c.level*2.4 + (f&&f.wonTitle?8:0) + (f&&f.inPlayoff?4:0), 0, 99);
    const draftees = (f && f.draftees) || 0;
    a.proPotential = clamp(a.proPotential*0.97 + draftees*2.2 + 1.5, 20, 99);
    const wins = f ? f.wins||0 : 0;
    let dp = 0;
    if (f){ if (f.wonTitle) dp=0.35; else if (f.inPlayoff) dp=0.18; else if (f.rank&&f.rank<=15) dp=0.10; else if (wins>=9) dp=0.06; else if (wins<=4) dp=-0.10; else dp=-0.02; }
    S.school.prestigeF = clamp((S.school.prestigeF||S.school.prestige)+dp, 0.5, 5);
    S.school.prestige = clamp(Math.round(S.school.prestigeF), 1, 5);
    if (f){ if (f.wonTitle) a.tradition=clamp(a.tradition+3,0,99); else if (f.inPlayoff) a.tradition=clamp(a.tradition+1.2,0,99); else a.tradition=clamp(a.tradition+0.2,0,99); }
    let pts = 2; if (f){ if(wins>=9)pts++; if(f.inPlayoff)pts++; if(f.wonTitle)pts+=2; if(f.confChamp)pts++; }
    S.school.upgradePoints = (S.school.upgradePoints||0) + pts;
    S.school.grades = motivationGrades(S.school, S.offPb);
    return pts;
  }

  DHQ.program = { ATTR, init, motivationGrades, grade, valueToGrade, facilitiesXpMult, recruitingHoursBonus, recruitingInfluenceMult, upgradeCost, canUpgrade, upgrade, endSeasonUpdate, CONF_PRESTIGE };
})();
