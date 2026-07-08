/* ============================================================
   Dynasty HQ — app (engine + UI) — v0.4
   Consumes modules: DHQ.rng, DHQ.store, DHQ.data, DHQ.teams
   ============================================================ */
(() => {
const { rand, randint, pick, chance, shuffle, clamp } = DHQ.rng;
const D = DHQ.data;
const TM = DHQ.teams;
const store = DHQ.store;
const { MOTIVATIONS, OFF_PLAYBOOKS, DEF_PLAYBOOKS, schemeTargets } = D;

const WEEKS_PER_SEASON = 12;
const BOARD_LIMIT = 30;
const CLASS_SIZE = 70;
const SIGN_TARGET = 18;
const ROSTER_CAP = 85;
const CLASS_CAP = 25;
const HOUR_RATE = 0.46;
// Recruiting hours by prestige (half-star granularity): { preseason, weekly }
const HOURS_TABLE = {
  "0.5":{pre:375,wk:300}, "1":{pre:450,wk:350}, "1.5":{pre:500,wk:400}, "2":{pre:575,wk:450},
  "2.5":{pre:625,wk:500}, "3":{pre:750,wk:600}, "3.5":{pre:875,wk:700}, "4":{pre:1000,wk:800},
  "4.5":{pre:1125,wk:900}, "5":{pre:1250,wk:1000}
};
function prestigeStep(pf){ return clamp(Math.round((pf||3)*2)/2, 0.5, 5); }
function hoursRow(){ return HOURS_TABLE[String(prestigeStep(S.school.prestigeF||S.school.prestige))] || HOURS_TABLE["3"]; }

const ACTIVITIES = [
  { id:"social", name:"Connect on Social Media", short:"Social",  cost:5  },
  { id:"dm",     name:"DM the Player",            short:"DM",      cost:10 },
  { id:"fnf",    name:"Contact Friends & Family", short:"F&F",     cost:25 },
  { id:"house",  name:"Send the House",           short:"House",   cost:50 },
  { id:"sway",   name:"Sway",                     short:"Sway",    cost:20 },
];
const actById = (id) => ACTIVITIES.find(a => a.id === id) || null;
const INFLUENCE_ACTS = ["social","dm","fnf","house"];
const PER_RECRUIT_CAP = 50;
const SCOUT_COST = 10;        // instant, separate from the 50h influence cap
const SCHOL_COST = 5;         // instant, one-time scholarship offer
const SCHOL_MAX = 35;         // scholarship offers you can have outstanding
function scoutNeeded(r){ return 3; }   // 3 scouts (30h) for a full report
function scoutLevel(r){ return r.scoutProgress||0; }
function fullyScouted(r){ return scoutLevel(r) >= scoutNeeded(r); }
function yearLabel(p){ if (p.year==="RS-FR") return "FR (RS)"; return p.year + (p.rs ? " (RS)" : ""); }

const ARCHETYPES = [
  { id:"recruiter", name:"Recruiter", icon:"🧲", blurb:"Out-recruit everyone: more hours, better pitches, stronger pipelines." },
  { id:"motivator", name:"Motivator", icon:"📈", blurb:"Develop talent: faster growth, trait upgrades, and roster retention." },
  { id:"tactician", name:"Tactician", icon:"🎯", blurb:"Win on Saturdays: game-day rating boosts and big-game edges." },
];
const PERKS = [
  // ---- Recruiter tree ----
  { id:"hours",    name:"Recruiting Hours", icon:"⏱", tree:"recruiter", lvl:1, max:4, desc:t=>`+${t*40} recruiting hours every week.` },
  { id:"closer",   name:"The Closer",        icon:"🤝", tree:"recruiter", lvl:1, max:3, desc:t=>`+${t*10}% influence on recruits you already lead.` },
  { id:"silver",   name:"Silver Tongue",     icon:"🎙", tree:"recruiter", lvl:3, max:3, desc:t=>`Pitch grades count ${t} step${t>1?"s":""} higher when selling.` },
  { id:"comeback", name:"Hard Sell",         icon:"🔥", tree:"recruiter", lvl:3, max:3, desc:t=>`+${t*12}% influence on recruits where you trail.` },
  { id:"eye",      name:"Eye for Talent",    icon:"🔍", tree:"recruiter", lvl:5, max:2, desc:t=> t>=2 ? "Hidden gems revealed on every prospect." : "Scouting reveals if a prospect is a hidden gem." },
  { id:"pipeline", name:"Regional Ties",     icon:"📍", tree:"recruiter", lvl:6, max:3, desc:t=>`Pipelines strengthen ${t*40}% faster when you sign locally.` },
  { id:"bagman",   name:"NIL Connect",       icon:"🎓", tree:"recruiter", lvl:8, max:2, desc:t=>`Scholarship offers give +${t*4} extra interest.` },
  // ---- Motivator tree ----
  { id:"dev",      name:"Player Developer",  icon:"📈", tree:"motivator", lvl:1, max:3, desc:t=>`Players gain +${t} extra OVR growth each offseason.` },
  { id:"breakout", name:"Breakout Coach",    icon:"🌟", tree:"motivator", lvl:3, max:3, desc:t=>`+${t*3}% dev-trait upgrade chance each offseason.` },
  { id:"rsdev",    name:"Redshirt Guru",     icon:"🩹", tree:"motivator", lvl:5, max:2, desc:t=>`Redshirts & freshmen develop ${t*8}% faster.` },
  { id:"ironman",  name:"Culture Builder",   icon:"🛡", tree:"motivator", lvl:6, max:2, desc:t=>`Players are ${t*15}% less likely to transfer out.` },
  // ---- Tactician tree ----
  { id:"gameday",  name:"Game Manager",      icon:"🎯", tree:"tactician", lvl:1, max:3, desc:t=>`+${(t*1.5).toFixed(1)} team rating on game day.` },
  { id:"offense",  name:"Offensive Mind",    icon:"⚡", tree:"tactician", lvl:3, max:2, desc:t=>`+${t*2} offensive rating in your games.` },
  { id:"defense",  name:"Defensive Mind",    icon:"🧱", tree:"tactician", lvl:3, max:2, desc:t=>`+${t*2} defensive rating in your games.` },
  { id:"biggame",  name:"Big Game Coach",    icon:"🏟", tree:"tactician", lvl:6, max:2, desc:t=>`+${t*3} rating vs ranked (Top 25) opponents.` },
];
const CROSS_TREE_LEVEL = 12;   // level at which you can spend into other archetypes' trees
function perkAvailable(pk){ return S.coach.level >= pk.lvl && (pk.tree===S.coach.archetype || S.coach.level >= CROSS_TREE_LEVEL); }

let S = null;
let weekXP = 0;         // coach XP accumulated during the current advance
let weekCommits = [];   // recruits who committed to us this week

function coachTitle(lvl){
  if (lvl>=90) return "Immortal";
  if (lvl>=75) return "Hall of Famer";
  if (lvl>=55) return "Legendary HC";
  if (lvl>=40) return "Dynasty Architect";
  if (lvl>=28) return "Elite Head Coach";
  if (lvl>=18) return "Veteran HC";
  if (lvl>=10) return "Head Coach";
  if (lvl>=5)  return "Coordinator";
  if (lvl>=2)  return "Position Coach";
  return "Grad Assistant";
}
const xpNeeded = (lvl) => 100 + (lvl-1)*55;

const save = () => store.save(S);

/* ---------- team / display helpers ---------- */
function teamLabel(id, fallback){ const t = id ? TM.byId(id) : null; return t ? TM.displayName(t) : (fallback || "—"); }
function schoolName(){ return teamLabel(S.school.id, S.school.name); }
function suitorLabel(s){ return s.isPlayer ? schoolName() : teamLabel(s.teamId, s.name); }

const offPb = () => OFF_PLAYBOOKS.find(p=>p.id===S.offPb) || OFF_PLAYBOOKS[0];
const defPb = () => DEF_PLAYBOOKS.find(p=>p.id===S.defPb) || DEF_PLAYBOOKS[0];
function recomputeScheme(){ S.schemeTarget = schemeTargets(offPb().weights, defPb().weights); }
function rosterCounts(){ const c = {}; S.roster.filter(p=>p.status==="active").forEach(p=> c[p.pos]=(c[p.pos]||0)+1); return c; }
function posNeed(pos){ const have=(rosterCounts()[pos]||0); return (S.schemeTarget[pos]||0) - have; }

/* ---------- new game ---------- */
function buildRivalPool(team){
  return TM.TEAMS.filter(t => t.id !== team.id).map(t => ({ id:t.id, name:t.n, prestige:t.p }));
}
function newGame(cfg){
  const team = TM.byId(cfg.teamId) || TM.TEAMS[0];
  const o = OFF_PLAYBOOKS.find(p=>p.id===cfg.offPb) || OFF_PLAYBOOKS[0];
  const d = DEF_PLAYBOOKS.find(p=>p.id===cfg.defPb) || DEF_PLAYBOOKS[0];
  const prestige = team.p;
  const school = {
    id:team.id, name:team.n, nick:team.m, abbr:team.ab, conf:team.c, prestige,
    grades: {}, crest:team.ab.slice(0,2),
    c1:team.c1, c2:team.c2
  };
  if (DHQ.program){ DHQ.program.init(school, team); school.grades = DHQ.program.motivationGrades(school, o.id); }
  else school.grades = D.randGrades(prestige);
  if (DHQ.pipeline) DHQ.pipeline.initPipelines(school, team);
  S = {
    v: store.SAVE_VERSION,
    coach:{ name: cfg.coach || "Coach", archetype: cfg.archetype || "recruiter", level:1, xp:0, skillPoints:1, perks:{}, career:{w:0,l:0,cw:0,cl:0,t25w:0,t25l:0,t10w:0,t10l:0}, trophies:{conf:0,natl:0,playoff:0} },
    school, rivalPool: buildRivalPool(team),
    offPb:o.id, defPb:d.id, schemeTarget:{},
    year:1, week:0,
    prospects: [], roster: [], alumni: [],
    weeklyGoals: [], seasonGoals: [],
    classSigned: [], history: [], tab:"hub", lastSummary:null
  };
  PERKS.forEach(p => S.coach.perks[p.id]=0);
  recomputeScheme();
  S.roster = D.genStartingRoster(S.schemeTarget, prestige);
  generateClass();
  S.weeklyGoals = rollWeeklyGoals();
  S.seasonGoals = rollSeasonGoals();
  DHQ.S = S;
  if (DHQ.season) DHQ.season.init(S);
  save();
}

function generateClass(){
  S.prospects = D.genClass(S.rivalPool, CLASS_SIZE);
  if (perk("eye")>=2) S.prospects.forEach(p=>{ p.gemKnown=true; });
}

/* ---------- perk & hours helpers ---------- */
const perk = (id) => (S.coach.perks[id]||0);
function effHours(){ const base = (S.week===0 ? hoursRow().pre : hoursRow().wk); return base + perk("hours")*40; }
function activityCost(r){ return (r.actions||[]).reduce((s,id)=>{ const a=actById(id); return s + (a?a.cost:0); }, 0); }
function allocatedHours(){ return S.prospects.reduce((s,p)=> s + ((p.onBoard && p.status==="open") ? activityCost(p) : 0), 0); }
function hoursLeft(){ return effHours() - allocatedHours() - (S.weekSpent||0); }
function scholUsed(){ return S.prospects.filter(p=>p.schol && (p.status==="open" || (p.status==="committed" && p.committedTo===S.school.id))).length; }
function scholLeft(){ return SCHOL_MAX - scholUsed(); }

const GRADE_VAL = { A:1.32, B:1.16, C:1.0, D:0.86, F:0.72 };
const GRADE_ORDER = ["F","D","C","B","A"];
function bumpGrade(g, steps){ const i=clamp(GRADE_ORDER.indexOf(g)+steps,0,4); return GRADE_ORDER[i]; }
function recruitRegion(r){ return DHQ.pipeline ? DHQ.pipeline.regionOf(r.state, r.hometown && r.hometown.city) : (r.state||"??"); }
function fitMult(recruit){
  const steps = perk("silver"); let sum=0, wsum=0;
  const glam = recruit.pos==="QB"||recruit.pos==="RB"||recruit.pos==="WR"||recruit.pos==="CB"||recruit.pos==="EDGE";
  const mots = recruit.swayMot ? recruit.motivations.concat(recruit.swayMot) : recruit.motivations;
  const cth = DHQ.pipeline ? DHQ.pipeline.closeToHomeGrade(DHQ.pipeline.tierOf(S.school, recruitRegion(recruit))) : null;
  mots.forEach(m=>{ const w = (glam && m==="Brand Exposure") ? 1.6 : 1; const base = (m==="Close to Home" && cth) ? cth : (S.school.grades[m]||"C"); sum += GRADE_VAL[bumpGrade(base, steps)]*w; wsum += w; });
  return sum / wsum;
}

function playerSuitor(r){ return r.suitors.find(s=>s.isPlayer) || null; }
function ensurePlayerSuitor(r){
  let ps = playerSuitor(r);
  if (!ps){
    const start = Math.round(S.school.prestige*rand(1.6,3.2) + (fitMult(r)-1)*22);
    ps = { teamId:S.school.id, name:S.school.name, prestige:S.school.prestige, points:Math.max(3,start), isPlayer:true };
    r.suitors.push(ps);
  }
  return ps;
}
function leaderOf(r){ return r.suitors.reduce((a,b)=> b.points>a.points ? b : a, r.suitors[0]); }
function totalPoints(r){ return r.suitors.reduce((s,x)=>s+x.points,0); }
function sortedSuitors(r){ return r.suitors.slice().sort((a,b)=>b.points-a.points); }
function playerLeads(r){ const ps=playerSuitor(r); return ps && leaderOf(r)===ps; }

function addXP(amount){
  if (amount<=0) return;
  weekXP += amount;
  S.coach.xp += amount;
  let leveled=false;
  while (S.coach.level < 100 && S.coach.xp >= xpNeeded(S.coach.level)){ S.coach.xp -= xpNeeded(S.coach.level); S.coach.level++; S.coach.skillPoints++; leveled=true; }
  if (leveled) toast(`★ LEVEL UP — Lv ${S.coach.level} · ${coachTitle(S.coach.level)}! +1 Skill Point`, "xp", "★");
}

/* ---------- goals ---------- */
function g(id, name, target, kind, xp){ return { id, name, target, kind, xp, prog:0, done:false }; }
function rollWeeklyGoals(){
  const opts = [
    () => g("alloc","Use all your weekly hours", effHours(), "allocHours", 25),
    () => g("addboard","Add 3 prospects to your board", 3, "addedBoard", 20),
    () => g("scout","Scout 4 prospects", 4, "scouted", 20),
    () => g("lead4","Take the lead on a 4★+ recruit", 1, "lead4", 35),
    () => g("leadN","Lead the battle for 5 recruits", 5, "leadCount", 30),
    () => g("house","Send the House on a recruit", 1, "sentHouse", 25),
  ];
  return shuffle(opts).slice(0,3).map(f=>f());
}
function rollSeasonGoals(){
  const opts = [
    () => g("signN","Sign "+SIGN_TARGET+" recruits this class", SIGN_TARGET, "signed", 90),
    () => g("sign4","Sign a 4★ or better recruit", 1, "signed4", 80),
    () => g("signQB","Sign a QB", 1, "signedQB", 60),
    () => g("gem","Discover & sign a hidden gem", 1, "signedGem", 100),
    () => g("need","Sign 4 recruits at positions of need", 4, "needSigned", 90),
    () => g("juco","Sign a JUCO prospect", 1, "jucoSigned", 50),
  ];
  return shuffle(opts).slice(0,4).map(f=>f());
}
function bumpGoal(kind, amount=1, absolute=null){
  [...S.weeklyGoals, ...S.seasonGoals].forEach(go=>{
    if (go.kind!==kind || go.done) return;
    go.prog = absolute!=null ? absolute : Math.min(go.target, go.prog+amount);
    if (go.prog>=go.target){ go.done=true; addXP(go.xp); toast(`✓ Goal complete: ${go.name}  (+${go.xp} XP)`, "good", "✓"); }
  });
}
function setGoalAbs(kind, value){ bumpGoal(kind, 0, value); }
function refreshLiveGoals(){
  setGoalAbs("allocHours", allocatedHours());
  setGoalAbs("leadCount", S.prospects.filter(p=>p.onBoard&&p.status==="open"&&playerLeads(p)).length);
}

/* ============================================================
   ENGINE — advance one week
   ============================================================ */
function advanceWeek(){
  weekXP = 0; weekCommits = []; S.weekSpent = 0;
  const startWeek = S.week;
  const events = [];
  const playerGame = DHQ.season ? DHQ.season.simWeek(S) : null;
  if (startWeek >= 1){   // preseason (week 0) = scouting & scholarships only; no influence/commits
  const board = S.prospects.filter(p=>p.onBoard && p.status==="open");
  board.forEach(r=>{
    const acts = r.actions || [];
    if (!acts.length) return;
    const ps = ensurePlayerSuitor(r);
    // scouting — paid & progressive
    if (acts.includes("scout")){
      r.scoutProgress = (r.scoutProgress||0)+1; bumpGoal("scouted",1);
      if (fullyScouted(r) && !r.scouted){ r.scouted=true; if (r.gem){ r.gemKnown=true; events.push({t:`💎 Scouting found a GEM: ${r.name} (POT ${r.pot})`, k:"xp"}); } addXP(4); }
    }
    // sway
    if (acts.includes("sway") && !r.swayMot && chance(0.42 + perk("silver")*0.05)){
      const good = MOTIVATIONS.filter(m=>!r.motivations.includes(m) && (S.school.grades[m]==="A"||S.school.grades[m]==="B"));
      if (good.length){ r.swayMot = pick(good); addXP(6); events.push({t:`🎙 Swayed ${r.name} — now values ${r.swayMot}`, k:"good"}); }
    }
    // influence — sum of influence-action hours
    const infHours = acts.reduce((s,id)=> s + (INFLUENCE_ACTS.includes(id) ? actById(id).cost : 0), 0);
    if (infHours>0){
      let pts = infHours * HOUR_RATE * fitMult(r);
      if (DHQ.pipeline) pts *= DHQ.pipeline.influenceFactor(DHQ.pipeline.tierOf(S.school, recruitRegion(r)));
      if (DHQ.program) pts *= DHQ.program.recruitingInfluenceMult(S.school);
      const wasLeader = leaderOf(r)===ps;
      if (wasLeader && perk("closer")) pts *= 1 + perk("closer")*0.10;
      if (!wasLeader && perk("comeback")) pts *= 1 + perk("comeback")*0.12;
      ps.points += pts;
      if (!wasLeader && leaderOf(r)===ps){ addXP(5); bumpGoal("lead4", r.stars>=4?1:0); events.push({t:`You took the LEAD for ${r.name} (${r.pos}, ${r.stars}★)`, k:"good"}); }
    }
  });
  S.prospects.filter(p=>p.status==="open").forEach(r=>{
    r.suitors.forEach(s=>{
      if (s.isPlayer) return;
      let gain = randint(0,2) + s.prestige*rand(0.22,0.70) + r.stars*rand(0.10,0.32);
      if (chance(0.08)) gain *= rand(1.5,2.1);
      s.points += gain;
    });
    if (chance(0.02) && r.suitors.length<7){
      const cand = pick(S.rivalPool);
      if (!r.suitors.some(s=>s.teamId===cand.id)) r.suitors.push({teamId:cand.id,name:cand.name,prestige:cand.prestige,points:randint(4,12),isPlayer:false});
    }
  });
  board.forEach(r=>{
    const ps = playerSuitor(r); const lead = leaderOf(r);
    if (ps && lead!==ps){ const margin = lead.points - ps.points; if (margin>0 && chance(0.20)) events.push({t:`${suitorLabel(lead)} is surging for ${r.name} — behind by ${Math.round(margin)}`, k:"bad"}); }
  });
  // funnel: battle flags + Top-5 gating for blue-chips
  S.prospects.filter(p=>p.status==="open").forEach(r=>{ r.battle = DHQ.recruit ? DHQ.recruit.battle(r) : false; });
  S.prospects.filter(p=>p.onBoard && p.status==="open" && p.stars>=4).forEach(r=>{
    const st = DHQ.recruit ? DHQ.recruit.stage(r) : "Open";
    if (DHQ.recruit && (st==="Top 5"||st==="Top 3"||st==="Deciding")){
      const ps = playerSuitor(r);
      if (ps && !DHQ.recruit.inTopN(r, ps, 5)){ events.push({t:`❌ Missed the Top 5 for ${r.name} (${r.pos}, ${r.stars}★)`, k:"bad"}); r.onBoard=false; r.actions=[]; r.schol=false; }
    }
  });
  const weekFactor = S.week / WEEKS_PER_SEASON;
  S.prospects.filter(p=>p.status==="open").forEach(r=>{
    const need = { 5:120, 4:96, 3:72, 2:54, 1:42 }[r.stars];
    const T = totalPoints(r); if (T < need) return;
    const sorted = sortedSuitors(r); const L = sorted[0], S2 = sorted[1] ? sorted[1].points : 0;
    const leadShare = L.points / T; if (leadShare < 0.42) return;
    const margin = (L.points - S2) / Math.max(1,L.points);
    let pCommit = clamp((leadShare-0.42)*1.7,0,0.55) * (0.18 + weekFactor*0.95) * (0.5 + margin);
    if (r.battle) pCommit *= 0.5;
    if (chance(pCommit)){
      let committer = L;
      if (L.isPlayer && ((DHQ.recruit && !DHQ.recruit.dealbreakerOK(r, S.school.grades)) || !r.schol)){
        const rival = sorted.find(s=>!s.isPlayer);
        if (rival) committer = rival; else return;
      }
      commitRecruit(r, committer, events);
    }
  });
  }
  refreshLiveGoals();
  S.week++;
  let summary=null;
  if (S.week > WEEKS_PER_SEASON) summary = endOfSeason(events);
  else S.weeklyGoals = rollWeeklyGoals();
  save(); render();
  events.slice(0,3).forEach((e,i)=> setTimeout(()=>toast(e.t, e.k, e.k==="good"?"▲":e.k==="bad"?"▼":"•"), i*350));
  if (summary){ setTimeout(()=>openSeasonSummary(summary), 300); }
  else if (startWeek>=1){ setTimeout(()=>openWeekRecap(playerGame, weekXP, weekCommits, startWeek), 250); }
}

function commitRecruit(r, toSuitor, events){
  // Your class fills up: once you've hit the per-class cap, recruits you lead pick their next-best school.
  if (toSuitor.isPlayer && S.classSigned.length >= CLASS_CAP){
    const rivals = sortedSuitors(r).filter(s=>!s.isPlayer);
    if (rivals.length) toSuitor = rivals[0]; else return;
  }
  r.status = "committed"; r.committedTo = toSuitor.isPlayer ? S.school.id : toSuitor.teamId; r.actions = [];
  if (toSuitor.isPlayer){
    S.classSigned.push(r.id);
    weekCommits.push({ name:r.name, pos:r.pos, stars:r.stars });
    if (DHQ.pipeline) DHQ.pipeline.strengthen(S.school, recruitRegion(r), 0.35*(1+perk("pipeline")*0.4));
    addXP(8 + r.stars*9);
    bumpGoal("signed", 1);
    if (r.stars>=4) bumpGoal("signed4",1);
    if (r.pos==="QB") bumpGoal("signedQB",1);
    if (r.gem && r.gemKnown) bumpGoal("signedGem",1);
    if (r.juco) bumpGoal("jucoSigned",1);
    if (posNeed(r.pos) > 0) bumpGoal("needSigned",1);
    events.push({t:`🎉 COMMIT! ${r.name} (${r.pos}, ${r.stars}★${r.juco?" JUCO":""}) picked ${schoolName()}!`, k:"good"});
    r.onBoard = true;
  } else {
    if (r.onBoard) events.push({t:`💔 LOST ${r.name} (${r.pos}, ${r.stars}★) to ${suitorLabel(toSuitor)}`, k:"bad"});
    r.onBoard = false; r.schol = false;
  }
}

function endOfSeason(events){
  const football = DHQ.season ? DHQ.season.endRegularSeason(S) : null;
  if (DHQ.season) DHQ.season.accumulateCareer(S);
  S.prospects.filter(p=>p.status==="open").forEach(r=>{
    if (totalPoints(r) <= 0) return;
    let L = leaderOf(r);
    if (L.isPlayer && ((DHQ.recruit && !DHQ.recruit.dealbreakerOK(r, S.school.grades)) || !r.schol)){ const rv = sortedSuitors(r).find(s=>!s.isPlayer); if (rv) L = rv; else return; }
    commitRecruit(r, L, events);
  });
  const signees = S.prospects.filter(p=>p.status==="committed" && p.committedTo===S.school.id);
  const departures = developAndAge();
  if (football && DHQ.program){ football.wins = parseInt((football.record||"0").split("-")[0])||0; football.draftees = departures.filter(d=>d.how.includes("Draft")).length; football.upgradePts = DHQ.program.endSeasonUpdate(S, football); }
  const room = Math.min(CLASS_CAP, ROSTER_CAP - S.roster.filter(p=>p.status==="active").length);
  const ranked = signees.map(toPlayer).sort((a,b)=> b.ovr-a.ovr || b.pot-a.pot);
  const added = ranked.slice(0, Math.max(0, room));
  const cut = ranked.length - added.length;
  S.roster.push(...added);
  S.roster.sort((a,b)=> b.ovr-a.ovr);
  addXP(40 + signees.length*4);
  const grade = classGrade(signees);
  const summary = {
    year: S.year, signed: signees.length, added: added.length, cut,
    grade, bestSignee: signees.slice().sort((a,b)=>b.stars-a.stars||b.ovr-a.ovr)[0] || null,
    gems: signees.filter(s=>s.gem).length, juco: signees.filter(s=>s.juco).length,
    departures, rosterSize: S.roster.filter(p=>p.status==="active").length, football, devReport: S.lastDevReport
  };
  S.history.push({ year:S.year, signed:signees.length, grade });
  S.lastSummary = summary;
  S.year++; S.week = 0; S.classSigned = [];
  generateClass();
  S.weeklyGoals = rollWeeklyGoals();
  S.seasonGoals = rollSeasonGoals();
  if (DHQ.season) DHQ.season.init(S);
  return summary;
}

function classGrade(signees){
  if (!signees.length) return "F";
  const avgStars = signees.reduce((s,r)=>s+r.stars,0)/signees.length;
  const score = avgStars*0.5 + Math.min(1, signees.length/26)*1.6 + signees.filter(s=>s.stars>=4).length*0.1;
  if (score>=3.4) return "A+"; if (score>=3.0) return "A"; if (score>=2.6) return "B+";
  if (score>=2.2) return "B"; if (score>=1.8) return "C+"; if (score>=1.4) return "C"; return "D";
}

function toPlayer(r){
  const dev = D.rollDev(r.stars, r.gem);
  let year="FR", age=18, yearsIn=0;
  if (r.juco){ year=r.standing; age = year==="JR"?21:20; yearsIn = year==="JR"?2:1; }
  return {
    id:"r"+r.id, name:r.name, pos:r.pos, arch:r.arch, stars:r.stars, gem:r.gem,
    ovr:r.ovr, pot:r.pot, dev, weight:r.weight, year, age, redshirt:false, yearsIn,
    hometown:r.hometown, highSchool:r.highSchool, origin: r.juco?"JUCO":"HS", priorSchool: r.juco?"JUCO":null,
    prod:0, lastOvr:r.ovr, status:"active", starter:false, juco:!!r.juco, homegrown:!r.juco
  };
}

const DEV_GROWTH = { Normal:[1,3], Impact:[2,5], Star:[3,7], Elite:[5,9] };
const CLASS_NEXT = { "FR":"SO", "RS-FR":"SO", "SO":"JR", "JR":"SR", "SR":"GRAD" };

function developAndAge(){
  const departures = [];
  S.lastDevReport = DHQ.develop ? DHQ.develop.developRoster(S, perk("dev")) : null;
  const kept = [];
  S.roster.forEach(p=>{
    if (p.status!=="active") return;
    p.age++; p.yearsIn++;
    const next = CLASS_NEXT[p.year] || "GRAD";
    if (next==="GRAD"){
      p.status="graduated";
      const d = depart(p, p.ovr>=84?"NFL Draft (Senior)":"Graduated");
      if (p.ovr>=84){ p.draftRound=projRound(p.ovr); d.note = `Projected Round ${p.draftRound}`; }
      departures.push(d); return;
    }
    if (p.year==="JR" && p.ovr>=85 && chance(0.45 + (p.ovr-85)*0.04)){
      p.status="drafted"; p.draftRound=projRound(p.ovr);
      const d = depart(p, "Declared for NFL Draft"); d.note = `Projected Round ${p.draftRound}`;
      departures.push(d); return;
    }
    const transferP = ((p.starter?0.015:0.06) + (p.ovr<64?0.05:0)) * (1 - perk("ironman")*0.15);
    if (chance(transferP)){
      p.status="transferred"; const dst = pick(S.rivalPool); const d = depart(p, "Entered Transfer Portal"); d.note = `Transferred to ${teamLabel(dst.id, dst.name)}`;
      departures.push(d); return;
    }
    // redshirt: low-rated, non-starting freshmen get an extra year (once)
    if (p.year==="FR" && !p.rs && !p.starter && p.ovr < 72){ p.rs = true; /* sits this year, keeps FR eligibility */ }
    else { if (p.year==="RS-FR") p.rs = true; p.year = next; }
    kept.push(p);
  });
  S.roster = kept;
  departures.forEach(d=> S.alumni.push(d));
  return departures;
}
function depart(p, how){ return { name:p.name, pos:p.pos, ovr:p.ovr, stars:p.stars, dev:p.dev, how, note:"", year:S.year }; }
function projRound(ovr){ if (ovr>=93) return 1; if (ovr>=89) return randint(1,2); if (ovr>=86) return randint(2,4); if (ovr>=84) return randint(4,7); return randint(6,7); }

/* ============================================================
   RENDERING
   ============================================================ */
const $ = (s,el=document)=>el.querySelector(s);
const screens = $("#screens");
function starStr(n){ let h=""; for (let i=0;i<5;i++) h+=`<span class="${i<n?"":"off"}">★</span>`; return `<span class="stars">${h}</span>`; }
function fmtHW(p){ const f=Math.floor(p.height/12), i=p.height%12; return `${f}'${i}" · ${p.weight}`; }
function homeStr(p){ return p.hometown ? `${p.hometown.city}, ${p.hometown.st}` : (p.state||""); }

function render(){
  if (!S) return;
  $("#tbSchool").textContent = schoolName();
  $("#tbSub").textContent = `${TM.CONFS[S.school.conf]||S.school.conf} · Season ${S.year} · ${S.week>WEEKS_PER_SEASON?"Signing Day":(S.week===0?"Preseason":"Week "+S.week)}`;
  $("#tbHours").textContent = hoursLeft();
  const lbl = document.querySelector(".tb-hours-lbl"); if (lbl) lbl.textContent = `/ ${effHours()} HRS`;
  const crest = $("#tbCrest");
  crest.textContent = S.school.crest || (S.school.abbr||"D").slice(0,2);
  if (S.school.c1){ crest.style.background = `linear-gradient(150deg, ${S.school.c1}, ${S.school.c2||S.school.c1})`; crest.style.color = pickText(S.school.c1); }
  $("#xpLvl").textContent = "Lv "+S.coach.level;
  $("#xpTitle").textContent = coachTitle(S.coach.level);
  const need = xpNeeded(S.coach.level);
  $("#xpFill").style.width = clamp(S.coach.xp/need*100,0,100)+"%";
  $("#xpNum").textContent = `${Math.floor(S.coach.xp)} / ${need} XP`;
  const t = S.tab;
  screens.innerHTML = `<div class="screen active">${
    t==="hub" ? DHQ.season.viewHub() :
    t==="board" ? viewBoard() : t==="prospects" ? viewProspects() :
    t==="roster" ? viewRoster() : t==="season" ? DHQ.season.viewSeason() :
    t==="coach" ? viewCoach() : viewGoals()
  }</div>`;
  document.querySelectorAll(".tab").forEach(b=> b.classList.toggle("active", b.dataset.tab===t));
  updateAdvanceBtn();
}
function pickText(hex){ // black or white text for contrast
  const c = hex.replace("#",""); if (c.length<6) return "#0b1020";
  const r=parseInt(c.substr(0,2),16), g=parseInt(c.substr(2,2),16), b=parseInt(c.substr(4,2),16);
  return (0.299*r+0.587*g+0.114*b) > 150 ? "#0b1020" : "#ffffff";
}

function viewBoard(){
  const board = S.prospects.filter(p=>p.onBoard);
  const open = board.filter(p=>p.status==="open");
  const committed = board.filter(p=>p.status==="committed");
  let h = `
    <div class="sec-head"><div><div class="sec-title">Recruiting Board</div>
      <div class="sec-sub">${open.length}/${BOARD_LIMIT} targets · ${committed.length} committed</div></div></div>
    <div class="kpis">
      <div class="kpi"><b>${hoursLeft()}</b><span>Hrs Left</span></div>
      <div class="kpi"><b>${scholLeft()}</b><span>Schol Left</span></div>
      <div class="kpi"><b>${S.classSigned.length}</b><span>Committed</span></div>
    </div>`;
  if (!board.length){
    return h + `<div class="panel empty">Your board is empty.<br><br>Go to <b>Scout</b> to find prospects and add them here, then assign a recruiting activity to win them over. Your hours carry over each week until you change them.</div>`;
  }
  h += `<div class="row" style="gap:8px;margin:0 0 10px">
    <button class="btn sm ghost" style="flex:1" data-act="scoutall" ${scoutAllHours()<=0?"disabled":""}>🔍 Scout All${scoutAllHours()>0?` (${scoutAllHours()}h)`:""}</button>
    <button class="btn sm ghost" style="flex:1" data-act="scholall" ${scholAllHours()<=0?"disabled":""}>🎓 Offer All${scholAllHours()>0?` (${scholAllHours()}h)`:""}</button>
  </div>`;
  if (committed.length){ h += `<div class="sec-sub cap" style="margin:14px 2px 8px;color:var(--gold)">★ Commitments</div>`; committed.forEach(r=> h+= recruitCard(r)); }
  if (open.length){
    h += `<div class="sec-sub cap" style="margin:16px 2px 8px;color:var(--muted)">Active Battles</div>`;
    open.sort((a,b)=> b.stars-a.stars || (totalPoints(b)-totalPoints(a)));
    open.forEach(r=> h+= recruitCard(r));
  }
  return h;
}

function activitySelector(r){
  const left = hoursLeft(); const acts = r.actions||[];
  const infCur = acts.reduce((s,id)=> s + (INFLUENCE_ACTS.includes(id)?actById(id).cost:0), 0);
  let h = `<div class="acts">`;
  ACTIVITIES.forEach(a=>{
    const sel = acts.includes(a.id);
    const inf = INFLUENCE_ACTS.includes(a.id);
    const afford = sel || ((!inf || infCur + a.cost <= PER_RECRUIT_CAP) && a.cost <= left);
    h += `<button class="act-btn ${sel?"on":""}" data-act="action" data-id="${r.id}" data-a="${a.id}" ${afford?"":"disabled"}>
      <span class="ab-name">${a.short}</span><span class="ab-cost">${a.cost}h</span></button>`;
  });
  h += `</div>`;
  return h;
}

function recruitCard(r){
  const committedToMe = r.status==="committed" && r.committedTo===S.school.id;
  const leads = r.status==="open" && playerLeads(r);
  const ps = playerSuitor(r);
  const cls = committedToMe ? "committed" : leads ? "lead" : (r.status==="open" && ps && leaderOf(r)!==ps) ? "losing" : "";
  const showGem = r.gem && (r.gemKnown || perk("eye")>=2);
  const need = posNeed(r.pos) > 0;
  const sl = scoutLevel(r), sn = scoutNeeded(r), full = fullyScouted(r);
  let h = `<div class="recruit ${cls}">
    <div class="rc-top">
      <div class="rc-id">
        <div class="rc-pos ${showGem?"gem":""}">${r.pos}</div>
        <div class="rc-meta">
          <div class="rc-name">${r.name} ${showGem?'<span class="gem-tag">GEM</span>':''} ${r.juco?'<span class="juco-tag">JUCO</span>':''} ${need?'<span class="need-tag">NEED</span>':''}</div>
          <div class="rc-line">${starStr(r.stars)} · ${r.arch} · ${homeStr(r)}${r.juco?` · ${r.standing}`:''}</div>
          <div style="margin-top:3px"><span class="pill tiny ${r.battle?"red":""}">${DHQ.recruit?DHQ.recruit.stage(r):"Open"}${r.battle?" ⚔ BATTLE":""}</span>${(()=>{ if(!DHQ.pipeline)return""; const rg=recruitRegion(r); const t=DHQ.pipeline.tierOf(S.school,rg); return t>1?` <span class="pill tiny green">📍 ${rg} ${DHQ.pipeline.tierLabel(t)}</span>`:` <span class="pill tiny">📍 ${rg}</span>`; })()}</div>
        </div>
      </div>
      <div class="rc-ovr"><b>${sl>=1 ? (full ? r.ovr : "~"+(Math.round(r.ovr/5)*5)) : "?"}</b><span>OVR</span></div>
    </div>`;
  if (committedToMe){ return h + `<div class="row" style="margin-top:10px"><span class="pill gold">✓ Committed to ${schoolName()}</span></div></div>`; }
  const sorted = sortedSuitors(r); const maxP = Math.max(1, sorted[0].points);
  h += `<div class="battle">`;
  sorted.slice(0,4).forEach(s=>{
    h += `<div class="battle-row ${s.isPlayer?"me":""}"><div class="nm">${s.isPlayer?"★ "+suitorLabel(s):suitorLabel(s)}</div>
      <div class="bar"><i style="width:${clamp(s.points/maxP*100,4,100)}%"></i></div>
      <div class="pts">${Math.round(s.points)}</div></div>`;
  });
  h += `</div>`;
  if (sl>=1){
    h += `<div class="motfit">`;
    const shown = r.motivations.slice(0, Math.min(sl,3));
    shown.forEach(m=>{ const gr=bumpGrade(S.school.grades[m]||"C", perk("silver")); const db=(m===r.dealbreaker && full); h += `<span class="mot ${db?"db":""}">${db?"🔒 ":""}${m}<span class="g g-${gr}">${gr}</span></span>`; });
    for (let i=shown.length;i<3;i++) h += `<span class="mot" style="opacity:.35">? · ?</span>`;
    if (r.swayMot){ const gr=bumpGrade(S.school.grades[r.swayMot]||"C", perk("silver")); h += `<span class="mot sway">+${r.swayMot}<span class="g g-${gr}">${gr}</span></span>`; }
    h += `</div>`;
    if (full && r.dealbreaker && DHQ.recruit && !DHQ.recruit.dealbreakerOK(r, S.school.grades)){ h += `<div class="tiny" style="color:var(--red);font-weight:700;margin-top:6px">⚠ Dealbreaker: ${r.dealbreaker} — Sway him or raise this grade to sign</div>`; }
    h += `<div class="tiny faint" style="margin-top:5px">🔍 Scouted ${Math.min(sl,sn)}/${sn}${full?` · full report`:` — scout more to reveal`}</div>`;
  } else {
    h += `<div class="tiny faint" style="margin-top:9px">🔍 Add the Scout action (10h) to reveal his OVR, motivations & dealbreaker (${sn} scouts for a full report).</div>`;
  }
  if (S.week>=1){
    const infH = (r.actions||[]).reduce((s,id)=>s+(INFLUENCE_ACTS.includes(id)?actById(id).cost:0),0);
    const hasSway = (r.actions||[]).includes("sway");
    h += `<div class="act-label"><span>Influence · <b>${infH}</b>/${PER_RECRUIT_CAP}h${hasSway?` · <span class="g-A">Sway on</span>`:""}</span></div>`;
    h += activitySelector(r);
  } else {
    h += `<div class="act-label"><span class="faint">Preseason — scout & offer scholarships only</span></div>`;
  }
  h += `<div class="instant-acts">
      <button class="act-btn ${fullyScouted(r)?"on":""}" data-act="doscout" data-id="${r.id}" ${(fullyScouted(r)||hoursLeft()<SCOUT_COST)?"disabled":""}><span class="ab-name">🔍 Scout ${Math.min(scoutLevel(r),scoutNeeded(r))}/${scoutNeeded(r)}</span><span class="ab-cost">${fullyScouted(r)?"done":SCOUT_COST+"h"}</span></button>
      <button class="act-btn ${r.schol?"on":""}" data-act="offerschol" data-id="${r.id}" ${(r.schol||scholLeft()<=0||hoursLeft()<SCHOL_COST)?"disabled":""}><span class="ab-name">🎓 ${r.schol?"Offered":"Scholarship"}</span><span class="ab-cost">${r.schol?"✓":SCHOL_COST+"h"}</span></button>
    </div>`;
  h += `<div class="row spread" style="margin-top:9px">
      <button class="btn sm ghost" data-act="detail" data-id="${r.id}">Details</button>
      <button class="btn sm danger" data-act="remove" data-id="${r.id}">Drop</button>
    </div></div>`;
  return h;
}

let pState = { fpos:"ALL", fstar:0 };
function viewProspects(){
  const POS = ["ALL","NEED","QB","RB","WR","TE","OT","IOL","EDGE","DT","LB","CB","S","ATH","K"];
  let list = S.prospects.filter(p=>p.status==="open" && !p.onBoard);
  if (pState.fpos==="NEED") list = list.filter(p=>posNeed(p.pos)>0);
  else if (pState.fpos!=="ALL") list = list.filter(p=>p.pos===pState.fpos);
  if (pState.fstar>0) list = list.filter(p=>p.stars>=pState.fstar);
  list.sort((a,b)=> b.stars-a.stars || b.ovr-a.ovr);
  let h = `<div class="sec-head"><div><div class="sec-title">Scout Prospects</div>
    <div class="sec-sub">${list.length} available · ${offPb().name} / ${defPb().name}</div></div></div>`;
  h += `<div class="filters">`;
  POS.forEach(p=> h+=`<button class="chip ${pState.fpos===p?"on":""} ${p==="NEED"?"need":""}" data-act="fpos" data-v="${p}">${p}</button>`);
  h += `</div><div class="filters">`;
  [0,3,4,5].forEach(s=> h+=`<button class="chip ${pState.fstar===s?"on":""}" data-act="fstar" data-v="${s}">${s===0?"Any ★":s+"★+"}</button>`);
  h += `</div>`;
  if (!list.length) return h + `<div class="panel empty">No prospects match. Try different filters.</div>`;
  list.slice(0,45).forEach(r=>{
    const showGem = r.gem && (r.gemKnown || perk("eye")>=2);
    const need = posNeed(r.pos) > 0;
    h += `<div class="recruit">
      <div class="rc-top">
        <div class="rc-id">
          <div class="rc-pos ${showGem?"gem":""}">${r.pos}</div>
          <div class="rc-meta">
            <div class="rc-name">${r.name} ${showGem?'<span class="gem-tag">GEM</span>':''} ${r.juco?'<span class="juco-tag">JUCO</span>':''} ${need?'<span class="need-tag">NEED</span>':''}</div>
            <div class="rc-line">${starStr(r.stars)} · ${r.arch} · ${homeStr(r)} · ${r.suitors.length} schools${r.juco?` · ${r.standing}`:''}</div>
          </div>
        </div>
        <div class="rc-ovr"><b>${fullyScouted(r)?r.ovr:"?"}</b><span>OVR</span></div>
      </div>
      <div class="row spread" style="margin-top:11px;gap:6px">
        ${fullyScouted(r) ? `<span class="pill">${fmtHW(r)} · POT ${r.pot}</span>` : `<button class="btn sm ghost" data-act="doscout" data-id="${r.id}" ${hoursLeft()<SCOUT_COST?"disabled":""}>🔍 Scout ${SCOUT_COST}h · ${Math.min(scoutLevel(r),scoutNeeded(r))}/${scoutNeeded(r)}</button>`}
        <button class="btn sm primary" data-act="add" data-id="${r.id}">+ Board</button>
      </div></div>`;
  });
  return h;
}

function viewRoster(){
  const r = S.roster.filter(p=>p.status==="active");
  let h = `<div class="sec-head"><div><div class="sec-title">Roster</div>
    <div class="sec-sub">${r.length}/${ROSTER_CAP} players · ${offPb().name} / ${defPb().name}</div></div></div>`;
  h += schemeNeedsPanel();
  h += nextYearNeedsPanel();
  if (!r.length){ return h + `<div class="panel empty">No active players.</div>` + recentDepartures(); }
  const teamOvr = Math.round(r.reduce((s,p)=>s+p.ovr,0)/r.length);
  h += `<div class="kpis">
    <div class="kpi"><b>${teamOvr}</b><span>Team OVR</span></div>
    <div class="kpi"><b>${r.filter(p=>p.dev==="Star"||p.dev==="Elite").length}</b><span>Blue Chips</span></div>
    <div class="kpi"><b>${r.filter(p=>p.ovr>=85).length}</b><span>Stars 85+</span></div>
  </div>`;
  const order = ["QB","RB","WR","TE","OT","IOL","EDGE","DT","LB","CB","S","ATH","K","P"];
  r.sort((a,b)=> order.indexOf(a.pos)-order.indexOf(b.pos) || b.ovr-a.ovr);
  let curPos=null;
  r.forEach(p=>{
    if (p.pos!==curPos){ curPos=p.pos; const nd=posNeed(p.pos);
      h+=`<div class="pos-head"><span class="cap">${p.pos}</span><span class="faint tiny">${rosterCounts()[p.pos]||0}/${S.schemeTarget[p.pos]||0}${nd>0?` · need ${nd}`:""}</span></div>`; }
    h += playerCard(p);
  });
  return h + recentDepartures();
}

function schemeNeedsPanel(){
  const order = ["QB","RB","WR","TE","OT","IOL","EDGE","DT","LB","CB","S","K","P"];
  const counts = rosterCounts();
  let cells = order.map(pos=>{
    const have = counts[pos]||0, tgt = S.schemeTarget[pos]||0, nd = tgt-have;
    const c = nd>=2 ? "red" : nd===1 ? "warn" : "ok";
    return `<div class="need-cell ${c}"><div class="nc-pos">${pos}</div><div class="nc-num">${have}/${tgt}</div></div>`;
  }).join("");
  return `<div class="panel">
    <div class="row spread" style="margin-bottom:8px"><div class="cap muted tiny">Depth Chart vs Scheme</div>
      <button class="btn sm ghost" data-act="formations">Formations</button></div>
    <div class="needgrid">${cells}</div>
    <div class="tiny faint" style="margin-top:8px">Red = need 2+ · Yellow = need 1 · Recruit those spots to fill toward 85.</div>
  </div>`;
}

function nextYearNeedsPanel(){
  const order = ["QB","RB","WR","TE","OT","IOL","EDGE","DT","LB","CB","S","K","P"];
  const active = S.roster.filter(p=>p.status==="active");
  const committed = S.prospects.filter(p=>p.status==="committed" && p.committedTo===S.school.id);
  const leaving = (p)=> p.year==="SR";   // seniors graduate (redshirt seniors are also year "SR")
  const totalLeave = active.filter(leaving).length;
  const cells = order.map(pos=>{
    const returning = active.filter(p=>p.pos===pos && !leaving(p)).length;
    const incoming = committed.filter(r=>r.pos===pos).length;
    const proj = returning + incoming;
    const tgt = S.schemeTarget[pos]||0, nd = tgt - proj;
    const c = nd>=2 ? "red" : nd===1 ? "warn" : "ok";
    return `<div class="need-cell ${c}"><div class="nc-pos">${pos}</div><div class="nc-num">${proj}/${tgt}</div></div>`;
  }).join("");
  return `<div class="panel">
    <div class="cap muted tiny" style="margin-bottom:8px">📅 Projected Next Year · ${totalLeave} senior${totalLeave!==1?"s":""} leaving</div>
    <div class="needgrid">${cells}</div>
    <div class="tiny faint" style="margin-top:8px">Returning players (after seniors graduate) + your committed recruits. Target your board at the red spots for next year.</div>
  </div>`;
}

function playerCard(p){
  const d = p.ovr - p.lastOvr;
  const trend = d>0 ? `<div class="trend up">▲ +${d}</div>` : (p.yearsIn>0?`<div class="trend flat">— steady</div>`:`<div class="trend flat tiny">new</div>`);
  return `<div class="player" data-act="player" data-pid="${p.id}">
    <div class="pl-ovr"><b>${p.ovr}</b><span>OVR</span></div>
    <div class="pl-mid">
      <div class="pl-name">${p.name} ${p.gem?'<span class="gem-tag">GEM</span>':''} ${p.juco?'<span class="juco-tag">JUCO</span>':''}</div>
      <div class="pl-line">${yearLabel(p)} · ${p.arch} · ${starStr(p.stars)} · ${homeStr(p)}</div>
    </div>
    <div class="pl-dev"><span class="dev ${p.dev}">${p.dev.toUpperCase()}</span>${trend}</div>
  </div>`;
}

function recentDepartures(){
  if (!S.alumni.length) return "";
  const recent = S.alumni.slice(-8).reverse();
  let h = `<div class="sec-sub cap" style="margin:22px 2px 8px;color:var(--faint)">Recent Departures</div>`;
  recent.forEach(d=>{
    const icon = d.how.includes("Draft")?"🏈":d.how.includes("Transfer")?"↪":"🎓";
    const k = d.how.includes("Draft")?"blue":d.how.includes("Transfer")?"red":"";
    h += `<div class="player" style="opacity:.85">
      <div class="pl-ovr"><b>${d.ovr}</b><span>OVR</span></div>
      <div class="pl-mid"><div class="pl-name">${icon} ${d.name}</div>
        <div class="pl-line">${d.pos} · ${d.how}${d.note?" · "+d.note:""}</div></div>
      <div class="pl-dev"><span class="pill ${k}">S${d.year}</span></div></div>`;
  });
  return h;
}

function viewCoach(){
  const c = S.coach; const need = xpNeeded(c.level);
  let h = `<div class="sec-head"><div><div class="sec-title">Coach Development</div>
    <div class="sec-sub">Spend skill points to upgrade your program</div></div></div>`;
  h += `<div class="panel">
    <div class="coach-hero">
      <div class="coach-badge">★</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:900;font-size:17px">${c.name}</div>
        <div class="muted" style="font-weight:700;font-size:12.5px">Level ${c.level} · ${coachTitle(c.level)}</div>
        <div class="bigxp"><i style="width:${clamp(c.xp/need*100,0,100)}%"></i></div>
        <div class="tiny faint" style="margin-top:5px">${Math.floor(c.xp)} / ${need} XP to next level</div>
      </div>
    </div>
    <div class="row spread" style="margin-top:6px">
      <span class="pill gold">${c.skillPoints} Skill Point${c.skillPoints!==1?"s":""}</span>
      <span class="pill">⏱ ${effHours()} hrs/week · ${S.school.prestige}★</span>
    </div>
    <div class="row" style="margin-top:8px;gap:8px"><button class="btn sm ghost" style="flex:1" data-act="programhq">🏛 Program${(S.school.upgradePoints||0)>0?` · ${S.school.upgradePoints}pts`:""}</button><button class="btn sm ghost" style="flex:1" data-act="editschool">⚙ Playbooks</button></div>
  </div>`;
  const cr = c.career || {w:0,l:0,cw:0,cl:0,t25w:0,t25l:0,t10w:0,t10l:0};
  const tr = c.trophies || {conf:0,natl:0,playoff:0};
  const rec = (w,l)=>`${w||0}-${l||0}`;
  h += `<div class="panel">
    <div class="cap muted tiny" style="margin-bottom:8px">🏆 Coaching Career</div>
    <div class="kpis">
      <div class="kpi"><b>${rec(cr.w,cr.l)}</b><span>Overall</span></div>
      <div class="kpi"><b>${rec(cr.cw,cr.cl)}</b><span>Conference</span></div>
      <div class="kpi"><b>${tr.natl||0}</b><span>Natl Titles</span></div>
    </div>
    <div class="row spread" style="margin-top:8px"><span class="tiny muted">vs Top 25: <b>${rec(cr.t25w,cr.t25l)}</b></span><span class="tiny muted">vs Top 10: <b>${rec(cr.t10w,cr.t10l)}</b></span></div>
    <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
      ${tr.natl?`<span class="pill gold">🏆 ${tr.natl} National</span>`:""}
      ${tr.conf?`<span class="pill gold">🥇 ${tr.conf} Conference</span>`:""}
      ${tr.playoff?`<span class="pill">🎟 ${tr.playoff} Playoff App${tr.playoff>1?"s":""}</span>`:""}
      ${(!tr.natl&&!tr.conf&&!tr.playoff)?`<span class="tiny faint">No trophies yet — go win some hardware.</span>`:""}
    </div>
  </div>`;
  const myArch = ARCHETYPES.find(a=>a.id===c.archetype) || ARCHETYPES[0];
  h += `<div class="sec-sub cap" style="margin:14px 2px 6px;color:var(--gold)">${myArch.icon} ${myArch.name} · Skill Tree</div>`;
  ARCHETYPES.forEach(arch=>{
    const isMine = arch.id===c.archetype;
    h += `<div class="sec-sub cap" style="margin:12px 2px 7px;color:${isMine?"var(--gold)":"var(--faint)"}">${arch.icon} ${arch.name}${isMine?" — your tree":(c.level<CROSS_TREE_LEVEL?` — cross-tree at Lv ${CROSS_TREE_LEVEL}`:"")}</div>`;
    PERKS.filter(pk=>pk.tree===arch.id).forEach(pk=>{
      const tier=perk(pk.id); const maxed=tier>=pk.max; const avail=perkAvailable(pk); const canBuy=c.skillPoints>0 && !maxed && avail;
      const lockNote = c.level<pk.lvl ? `🔒 Lv ${pk.lvl}` : (!isMine && c.level<CROSS_TREE_LEVEL ? `🔒 Lv ${CROSS_TREE_LEVEL}` : "🔒");
      h += `<div class="perk ${maxed?"maxed":""}" style="${avail?"":"opacity:.55"}">
        <div class="perk-ic">${pk.icon}</div>
        <div class="perk-mid">
          <div class="perk-name">${pk.name} ${maxed?'<span class="pill green tiny">MAX</span>':`<span class="faint tiny">Tier ${tier}/${pk.max}</span>`}</div>
          <div class="perk-desc">${pk.desc(Math.min(pk.max,tier+(maxed?0:1)))}</div>
          <div class="perk-tier">${Array.from({length:pk.max},(_,i)=>`<span class="tdot ${i<tier?"on":""}"></span>`).join("")}</div>
        </div>
        <button class="btn sm ${canBuy?"primary":""}" data-act="buyperk" data-id="${pk.id}" ${canBuy?"":"disabled"}>${maxed?"✓":(avail?"Upgrade":lockNote)}</button>
      </div>`;
    });
  });
  return h;
}

function viewGoals(){
  refreshLiveGoals();
  let h = `<div class="sec-head"><div><div class="sec-title">XP Goals</div>
    <div class="sec-sub">Complete objectives to earn Coach XP</div></div></div>`;
  h += `<div class="sec-sub cap" style="margin:6px 2px 9px;color:var(--gold)">This Week</div>`;
  S.weeklyGoals.forEach(go=> h+=goalCard(go));
  h += `<div class="sec-sub cap" style="margin:18px 2px 9px;color:var(--blue)">This Season's Class</div>`;
  S.seasonGoals.forEach(go=> h+=goalCard(go));
  if (S.history.length){
    h += `<div class="sec-sub cap" style="margin:20px 2px 9px;color:var(--faint)">Class History</div>`;
    S.history.slice().reverse().forEach(hh=> h += `<div class="goal"><div class="goal-check">★</div><div class="goal-mid"><div class="goal-name">Season ${hh.year} class</div></div><div class="goal-xp">Grade ${hh.grade} · ${hh.signed}</div></div>`);
  }
  return h;
}
function goalCard(go){
  const pct = clamp(go.prog/go.target*100,0,100);
  return `<div class="goal ${go.done?"done":""}"><div class="goal-check">✓</div>
    <div class="goal-mid"><div class="goal-name">${go.name}</div>
    <div class="goal-bar"><i style="width:${pct}%"></i></div></div>
    <div class="goal-xp">+${go.xp}</div></div>`;
}

let advWrap=null;
function ensureAdvanceBtn(){
  if (advWrap) return;
  advWrap = document.createElement("div"); advWrap.id="advanceWrap";
  advWrap.innerHTML = `<button id="advanceBtn" class="btn primary"></button>`;
  document.getElementById("app").appendChild(advWrap);
  advWrap.querySelector("#advanceBtn").addEventListener("click", advanceWeek);
}
function updateAdvanceBtn(){
  ensureAdvanceBtn();
  advWrap.style.display = (S.tab==="hub"||S.tab==="board"||S.tab==="prospects"||S.tab==="season") ? "flex":"none";
  advWrap.querySelector("#advanceBtn").textContent = S.week===0 ? "▶ Advance — Preseason" : (S.week<=WEEKS_PER_SEASON ? `▶ Play Week ${S.week}` : "▶ Signing Day & Offseason");
}

function toast(msg, kind="", icon="•"){
  const t = document.createElement("div"); t.className = "toast "+kind;
  t.innerHTML = `<span class="ti">${icon}</span><span>${msg}</span>`;
  $("#toast").appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; t.style.transition="opacity .4s"; setTimeout(()=>t.remove(),420); }, 2600);
}
function openModal(html){ $("#modalCard").innerHTML = html; $("#modal").classList.remove("hidden"); }
function closeModal(){ $("#modal").classList.add("hidden"); }

