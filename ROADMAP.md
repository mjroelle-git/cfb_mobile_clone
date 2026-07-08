# Dynasty HQ — Roadmap v2 (mapped to the CFB 26 Dynasty deep dive)

This roadmap rebuilds our plan around `CFB26_Dynasty_Deep_Dive.md`. Every phase below traces to a section of that document, so the end state mirrors CFB 26's interconnected systems — coach archetypes, school attributes, the recruiting funnel, pipelines, the dynamic transfer portal, deep player development, the 12-team CFP, and the offseason calendar — while staying a no-build vanilla-JS PWA that installs on your iPhone.

**Design principles**
- **Interconnection over features.** CFB 26's depth comes from systems feeding each other: school attributes → recruit motivations/dealbreakers → recruiting grades; dev traits → progression; pipelines → recruiting math; rising expectations → portal. We build the shared spine first, then layer screens on top.
- **Learn from the deep dive's "Known Issues" (§14) — design them out:**
  - XP must *always* allocate (avoid the zero-XP progression bug).
  - No punishing position-change skill caps (the most-hated bug).
  - Starters don't leave for "playing time"; portal reasons are surfaced *before* a player leaves.
  - Winning **raises** prestige/tradition (no prestige regression).
  - Surface **national** stat leaders, not just conference.
- **NIL reconciliation.** The deep dive (§7) abstracts NIL as the **Brand Exposure** grade (no dollars). You earlier asked for an NIL *budget*. Plan: ship CFB 26's grade-based model as canonical, then add an **optional NIL collective/budget layer** on top (toggle) so you get both — realism by default, money-management if you want it.
- **Parody + no-build + versioned saves** carried throughout (already established in v0.4).

---

## Foundation already shipped (v0.4)
Modular codebase (`core`/`teams`/`gamedata`/`app`), all **134–136 real FBS teams** + conferences with a parody-swap layer, prestige-weighted **real-team recruiting rivals**, the sticky-activity recruiting board, prestige-based weekly hours, offensive/defensive playbooks + scheme needs, JUCO recruits, coach XP/perks, weekly + season goals, season-over-season development, departures (graduation/draft/transfer), player **backgrounds** (hometown/high school), versioned saves + migration. This is the base every phase below extends.

---

## The shared spine (built incrementally, used everywhere)

These data models are introduced early and consumed by later phases:

- **School Attributes (§4)** — 14 attributes. *Fixed:* Stadium Atmosphere, Academic Prestige, Conference Prestige, Program Tradition. *Dynamic:* Athletic Facilities, Brand Exposure, Coach Prestige, Recruiting, Pro Potential. Each maps to recruit motivations and to development/retention.
- **Player card** — ratings breakdown (not just OVR), **dev trait** (Normal/Impact/Star/Elite), **20 skill-group tiers**, age, weight, redshirt, playing-time expectation, dealbreakers, season & career stats, backgrounds.
- **Coach + Staff** — archetype (Recruiter/Motivator/Tactician), level (cap 100), cross-tree abilities; OC/DC coordinators with their own trees and prestige contribution.
- **Pipelines** — geographic tiers (1–5) with regional sub-pipelines for TX/CA/FL.
- **Season** — schedule, standings, weekly CFP committee ranking, postseason bracket.

---

## Version increments

### v0.5 — Season & Game Engine (deep dive §10)
The world starts playing football around you.
- **Scheduling:** conference slates + **you pick out-of-conference games**; strength-of-schedule tracked (cupcakes help win totals but hurt CFP positioning).
- **Box-score sim:** team off/def ratings from weighted position groups + scheme fit + home-field (Stadium Atmosphere) + (later) coach Tactician bonuses + variance → final score **and realistic per-player stat lines**.
- **Standings + weekly CFP committee ranking** (conf championships, SoS, head-to-head, common opponents).
- **League-wide weekly sim** so every team's season advances.
- **Stat leaders incl. national** (designing out the §14 conference-only limitation).
- *Test:* sim 5 seasons headless — score realism, stat leaders, standings/rankings coherent, 0 errors.

### v0.6 — Postseason + the Offseason Calendar (§10–11)
Complete the CFB 26 annual loop.
- **Conference championships**, then the **12-team CFP**: 6 auto bids (4 P4 champs + best-ranked G5) + 6 at-large; **top-4 seeds bye**; first round at higher seed; QF/SF rotate the **New Year's Six** bowls; **neutral-site title game**. Plus the bowl tier for non-playoff teams.
- The **7-phase offseason calendar**: Bowls/Playoffs → Signing Day → Transfer Portal window → Offseason Training & Progression → Coaching Carousel → Awards/Stars of the Season → Early Signing.
- **Awards & All-America** from season stats (feeding prestige & draft stock).
- *Test:* 10 seasons — bracket/byes/bowls resolve, awards track stat leaders, calendar advances cleanly.

### v0.7 — Player Development & Progression overhaul (§8)
Where dynasties are won.
- **Dev traits** with ~**3× XP** spread (Elite/Star vs Normal); **trait upgrades** that get harder at higher tiers (Normal→Impact reasonable, Star→Elite rare).
- **20 skill-group tiers** for smooth growth; ratings breakdown per attribute.
- **XP sources:** in-game performance, **offseason training (biggest)**, playing time (starters > backups), coach (Motivator) bonuses.
- **Age curve** (FR fastest → SR slowest), **position-specific XP rates** (OL +, QB slight +, DE/LB −, WR/RB baseline), **offseason weight gain** by position/year.
- **Manual vs auto progression** (manual = pick attributes, −25% XP).
- **Guardrails:** XP always allocates; **no position-change penalty**.
- *Test:* multi-season — trait/age/position curves behave, manual penalty correct, no zero-XP states.

