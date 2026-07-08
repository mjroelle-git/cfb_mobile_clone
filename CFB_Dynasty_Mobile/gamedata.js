/* ============================================================
   Dynasty HQ — static game data + generators (DHQ.data)
   ============================================================ */
window.DHQ = window.DHQ || {};
(() => {
  const { rand, randint, pick, chance, shuffle, clamp } = DHQ.rng;

  const FIRST = ["Jaylen","Marcus","DeShawn","Trey","Cameron","Bryce","Xavier","Malik","Tyrese","Jordan",
    "Caleb","Isaiah","Devon","Damari","Keon","Amari","Tre","Jamal","Khalil","Rashad","Donovan","Elijah",
    "Micah","Carter","Mason","Hudson","Gage","Brock","Tanner","Colt","Beau","Easton","Landon","Kade",
    "Anthony","Vince","Dom","Nico","Leo","Mateo","Andre","Quincy","Roman","Silas","Zion","Jaxon","Demarcus",
    "Terrell","Cordell","Javon","Darius","Kelvin","Marquis","Treveon","Jaden","Kobe","Deion","Lamar","Cade"];
  const LAST = ["Johnson","Williams","Carter","Brooks","Hayes","Coleman","Bennett","Foster","Reed","Sims",
    "Patterson","Rivers","Mack","Dawson","Caldwell","Holloway","Sanders","Wade","Greer","Mosley","Vance",
    "Pierce","Ellison","Tatum","Boyd","Compton","Ferguson","Garrett","Hammond","Ingram","Jennings","Knight",
    "Larkin","Mercer","Newsome","Okafor","Prince","Quarles","Ramsey","Stallworth","Thornton","Underwood",
    "Vaughn","Whitfield","Youngblood","Zamora","Beckett","Castillo","DeLeon","Esposito","Faulkner","Goodwin"];
  const STATES = ["TX","FL","GA","CA","OH","AL","LA","NC","PA","MI","TN","VA","SC","MS","NJ","MD","AZ","WA",
    "IL","IN","KY","OK","MO","CO","NV","UT","OR","WI","MN","NY","AR","KS","NE","IA","CT"];
  // city pools by state (subset; falls back to a generic list)
  const CITIES = {
    TX:["Houston","Dallas","Austin","San Antonio","Fort Worth","Katy","Allen","Tyler","Midland","Waco"],
    FL:["Miami","Tampa","Orlando","Jacksonville","Fort Lauderdale","Naples","Lakeland","Bradenton"],
    GA:["Atlanta","Savannah","Macon","Valdosta","Columbus","Marietta","Athens"],
    CA:["Los Angeles","San Diego","Sacramento","Fresno","Long Beach","Oakland","Santa Ana"],
    OH:["Cleveland","Columbus","Cincinnati","Toledo","Akron","Dayton"],
    AL:["Birmingham","Mobile","Montgomery","Huntsville","Tuscaloosa"],
    LA:["New Orleans","Baton Rouge","Shreveport","Lafayette","Metairie"],
    NC:["Charlotte","Raleigh","Greensboro","Durham","Fayetteville"],
  };
  const GENERIC_CITY = ["Riverside","Springfield","Franklin","Clinton","Madison","Georgetown","Salem","Auburn","Dayton","Marion"];
  const HS_SUFFIX = ["High","Prep","Academy","Christian","Catholic","Central","Senior High"];

  function genHometown(state){
    const list = CITIES[state] || GENERIC_CITY;
    return { city: pick(list), st: state };
  }
  function genHighSchool(home){
    const base = chance(0.5) ? home.city : pick(["North","South","East","West","Central","Lincoln","Liberty","Heritage","Oak Ridge","Lakeview"]);
    return `${base} ${pick(HS_SUFFIX)}`;
  }

  const POSITIONS = [
    { p:"QB", arch:["Pocket Passer","Dual Threat","Field General","Backyard QB"] },
    { p:"RB", arch:["Power Back","Elusive Back","Receiving Back","Every-Down Back"] },
    { p:"WR", arch:["Deep Threat","Possession","Slot Weapon","Physical X"] },
    { p:"TE", arch:["Vertical Threat","Blocking TE","Possession TE"] },
    { p:"OT", arch:["Pass Protector","Power Blocker","Agile"] },
    { p:"IOL",arch:["Pass Protector","Power Blocker","Pulling Guard"] },
    { p:"EDGE",arch:["Speed Rusher","Power Rusher","Edge Setter"] },
    { p:"DT", arch:["Run Stuffer","Interior Rusher","Nose Tackle"] },
    { p:"LB", arch:["Field General","Thumper","Coverage LB"] },
    { p:"CB", arch:["Man-to-Man","Zone","Bump-and-Run"] },
    { p:"S",  arch:["Box Safety","Coverage Safety","Hybrid"] },
    { p:"ATH",arch:["Athlete"] },
    { p:"K",  arch:["Accurate","Big Leg"] },
    { p:"P",  arch:["Directional","Booming"] },
  ];
  const posWeights = ["QB","QB","RB","RB","WR","WR","WR","TE","OT","OT","IOL","IOL","EDGE","EDGE","DT","DT",
    "LB","LB","CB","CB","CB","S","S","ATH","K"];
  const MOTIVATIONS = ["Playing Time","Title Contender","Path to the Pros","Brand Exposure","Program Tradition",
    "Academic Prestige","Close to Home","Campus Lifestyle","Conference Prestige","Coach Stability","Pro-Style Scheme"];

  const OFF_PLAYBOOKS = [
    { id:"airraid",   name:"Air Raid",        formations:["Empty","Gun Trips","Gun Spread","Gun Bunch","Mesh"],          weights:{ WR:1.5, QB:1.1, IOL:1.0, OT:1.0, TE:0.6, RB:0.8 } },
    { id:"spread",    name:"Spread Option",   formations:["Gun Trips","Pistol","Gun Spread","Read Option","RPO"],         weights:{ WR:1.3, QB:1.2, RB:1.1, OT:1.0, IOL:1.0, TE:0.8 } },
    { id:"prostyle",  name:"Pro Style",       formations:["I-Form","Singleback","Strong I","Play Action","Power O"],      weights:{ OT:1.2, IOL:1.1, TE:1.2, RB:1.1, WR:1.0, QB:1.0 } },
    { id:"westcoast", name:"West Coast",      formations:["Singleback","Gun Slot","I-Form Pro","Slants","Flood"],         weights:{ WR:1.2, TE:1.1, RB:1.0, QB:1.0, OT:1.0, IOL:1.0 } },
    { id:"smashmouth",name:"Smashmouth Power",formations:["I-Form Power","Heavy","Goal Line","Wham","Counter"],          weights:{ OT:1.3, IOL:1.3, TE:1.3, RB:1.2, WR:0.7, QB:0.9 } },
    { id:"flexbone",  name:"Flexbone Option", formations:["Flexbone","Triple Option","Wishbone","Midline","Rocket Toss"], weights:{ RB:1.4, OT:1.2, IOL:1.2, QB:1.2, TE:1.0, WR:0.6 } },
  ];
  const DEF_PLAYBOOKS = [
    { id:"43",       name:"4-3",            formations:["4-3 Over","4-3 Under","Cover 2","Cover 3","Tampa 2"],   weights:{ DT:1.2, EDGE:1.2, LB:1.3, CB:1.0, S:1.0 } },
    { id:"34",       name:"3-4",            formations:["3-4 Base","3-4 Odd","Okie","Cover 3","Fire Zone"],      weights:{ EDGE:1.4, DT:1.1, LB:1.3, CB:1.0, S:1.0 } },
    { id:"nickel",   name:"Nickel (4-2-5)", formations:["Nickel","4-2-5","Dime","Cover 4","Cover 6"],           weights:{ CB:1.3, S:1.3, EDGE:1.2, DT:1.0, LB:0.9 } },
    { id:"335",      name:"3-3-5 Stack",    formations:["3-3-5","Stack","Bear","Cover 3 Buzz","Robber"],        weights:{ S:1.4, LB:1.1, CB:1.2, EDGE:1.1, DT:0.9 } },
    { id:"multiple", name:"Multiple",       formations:["4-3 Base","Nickel","3-4 Okie","Dime","Cover 3"],       weights:{ EDGE:1.1, DT:1.1, LB:1.1, CB:1.1, S:1.1 } },
  ];

  const ROSTER_BASE = { QB:4, RB:6, WR:11, TE:5, OT:8, IOL:8, EDGE:7, DT:7, LB:9, CB:9, S:8, K:2, P:1 };
  function schemeTargets(offWeights, defWeights){
    const t = { ...ROSTER_BASE };
    for (const k in t){ const w = (offWeights && offWeights[k]) || (defWeights && defWeights[k]) || 1; t[k] = t[k]*w; }
    const sum = Object.values(t).reduce((a,b)=>a+b,0); const scale = 85/sum;
    const out = {}; for (const k in t) out[k] = Math.max(1, Math.round(t[k]*scale));
    let tot = Object.values(out).reduce((a,b)=>a+b,0);
    const keys = Object.keys(out).sort((a,b)=>out[b]-out[a]); let i=0;
    while (tot>85){ const k=keys[i%keys.length]; if(out[k]>1){ out[k]--; tot--; } i++; if(i>500)break; }
    i=0; while (tot<85){ out[keys[i%keys.length]]++; tot++; i++; if(i>500)break; }
    return out;
  }

  function ovrForStars(stars){ const base = { 5:[83,90], 4:[77,85], 3:[70,80], 2:[63,73], 1:[58,68] }[stars]; return randint(base[0], base[1]); }
  function potForStars(stars, ovr, gem){
    let bonus = { 5:[6,12], 4:[5,12], 3:[5,14], 2:[6,16], 1:[6,16] }[stars];
    let pot = ovr + randint(bonus[0], bonus[1]); if (gem) pot += randint(4, 9);
    return clamp(pot, ovr + 2, 99);
  }
  function rollStars(){ const r = Math.random(); if (r<0.03) return 5; if (r<0.18) return 4; if (r<0.55) return 3; if (r<0.85) return 2; return 1; }
  function rollDev(stars, gem){ let r = Math.random() + (stars-3)*0.08 + (gem?0.15:0); return r>0.95?"Elite":r>0.78?"Star":r>0.50?"Impact":"Normal"; }

  let _pid = 1;
  const HW = { QB:[200,235],RB:[195,225],WR:[175,215],TE:[235,260],OT:[290,325],IOL:[295,330],
      EDGE:[245,275],DT:[290,330],LB:[225,250],CB:[180,200],S:[195,215],ATH:[185,215],K:[180,205],P:[185,210] };

  // rivalPool entries: { id, name, prestige }
  function genProspect(rivalPool, opts={}){
    const stars = opts.stars || rollStars();
    const posObj = POSITIONS.find(o => o.p === (opts.pos || pick(posWeights))) || pick(POSITIONS);
    const juco = chance(0.12);
    const standing = juco ? pick(["SO","JR"]) : "HS";
    let ovr = ovrForStars(stars);
    const gem = chance(stars <= 3 ? 0.16 : 0.05);
    let pot = potForStars(stars, ovr, gem);
    if (juco){ ovr = clamp(ovr+2, 55, 95); pot = clamp(ovr + randint(2,7) + (gem?randint(2,5):0), ovr+1, 99); }
    const name = pick(FIRST) + " " + pick(LAST);
    const state = pick(STATES);
    const home = genHometown(state);
    const motivations = shuffle(MOTIVATIONS).slice(0, 3);
    const height = randint(68, 79);
    const w = HW[posObj.p] || [200,250];

    // Suitors weighted by prestige, amplified for higher-star recruits
    // (blue bloods chase 5★s; G5 schools chase 2★s).
    const nSuitors = clamp(randint(stars + 1, stars + 3), 2, 6);
    const pool = rivalPool.slice();
    const exp = 1 + (stars - 3) * 0.55;
    const suitors = [];
    for (let k = 0; k < nSuitors && pool.length; k++){
      let tot = 0; pool.forEach(t => tot += Math.pow(Math.max(1, t.prestige), exp));
      let r = Math.random() * tot, idx = 0;
      for (let j = 0; j < pool.length; j++){ r -= Math.pow(Math.max(1, pool[j].prestige), exp); if (r <= 0){ idx = j; break; } }
      const s = pool.splice(idx, 1)[0];
      suitors.push({ teamId: s.id, name: s.name, prestige: s.prestige,
        points: randint(0, 4) + s.prestige * randint(0, 2), isPlayer: false });
    }

    return {
      id: "p" + (_pid++), name, pos: posObj.p, arch: pick(posObj.arch), stars, ovr, pot,
      gem, gemKnown: false, scouted: false, juco, standing,
      state, hometown: home, highSchool: genHighSchool(home),
      height, weight: randint(w[0], w[1]), motivations, dealbreaker: motivations[0], swayMot: null, suitors,
      onBoard: false, priority: false, activity: null, status: "open", committedTo: null
    };
  }

  function genClass(rivalPool, n){
    const list = [];
    for (let i = 0; i < n; i++) list.push(genProspect(rivalPool));
    list.forEach(p => p._rank = p.stars * 100 + p.ovr);
    list.sort((a,b) => b._rank - a._rank);
    return list;
  }

  function genRosterPlayer(pos, yr, prestige){
    const starRoll = () => { const r = Math.random() + (prestige-3)*0.06; return r>0.93?5:r>0.76?4:r>0.43?3:r>0.16?2:1; };
    const stars = starRoll();
    const gem = chance(0.07);
    const clsBase = { FR:[60,70], "RS-FR":[62,72], SO:[64,77], JR:[68,83], SR:[70,86] }[yr] || [62,74];
    let ovr = clamp(randint(clsBase[0], clsBase[1]) + (prestige-3) + (stars-3), 55, 93);
    const room = { FR:14, "RS-FR":12, SO:10, JR:6, SR:3 }[yr] || 8;
    const pot = clamp(ovr + randint(2, room) + (gem?randint(3,7):0), ovr+1, 99);
    const posObj = POSITIONS.find(o => o.p === pos) || POSITIONS[0];
    const age = { FR:18, "RS-FR":19, SO:19, JR:20, SR:21 }[yr] || 19;
    const yearsIn = { FR:0, "RS-FR":1, SO:1, JR:2, SR:3 }[yr] || 1;
    const state = pick(STATES); const home = genHometown(state);
    return {
      id: "s" + (_pid++), name: pick(FIRST)+" "+pick(LAST), pos, arch: pick(posObj.arch),
      stars, gem, ovr, pot, dev: rollDev(stars, gem),
      weight: randint((HW[pos]||[200,250])[0], (HW[pos]||[200,250])[1]),
      year: yr, age, redshirt:false, yearsIn,
      hometown: home, highSchool: genHighSchool(home), origin:"HS", priorSchool:null,
      prod: randint(0, 40), lastOvr: ovr, status:"active", starter:false, homegrown:true
    };
  }

  function genStartingRoster(targets, prestige){
    const players = [];
    for (const pos in targets){
      const n = targets[pos]; if (!n) continue;
      for (let i=0;i<n;i++){
        const r = Math.random();
        let yr = r<0.27 ? "FR" : r<0.50 ? "SO" : r<0.74 ? "JR" : "SR";
        if (yr==="FR" && chance(0.28)) yr = "RS-FR";
        players.push(genRosterPlayer(pos, yr, prestige));
      }
    }
    players.sort((a,b)=> b.ovr-a.ovr);
    return players;
  }

  function randGrades(prestige){
    const g = {};
    MOTIVATIONS.forEach(m => { const r = Math.random() + (prestige - 3) * 0.08;
      g[m] = r > 0.80 ? "A" : r > 0.58 ? "B" : r > 0.34 ? "C" : r > 0.14 ? "D" : "F"; });
    return g;
  }

  DHQ.data = {
    POSITIONS, posWeights, MOTIVATIONS, STATES,
    OFF_PLAYBOOKS, DEF_PLAYBOOKS, ROSTER_BASE, schemeTargets,
    genProspect, genClass, genRosterPlayer, genStartingRoster,
    randGrades, ovrForStars, rollStars, rollDev, genHometown, genHighSchool
  };
})();