function openDetail(r){
  const showGem = r.gem && (r.gemKnown||perk("eye")>=2);
  let h = `<div class="modal-title">${r.name} ${showGem?'<span class="gem-tag">GEM</span>':''} ${r.juco?'<span class="juco-tag">JUCO</span>':''}</div>
    <div class="muted" style="font-weight:700;margin-bottom:6px">${r.pos} · ${r.arch} · ${starStr(r.stars)}</div>
    <div class="tiny faint" style="margin-bottom:12px">${homeStr(r)} · ${r.highSchool||""}${r.juco?` · JUCO (${r.standing})`:''}</div>
    <div class="kpis">
      <div class="kpi"><b>${fullyScouted(r)?r.ovr:(scoutLevel(r)>=1?"~"+Math.round(r.ovr/5)*5:"?")}</b><span>OVR</span></div>
      <div class="kpi"><b>${fullyScouted(r)?r.pot:"?"}</b><span>POT</span></div>
      <div class="kpi"><b>${r.suitors.length}</b><span>Schools</span></div>
    </div>`;
  h += `<div class="sec-sub cap" style="margin:6px 2px 8px;color:var(--muted)">Recruiting Battle</div>`;
  const sorted = sortedSuitors(r); const maxP=Math.max(1,sorted[0].points);
  sorted.forEach(s=>{ h+=`<div class="battle-row ${s.isPlayer?"me":""}"><div class="nm">${s.isPlayer?"★ "+suitorLabel(s):suitorLabel(s)}</div><div class="bar"><i style="width:${clamp(s.points/maxP*100,4,100)}%"></i></div><div class="pts">${Math.round(s.points)}</div></div>`; });
  h += `<div class="sec-sub cap" style="margin:14px 2px 8px;color:var(--muted)">What he values ${fullyScouted(r)?"":`· scouted ${Math.min(scoutLevel(r),scoutNeeded(r))}/${scoutNeeded(r)}`}</div><div class="motfit">`;
  r.motivations.slice(0, Math.min(scoutLevel(r),3)).forEach(m=>{ const gr=bumpGrade(S.school.grades[m]||"C",perk("silver")); const db=(m===r.dealbreaker&&fullyScouted(r)); h+=`<span class="mot ${db?"db":""}">${db?"🔒 ":""}${m}<span class="g g-${gr}">${gr}</span></span>`; });
  if (scoutLevel(r)<1) h+=`<span class="tiny faint">Add to board & Scout to reveal his motivations.</span>`;
  h += `</div>`;
  if (r.scouted) h += `<div class="tiny faint" style="margin-top:12px">${fmtHW(r)}</div>`;
  h += `<div class="row spread" style="margin-top:18px;gap:10px">
    <button class="btn ghost" data-act="closemodal">Close</button>
    ${!r.onBoard?`<button class="btn primary" data-act="add" data-id="${r.id}">+ Board</button>`:`<button class="btn danger" data-act="remove" data-id="${r.id}">Drop</button>`}
  </div>`;
  openModal(h);
}