### v0.8 — School Attributes & Program Building (§4)
Your program identity becomes a system.
- Implement all **14 attributes**; **dynamic ones upgrade** via offseason investment (facilities → dev rate; Brand Exposure → NIL/retention; Coach Prestige; Recruiting; Pro Potential).
- Attributes **drive recruit motivation grades** (your sales pitch made visible).
- **Prestige rises with success** (championships, wins, NFL output) — designed against the §14 regression bug.
- *Test:* investment moves grades, prestige climbs with results, recruiting interest responds.

### v0.9 — Recruiting Overhaul: funnel, pitches, dealbreakers, Sway, Battles (§5)
Deepen recruiting to CFB 26 depth.
- **Hours rescaled** to CFB 26 (~350 for 1★ → ~1000 for 5★), **50 hrs/recruit cap**.
- **Prospect funnel:** Open → Top 8 → Top 5 → Top 3 → Commit, with **Top-5 gating for 4–5★** (must be on their board early).
- **3 motivations + 1 Dealbreaker**; the **hard-pitch phase**; grades come from school attributes; **glamour positions (QB/RB/WR/CB/Edge) weight Brand Exposure**.
- **Actions:** Scout, Search Social Media, **Send the House**, Schedule Visit (Top-5 + offer), **Sway** (add a motivation you grade well).
- **Recruiting Battles** (head-to-head momentum reset near commitment).
- *Test:* funnel transitions, dealbreaker gating, Sway success, battles resolve; balanced class sizes by prestige.

### v0.10 — Pipelines (§6)
Geographic recruiting identity.
- **Pipeline territories**, **Tier 1–5** influence in the recruiting math; **regional sub-pipelines** for TX/CA/FL.
- Pipelines **strengthen with repeated signings**; Recruiter abilities accelerate them; can overcome hour disparities.
- *Test:* pipeline tier tilts close battles; tiers grow with regional success.

### v0.11 — Coach Archetypes, Trees & Coordinators (§3)
Make coaching a deep build.
- **Recruiter / Motivator / Tactician** archetypes; **cross-tree abilities**; **level cap 100** progression curve.
- **OC/DC coordinators** with their own ability trees, who **add to program prestige** and are **poachable**.
- Abilities wire into recruiting (Recruiter), development (Motivator), and game sim (Tactician).
- *Test:* abilities apply across systems; staff prestige math; long-run leveling stays meaningful to L100.

### v0.12 — Transfer Portal & NIL (§7, §9)
The signature CFB 26 system.
- **Portal windows** (post-season + spring) as **micro-recruiting** (compressed, intense).
- **Why players leave:** playing-time disappointment (tracked vs depth-chart expectation), **Dynamic Dealbreakers / rising expectations** (a developed 3★→4★ wants more), **Conference Prestige** dealbreaker (G5 must fight to keep blue-chippers).
- **Retention:** honor recruiting promises, Brand Exposure, Conference Prestige, coach reputation.
- **Redshirt portal risk** integrated (see v0.13).
- **NIL:** Brand-Exposure grade model (canonical) **+ optional NIL collective/budget layer** (your earlier ask) as a toggle.
- **Guardrails:** starters don't bolt for playing time; portal reasons shown before departure.
- *Test:* portal in/out balances rosters, reasons are correct & visible, retention levers work, budget can't overspend.

### v0.13 — Coaching Carousel, Job Security & Press (§11–12)
The living world + your career.
- **Coaching Carousel:** fired/promoted/poached/retire across the FBS; **notifications**, a **Staff Moves screen** (role, destination, reason), rebalanced offer logic.
- **AD quotas / hot-seat** job security; firing & job offers tied to the carousel.
- **Press conferences** (post-game & weekly) with tone choices that move morale, recruiting buzz, and AD/fan confidence.
- **Weekly coach tasks** to chase.
- *Test:* carousel stable over 15+ seasons, quotas/hot-seat fire, press choices move the right meters.

### v0.14 — Redshirting, Depth Chart & Custom Conferences (§9, §13)
Roster control + world-building.
- **Redshirting:** eligible if <4 games and not previously redshirted; **postseason games don't count**; toggling redshirt **only adjusts that position** on the depth chart; **redshirt → portal risk** if playing-time dealbreaker.
- **Custom conferences & realignment** with **Protected Opponents** (annual rivalries regardless of divisions).
- *Test:* redshirt rules + portal risk correct; realignment + protected games schedule properly.

### v1.0 — Polish, balance & promotion-ready
- Full cross-system balance pass (attributes ↔ recruiting ↔ pipelines ↔ development ↔ portal ↔ sim).
- Save-migration hardening, IndexedDB for league-wide stats, performance, onboarding/tutorial.
- **Parody-name flip** verified end-to-end; branding.

### Future / stretch
Drive-by-drive sim + play log, authentic-coach style profiles, wear & tear (done carefully to avoid the §14 instability), dual-position recognition, custom playbook editor, historical record book & trophy case, cloud save.

---

## Test discipline (every phase)
A headless multi-season Node simulation asserting the new systems behave (sim realism, funnel/dealbreaker logic, dev curves, portal balance, carousel stability, no runtime errors), plus render checks for new screens. Because the OneDrive folder syncs to the test sandbox with a lag, validation runs against a clean sandbox copy of the exact code and shipped files are spot-checked directly.

## Sequencing logic
Season engine (v0.5–0.6) makes the world alive and **generates the stats** everything else feeds on. Development (v0.7) and school attributes (v0.8) build the **shared spine**. The recruiting overhaul (v0.9) and pipelines (v0.10) then have real attributes/stats to grade against. Coaching depth (v0.11), the portal/NIL (v0.12), and the carousel/career (v0.13) layer the human drama on top. Redshirts + custom conferences (v0.14) round out control before the v1.0 polish + parody flip.
