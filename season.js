/* ============================================================
   Dynasty HQ — season engine (DHQ.season) — v0.6
   Schedule, box-score sim + player stat lines, standings,
   CFP-style Top 25, conference championships, 12-team CFP,
   bowls, awards (Heisman/All-America) + national leaders.
   ============================================================ */
window.DHQ = window.DHQ || {};
(() => {
  const R = DHQ.rng;
  const { randint, rand, pick, chance, clamp, shuffle } = R;
  const TM = DHQ.teams;
  const REG_WEEKS = 12;
  const POWER = ["SEC","B1G","B12","ACC"];

  const S = () => DHQ.S;
  const teamName = (id) => { const t = TM.byId(id); return t ? TM.displayName(t) : id; };
  const teamAbbr = (id) => { const t = TM.byId(id); return t ? t.ab : (id||"").toUpperCase(); };
  const schoolName = () => (DHQ.app && DHQ.app.schoolName) ? DHQ.app.schoolName() : (S().school.name);

  /* ---------- team ratings ---------- */
  function baseRatingForPrestige(p){ return ({5:88,4:83,3:77,2:71,1:66})[clamp(p,1,5)] || 74; }
  function playerTeamRating(st){
    const r = st.roster.filter(p=>p.status==="active");
    const top = (pos,n)=> r.filter(p=>p.pos===pos).sort((a,b)=>b.ovr-a.ovr).slice(0,n);
    const avg = arr => arr.length ? arr.reduce((s,p)=>s+p.ovr,0)/arr.length : 64;
    const off = 0.30*avg(top("QB",1)) + 0.15*avg(top("RB",2)) + 0.22*avg(top("WR",3))
              + 0.08*avg(top("TE",1)) + 0.25*avg([...top("OT",2),...top("IOL",3)]);
    const def = 0.32*avg([...top("EDGE",2),...top("DT",2)]) + 0.30*avg(top("LB",3))
              + 0.38*avg([...top("CB",3),...top("S",2)]);
    // Tactician coach perks: game-day rating boosts
    const cp = (st.coach && st.coach.perks) || {};
    const gameday = (cp.gameday||0)*1.5;
    const offB = gameday + (cp.offense||0)*2;
    const defB = gameday + (cp.defense||0)*2;
    return { off: Math.round(off+offB), def: Math.round(def+defB), ovr: Math.round((off+offB+def+defB)/2) };
  }

  /* ---------- init ---------- */
  function init(st){
    const myId = st.school.id;
    const ratings = {};
    TM.TEAMS.forEach(t=>{ const base = baseRatingForPrestige(t.p) + randint(-4,4);
      ratings[t.id] = { ovr:base, off: base+randint(-3,3), def: base+randint(-3,3), w:0, l:0, cw:0, cl:0 }; });
    if (myId && ratings[myId]){ const pr = playerTeamRating(st); ratings[myId].off=pr.off; ratings[myId].def=pr.def; ratings[myId].ovr=pr.ovr; }
    st.season = { week:1, phase:"regular", ratings, schedule: buildPlayerSchedule(st, ratings),
      results:[], champs:null, champGames:null, finalRank:[], cfp:null, playerBowl:null, awards:null, lastGame:null };
    resetSeasonStats(st);
    syncWeek(st);
  }
  function syncWeek(st){ if (st.season) st.season.week = st.week; }

  function buildPlayerSchedule(st, ratings){
    const me = TM.byId(st.school.id); if (!me) return [];
    const confMates = TM.byConf(me.c).filter(t=>t.id!==me.id);
    const nonConf  = TM.TEAMS.filter(t=>t.c!==me.c && t.id!==me.id);
    const confOpp = shuffle(confMates).slice(0, Math.min(confMates.length, 8)).map(t=>t.id);
    const oocOpp  = shuffle(nonConf).slice(0, REG_WEEKS - confOpp.length).map(t=>t.id);
    const games = [];
    confOpp.forEach(id=> games.push({ oppId:id, ooc:false }));
    oocOpp.forEach(id=> games.push({ oppId:id, ooc:true }));
    return shuffle(games).slice(0, REG_WEEKS).map((g,i)=>({ week:i+1, oppId:g.oppId, ooc:g.ooc, home:(i%2===0), played:false, us:0, them:0, win:null }));
  }

  function resetSeasonStats(st){ st.roster.forEach(p=>{ p.seasonStats = blankStats(); }); }
  function blankStats(){ return { gp:0, cmp:0, att:0, passYd:0, passTD:0, int:0, rushAtt:0, rushYd:0, rushTD:0, rec:0, recYd:0, recTD:0, tkl:0, sack:0, intD:0, ff:0 }; }
  function ensureStats(p){ if(!p.seasonStats) p.seasonStats=blankStats(); if(!p.careerStats) p.careerStats=blankStats(); }

  /* ---------- box-score sim ---------- */
  function gauss(){ return (Math.random()+Math.random()+Math.random()-1.5); }
  function expPoints(off, def){ return clamp(24 + (off-def)*0.55, 3, 66); }
  function simScore(offA, defB, homeA){ return clamp(Math.round(expPoints(offA + (homeA?2.5:0), defB) + gauss()*13), 0, 80); }
  function simGame(a, b, aHome){
    let as = simScore(a.off, b.def, aHome), bs = simScore(b.off, a.def, !aHome);
    if (as===bs){ if(chance(0.5)) as+=3; else bs+=3; }
    return { as, bs };
  }

  /* ---------- player stat distribution ---------- */
  const SCHEME_PASS = { airraid:340, spread:300, westcoast:280, prostyle:250, smashmouth:200, flexbone:120 };
  const SCHEME_RUSH = { airraid:110, spread:175, westcoast:150, prostyle:185, smashmouth:235, flexbone:300 };
  function distributePlayerStats(st, us){
    const r = st.roster.filter(p=>p.status==="active");
    r.forEach(p=>{ ensureStats(p); p.seasonStats.gp++; });
    const top = (pos,n)=> r.filter(p=>p.pos===pos).sort((a,b)=>b.ovr-a.ovr).slice(0,n);
    const offPb = st.offPb || "prostyle";
    const qbScale = clamp(us/28, 0.55, 1.6);
    let passYd = Math.round((SCHEME_PASS[offPb]||260) * (0.8+0.4*Math.random()) * qbScale);
    let rushYd = Math.round((SCHEME_RUSH[offPb]||180) * (0.8+0.4*Math.random()) * qbScale);
    const offTD = clamp(Math.round(us/7 + gauss()*0.6), 0, 9);
    const passTD = clamp(Math.round(offTD * (passYd/(passYd+rushYd||1))), 0, offTD);
    const rushTD = clamp(offTD - passTD, 0, offTD);
    const qb = top("QB",1)[0];
    if (qb){ const att = clamp(Math.round(passYd/7.6 + randint(-3,3)), 8, 55); const cmp = clamp(Math.round(att*(0.55+Math.random()*0.15)),5,att);
      add(qb,{att,cmp,passYd,passTD,int: chance(0.45)?randint(1,2):0});
      if (["spread","flexbone"].includes(offPb)){ const qr=Math.round(rushYd*0.25); add(qb,{rushAtt:randint(6,12),rushYd:qr,rushTD: chance(0.4)?1:0}); rushYd-=qr; } }
    const rbs = top("RB",2);
    if (rbs[0]){ const y=Math.round(rushYd*0.66); add(rbs[0],{rushAtt:clamp(Math.round(y/4.6),6,30),rushYd:y,rushTD:Math.round(rushTD*0.6)}); }
    if (rbs[1]){ const y=Math.round(rushYd*0.28); add(rbs[1],{rushAtt:clamp(Math.round(y/4.6),3,18),rushYd:y,rushTD:Math.round(rushTD*0.2)}); }
    const wr = top("WR",3), te = top("TE",1)[0];
    let tdLeft = passTD;
    [[wr[0],0.34],[wr[1],0.24],[wr[2],0.14],[te,0.16],[rbs[0],0.12]].forEach(([pl,sh])=>{ if(!pl) return; const y=Math.round(passYd*sh); const rec=clamp(Math.round(y/13.5),1,14);
      let td=0; if(tdLeft>0 && chance(sh*1.6)){ td=1; tdLeft--; } add(pl,{rec,recYd:y,recTD:td}); });
    const front=[...top("EDGE",2),...top("DT",2)], lbs=top("LB",3), dbs=[...top("CB",3),...top("S",2)];
    lbs.forEach(p=> add(p,{tkl:randint(5,11)}));
    dbs.forEach(p=> add(p,{tkl:randint(2,7)}));
    front.forEach(p=> add(p,{tkl:randint(2,6)}));
    let sacks=clamp(randint(0,5),0,6); while(sacks-->0){ const p=pick(front.length?front:lbs); if(p) add(p,{sack:1,tkl:1}); }
    if (chance(0.5)){ let ints=randint(1,2); while(ints-->0){ const p=pick(dbs.length?dbs:lbs); if(p) add(p,{intD:1}); } }
  }
  function add(p, s){ ensureStats(p); for(const k in s){ p.seasonStats[k]=(p.seasonStats[k]||0)+s[k]; } }

  /* ---------- advance one week ---------- */
  function simWeek(st){
    syncWeek(st);
    const wk = st.season.week;
    if (wk < 1) return null;   // preseason: recruiting only, no games
    const g = st.season.schedule.find(x=>x.week===wk);
    let playerGame=null; const myId=st.school.id; const rt=st.season.ratings;
    if (g && !g.played){
      const pr=playerTeamRating(st); rt[myId].off=pr.off; rt[myId].def=pr.def; rt[myId].ovr=pr.ovr;
      const opp=rt[g.oppId]||{off:74,def:74,ovr:74};
      const oppRank = rankings(st).indexOf(g.oppId);
      // Big Game Coach: extra edge vs Top-25 opponents
      const bigPerk = ((st.coach&&st.coach.perks&&st.coach.perks.biggame)||0);
      const me = (bigPerk>0 && oppRank>=0 && oppRank<25)
        ? { off: rt[myId].off + bigPerk*3, def: rt[myId].def + bigPerk*3 } : rt[myId];
      const res=simGame(me, opp, g.home);
      g.played=true; g.us=res.as; g.them=res.bs; g.win=res.as>res.bs;
      if (g.win){ rt[myId].w++; if(rt[g.oppId]) rt[g.oppId].l++; } else { rt[myId].l++; if(rt[g.oppId]) rt[g.oppId].w++; }
      if (!g.ooc){ if(g.win){ rt[myId].cw++; if(rt[g.oppId]) rt[g.oppId].cl++; } else { rt[myId].cl++; if(rt[g.oppId]) rt[g.oppId].cw++; } }
      distributePlayerStats(st, res.as);
      playerGame={ opp:g.oppId, home:g.home, us:res.as, them:res.bs, win:g.win };
      st.season.lastGame=playerGame;
      recordCoachGame(st, g.win, !g.ooc, rankings(st).indexOf(g.oppId));
    }
    simShadowWeek(st, g?g.oppId:null);
    return playerGame;
  }
  function simShadowWeek(st, skipId){
    const rt=st.season.ratings; const myId=st.school.id;
    let pool=shuffle(TM.TEAMS.filter(t=>t.id!==myId && t.id!==skipId).map(t=>t.id));
    for (let i=0;i+1<pool.length;i+=2){
      const a=pool[i], b=pool[i+1]; const ta=TM.byId(a), tb=TM.byId(b); const same=ta&&tb&&ta.c===tb.c;
      const res=simGame(rt[a], rt[b], chance(0.5));
      if (res.as>res.bs){ rt[a].w++; rt[b].l++; if(same){rt[a].cw++;rt[b].cl++;} } else { rt[b].w++; rt[a].l++; if(same){rt[b].cw++;rt[a].cl++;} }
    }
  }

  /* ---------- rankings & standings ---------- */
  function rankScore(id, rt){ const t=rt[id]; const tt=TM.byId(id); return t.ovr*0.10 + t.w*1.25 - t.l*0.85 + (tt?tt.p*0.25:0) + (t.cw-t.cl)*0.15; }
  function rankings(st, n=25){ const rt=st.season.ratings; return TM.TEAMS.map(t=>t.id).sort((a,b)=>rankScore(b,rt)-rankScore(a,rt)).slice(0,n); }
  function confStandings(st, conf){ const rt=st.season.ratings; return TM.byConf(conf).map(t=>t.id).sort((a,b)=>(rt[b].cw-rt[b].cl)-(rt[a].cw-rt[a].cl) || (rt[b].w-rt[b].l)-(rt[a].w-rt[a].l) || rankScore(b,rt)-rankScore(a,rt)); }

  /* ---------- conference championships + CFP ---------- */
  function nGame(a,b,rt){ const r=simGame(rt[a], rt[b], chance(0.5)); return {t1:a,t2:b,s1:r.as,s2:r.bs,winner:r.as>r.bs?a:b}; }
  function hGame(t1,t2,rt){ const r=simGame(rt[t1], rt[t2], true); return {t1,t2,s1:r.as,s2:r.bs,winner:r.as>r.bs?t1:t2}; }

  function buildCFP(st, champs){
    const rt=st.season.ratings;
    const p4=POWER.map(c=>champs[c]).filter(Boolean);
    const g5confs=TM.CONF_ORDER.filter(c=>!POWER.includes(c)&&c!=="IND");
    const g5=g5confs.map(c=>champs[c]).filter(Boolean).sort((a,b)=>rankScore(b,rt)-rankScore(a,rt));
    const auto=[...new Set([...p4, g5[0]].filter(Boolean))];
    const field=[...auto];
    rankings(st,80).forEach(id=>{ if(field.length<12 && !field.includes(id)) field.push(id); });
    field.sort((a,b)=>rankScore(b,rt)-rankScore(a,rt));
    const f=field.slice(0,12);
    const fr=[ hGame(f[4],f[11],rt), hGame(f[5],f[10],rt), hGame(f[6],f[9],rt), hGame(f[7],f[8],rt) ];
    const qf=[ hGame(f[0],fr[3].winner,rt), hGame(f[1],fr[2].winner,rt), hGame(f[2],fr[1].winner,rt), hGame(f[3],fr[0].winner,rt) ];
    const sf=[ nGame(qf[0].winner,qf[1].winner,rt), nGame(qf[2].winner,qf[3].winner,rt) ];
    const nc=nGame(sf[0].winner, sf[1].winner, rt);
    return { field:f, byes:f.slice(0,4), firstRound:fr, qf, sf, nc, champion:nc.winner };
  }
  function playerCFPGames(cfp, myId){ return [...cfp.firstRound,...cfp.qf,...cfp.sf,cfp.nc].filter(g=>g.t1===myId||g.t2===myId); }
  function roundOf(cfp, g){ if(cfp.firstRound.includes(g))return"First Round"; if(cfp.qf.includes(g))return"Quarterfinal"; if(cfp.sf.includes(g))return"Semifinal"; if(cfp.nc===g)return"National Championship"; return"Playoff"; }

  const BOWLS=["Sun Bowl","Gator Bowl","Liberty Bowl","Music City Bowl","Holiday Bowl","Las Vegas Bowl","Pinstripe Bowl","Duke's Mayo Bowl","Texas Bowl","Citrus Bowl"];

  function recordCoachGame(st, win, isConf, oppRank){
    const c = st.coach && st.coach.career; if (!c) return;
    if (win) c.w++; else c.l++;
    if (isConf){ if (win) c.cw++; else c.cl++; }
    if (oppRank>=0 && oppRank<25){ if (win) c.t25w++; else c.t25l++; }
    if (oppRank>=0 && oppRank<10){ if (win) c.t10w++; else c.t10l++; }
  }

  function endRegularSeason(st){
    const rt=st.season.ratings; const myId=st.school.id;
    // 1) conference championship games
    const champs={}, champGames={};
    TM.CONF_ORDER.forEach(c=>{ const order=confStandings(st,c);
      if(order.length>=2){ const a=order[0],b=order[1]; const res=simGame(rt[a],rt[b],chance(0.5)); const w=res.as>res.bs?a:b;
        if(res.as>res.bs){rt[a].w++;rt[b].l++;}else{rt[b].w++;rt[a].l++;}
        champGames[c]={a,b,as:res.as,bs:res.bs,winner:w}; champs[c]=w; }
      else if(order.length===1){ champs[c]=order[0]; } });
    st.season.champs=champs; st.season.champGames=champGames;
    // 2) CFP
    const cfp=buildCFP(st, champs); st.season.cfp=cfp;
    // 3) player path / record
    const inField=cfp.field.includes(myId);
    let playerCFP=null, playerBowl=null;
    if (inField){
      playerCFPGames(cfp,myId).forEach(g=>{ const gw=g.winner===myId; const gopp=(g.t1===myId?g.t2:g.t1); if(gw) rt[myId].w++; else rt[myId].l++; recordCoachGame(st, gw, false, rankings(st).indexOf(gopp)); });
      playerCFP = cfp.champion===myId ? {round:"National Champion", won:true} : (()=>{ const lost=playerCFPGames(cfp,myId).find(g=>g.winner!==myId); return {round: lost?roundOf(cfp,lost):"Playoff", won:false}; })();
    } else if (rt[myId].w>=6){
      const opp=pick(TM.TEAMS.filter(t=>t.id!==myId && !cfp.field.includes(t.id))).id;
      const res=simGame(rt[myId], rt[opp], chance(0.5)); if(res.as>res.bs)rt[myId].w++;else rt[myId].l++;
      playerBowl={ opp, us:res.as, them:res.bs, win:res.as>res.bs, name:pick(BOWLS) };
      recordCoachGame(st, playerBowl.win, false, rankings(st).indexOf(opp));
    }
    st.season.playerCFP=playerCFP; st.season.playerBowl=playerBowl;
    // 4) final rankings (champion #1)
    const finalRank=rankings(st,25);
    if (finalRank.includes(cfp.champion)){ finalRank.splice(finalRank.indexOf(cfp.champion),1); finalRank.unshift(cfp.champion); }
    st.season.finalRank=finalRank;
    // 5) awards + national leaders
    const awards=computeAwards(st); st.season.awards=awards;
    if (st.coach && st.coach.trophies){ if (champs[st.school.conf]===myId) st.coach.trophies.conf++; if (cfp.champion===myId) st.coach.trophies.natl++; if (inField) st.coach.trophies.playoff++; }
    const myRank=finalRank.indexOf(myId);
    return {
      record:`${rt[myId].w}-${rt[myId].l}`, confRecord:`${rt[myId].cw}-${rt[myId].cl}`,
      rank: myRank>=0?myRank+1:null, confChamp: champs[st.school.conf]===myId,
      champs, cfp, playerCFP, playerBowl, awards,
      nationalChamp: cfp.champion, wonTitle: cfp.champion===myId, inPlayoff: inField
    };
  }

  /* ---------- awards & national leaders ---------- */
  function offScore(s){ return s.passYd*0.04 + s.passTD*4 + s.rushYd*0.06 + s.rushTD*5 + s.recYd*0.05 + s.recTD*5 - s.int*1.5; }
  function mkStar(teamId,pos,stats){ return { name: DHQ.data.genRosterPlayer(pos,"JR",3).name, teamId, pos, real:false, seasonStats: Object.assign(blankStats(),stats) }; }
  function synthStars(st){
    const rt=st.season.ratings; const myId=st.school.id; const stars=[];
    rankings(st,24).filter(id=>id!==myId).forEach(id=>{ const off=rt[id].off; const sc=clamp((off-72)/16,0.4,1.5);
      if(chance(0.5)) stars.push(mkStar(id,"QB",{ passYd:Math.round(2400*sc+rand(-300,400)), passTD:Math.round(22*sc+randint(-4,6)), int:randint(3,12), cmp:0, att:0 }));
      if(chance(0.55)) stars.push(mkStar(id,"RB",{ rushYd:Math.round(1100*sc+rand(-200,400)), rushTD:Math.round(11*sc+randint(-3,5)), recYd:randint(80,400) }));
      if(chance(0.6)) stars.push(mkStar(id,"WR",{ recYd:Math.round(950*sc+rand(-200,400)), recTD:Math.round(8*sc+randint(-2,5)), rec:randint(45,90) })); });
    return stars;
  }
  function computeAwards(st){
    const myId=st.school.id;
    const real=st.roster.filter(p=>p.status==="active"&&p.seasonStats&&p.seasonStats.gp>0).map(p=>({name:p.name,teamId:myId,pos:p.pos,real:true,seasonStats:p.seasonStats}));
    const all=[...real, ...synthStars(st)];
    const off=all.filter(p=>["QB","RB","WR","TE"].includes(p.pos));
    const heisman= off.slice().sort((a,b)=>offScore(b.seasonStats)-offScore(a.seasonStats))[0]||null;
    const bestAt=(pos,key)=> all.filter(p=>p.pos===pos).sort((a,b)=>b.seasonStats[key]-a.seasonStats[key])[0];
    const wrs=all.filter(p=>p.pos==="WR").sort((a,b)=>b.seasonStats.recYd-a.seasonStats.recYd).slice(0,2);
    const aa=[bestAt("QB","passYd"),bestAt("RB","rushYd"),...wrs,bestAt("TE","recYd")].filter(Boolean);
    const lead=(key)=>all.filter(p=>p.seasonStats[key]>0).sort((a,b)=>b.seasonStats[key]-a.seasonStats[key]).slice(0,5);
    return { heisman, allAmerica:aa, leaders:{ pass:lead("passYd"), rush:lead("rushYd"), rec:lead("recYd") } };
  }
  function accumulateCareer(st){ st.roster.forEach(p=>{ ensureStats(p); for(const k in p.seasonStats){ p.careerStats[k]=(p.careerStats[k]||0)+p.seasonStats[k]; } }); }

  /* ---------- VIEWS ---------- */
  function rec(id){ const t=S().season.ratings[id]; return t?`${t.w}-${t.l}`:"0-0"; }
  function crest(id){ const t=TM.byId(id); if(!t) return ""; return `<span class="mini-crest" style="background:linear-gradient(150deg,${t.c1},${t.c2||t.c1})">${t.ab.slice(0,2)}</span>`; }
  function statLine(s){ if(s.passYd>=(s.rushYd||0)&&s.passYd>=(s.recYd||0)&&s.passYd>0) return `${s.passYd} pass yd · ${s.passTD} TD · ${s.int} INT`;
    if((s.rushYd||0)>=(s.recYd||0)&&s.rushYd>0) return `${s.rushYd} rush yd · ${s.rushTD} TD`;
    if(s.recYd>0) return `${s.recYd} rec yd · ${s.rec} rec · ${s.recTD} TD`;
    if(s.tkl>0) return `${s.tkl} tkl · ${s.sack} sk`; return ""; }

  function viewHub(){
    const st=S(); const wk=st.week; const sea=st.season;
    const g=sea.schedule.find(x=>x.week===wk); const myId=st.school.id; const myRk=rankings(st).indexOf(myId);
    let h=`<div class="sec-head"><div><div class="sec-title">${schoolName()}</div>
      <div class="sec-sub">${TM.CONFS[st.school.conf]||""} · ${rec(myId)} ${myRk>=0&&myRk<25?`· #${myRk+1}`:""}</div></div></div>`;
    if (wk<1){
      h+=`<div class="panel"><div class="cap muted tiny">Preseason</div><div style="font-weight:800;margin-top:6px">Build your board before Week 1</div><div class="tiny faint" style="margin-top:6px">Your biggest recruiting-hour budget of the year — get on your top targets' boards early, then Advance to kick off the season.</div></div>`;
    } else if (wk<=REG_WEEKS && g){
      const opp=g.oppId; const oppRk=rankings(st).indexOf(opp);
      h+=`<div class="panel matchup">
        <div class="cap muted tiny" style="margin-bottom:8px">Week ${wk} · ${g.home?"vs":"@"} ${g.ooc?"<span class='pill tiny'>Non-Conf</span>":""}</div>
        <div class="mu-row">
          <div class="mu-team">${crest(myId)}<div><div class="mu-name">${schoolName()}</div><div class="tiny faint">${rec(myId)} · OVR ${sea.ratings[myId].ovr}</div></div></div>
          <div class="mu-vs">${g.played?`${g.us}–${g.them}`:"vs"}</div>
          <div class="mu-team right">${crest(opp)}<div><div class="mu-name">${teamName(opp)}</div><div class="tiny faint">${oppRk>=0&&oppRk<25?`#${oppRk+1} · `:""}${rec(opp)}</div></div></div>
        </div>
        ${g.played?`<div class="pill ${g.win?"green":"red"}" style="margin-top:10px">${g.win?"W":"L"} ${g.us}–${g.them}</div>`:`<div class="tiny faint" style="margin-top:8px">Hit Advance to play the game and run the recruiting week.</div>`}
      </div>`;
    } else if (wk>REG_WEEKS){
      const pc=sea.playerCFP, pb=sea.playerBowl;
      h+=`<div class="panel"><div class="cap muted tiny">Regular season complete · Postseason</div>
        ${pc?`<div style="font-weight:800;margin-top:6px">${pc.won?"🏆 NATIONAL CHAMPIONS!":"Playoff: reached the "+pc.round}</div>`:""}
        ${pb?`<div style="font-weight:800;margin-top:6px">${pb.name}: ${pb.win?"W":"L"} ${pb.us}–${pb.them} vs ${teamName(pb.opp)}</div>`:""}
        ${sea.cfp?`<div class="tiny faint" style="margin-top:6px">National Champion: <b>${teamName(sea.cfp.champion)}</b>. See the bracket in the Season tab.</div>`:""}
        <div class="tiny faint" style="margin-top:6px">Advance for Signing Day & the offseason.</div></div>`;
    }
    if (sea.lastGame && (!g||!g.played)){ const lg=sea.lastGame; h+=`<div class="tiny faint" style="margin:2px 2px 10px">Last: ${lg.win?"W":"L"} ${lg.us}–${lg.them} vs ${teamName(lg.opp)}</div>`; }
    if (DHQ.app && DHQ.app.goalsSummaryHTML) h+=DHQ.app.goalsSummaryHTML();
    return h;
  }

  let seaTab="schedule";
  function viewSeason(){
    const st=S();
    let h=`<div class="sec-head"><div><div class="sec-title">Season ${st.year}</div>
      <div class="sec-sub">Week ${Math.min(st.week,REG_WEEKS)} of ${REG_WEEKS}</div></div></div>`;
    const tabs = st.season.cfp ? ["schedule","standings","rankings","playoff","stats"] : ["schedule","standings","rankings","stats"];
    h+=`<div class="filters">`+tabs.map(t=>`<button class="chip ${seaTab===t?"on":""}" data-act="seatab" data-v="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")+`</div>`;
    if (seaTab==="schedule") h+=viewSchedule();
    else if (seaTab==="standings") h+=viewStandings();
    else if (seaTab==="rankings") h+=viewRankings();
    else if (seaTab==="playoff") h+=viewPlayoff();
    else h+=viewStats();
    return h;
  }

  function viewSchedule(){
    const st=S(); let h="";
    st.season.schedule.forEach(g=>{ const me=g.played?(g.win?"W":"L"):"";
      h+=`<div class="sched-row ${g.played?(g.win?"win":"loss"):""} ${g.week===st.week&&!g.played?"now":""}">
        <div class="sched-wk">W${g.week}</div>
        <div class="sched-mid">${crest(g.oppId)}<div><div class="sched-opp">${g.home?"vs":"@"} ${teamName(g.oppId)} ${g.ooc?'<span class="pill tiny">OOC</span>':''}</div>
          <div class="tiny faint">${rec(g.oppId)} · OVR ${st.season.ratings[g.oppId].ovr}</div></div></div>
        <div class="sched-res">${g.played?`<b class="${g.win?"g-A":"g-F"}">${me}</b> ${g.us}–${g.them}`:(g.ooc?`<button class="btn sm ghost" data-act="editooc" data-w="${g.week}">Edit</button>`:`<span class="faint tiny">—</span>`)}</div>
      </div>`; });
    h+=`<div class="tiny faint" style="margin-top:10px">Tap <b>Edit</b> on a non-conference week to choose your opponent (before it's played).</div>`;
    return h;
  }
  function viewStandings(){
    const st=S(); const myConf=st.school.conf; const confs=[myConf,...TM.CONF_ORDER.filter(c=>c!==myConf)]; let h="";
    confs.forEach(c=>{ const order=confStandings(st,c).slice(0,8); const champ=st.season.champs&&st.season.champs[c];
      h+=`<div class="sec-sub cap" style="margin:14px 2px 7px;color:${c===myConf?"var(--gold)":"var(--muted)"}">${TM.CONFS[c]}</div>`;
      order.forEach((id,i)=>{ const t=st.season.ratings[id]; const me=id===st.school.id;
        h+=`<div class="stand-row ${me?"me":""}"><span class="st-rk">${i+1}</span>${crest(id)}<span class="st-name">${teamName(id)} ${champ===id?'🏆':''}</span><span class="st-rec">${t.cw}-${t.cl} <span class="faint">(${t.w}-${t.l})</span></span></div>`; }); });
    return h;
  }
  function viewRankings(){
    const st=S(); const rk=(st.season.finalRank&&st.season.finalRank.length?st.season.finalRank:rankings(st,25)); let h=`<div class="sec-sub cap" style="margin:6px 2px 9px;color:var(--gold)">CFP Committee Top 25</div>`;
    rk.slice(0,25).forEach((id,i)=>{ const t=st.season.ratings[id]; const me=id===st.school.id;
      h+=`<div class="stand-row ${me?"me":""}"><span class="st-rk">${i+1}</span>${crest(id)}<span class="st-name">${teamName(id)}</span><span class="st-rec">${t.w}-${t.l}</span></div>`; });
    return h;
  }
  function bracketGame(g){ const w1=g.winner===g.t1; return `<div class="bg-row"><div class="bg-team ${w1?'win':''}">${crest(g.t1)}<span>${teamName(g.t1)}</span><b>${g.s1}</b></div><div class="bg-team ${!w1?'win':''}">${crest(g.t2)}<span>${teamName(g.t2)}</span><b>${g.s2}</b></div></div>`; }
  function viewPlayoff(){
    const st=S(); const cfp=st.season.cfp; if(!cfp) return `<div class="panel empty">No playoff yet — finish the regular season.</div>`;
    let h=`<div class="panel" style="text-align:center"><div class="cap muted tiny">National Champion</div>
      <div style="font-weight:900;font-size:18px;margin-top:6px">${crest(cfp.champion)} ${teamName(cfp.champion)} 🏆</div></div>`;
    h+=`<div class="sec-sub cap" style="margin:14px 2px 7px;color:var(--gold)">Bracket — Top 4 seeds had byes</div>`;
    h+=`<div class="cap faint tiny" style="margin:8px 2px 4px">Seeds 1–4 (byes)</div>`;
    cfp.byes.forEach((id,i)=> h+=`<div class="stand-row"><span class="st-rk">${i+1}</span>${crest(id)}<span class="st-name">${teamName(id)}</span></div>`);
    h+=`<div class="cap faint tiny" style="margin:12px 2px 4px">First Round</div>`; cfp.firstRound.forEach(g=> h+=bracketGame(g));
    h+=`<div class="cap faint tiny" style="margin:12px 2px 4px">Quarterfinals</div>`; cfp.qf.forEach(g=> h+=bracketGame(g));
    h+=`<div class="cap faint tiny" style="margin:12px 2px 4px">Semifinals</div>`; cfp.sf.forEach(g=> h+=bracketGame(g));
    h+=`<div class="cap faint tiny" style="margin:12px 2px 4px">National Championship</div>`; h+=bracketGame(cfp.nc);
    // awards
    const aw=st.season.awards;
    if (aw){ h+=`<div class="sec-sub cap" style="margin:16px 2px 7px;color:var(--blue)">Awards</div>`;
      if(aw.heisman){ const s=aw.heisman; h+=`<div class="panel"><div class="cap muted tiny">Heisman</div><div style="font-weight:800;margin-top:3px">${s.name} <span class="faint tiny">${s.pos} · ${teamAbbr(s.teamId)}</span></div><div class="tiny muted">${statLine(s.seasonStats)}</div></div>`; }
      h+=`<div class="cap faint tiny" style="margin:6px 2px 4px">All-America</div>`;
      aw.allAmerica.forEach(s=> h+=`<div class="stand-row"><span class="st-name">${s.name} <span class="faint tiny">${s.pos} · ${teamAbbr(s.teamId)}</span></span><span class="st-rec tiny">${statLine(s.seasonStats)}</span></div>`);
    }
    return h;
  }
  function viewStats(){
    const st=S();
    const aw=st.season.awards;
    let h="";
    if (aw && aw.leaders){
      h+=`<div class="tiny faint" style="margin:4px 2px 6px">National leaders.</div>`;
      const blk=(arr,label,key,unit)=>{ if(!arr||!arr.length) return ""; let s=`<div class="sec-sub cap" style="margin:14px 2px 7px;color:var(--muted)">${label}</div>`;
        arr.forEach(p=> s+=`<div class="stand-row"><span class="st-name">${p.name} <span class="faint tiny">${p.pos} · ${teamAbbr(p.teamId)}</span></span><span class="st-rec">${p.seasonStats[key]} ${unit}</span></div>`); return s; };
      h+=blk(aw.leaders.pass,"Passing Yards","passYd","yd");
      h+=blk(aw.leaders.rush,"Rushing Yards","rushYd","yd");
      h+=blk(aw.leaders.rec,"Receiving Yards","recYd","yd");
      return h;
    }
    // in-season: your team leaders
    const r=st.roster.filter(p=>p.status==="active"&&p.seasonStats);
    const leader=(key,label,fmt)=>{ const s=r.filter(p=>p.seasonStats[key]>0).sort((a,b)=>b.seasonStats[key]-a.seasonStats[key]).slice(0,3); if(!s.length)return"";
      let o=`<div class="sec-sub cap" style="margin:14px 2px 7px;color:var(--muted)">${label}</div>`; s.forEach(p=> o+=`<div class="stand-row"><span class="st-name">${p.name} <span class="faint tiny">${p.pos}</span></span><span class="st-rec">${fmt(p.seasonStats)}</span></div>`); return o; };
    h+=`<div class="tiny faint" style="margin:4px 2px 6px">Your team leaders this season.</div>`;
    h+=leader("passYd","Passing Yards",s=>`${s.passYd} yd · ${s.passTD} TD`);
    h+=leader("rushYd","Rushing Yards",s=>`${s.rushYd} yd · ${s.rushTD} TD`);
    h+=leader("recYd","Receiving Yards",s=>`${s.recYd} yd · ${s.rec} rec`);
    h+=leader("tkl","Tackles",s=>`${s.tkl} tkl · ${s.sack} sk`);
    if (!r.some(p=>p.seasonStats.gp>0)) h=`<div class="panel empty">No games played yet this season.</div>`;
    return h;
  }

  DHQ.season = {
    init, simWeek, endRegularSeason, accumulateCareer, resetSeasonStats, playerTeamRating, rankings, confStandings,
    viewHub, viewSeason, REG_WEEKS,
    setSeaTab:(t)=>{ seaTab=t; }, get seaTab(){ return seaTab; }
  };
})();