function statSummary(s){
  const parts=[];
  if(s.gp) parts.push(`${s.gp} G`);
  if(s.passYd) parts.push(`${s.passYd} pass yd · ${s.passTD} TD · ${s.int} INT`);
  if(s.rushYd) parts.push(`${s.rushYd} rush yd · ${s.rushTD} TD`);
  if(s.recYd) parts.push(`${s.rec} rec · ${s.recYd} yd · ${s.recTD} TD`);
  if(s.tkl) parts.push(`${s.tkl} tkl · ${s.sack} sk · ${s.intD} INT`);
  return parts.join(" · ") || "No stats yet";
}
function openPlayer(p){
  const breakout = p.ovr - (p.lastOvr||p.ovr);
  const tr = DHQ.develop ? DHQ.develop.tier(p.ovr) : "";
  const sLine = p.seasonStats ? statSummary(p.seasonStats) : "";
  const cLine = p.careerStats ? statSummary(p.careerStats) : "";
  let h = `<div class="modal-title">${p.name} ${p.gem?'<span class="gem-tag">GEM</span>':''} ${p.juco?'<span class="juco-tag">JUCO</span>':''}</div>
    <div class="muted" style="font-weight:700;margin-bottom:6px">${p.pos} · ${p.arch} · ${yearLabel(p)} · ${starStr(p.stars)}</div>
    <div class="tiny faint" style="margin-bottom:12px">${homeStr(p)} · ${p.highSchool||""}${p.weight?` · ${p.weight} lbs`:""}${p.origin==="JUCO"?` · JUCO transfer`:(p.priorSchool&&p.priorSchool!=="JUCO"?` · from ${teamLabel(p.priorSchool)}`:"")}</div>
    <div class="kpis">
      <div class="kpi"><b>${p.ovr}</b><span>OVR · T${tr}</span></div>
      <div class="kpi"><b>${p.pot}</b><span>POT</span></div>
      <div class="kpi"><b>${p.dev}</b><span>Dev Trait</span></div>
    </div>
    <div class="row spread" style="margin-top:4px"><span class="pill">Age ${p.age}</span>${breakout>0?`<span class="pill green">▲ +${breakout} OVR last yr</span>`:(p.devXP?`<span class="pill">${p.devXP} XP last yr</span>`:`<span class="pill">—</span>`)}</div>`;
  if (sLine && p.seasonStats.gp>0) h += `<div class="sec-sub cap" style="margin:14px 2px 6px;color:var(--muted)">This Season</div><div class="tiny" style="font-weight:700">${sLine}</div>`;
  if (cLine && p.careerStats && p.careerStats.gp>0) h += `<div class="sec-sub cap" style="margin:12px 2px 6px;color:var(--faint)">Career</div><div class="tiny faint" style="font-weight:700">${cLine}</div>`;
  h += `<button class="btn primary block" style="margin-top:18px" data-act="closemodal">Close</button>`;
  openModal(h);
}

function openFormations(){
  const o = offPb(), d = defPb();
  let h = `<div class="modal-title">Playbooks & Formations</div>
    <div class="sec-sub cap" style="margin:10px 2px 6px;color:var(--gold)">Offense · ${o.name}</div>
    <div class="form-list">${o.formations.map(f=>`<span class="form-chip">${f}</span>`).join("")}</div>
    <div class="sec-sub cap" style="margin:16px 2px 6px;color:var(--blue)">Defense · ${d.name}</div>
    <div class="form-list">${d.formations.map(f=>`<span class="form-chip">${f}</span>`).join("")}</div>
    <div class="tiny faint" style="margin-top:14px">Your playbooks shape your ideal depth chart — recruit to fill the positions they emphasize.</div>
    <button class="btn primary block" style="margin-top:16px" data-act="closemodal">Got it</button>`;
  openModal(h);
}

function openOOCEdit(week){
  const gOOC = S.season.schedule.find(x=>x.week===week); if(!gOOC || gOOC.played) return;
  const taken = new Set(S.season.schedule.map(x=>x.oppId));
  let opts="";
  TM.CONF_ORDER.forEach(c=>{ const ts=TM.byConf(c).filter(t=>t.id!==S.school.id && (!taken.has(t.id)||t.id===gOOC.oppId)); if(!ts.length) return;
    opts += `<optgroup label="${TM.CONFS[c]}">`+ts.sort((a,b)=>a.n.localeCompare(b.n)).map(t=>`<option value="${t.id}" ${t.id===gOOC.oppId?"selected":""}>${t.n} ${t.m} (${t.p}★)</option>`).join("")+`</optgroup>`; });
  let h=`<div class="modal-title">Week ${week} — Non-Conference Opponent</div>
    <div class="tiny muted" style="margin-bottom:10px">Tougher opponents help your CFP résumé; cupcakes pad wins.</div>
    <select id="oocSel" class="ipt">${opts}</select>
    <div class="row spread" style="margin-top:14px;gap:10px"><button class="btn ghost" data-act="closemodal">Cancel</button>
      <button class="btn primary" data-act="pickooc" data-w="${week}">Schedule</button></div>`;
  openModal(h);
}

function goalsSummaryHTML(){
  refreshLiveGoals();
  let h = `<div class="sec-sub cap" style="margin:16px 2px 8px;color:var(--gold)">Weekly Goals</div>`;
  S.weeklyGoals.forEach(go=> h+=goalCard(go));
  h += `<div class="sec-sub cap" style="margin:16px 2px 8px;color:var(--blue)">Season Class Goals</div>`;
  S.seasonGoals.forEach(go=> h+=goalCard(go));
  return h;
}

function miniCrest(id){ const t=TM.byId(id); if(!t) return ""; return `<span class="mini-crest" style="background:linear-gradient(150deg,${t.c1},${t.c2||t.c1})">${t.ab.slice(0,2)}</span>`; }
function openWeekRecap(pg, xp, commits, wk){
  let h = `<div class="modal-title">Week ${wk} Recap</div>`;
  if (commits.length){
    const top = commits.slice().sort((a,b)=>b.stars-a.stars)[0];
    h += `<div class="panel" style="text-align:center;border-color:var(--gold)"><div style="font-size:26px">🎉</div>
      <div style="font-weight:900;font-size:15px;margin-top:2px">${top.name} committed to ${schoolName()}!</div>
      <div class="tiny muted" style="font-weight:700">${top.pos} · ${starStr(top.stars)}${commits.length>1?` · and ${commits.length-1} more`:""}</div></div>`;
  }
  if (pg){
    h += `<div class="panel"><div class="row spread"><div class="cap muted tiny">Game Result</div><span class="pill ${pg.win?"green":"red"}">${pg.win?"WIN":"LOSS"}</span></div>
      <div class="mu-row" style="margin-top:6px">
        <div class="mu-team">${miniCrest(S.school.id)}<div class="mu-name">${schoolName()}</div></div>
        <div class="mu-vs">${pg.us}–${pg.them}</div>
        <div class="mu-team right">${miniCrest(pg.opp)}<div class="mu-name">${teamLabel(pg.opp)}</div></div>
      </div></div>`;
  }
  h += `<div class="kpis">
    <div class="kpi"><b>+${Math.round(xp)}</b><span>Coach XP</span></div>
    <div class="kpi"><b>${commits.length}</b><span>Commits</span></div>
    <div class="kpi"><b>${S.classSigned.length}</b><span>Class</span></div>
  </div>`;
  if (commits.length>1){
    h += `<div class="sec-sub cap" style="margin:10px 2px 6px;color:var(--gold)">This week's commits</div>`;
    commits.forEach(c=> h+=`<div class="row spread" style="padding:5px 2px;border-bottom:1px solid var(--line)"><div style="font-weight:700">${c.name} <span class="faint tiny">${c.pos}</span></div><div>${starStr(c.stars)}</div></div>`);
  }
  h += `<button class="btn primary block" style="margin-top:16px" data-act="closemodal">Continue ▸</button>`;
  openModal(h);
}
function openSeasonSummary(sm){
  let h = `<div class="modal-title">Season ${sm.year} Wrap-Up</div>`;
  const f = sm.football;
  if (f){
    const champLine = f.wonTitle ? "🏆 NATIONAL CHAMPIONS" : (f.playerCFP ? `Playoff — reached the ${f.playerCFP.round}` : (f.playerBowl ? `${f.playerBowl.name}: ${f.playerBowl.win?"W":"L"} ${f.playerBowl.us}–${f.playerBowl.them} vs ${teamLabel(f.playerBowl.opp)}` : ""));
    h += `<div class="panel" style="margin-bottom:12px">
      <div class="row spread"><div class="cap muted tiny">Final Record</div>${f.confChamp?'<span class="pill gold tiny">CONF CHAMP 🏆</span>':''}</div>
      <div style="font-weight:900;font-size:20px;margin-top:3px">${f.record} <span class="faint" style="font-size:13px">(${f.confRecord} ${TM.CONFS[S.school.conf]||""})</span></div>
      <div class="tiny muted" style="font-weight:700">${f.rank?`#${f.rank} final`:"Unranked"}${champLine?` · ${champLine}`:""}</div>
      ${(!f.wonTitle && f.nationalChamp)?`<div class="tiny faint" style="margin-top:4px">National Champion: ${teamLabel(f.nationalChamp)}</div>`:""}
      ${(f.awards&&f.awards.heisman)?`<div class="tiny faint" style="margin-top:4px">🏅 Heisman: ${f.awards.heisman.name} (${f.awards.heisman.pos}, ${teamLabel(f.awards.heisman.teamId)})</div>`:""}
      ${f.upgradePts?`<div class="tiny faint" style="margin-top:4px">🏛 +${f.upgradePts} program upgrade points · prestige now ${(S.school.prestigeF||S.school.prestige).toFixed(1)}★</div>`:""}
    </div>`;
  }
  h += `<div class="muted" style="font-weight:700;margin-bottom:10px">Signing Day — your class is in the books.</div>
    <div class="kpis">
      <div class="kpi"><b>${sm.grade}</b><span>Class Grade</span></div>
      <div class="kpi"><b>${sm.added}</b><span>Signed</span></div>
      <div class="kpi"><b>${sm.rosterSize}</b><span>Roster</span></div>
    </div>`;
  if (sm.cut>0) h += `<div class="pill red" style="margin-bottom:10px">⚠ ${sm.cut} commit${sm.cut>1?"s":""} couldn't fit under the 85 cap</div>`;
  if (sm.bestSignee) h += `<div class="panel"><div class="tiny cap muted">Crown Jewel</div>
    <div style="font-weight:800;font-size:15px;margin-top:3px">${sm.bestSignee.name} ${sm.bestSignee.juco?'<span class="juco-tag">JUCO</span>':''}</div>
    <div class="muted tiny" style="font-weight:700">${sm.bestSignee.pos} · ${starStr(sm.bestSignee.stars)} · ${sm.bestSignee.ovr} OVR</div></div>`;
  if (sm.devReport && sm.devReport.length){
    const risers = sm.devReport.filter(d=>d.gain>0).slice(0,5);
    const ups = sm.devReport.filter(d=>d.traitUp);
    h += `<div class="sec-sub cap" style="margin:10px 2px 8px;color:var(--green)">Player Development — Top Risers</div>`;
    risers.forEach(d=> h += `<div class="row spread" style="padding:5px 2px;border-bottom:1px solid var(--line)"><div class="tiny" style="font-weight:700">${d.name} <span class="faint">${d.pos} · ${d.year}</span></div><div class="tiny" style="font-weight:800;color:var(--green)">${d.from}→${d.to} ▲${d.gain}${d.traitUp?` · ${d.traitUp}!`:""}</div></div>`);
    if (ups.length) h += `<div class="tiny faint" style="margin:7px 2px 0">★ Trait upgrades: ${ups.map(u=>u.name+" → "+u.traitUp).join(", ")}</div>`;
  }
  if (sm.departures.length){
    h += `<div class="sec-sub cap" style="margin:12px 2px 8px;color:var(--faint)">Departures (${sm.departures.length})</div>`;
    sm.departures.forEach(d=>{ const icon=d.how.includes("Draft")?"🏈":d.how.includes("Transfer")?"↪":"🎓";
      h += `<div class="row spread" style="padding:7px 2px;border-bottom:1px solid var(--line)">
        <div><b>${icon} ${d.name}</b> <span class="faint tiny">${d.pos} · ${d.ovr}</span></div>
        <div class="tiny muted">${d.how.replace(" (Senior)","")}${d.note?" · "+d.note:""}</div></div>`; });
  }
  h += `<button class="btn primary block" style="margin-top:18px" data-act="closemodal">Start Season ${sm.year+1} ▸</button>`;
  openModal(h);
}

/* ---------- actions ---------- */
function addToBoard(r){
  const open = S.prospects.filter(p=>p.onBoard && p.status==="open").length;
  if (open>=BOARD_LIMIT){ toast(`Board full (${BOARD_LIMIT}). Drop someone first.`, "bad","✕"); return; }
  r.onBoard=true; ensurePlayerSuitor(r); bumpGoal("addedBoard",1);
  toast(`Added ${r.name} to your board`, "good","＋");
}
function scout(r){
  if (r.scouted) return;
  r.scouted=true; bumpGoal("scouted",1);
  if (r.gem && (perk("eye")>=1 && r.stars<=3 || perk("eye")>=2 || chance(0.5))){
    r.gemKnown=true; addXP(15); toast(`💎 Hidden GEM: ${r.name} (POT ${r.pot})!`, "xp","💎");
  } else toast(`Scouted ${r.name} — ${r.ovr} OVR / ${r.pot} POT`, "", "🔍");
}
function toggleAction(r, actId){
  const a = actById(actId); if (!a) return;
  r.actions = r.actions || [];
  const idx = r.actions.indexOf(actId);
  if (idx>=0){ r.actions.splice(idx,1); refreshLiveGoals(); return; }
  if (INFLUENCE_ACTS.includes(actId)){
    const infCur = r.actions.reduce((s,id)=> s + (INFLUENCE_ACTS.includes(id)?actById(id).cost:0), 0);
    if (infCur + a.cost > PER_RECRUIT_CAP){ toast(`Max ${PER_RECRUIT_CAP}h of influence per recruit`, "bad","✕"); return; }
  }
  if (a.cost > hoursLeft()){ toast(`Not enough hours — ${hoursLeft()} left this week`, "bad","✕"); return; }
  r.actions.push(actId);
  if (actId==="house") bumpGoal("sentHouse",1);
  refreshLiveGoals();
}
function doScout(r, silent){
  if (fullyScouted(r)) return false;
  if (hoursLeft() < SCOUT_COST){ if(!silent) toast(`Not enough hours to scout (${SCOUT_COST}h)`, "bad","✕"); return false; }
  S.weekSpent = (S.weekSpent||0) + SCOUT_COST;
  r.scoutProgress = (r.scoutProgress||0) + 1;
  bumpGoal("scouted",1); addXP(2);
  if (fullyScouted(r) && !r.scouted){ r.scouted=true; if (r.gem) r.gemKnown=true; }
  return true;
}
function offerScholarship(r, silent){
  if (r.schol) return false;
  if (scholLeft() <= 0){ if(!silent) toast(`No scholarships left (${SCHOL_MAX} max)`, "bad","✕"); return false; }
  if (hoursLeft() < SCHOL_COST){ if(!silent) toast(`Not enough hours (${SCHOL_COST}h)`, "bad","✕"); return false; }
  S.weekSpent = (S.weekSpent||0) + SCHOL_COST;
  r.schol = true;
  ensurePlayerSuitor(r).points += 8 + perk("bagman")*4;
  if (!silent) toast(`🎓 Scholarship offered to ${r.name}`, "good","🎓");
  return true;
}
function scoutAllHours(){ return S.prospects.filter(p=>p.onBoard && p.status==="open" && !fullyScouted(p)).reduce((s,r)=> s + (scoutNeeded(r)-scoutLevel(r))*SCOUT_COST, 0); }
function scholAllHours(){ const cand = S.prospects.filter(p=>p.onBoard && p.status==="open" && !p.schol).length; return Math.min(cand, scholLeft()) * SCHOL_COST; }
function scoutAll(){
  const board = S.prospects.filter(p=>p.onBoard && p.status==="open" && !fullyScouted(p));
  let done=0;
  for (const r of board){ while (!fullyScouted(r) && hoursLeft()>=SCOUT_COST){ if (doScout(r,true)) done++; else break; } if (hoursLeft()<SCOUT_COST) break; }
  save(); render();
  toast(done?`🔍 Ran ${done} scout report${done>1?"s":""}`:`Not enough hours (or all scouted)`, done?"good":"bad","🔍");
}
function scholAll(){
  const board = S.prospects.filter(p=>p.onBoard && p.status==="open" && !p.schol);
  let done=0;
  for (const r of board){ if (scholLeft()<=0 || hoursLeft()<SCHOL_COST) break; if (offerScholarship(r,true)) done++; }
  save(); render();
  toast(done?`🎓 Offered ${done} scholarship${done>1?"s":""}`:`No scholarships or hours available`, done?"good":"bad","🎓");
}

document.addEventListener("click", (e)=>{
  const tab = e.target.closest(".tab");
  if (tab){ S.tab=tab.dataset.tab; save(); render(); return; }
  const pl = e.target.closest("[data-pid]");
  if (pl && !e.target.closest("[data-act]")){ const p = S.roster.find(x=>x.id===pl.dataset.pid); if (p) openPlayer(p); return; }
  const el = e.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act; const id = el.dataset.id;
  const r = id ? S.prospects.find(p=>p.id===id) : null;
  switch(act){
    case "action": toggleAction(r, el.dataset.a); save(); render(); break;
    case "doscout": doScout(r); save(); render(); if(!$("#modal").classList.contains("hidden")) openDetail(r); break;
    case "offerschol": offerScholarship(r); save(); render(); break;
    case "scoutall": scoutAll(); break;
    case "scholall": scholAll(); break;
    case "add": addToBoard(r); closeModal(); save(); render(); break;
    case "remove": r.onBoard=false; r.actions=[]; r.schol=false; r.suitors=r.suitors.filter(s=>!s.isPlayer); closeModal(); save(); render(); break;
    case "detail": openDetail(r); break;
    case "formations": openFormations(); break;
    case "seatab": DHQ.season.setSeaTab(el.dataset.v); render(); break;
    case "editooc": openOOCEdit(parseInt(el.dataset.w,10)); break;
    case "pickooc": { const w=parseInt(el.dataset.w,10); const gg=S.season.schedule.find(x=>x.week===w); const v=$("#oocSel")?$("#oocSel").value:null; if(gg&&v&&!gg.played) gg.oppId=v; closeModal(); save(); render(); break; }
    case "fpos": pState.fpos=el.dataset.v; render(); break;
    case "fstar": pState.fstar=parseInt(el.dataset.v,10); render(); break;
    case "buyperk": buyPerk(el.dataset.id); break;
    case "editschool": openProgramEditor(); break;
    case "saveschool": saveProgramEditor(); break;
    case "programhq": openProgramHQ(); break;
    case "upattr": if(DHQ.program && DHQ.program.upgrade(S.school, el.dataset.a)){ S.school.grades=DHQ.program.motivationGrades(S.school,S.offPb); save(); render(); openProgramHQ(); } break;
    case "toggleparody": DHQ.USE_PARODY = !DHQ.USE_PARODY; saveProgramEditor(); break;
    case "closemodal": closeModal(); render(); break;
    case "newgame": if(confirm("Start a brand new dynasty? This erases your current save.")){ store.wipe(); location.reload(); } break;
  }
});

function buyPerk(pid){
  const pk = PERKS.find(p=>p.id===pid);
  if (!pk || S.coach.skillPoints<=0 || perk(pid)>=pk.max || !perkAvailable(pk)) return;
  S.coach.skillPoints--; S.coach.perks[pid]++;
  if (pid==="eye" && perk("eye")>=2) S.prospects.forEach(p=>{ if(p.gem) p.gemKnown=true; });
  toast(`Upgraded ${pk.name} → Tier ${perk(pid)}`, "xp", pk.icon);
  save(); render();
}

function openProgramHQ(){
  if (!DHQ.program){ toast("Program module not loaded","bad","✕"); return; }
  const sc=S.school; const a=sc.attr||{}; const pts=sc.upgradePoints||0;
  let h=`<div class="modal-title">Program Builder</div>
    <div class="row spread" style="margin-bottom:12px"><span class="tiny muted">${sc.name} · ${(sc.prestigeF||sc.prestige).toFixed(1)}★ prestige</span><span class="pill gold">${pts} upgrade pts</span></div>`;
  DHQ.program.ATTR.forEach(at=>{ const v=Math.round(a[at.id]||50); const gr=DHQ.program.valueToGrade(v); const dyn=at.type==="dynamic"; const cost=DHQ.program.upgradeCost(v); const can=DHQ.program.canUpgrade(sc,at.id);
    h+=`<div class="attr-row"><div class="attr-name">${at.name} ${at.type!=="dynamic"?`<span class="faint tiny">${at.type}</span>`:""}</div>
      <div class="attr-grade g-${gr}">${gr}</div>
      ${dyn?`<button class="btn sm ${can?"primary":""}" data-act="upattr" data-a="${at.id}" ${can?"":"disabled"}>${v>=95?"MAX":"▲"+cost}</button>`:`<div style="width:48px"></div>`}</div>`; });
  h+=`<div class="tiny faint" style="margin-top:12px">Facilities boost player development · Brand Exposure & Recruiting boost recruiting · earn points by winning. Your recruits' pitch grades come from these.</div>`;
  if (DHQ.pipeline && sc.pipelines){
    const entries = Object.entries(sc.pipelines).sort((a,b)=>b[1]-a[1]).slice(0,10);
    h += `<div class="sec-sub cap" style="margin:16px 2px 7px;color:var(--gold)">Pipelines · home: ${sc.homeRegion||"—"}</div>`;
    entries.forEach(([rg,t])=>{ h += `<div class="attr-row"><div class="attr-name">📍 ${rg}</div><div class="attr-grade ${t>=4.5?"g-A":t>=3.5?"g-B":t>=2.5?"g-C":"g-D"}">${DHQ.pipeline.tierLabel(t)}</div><div style="width:48px"></div></div>`; });
    h += `<div class="tiny faint" style="margin-top:6px">Higher-tier regions give a big recruiting edge and a better Close-to-Home pitch there. Signing from a region strengthens it over time.</div>`;
  }
  h += `<button class="btn primary block" style="margin-top:14px" data-act="closemodal">Done</button>`;
  openModal(h);
}

function openProgramEditor(){
  let h = `<div class="modal-title">Program & Playbooks</div>
    <div class="tiny muted" style="margin-bottom:10px">${S.school.name} ${S.school.nick} · ${TM.CONFS[S.school.conf]||S.school.conf} · ${S.school.prestige}★</div>
    <label class="tiny cap muted">Coach name</label>
    <input id="edCoach" value="${(S.coach.name||"").replace(/"/g,'&quot;')}" class="ipt">
    <div class="row" style="gap:10px">
      <div style="flex:1"><label class="tiny cap muted">Offense</label>
        <select id="edOff" class="ipt">${OFF_PLAYBOOKS.map(p=>`<option value="${p.id}" ${S.offPb===p.id?"selected":""}>${p.name}</option>`).join("")}</select></div>
      <div style="flex:1"><label class="tiny cap muted">Defense</label>
        <select id="edDef" class="ipt">${DEF_PLAYBOOKS.map(p=>`<option value="${p.id}" ${S.defPb===p.id?"selected":""}>${p.name}</option>`).join("")}</select></div>
    </div>
    <div class="tiny faint" style="margin:10px 0 4px">Pitch grades come from your program attributes — open 🏛 Program Builder (Coach tab) to invest.</div>`;
  h += `<div class="divider"></div>
    <div class="row spread" style="margin-bottom:10px"><span class="tiny" style="font-weight:700">Parody names ${DHQ.USE_PARODY?"<span class='pill green tiny'>ON</span>":""}</span>
      <button class="btn sm ghost" data-act="toggleparody">${DHQ.USE_PARODY?"Use real names":"Use parody names"}</button></div>
    <button class="btn primary block" data-act="saveschool">Save</button>
    <button class="btn danger block ghost" style="margin-top:10px" data-act="newgame">Start New Dynasty</button>`;
  openModal(h);
}
function saveProgramEditor(){
  const cn = $("#edCoach") ? $("#edCoach").value.trim() : ""; if (cn) S.coach.name=cn;
  if ($("#edOff")) S.offPb = $("#edOff").value;
  if ($("#edDef")) S.defPb = $("#edDef").value;
  recomputeScheme();
  if (DHQ.program) S.school.grades = DHQ.program.motivationGrades(S.school, S.offPb);
  save(); closeModal(); render();
}

/* ---------- first-run setup ---------- */
function openSetup(){
  // team picker grouped by conference
  let opts = "";
  TM.CONF_ORDER.forEach(c=>{
    const teams = TM.byConf(c).sort((a,b)=>a.n.localeCompare(b.n));
    if (!teams.length) return;
    opts += `<optgroup label="${TM.CONFS[c]}">` + teams.map(t=>`<option value="${t.id}">${t.n} ${t.m} (${t.p}★)</option>`).join("") + `</optgroup>`;
  });
  const def = pick(TM.TEAMS.filter(t=>t.p>=2 && t.p<=3));
  let h = `<div class="modal-title">Build Your Dynasty</div>
    <div class="tiny muted" style="margin-bottom:14px">Pick your program and playbooks. Prestige sets your weekly recruiting hours.</div>
    <label class="tiny cap muted">School</label>
    <select id="suTeam" class="ipt big">${opts}</select>
    <div id="suInfo" class="tiny faint" style="margin:-6px 0 12px"></div>
    <label class="tiny cap muted">Coach name</label>
    <input id="suCoach" value="Coach ${pick(["Reed","Vance","Holt","Boone","Marsh","Cole"])}" class="ipt">
    <div class="row" style="gap:10px">
      <div style="flex:1"><label class="tiny cap muted">Offense</label>
        <select id="suOff" class="ipt">${OFF_PLAYBOOKS.map(p=>`<option value="${p.id}">${p.name}</option>`).join("")}</select></div>
      <div style="flex:1"><label class="tiny cap muted">Defense</label>
        <select id="suDef" class="ipt">${DEF_PLAYBOOKS.map(p=>`<option value="${p.id}">${p.name}</option>`).join("")}</select></div>
    </div>
    <label class="tiny cap muted">Coaching Archetype</label>
    <select id="suArch" class="ipt">${ARCHETYPES.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join("")}</select>
    <div id="suArchInfo" class="tiny faint" style="margin:-6px 0 10px"></div>
    <button class="btn primary block" id="suStart" style="margin-top:6px">Start Dynasty ▸</button>`;
  openModal(h);
  const arch = $("#suArch");
  const setArchInfo = () => { const a = ARCHETYPES.find(x=>x.id===arch.value); if (a) $("#suArchInfo").textContent = a.blurb; };
  arch.addEventListener("change", setArchInfo); setArchInfo();
  const sel = $("#suTeam"); sel.value = def.id;
  const updateInfo = () => { const t = TM.byId(sel.value); const row=HOURS_TABLE[String(t.p)]||{wk:600,pre:750}; $("#suInfo").textContent = `${TM.CONFS[t.c]} · ${t.p}★ prestige · ${t.city}, ${t.st} · ${row.wk} hrs/wk (${row.pre} preseason)`; };
  sel.addEventListener("change", updateInfo); updateInfo();
  $("#suStart").addEventListener("click", ()=>{
    newGame({ teamId: sel.value, coach: $("#suCoach").value.trim()||"Coach", offPb: $("#suOff").value, defPb: $("#suDef").value, archetype: $("#suArch").value });
    closeModal(); render();
    setTimeout(()=>toast("Welcome to "+schoolName()+". Fill your board!","good","★"),300);
  });
}

/* ---------- boot ---------- */
function boot(){
  const saved = store.load();
  if (saved && saved.school && saved.school.name){
    S = saved; DHQ.S = S;
    PERKS.forEach(p=>{ if(S.coach.perks[p.id]==null) S.coach.perks[p.id]=0; });
    if (!S.coach.career) S.coach.career = {w:0,l:0,cw:0,cl:0,t25w:0,t25l:0,t10w:0,t10l:0};
    if (!S.coach.trophies) S.coach.trophies = {conf:0,natl:0,playoff:0};
    if (!S.coach.archetype) S.coach.archetype = "recruiter";
    if (!S.schemeTarget || !Object.keys(S.schemeTarget).length) recomputeScheme();
    if (!S.rivalPool || !S.rivalPool.length) S.rivalPool = buildRivalPool(TM.byId(S.school.id) || {id:null});
    if (DHQ.season && !S.season) DHQ.season.init(S);
    if (DHQ.program && !S.school.attr){ DHQ.program.init(S.school, TM.byId(S.school.id)); S.school.grades = DHQ.program.motivationGrades(S.school, S.offPb); }
    if (DHQ.pipeline && !S.school.pipelines){ DHQ.pipeline.initPipelines(S.school, TM.byId(S.school.id)); }
    render();
  } else { render(); openSetup(); }
}
document.addEventListener("dblclick", e=>{ if(e.target.closest("button")) e.preventDefault(); }, {passive:false});
boot();
DHQ.app = { get S(){return S;}, newGame, advanceWeek, render, toggleAction, schoolName, goalsSummaryHTML, hoursLeft:()=>hoursLeft(), effHours:()=>effHours(), allocatedHours:()=>allocatedHours() };
})();
